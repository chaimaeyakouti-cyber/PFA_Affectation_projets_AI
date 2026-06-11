from fastapi import FastAPI, Depends, HTTPException, Header
from sqlalchemy.orm import Session
from sqlalchemy import inspect, text
import models, schemas
from database import engine, SessionLocal
import sys
import os
import hashlib
import base64
import hmac
import json
import time
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'AI_engine'))
from affectation import affecter_projets_avec_rapport

def load_env_file():
    env_path = os.path.join(os.path.dirname(__file__), "..", ".env")
    if not os.path.exists(env_path):
        return

    with open(env_path, encoding="utf-8") as env_file:
        for raw_line in env_file:
            line = raw_line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))

load_env_file()

APP_ENV = os.getenv("APP_ENV", "development")
SECRET_KEY = os.getenv("SECRET_KEY")
if not SECRET_KEY:
    if APP_ENV == "production":
        raise RuntimeError("SECRET_KEY doit etre defini en production")
    SECRET_KEY = "development-only-secret-key"

TOKEN_TTL_SECONDS = 60 * 60 * 8

models.Base.metadata.create_all(bind=engine)

def ensure_missing_columns():
    inspector = inspect(engine)
    required_columns = {
        "groupes": {
            "createur_id": "INT NULL",
        },
        "etudiants": {
            "email": "VARCHAR(100) NULL",
            "utilisateur_id": "INT NULL",
        },
        "utilisateurs": {
            "groupe_id": "INT NULL",
        },
    }

    with engine.begin() as connection:
        for table_name, columns in required_columns.items():
            existing = {column["name"] for column in inspector.get_columns(table_name)}
            for column_name, column_type in columns.items():
                if column_name not in existing:
                    connection.execute(text(f"ALTER TABLE {table_name} ADD COLUMN {column_name} {column_type}"))

ensure_missing_columns()
app = FastAPI()

from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
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

def _b64encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode().rstrip("=")

def _b64decode(data: str) -> bytes:
    padding = "=" * (-len(data) % 4)
    return base64.urlsafe_b64decode(data + padding)

def create_access_token(user: models.Utilisateur) -> str:
    payload = {
        "sub": user.id,
        "role": user.role,
        "exp": int(time.time()) + TOKEN_TTL_SECONDS,
    }
    payload_b64 = _b64encode(json.dumps(payload, separators=(",", ":")).encode())
    signature = hmac.new(SECRET_KEY.encode(), payload_b64.encode(), hashlib.sha256).digest()
    return f"{payload_b64}.{_b64encode(signature)}"

def verify_access_token(token: str) -> dict:
    try:
        payload_b64, signature_b64 = token.split(".", 1)
        expected_signature = hmac.new(SECRET_KEY.encode(), payload_b64.encode(), hashlib.sha256).digest()
        received_signature = _b64decode(signature_b64)
        if not hmac.compare_digest(expected_signature, received_signature):
            raise ValueError
        payload = json.loads(_b64decode(payload_b64))
        if int(payload.get("exp", 0)) < int(time.time()):
            raise HTTPException(status_code=401, detail="Session expirée")
        return payload
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=401, detail="Token invalide")

def get_current_user(
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Authentification requise")
    payload = verify_access_token(authorization.replace("Bearer ", "", 1))
    user = db.query(models.Utilisateur).filter(models.Utilisateur.id == payload.get("sub")).first()
    if not user:
        raise HTTPException(status_code=401, detail="Utilisateur introuvable")
    return user

def ensure_same_user_or_coordinateur(user_id: int, current_user: models.Utilisateur):
    if current_user.id != user_id and current_user.role != "coordinateur":
        raise HTTPException(status_code=403, detail="Accès interdit")

def require_role(current_user: models.Utilisateur, role: str):
    if current_user.role != role:
        raise HTTPException(status_code=403, detail="Accès interdit")

def find_groupe_for_user(user_id: int, db: Session):
    user = db.query(models.Utilisateur).filter(models.Utilisateur.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")

    groupe = None
    if user.groupe_id:
        groupe = db.query(models.Groupe).filter(models.Groupe.id == user.groupe_id).first()
    if not groupe:
        groupe = db.query(models.Groupe).filter(models.Groupe.createur_id == user_id).first()
    if not groupe:
        etudiant = db.query(models.Etudiant).filter(models.Etudiant.utilisateur_id == user_id).first()
        groupe = etudiant.groupe if etudiant else None
    if not groupe:
        raise HTTPException(status_code=404, detail="Aucun groupe associé à cet utilisateur")

    return groupe


@app.get("/")
def read_root():
    return {"message": "Serveur opérationnel ! Allez sur /docs pour tester."}


@app.post("/groupes/", response_model=schemas.Groupe)
def create_groupe(
    groupe: schemas.GroupeCreate,
    db: Session = Depends(get_db),
    current_user: models.Utilisateur = Depends(get_current_user),
):
    if len(groupe.etudiants) > 3:
        raise HTTPException(status_code=400, detail="Un groupe ne peut pas dépasser 3 étudiants")
    createur_id = current_user.id if current_user.role == "etudiant" else groupe.createur_id
    new_groupe = models.Groupe(nom=groupe.nom, createur_id=createur_id)
    db.add(new_groupe)
    db.commit()
    db.refresh(new_groupe)
    for etudiant_data in groupe.etudiants:
        new_etudiant = models.Etudiant(**etudiant_data.model_dump(), groupe_id=new_groupe.id)
        db.add(new_etudiant)
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
    db: Session = Depends(get_db),
    current_user: models.Utilisateur = Depends(get_current_user),
):
    require_role(current_user, "coordinateur")
    groupe = db.query(models.Groupe).filter(models.Groupe.id == groupe_id).first()
    if not groupe:
        raise HTTPException(status_code=404, detail="Groupe introuvable")

    db.query(models.Affectation).filter(models.Affectation.groupe_id == groupe_id).delete()
    db.query(models.Choix).filter(models.Choix.groupe_id == groupe_id).delete()
    db.query(models.Etudiant).filter(models.Etudiant.groupe_id == groupe_id).delete()
    db.query(models.Utilisateur).filter(models.Utilisateur.groupe_id == groupe_id).update({"groupe_id": None})
    db.delete(groupe)
    db.commit()
    return {"message": "Groupe supprimé avec succès"}

@app.get("/mon-groupe/{user_id}", response_model=schemas.Groupe)
def get_mon_groupe(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: models.Utilisateur = Depends(get_current_user),
):
    ensure_same_user_or_coordinateur(user_id, current_user)
    user = db.query(models.Utilisateur).filter(models.Utilisateur.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")

    groupe = None
    if user.groupe_id:
        groupe = db.query(models.Groupe).filter(models.Groupe.id == user.groupe_id).first()
    if not groupe:
        groupe = db.query(models.Groupe).filter(models.Groupe.createur_id == user_id).first()
    if not groupe:
        etudiant = db.query(models.Etudiant).filter(models.Etudiant.utilisateur_id == user_id).first()
        groupe = etudiant.groupe if etudiant else None
    if not groupe:
        raise HTTPException(status_code=404, detail="Aucun groupe associé à cet utilisateur")

    return groupe

@app.put("/users/{user_id}/lier-groupe/{groupe_id}", response_model=schemas.UserResponse)
def lier_groupe(
    user_id: int,
    groupe_id: int,
    db: Session = Depends(get_db),
    current_user: models.Utilisateur = Depends(get_current_user),
):
    ensure_same_user_or_coordinateur(user_id, current_user)
    user = db.query(models.Utilisateur).filter(models.Utilisateur.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")
    groupe = db.query(models.Groupe).filter(models.Groupe.id == groupe_id).first()
    if not groupe:
        raise HTTPException(status_code=404, detail="Groupe introuvable")

    user.groupe_id = groupe_id
    if groupe.createur_id is None:
        groupe.createur_id = user_id
    db.commit()
    db.refresh(user)
    return user


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


@app.post("/choix/", response_model=schemas.Choix)
def create_choix(choix: schemas.ChoixCreate, db: Session = Depends(get_db)):
    
    if choix.priorite not in [1, 2, 3]:
        raise HTTPException(status_code=400, detail="La priorité doit être 1, 2 ou 3")
    
    existant = db.query(models.Choix).filter(
        models.Choix.groupe_id == choix.groupe_id,
        models.Choix.projet_id == choix.projet_id
    ).first()
    if existant:
        raise HTTPException(status_code=400, detail="Ce groupe a déjà choisi ce projet")
    
    nb_choix = db.query(models.Choix).filter(models.Choix.groupe_id == choix.groupe_id).count()
    if nb_choix >= 3:
        raise HTTPException(status_code=400, detail="Ce groupe a déjà fait ses 3 choix")
    new_choix = models.Choix(**choix.model_dump())
    db.add(new_choix)
    db.commit()
    db.refresh(new_choix)
    return new_choix

@app.get("/choix/", response_model=list[schemas.Choix])
def get_choix(db: Session = Depends(get_db)):
    return db.query(models.Choix).all()

@app.get("/mes-choix/{user_id}", response_model=list[schemas.Choix])
def get_mes_choix(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: models.Utilisateur = Depends(get_current_user),
):
    ensure_same_user_or_coordinateur(user_id, current_user)
    groupe = find_groupe_for_user(user_id, db)
    return db.query(models.Choix).filter(models.Choix.groupe_id == groupe.id).all()






@app.post("/affecter/")
def lancer_affectation(
    db: Session = Depends(get_db),
    current_user: models.Utilisateur = Depends(get_current_user),
):
    require_role(current_user, "coordinateur")
    """
    Lance le moteur IA d'affectation.
 
    Retourne :
    {
      "affectations": [...],
      "rapport": {
        "equity_score": 0.78,
        "taux_premier_voeu": 66.7,
        "conforme_cdc": true,
        "satisfactions": { "1": 2, "2": 0, "3": 1, ... },
        ...
      }
    }
    """
    tous_les_choix = db.query(models.Choix).all()
    if not tous_les_choix:
        raise HTTPException(status_code=400, detail="Aucun choix enregistré")
 
    # ── Données d'entrée du moteur ──────────────────────────────────────────
 
    choix_list = [
        {"groupe_id": c.groupe_id, "projet_id": c.projet_id, "priorite": c.priorite}
        for c in tous_les_choix
    ]
 
    # Enrichissement : projets (compétences + encadrant)
    projets_info = [
        {
            "id":                    p.id,
            "competences_requises":  p.competences_requises,
            "encadrant_id":          p.encadrant_id,
        }
        for p in db.query(models.Projet).all()
    ]
 
    # Enrichissement : groupes (filières des étudiants)
    groupes_db = db.query(models.Groupe).all()
    groupes_info = [
        {
            "id": g.id,
            "etudiants": [
                {"filiere": e.filiere}
                for e in g.etudiants
            ],
        }
        for g in groupes_db
    ]
 
    # ── Exécution du moteur ────────────────────────────────────────────────
 
    resultats, rapport = affecter_projets_avec_rapport(
        choix_list   = choix_list,
        projets_info = projets_info,
        groupes_info = groupes_info,
    )
 
    # ── Sauvegarde en base ─────────────────────────────────────────────────
 
    db.query(models.Affectation).delete()
    db.commit()
 
    for groupe_id, projet_id in resultats.items():
        db.add(models.Affectation(
            groupe_id = groupe_id,
            projet_id = projet_id,
            valide    = "en_attente",
        ))
    db.commit()
 
    # ── Construction de la réponse ─────────────────────────────────────────
 
    reponse = []
    for groupe_id, projet_id in resultats.items():
        groupe = db.query(models.Groupe).filter(models.Groupe.id == groupe_id).first()
        projet = db.query(models.Projet).filter(models.Projet.id == projet_id).first() if projet_id else None
 
        # Rang obtenu dans les préférences de ce groupe
        rang = next(
            (c.priorite for c in tous_les_choix
             if c.groupe_id == groupe_id and c.projet_id == projet_id),
            None
        )
 
        reponse.append({
            "groupe":         groupe.nom if groupe else f"Groupe {groupe_id}",
            "projet_affecte": projet.titre if projet else "Aucun projet disponible",
            "statut":         "en_attente",
            "rang_obtenu":    rang,   # 1, 2 ou 3 (ou None si hors préférences)
        })
 
    return {
        "affectations": reponse,
        "rapport":      rapport,     # ← nouveau : rapport d'équité complet
    }


@app.get("/affectations/", response_model=list[schemas.Affectation])
def get_affectations(db: Session = Depends(get_db)):
    return db.query(models.Affectation).all()

@app.get("/mon-affectation/{user_id}")
def get_mon_affectation(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: models.Utilisateur = Depends(get_current_user),
):
    ensure_same_user_or_coordinateur(user_id, current_user)
    groupe = find_groupe_for_user(user_id, db)
    affectation = db.query(models.Affectation).filter(models.Affectation.groupe_id == groupe.id).first()
    if not affectation:
        raise HTTPException(status_code=404, detail="Aucune affectation disponible pour ce groupe")

    projet = db.query(models.Projet).filter(models.Projet.id == affectation.projet_id).first() if affectation.projet_id else None
    return {
        "affectation_id": affectation.id,
        "groupe_id": groupe.id,
        "groupe_nom": groupe.nom,
        "projet_id": affectation.projet_id,
        "projet_titre": projet.titre if projet else None,
        "projet_description": projet.description if projet else None,
        "valide": affectation.valide,
    }


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
    if not projet or projet.encadrant_id != current_user.encadrant_id:
        raise HTTPException(status_code=403, detail="Cette affectation ne concerne pas vos projets")
    affectation.valide = "validé"
    db.commit()
    return {"message": f"Affectation {affectation_id} validée ✅"}


@app.put("/affectations/{affectation_id}/modifier")
def modifier_affectation(
    affectation_id: int,
    nouveau_projet_id: int,
    db: Session = Depends(get_db),
    current_user: models.Utilisateur = Depends(get_current_user),
):
    require_role(current_user, "encadrant")
    affectation = db.query(models.Affectation).filter(models.Affectation.id == affectation_id).first()
    if not affectation:
        raise HTTPException(status_code=404, detail="Affectation introuvable")
    ancien_projet = db.query(models.Projet).filter(models.Projet.id == affectation.projet_id).first()
    if ancien_projet and ancien_projet.encadrant_id != current_user.encadrant_id:
        raise HTTPException(status_code=403, detail="Cette affectation ne concerne pas vos projets")
    
    projet = db.query(models.Projet).filter(models.Projet.id == nouveau_projet_id).first()
    if not projet:
        raise HTTPException(status_code=404, detail="Projet introuvable")
    if projet.encadrant_id != current_user.encadrant_id:
        raise HTTPException(status_code=403, detail="Vous ne pouvez affecter que vos propres projets")
    affectation.projet_id = nouveau_projet_id
    affectation.valide = "modifié"
    db.commit()
    return {"message": f"Affectation {affectation_id} modifiée → {projet.titre} ✅"}


# AUTHENTIFICATION


@app.post("/register", response_model=schemas.UserResponse)
def register(user: schemas.UserRegister, db: Session = Depends(get_db)):
    existant = db.query(models.Utilisateur).filter(
        models.Utilisateur.email == user.email
    ).first()
    if existant:
        raise HTTPException(status_code=400, detail="Email déjà utilisé")
    if user.role not in ["etudiant", "encadrant", "coordinateur"]:
        raise HTTPException(status_code=400, detail="Rôle invalide")

    new_user = models.Utilisateur(
        nom=user.nom,
        email=user.email,
        mot_de_passe=hash_password(user.mot_de_passe),
        role=user.role
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Si c'est un encadrant → créer automatiquement dans la table encadrants
    if user.role == "encadrant":
        parts = user.nom.strip().split(' ')
        nom = parts[0]
        prenom = parts[1] if len(parts) > 1 else parts[0]
        new_encadrant = models.Encadrant(
            nom=nom,
            prenom=prenom,
            email=user.email
        )
        db.add(new_encadrant)
        db.commit()
        db.refresh(new_encadrant)
        # Sauvegarder l'id encadrant dans utilisateur
        new_user.encadrant_id = new_encadrant.id
        db.commit()

    return new_user

@app.post("/login", response_model=schemas.AuthResponse)
def login(user: schemas.UserLogin, db: Session = Depends(get_db)):
    db_user = db.query(models.Utilisateur).filter(
        models.Utilisateur.email == user.email
    ).first()
    if not db_user or db_user.mot_de_passe != hash_password(user.mot_de_passe):
        raise HTTPException(status_code=401, detail="Email ou mot de passe incorrect")
    return {
        "user": db_user,
        "access_token": create_access_token(db_user),
        "token_type": "bearer",
    }

@app.get("/user-by-email", response_model=schemas.UserResponse)
def get_user_by_email(
    email: str,
    db: Session = Depends(get_db),
    current_user: models.Utilisateur = Depends(get_current_user),
):
    if current_user.email != email and current_user.role != "coordinateur":
        raise HTTPException(status_code=403, detail="Accès interdit")
    user = db.query(models.Utilisateur).filter(models.Utilisateur.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")
    return user
