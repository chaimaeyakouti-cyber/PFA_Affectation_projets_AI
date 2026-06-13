from fastapi import FastAPI, Depends, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from sqlalchemy import inspect, text
from sqlalchemy.orm import Session
from typing import Optional
import base64
import csv
import hashlib
import hmac
import io
import json
import os
import sys
import time
from datetime import datetime

import models
import schemas
from database import engine, SessionLocal

sys.path.append(os.path.join(os.path.dirname(__file__), "..", "AI_engine"))
from affectation import affecter_projets_avec_rapport


SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-change-me")
TOKEN_TTL_SECONDS = int(os.getenv("TOKEN_TTL_SECONDS", "86400"))

models.Base.metadata.create_all(bind=engine)


def ensure_missing_columns():
    inspector = inspect(engine)
    required_columns = {
        "groupes": {
            "createur_id": "INT NULL",
            "chef_id": "INT NULL",
            "chef_nom": "VARCHAR(100) NULL",
            "competences_techniques": "TEXT NULL",
            "soft_skills": "TEXT NULL",
        },
        "etudiants": {
            "email": "VARCHAR(100) NULL",
            "stacks": "VARCHAR(300) NULL",
            "utilisateur_id": "INT NULL",
        },
        "utilisateurs": {
            "encadrant_id": "INT NULL",
            "groupe_id": "INT NULL",
        },
        "choix": {
            "locked": "INT DEFAULT 0",
        },
        "projets": {
            "domaine": "VARCHAR(80) NULL",
        },
    }

    with engine.begin() as connection:
        for table_name, columns in required_columns.items():
            existing = {column["name"] for column in inspector.get_columns(table_name)}
            for column_name, column_type in columns.items():
                if column_name not in existing:
                    connection.execute(text(f"ALTER TABLE {table_name} ADD COLUMN {column_name} {column_type}"))


ensure_missing_columns()

app = FastAPI(title="PFA Affectation API", version="2.1")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()


def _sign(payload_b64: str) -> str:
    return hmac.new(SECRET_KEY.encode(), payload_b64.encode(), hashlib.sha256).hexdigest()


def create_access_token(user: models.Utilisateur) -> str:
    payload = {
        "sub": user.id,
        "role": user.role,
        "exp": int(time.time()) + TOKEN_TTL_SECONDS,
    }
    payload_b64 = base64.urlsafe_b64encode(json.dumps(payload).encode()).decode().rstrip("=")
    return f"{payload_b64}.{_sign(payload_b64)}"


def decode_access_token(token: str) -> dict:
    try:
        payload_b64, signature = token.split(".", 1)
        if not hmac.compare_digest(_sign(payload_b64), signature):
            raise ValueError("bad signature")
        padded = payload_b64 + "=" * (-len(payload_b64) % 4)
        payload = json.loads(base64.urlsafe_b64decode(padded.encode()).decode())
        if payload.get("exp", 0) < int(time.time()):
            raise ValueError("expired")
        return payload
    except Exception as exc:
        raise HTTPException(status_code=401, detail="Token invalide ou expire") from exc


def get_current_user(
    authorization: Optional[str] = Header(default=None),
    db: Session = Depends(get_db),
) -> models.Utilisateur:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Authentification requise")
    payload = decode_access_token(authorization.split(" ", 1)[1])
    user = db.query(models.Utilisateur).filter(models.Utilisateur.id == payload.get("sub")).first()
    if not user:
        raise HTTPException(status_code=401, detail="Utilisateur introuvable")
    return user


def require_role(user: models.Utilisateur, *roles: str):
    if user.role not in roles:
        raise HTTPException(status_code=403, detail="Acces non autorise")


def _find_groupe_for_user(user: models.Utilisateur, db: Session) -> Optional[models.Groupe]:
    if user.groupe_id:
        groupe = db.query(models.Groupe).filter(models.Groupe.id == user.groupe_id).first()
        if groupe:
            return groupe

    etudiant = db.query(models.Etudiant).filter(models.Etudiant.utilisateur_id == user.id).first()
    if etudiant and etudiant.groupe_id:
        groupe = db.query(models.Groupe).filter(models.Groupe.id == etudiant.groupe_id).first()
        if groupe:
            return groupe

    groupe = db.query(models.Groupe).filter(
        (models.Groupe.chef_id == user.id) | (models.Groupe.createur_id == user.id)
    ).first()
    if groupe:
        return groupe

    if user.nom:
        first_name = user.nom.strip().split()[0]
        etudiant = db.query(models.Etudiant).filter(models.Etudiant.nom.ilike(f"%{first_name}%")).first()
        if etudiant and etudiant.groupe_id:
            return db.query(models.Groupe).filter(models.Groupe.id == etudiant.groupe_id).first()
    return None


@app.get("/")
def read_root():
    return {"message": "PFA Affectation API operationnelle"}


@app.post("/groupes/", response_model=schemas.Groupe)
def create_groupe(
    groupe: schemas.GroupeCreate,
    db: Session = Depends(get_db),
    current_user: models.Utilisateur = Depends(get_current_user),
):
    require_role(current_user, "etudiant", "coordinateur")
    if len(groupe.etudiants) > 3:
        raise HTTPException(status_code=400, detail="Un groupe ne peut pas depasser 3 etudiants")
    if len(groupe.etudiants) < 1:
        raise HTTPException(status_code=400, detail="Un groupe doit avoir au moins 1 etudiant")

    competences_techniques = [c.strip() for c in groupe.competences_techniques if c.strip()]
    soft_skills = [s.strip() for s in groupe.soft_skills if s.strip()]
    if not competences_techniques:
        raise HTTPException(status_code=400, detail="Au moins une competence technique est requise")
    if not soft_skills:
        raise HTTPException(status_code=400, detail="Au moins une soft skill est requise")

    createur_id = current_user.id if current_user.role == "etudiant" else groupe.createur_id
    new_groupe = models.Groupe(
        nom=groupe.nom,
        createur_id=createur_id,
        chef_id=createur_id,
        chef_nom=current_user.nom,
        competences_techniques=", ".join(competences_techniques),
        soft_skills=", ".join(soft_skills),
    )
    db.add(new_groupe)
    db.commit()
    db.refresh(new_groupe)

    for index, etudiant_data in enumerate(groupe.etudiants):
        data = etudiant_data.model_dump()
        if index == 0 and createur_id and not data.get("utilisateur_id"):
            data["utilisateur_id"] = createur_id
        db.add(models.Etudiant(**data, groupe_id=new_groupe.id))

    if createur_id:
        user = db.query(models.Utilisateur).filter(models.Utilisateur.id == createur_id).first()
        if user:
            user.groupe_id = new_groupe.id
    db.commit()
    db.refresh(new_groupe)
    return new_groupe


@app.get("/groupes/", response_model=list[schemas.Groupe])
def get_groupes(db: Session = Depends(get_db)):
    return db.query(models.Groupe).all()


@app.delete("/groupes/{groupe_id}")
def delete_groupe(
    groupe_id: int,
    user_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: Optional[models.Utilisateur] = Depends(get_current_user),
):
    groupe = db.query(models.Groupe).filter(models.Groupe.id == groupe_id).first()
    if not groupe:
        raise HTTPException(status_code=404, detail="Groupe introuvable")

    actor = current_user
    if not actor and user_id:
        actor = db.query(models.Utilisateur).filter(models.Utilisateur.id == user_id).first()
    if not actor:
        raise HTTPException(status_code=401, detail="Utilisateur introuvable")

    is_owner = groupe.chef_id == actor.id or groupe.createur_id == actor.id
    if actor.role != "coordinateur" and not is_owner:
        raise HTTPException(status_code=403, detail="Seul le coordinateur ou le chef peut supprimer ce groupe")

    db.query(models.Choix).filter(models.Choix.groupe_id == groupe_id).delete()
    db.query(models.Affectation).filter(models.Affectation.groupe_id == groupe_id).delete()
    db.query(models.Etudiant).filter(models.Etudiant.groupe_id == groupe_id).delete()
    db.query(models.Utilisateur).filter(models.Utilisateur.groupe_id == groupe_id).update({"groupe_id": None})
    db.delete(groupe)
    db.commit()
    return {"message": f"Groupe '{groupe.nom}' supprime avec succes"}


@app.get("/etudiants/", response_model=list[schemas.Etudiant])
def get_etudiants(db: Session = Depends(get_db)):
    return db.query(models.Etudiant).all()


@app.post("/encadrants/", response_model=schemas.Encadrant)
def create_encadrant(encadrant: schemas.EncadrantCreate, db: Session = Depends(get_db)):
    new_encadrant = models.Encadrant(**encadrant.model_dump())
    db.add(new_encadrant)
    db.commit()
    db.refresh(new_encadrant)
    return new_encadrant


@app.get("/encadrants/", response_model=list[schemas.Encadrant])
def get_encadrants(db: Session = Depends(get_db)):
    return db.query(models.Encadrant).all()


@app.post("/projets/", response_model=schemas.Projet)
def create_projet(projet: schemas.ProjetCreate, db: Session = Depends(get_db)):
    encadrant = db.query(models.Encadrant).filter(models.Encadrant.id == projet.encadrant_id).first()
    if not encadrant:
        raise HTTPException(status_code=404, detail="Encadrant introuvable")
    new_projet = models.Projet(**projet.model_dump())
    db.add(new_projet)
    db.commit()
    db.refresh(new_projet)
    return new_projet


@app.get("/projets/", response_model=list[schemas.Projet])
def get_projets(db: Session = Depends(get_db)):
    return db.query(models.Projet).all()


@app.get("/projets-avec-encadrant/", response_model=list[schemas.ProjetAvecEncadrant])
def get_projets_avec_encadrant(db: Session = Depends(get_db)):
    projets = db.query(models.Projet).all()
    result = []
    for projet in projets:
        encadrant = db.query(models.Encadrant).filter(models.Encadrant.id == projet.encadrant_id).first()
        result.append({
            "id": projet.id,
            "titre": projet.titre,
            "description": projet.description,
            "competences_requises": projet.competences_requises,
            "domaine": projet.domaine,
            "encadrant_id": projet.encadrant_id,
            "encadrant_nom": f"{encadrant.prenom} {encadrant.nom}" if encadrant else None,
            "encadrant_email": encadrant.email if encadrant else None,
        })
    return result


@app.post("/choix/", response_model=schemas.Choix)
def create_choix(choix: schemas.ChoixCreate, db: Session = Depends(get_db)):
    if choix.priorite not in [1, 2, 3]:
        raise HTTPException(status_code=400, detail="La priorite doit etre 1, 2 ou 3")

    locked = db.query(models.Choix).filter(
        models.Choix.groupe_id == choix.groupe_id,
        models.Choix.locked == 1,
    ).first()
    if locked:
        raise HTTPException(status_code=400, detail="Les choix sont verrouilles apres le lancement de l'affectation")

    duplicate = db.query(models.Choix).filter(
        models.Choix.groupe_id == choix.groupe_id,
        models.Choix.projet_id == choix.projet_id,
    ).first()
    if duplicate:
        raise HTTPException(status_code=400, detail="Ce groupe a deja choisi ce projet")

    count = db.query(models.Choix).filter(models.Choix.groupe_id == choix.groupe_id).count()
    if count >= 3:
        raise HTTPException(status_code=400, detail="Ce groupe a deja fait ses 3 choix")

    new_choix = models.Choix(**choix.model_dump())
    db.add(new_choix)
    db.commit()
    db.refresh(new_choix)
    return new_choix


@app.get("/choix/", response_model=list[schemas.Choix])
def get_choix(db: Session = Depends(get_db)):
    return db.query(models.Choix).all()


@app.get("/mes-choix/{user_id}", response_model=list[schemas.Choix])
def get_mes_choix(user_id: int, db: Session = Depends(get_db)):
    user = db.query(models.Utilisateur).filter(models.Utilisateur.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")
    groupe = _find_groupe_for_user(user, db)
    if not groupe:
        raise HTTPException(status_code=404, detail="Aucun groupe trouve")
    return db.query(models.Choix).filter(models.Choix.groupe_id == groupe.id).all()


@app.put("/choix/{choix_id}")
def modifier_choix(choix_id: int, data: schemas.ChoixUpdate, db: Session = Depends(get_db)):
    choix = db.query(models.Choix).filter(models.Choix.id == choix_id).first()
    if not choix:
        raise HTTPException(status_code=404, detail="Choix introuvable")
    if choix.locked:
        raise HTTPException(status_code=400, detail="Ce choix est verrouille")

    conflict = db.query(models.Choix).filter(
        models.Choix.groupe_id == choix.groupe_id,
        models.Choix.projet_id == data.projet_id,
        models.Choix.id != choix_id,
    ).first()
    if conflict:
        raise HTTPException(status_code=400, detail="Ce projet est deja dans vos choix")

    choix.projet_id = data.projet_id
    choix.priorite = data.priorite
    db.commit()
    return {"message": "Choix modifie avec succes", "choix_id": choix_id}


@app.delete("/choix/groupe/{groupe_id}")
def reset_choix(groupe_id: int, db: Session = Depends(get_db)):
    locked = db.query(models.Choix).filter(
        models.Choix.groupe_id == groupe_id,
        models.Choix.locked == 1,
    ).first()
    if locked:
        raise HTTPException(status_code=400, detail="Les choix sont verrouilles")
    db.query(models.Choix).filter(models.Choix.groupe_id == groupe_id).delete()
    db.commit()
    return {"message": "Choix reinitialises"}


@app.post("/affecter/")
def lancer_affectation(
    config: Optional[schemas.MoteurConfig] = None,
    db: Session = Depends(get_db),
    current_user: models.Utilisateur = Depends(get_current_user),
):
    require_role(current_user, "coordinateur")
    tous_les_choix = db.query(models.Choix).all()
    if not tous_les_choix:
        raise HTTPException(status_code=400, detail="Aucun choix enregistre")

    config = config or schemas.MoteurConfig()
    total = config.poids_priorite + config.poids_adequation + config.poids_charge
    if not (0.99 <= total <= 1.01):
        raise HTTPException(status_code=400, detail=f"La somme des poids doit etre 1.0 (actuellement {total:.2f})")

    choix_list = [
        {"groupe_id": c.groupe_id, "projet_id": c.projet_id, "priorite": c.priorite}
        for c in tous_les_choix
    ]
    projets_info = [
        {"id": p.id, "competences_requises": p.competences_requises, "encadrant_id": p.encadrant_id}
        for p in db.query(models.Projet).all()
    ]
    groupes_info = []
    for groupe in db.query(models.Groupe).all():
        groupes_info.append({
            "id": groupe.id,
            "competences": " ".join(filter(None, [groupe.competences_techniques, groupe.soft_skills])),
            "etudiants": [
                {"filiere": e.filiere, "stacks": e.stacks or ""}
                for e in groupe.etudiants
            ],
        })

    resultats, rapport = affecter_projets_avec_rapport(
        choix_list=choix_list,
        projets_info=projets_info,
        groupes_info=groupes_info,
        poids_override={
            "priorite": config.poids_priorite,
            "adequation": config.poids_adequation,
            "charge": config.poids_charge,
        },
    )

    db.query(models.Affectation).delete()
    db.commit()
    for groupe_id, projet_id in resultats.items():
        db.add(models.Affectation(groupe_id=groupe_id, projet_id=projet_id, valide="en_attente"))
    db.query(models.Choix).update({"locked": 1})
    db.commit()

    response = []
    for groupe_id, projet_id in resultats.items():
        groupe = db.query(models.Groupe).filter(models.Groupe.id == groupe_id).first()
        projet = db.query(models.Projet).filter(models.Projet.id == projet_id).first() if projet_id else None
        encadrant = db.query(models.Encadrant).filter(models.Encadrant.id == projet.encadrant_id).first() if projet else None
        rang = next((c.priorite for c in tous_les_choix if c.groupe_id == groupe_id and c.projet_id == projet_id), None)
        response.append({
            "groupe": groupe.nom if groupe else f"Groupe {groupe_id}",
            "projet_affecte": projet.titre if projet else "Aucun projet disponible",
            "projet_description": projet.description if projet else None,
            "encadrant_nom": f"{encadrant.prenom} {encadrant.nom}" if encadrant else None,
            "encadrant_email": encadrant.email if encadrant else None,
            "statut": "en_attente",
            "rang_obtenu": rang,
        })

    return {
        "affectations": response,
        "rapport": rapport,
        "config_utilisee": {
            "alpha": config.poids_priorite,
            "beta": config.poids_adequation,
            "gamma": config.poids_charge,
        },
    }


@app.get("/affectations/", response_model=list[schemas.Affectation])
def get_affectations(db: Session = Depends(get_db)):
    return db.query(models.Affectation).all()


@app.put("/affectations/{affectation_id}/valider")
def valider_affectation(
    affectation_id: int,
    db: Session = Depends(get_db),
    current_user: models.Utilisateur = Depends(get_current_user),
):
    require_role(current_user, "encadrant")
    affectation = db.query(models.Affectation).filter(models.Affectation.id == affectation_id).first()
    if not affectation:
        raise HTTPException(status_code=404, detail="Affectation introuvable")
    projet = db.query(models.Projet).filter(models.Projet.id == affectation.projet_id).first()
    if projet and current_user.encadrant_id and projet.encadrant_id != current_user.encadrant_id:
        raise HTTPException(status_code=403, detail="Cette affectation appartient a un autre encadrant")
    affectation.valide = "validé"
    db.commit()
    return {"message": f"Affectation {affectation_id} validee"}


@app.put("/affectations/{affectation_id}/modifier")
def modifier_affectation(
    affectation_id: int,
    nouveau_projet_id: int,
    db: Session = Depends(get_db),
    current_user: models.Utilisateur = Depends(get_current_user),
):
    require_role(current_user, "encadrant")
    affectation = db.query(models.Affectation).filter(models.Affectation.id == affectation_id).first()
    projet = db.query(models.Projet).filter(models.Projet.id == nouveau_projet_id).first()
    if not affectation:
        raise HTTPException(status_code=404, detail="Affectation introuvable")
    if not projet:
        raise HTTPException(status_code=404, detail="Projet introuvable")
    if current_user.encadrant_id and projet.encadrant_id != current_user.encadrant_id:
        raise HTTPException(status_code=403, detail="Projet non autorise pour cet encadrant")
    affectation.projet_id = nouveau_projet_id
    affectation.valide = "modifié"
    db.commit()
    return {"message": f"Affectation {affectation_id} modifiee"}


@app.put("/affectations/{affectation_id}/reaffecter")
def reaffecter_affectation(
    affectation_id: int,
    nouveau_groupe_id: int,
    db: Session = Depends(get_db),
    current_user: models.Utilisateur = Depends(get_current_user),
):
    require_role(current_user, "encadrant")
    affectation = db.query(models.Affectation).filter(models.Affectation.id == affectation_id).first()
    groupe = db.query(models.Groupe).filter(models.Groupe.id == nouveau_groupe_id).first()
    if not affectation:
        raise HTTPException(status_code=404, detail="Affectation introuvable")
    if not groupe:
        raise HTTPException(status_code=404, detail="Groupe introuvable")
    affectation.groupe_id = nouveau_groupe_id
    affectation.valide = "modifié"
    db.commit()
    return {"message": f"Affectation {affectation_id} reaffectee au groupe {groupe.nom}"}


@app.get("/mon-groupe/{user_id}", response_model=schemas.MonGroupeResponse)
def get_mon_groupe(user_id: int, db: Session = Depends(get_db)):
    user = db.query(models.Utilisateur).filter(models.Utilisateur.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")
    groupe = _find_groupe_for_user(user, db)
    if not groupe:
        raise HTTPException(status_code=404, detail="Aucun groupe trouve pour cet utilisateur")
    return groupe


@app.get("/mon-affectation/{user_id}", response_model=schemas.MonAffectationResponse)
def get_mon_affectation(user_id: int, db: Session = Depends(get_db)):
    user = db.query(models.Utilisateur).filter(models.Utilisateur.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")
    groupe = _find_groupe_for_user(user, db)
    if not groupe:
        raise HTTPException(status_code=404, detail="Aucun groupe trouve")
    affectation = db.query(models.Affectation).filter(models.Affectation.groupe_id == groupe.id).first()
    if not affectation:
        raise HTTPException(status_code=404, detail="Aucune affectation pour ce groupe")

    projet = db.query(models.Projet).filter(models.Projet.id == affectation.projet_id).first() if affectation.projet_id else None
    encadrant = db.query(models.Encadrant).filter(models.Encadrant.id == projet.encadrant_id).first() if projet else None
    choix = db.query(models.Choix).filter(
        models.Choix.groupe_id == groupe.id,
        models.Choix.projet_id == affectation.projet_id,
    ).first() if affectation.projet_id else None

    return {
        "affectation_id": affectation.id,
        "groupe_nom": groupe.nom,
        "projet_titre": projet.titre if projet else None,
        "projet_description": projet.description if projet else None,
        "encadrant_nom": f"{encadrant.prenom} {encadrant.nom}" if encadrant else None,
        "encadrant_email": encadrant.email if encadrant else None,
        "valide": affectation.valide,
        "rang_obtenu": choix.priorite if choix else None,
    }


@app.put("/users/{user_id}/lier-groupe/{groupe_id}")
def lier_groupe(user_id: int, groupe_id: int, db: Session = Depends(get_db)):
    user = db.query(models.Utilisateur).filter(models.Utilisateur.id == user_id).first()
    groupe = db.query(models.Groupe).filter(models.Groupe.id == groupe_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")
    if not groupe:
        raise HTTPException(status_code=404, detail="Groupe introuvable")

    user.groupe_id = groupe_id
    groupe.createur_id = groupe.createur_id or user_id
    groupe.chef_id = groupe.chef_id or user_id
    groupe.chef_nom = groupe.chef_nom or user.nom

    first_name = user.nom.strip().split()[0] if user.nom else ""
    etudiant = db.query(models.Etudiant).filter(
        models.Etudiant.groupe_id == groupe_id,
        models.Etudiant.nom.ilike(f"%{first_name}%"),
    ).first()
    if etudiant and not etudiant.utilisateur_id:
        etudiant.utilisateur_id = user_id
    db.commit()
    return {"message": f"Utilisateur #{user_id} lie au groupe '{groupe.nom}'", "user_id": user_id, "groupe_id": groupe_id}


@app.get("/export/json")
def export_json(db: Session = Depends(get_db)):
    return _export_payload(db)


def _export_payload(db: Session) -> dict:
    groupes = db.query(models.Groupe).all()
    projets = db.query(models.Projet).all()
    affectations = db.query(models.Affectation).all()
    choix = db.query(models.Choix).all()
    return {
        "export_date": datetime.now().isoformat(),
        "groupes": [
            {
                "id": g.id,
                "nom": g.nom,
                "chef_nom": g.chef_nom,
                "competences_techniques": g.competences_techniques,
                "soft_skills": g.soft_skills,
                "etudiants": [
                    {"nom": e.nom, "prenom": e.prenom, "filiere": e.filiere, "stacks": e.stacks}
                    for e in g.etudiants
                ],
            }
            for g in groupes
        ],
        "projets": [
            {"id": p.id, "titre": p.titre, "description": p.description, "competences_requises": p.competences_requises, "domaine": p.domaine}
            for p in projets
        ],
        "choix": [{"groupe_id": c.groupe_id, "projet_id": c.projet_id, "priorite": c.priorite, "locked": c.locked} for c in choix],
        "affectations": [{"groupe_id": a.groupe_id, "projet_id": a.projet_id, "valide": a.valide} for a in affectations],
    }


@app.post("/register", response_model=schemas.UserResponse)
def register(user: schemas.UserRegister, db: Session = Depends(get_db)):
    existing = db.query(models.Utilisateur).filter(models.Utilisateur.email == user.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email deja utilise")
    if user.role not in ["etudiant", "encadrant", "coordinateur"]:
        raise HTTPException(status_code=400, detail="Role invalide")

    new_user = models.Utilisateur(
        nom=user.nom,
        email=user.email,
        mot_de_passe=hash_password(user.mot_de_passe),
        role=user.role,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    if user.role == "encadrant":
        parts = user.nom.strip().split(" ")
        encadrant = models.Encadrant(
            nom=parts[0],
            prenom=" ".join(parts[1:]) if len(parts) > 1 else parts[0],
            email=user.email,
        )
        db.add(encadrant)
        db.commit()
        db.refresh(encadrant)
        new_user.encadrant_id = encadrant.id
        db.commit()
        db.refresh(new_user)
    return new_user


@app.post("/login", response_model=schemas.AuthResponse)
def login(user: schemas.UserLogin, db: Session = Depends(get_db)):
    db_user = db.query(models.Utilisateur).filter(models.Utilisateur.email == user.email).first()
    if not db_user or db_user.mot_de_passe != hash_password(user.mot_de_passe):
        raise HTTPException(status_code=401, detail="Email ou mot de passe incorrect")
    return {"user": db_user, "access_token": create_access_token(db_user), "token_type": "bearer"}


@app.get("/user-by-email", response_model=schemas.UserResponse)
def get_user_by_email(email: str, db: Session = Depends(get_db)):
    user = db.query(models.Utilisateur).filter(models.Utilisateur.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")
    return user


@app.get("/admin/export")
def export_resultats(format: str = "json", db: Session = Depends(get_db)):
    affectations = db.query(models.Affectation).all()
    rows = []
    for affectation in affectations:
        groupe = db.query(models.Groupe).filter(models.Groupe.id == affectation.groupe_id).first()
        projet = db.query(models.Projet).filter(models.Projet.id == affectation.projet_id).first() if affectation.projet_id else None
        encadrant = db.query(models.Encadrant).filter(models.Encadrant.id == projet.encadrant_id).first() if projet else None
        rows.append({
            "groupe_id": affectation.groupe_id,
            "groupe_nom": groupe.nom if groupe else None,
            "projet_id": affectation.projet_id,
            "projet_titre": projet.titre if projet else None,
            "encadrant": f"{encadrant.prenom} {encadrant.nom}" if encadrant else None,
            "encadrant_email": encadrant.email if encadrant else None,
            "statut": affectation.valide,
        })

    if format == "csv":
        buffer = io.StringIO()
        writer = csv.DictWriter(buffer, fieldnames=rows[0].keys() if rows else ["groupe_id", "groupe_nom", "projet_id", "projet_titre", "encadrant", "encadrant_email", "statut"])
        writer.writeheader()
        writer.writerows(rows)
        buffer.seek(0)
        return StreamingResponse(
            iter([buffer.getvalue()]),
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=affectations.csv"},
        )
    return rows
