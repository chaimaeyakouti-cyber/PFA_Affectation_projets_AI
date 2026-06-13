from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional
import models, schemas
from database import engine, SessionLocal
import sys, os, hashlib, json
from datetime import datetime
import csv
import io
from fastapi.responses import StreamingResponse

sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'AI_engine'))
from affectation import affecter_projets_avec_rapport

models.Base.metadata.create_all(bind=engine)
app = FastAPI(title="PFA Affectation API", version="2.0")

from fastapi.middleware.cors import CORSMiddleware
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

def _find_groupe_for_user(user: models.Utilisateur, db: Session) -> Optional[models.Groupe]:
    """Trouve le groupe d'un utilisateur via 4 stratégies."""
    # 1. groupe_id direct
    if user.groupe_id:
        g = db.query(models.Groupe).filter(models.Groupe.id == user.groupe_id).first()
        if g: return g
    # 2. utilisateur_id dans etudiants
    e = db.query(models.Etudiant).filter(models.Etudiant.utilisateur_id == user.id).first()
    if e and e.groupe_id:
        g = db.query(models.Groupe).filter(models.Groupe.id == e.groupe_id).first()
        if g: return g
    # 3. chef_id ou createur_id
    g = db.query(models.Groupe).filter(
        (models.Groupe.chef_id == user.id) | (models.Groupe.createur_id == user.id)
    ).first()
    if g: return g
    # 4. fallback nom
    if user.nom:
        prenom = user.nom.strip().split()[0]
        e = db.query(models.Etudiant).filter(
            models.Etudiant.nom.ilike(f"%{prenom}%")
        ).first()
        if e and e.groupe_id:
            return db.query(models.Groupe).filter(models.Groupe.id == e.groupe_id).first()
    return None


# ═══════════════════════════════════════════════════════════
# RACINE
# ═══════════════════════════════════════════════════════════

@app.get("/")
def read_root():
    return {"message": "PFA Affectation API v2.0 — /docs pour tester"}


# ═══════════════════════════════════════════════════════════
# GROUPES
# ═══════════════════════════════════════════════════════════

@app.post("/groupes/", response_model=schemas.Groupe)
def create_groupe(groupe: schemas.GroupeCreate, db: Session = Depends(get_db)):
    if len(groupe.etudiants) > 3:
        raise HTTPException(400, "Un groupe ne peut pas dépasser 3 étudiants")
    if len(groupe.etudiants) < 1:
        raise HTTPException(400, "Un groupe doit avoir au moins 1 étudiant")

    new_groupe = models.Groupe(nom=groupe.nom)
    db.add(new_groupe)
    db.commit()
    db.refresh(new_groupe)

    for etudiant_data in groupe.etudiants:
        new_etudiant = models.Etudiant(
            nom=etudiant_data.nom,
            prenom=etudiant_data.prenom,
            filiere=etudiant_data.filiere,
            stacks=etudiant_data.stacks,
            groupe_id=new_groupe.id
        )
        db.add(new_etudiant)
    db.commit()
    db.refresh(new_groupe)
    return new_groupe

@app.get("/groupes/", response_model=list[schemas.Groupe])
def get_groupes(db: Session = Depends(get_db)):
    return db.query(models.Groupe).all()

@app.delete("/groupes/{groupe_id}")
def delete_groupe(groupe_id: int, user_id: int, db: Session = Depends(get_db)):
    """
    Supprime un groupe.
    - Le chef du groupe peut supprimer son propre groupe
    - Le coordinateur peut supprimer n'importe quel groupe
    """
    groupe = db.query(models.Groupe).filter(models.Groupe.id == groupe_id).first()
    if not groupe:
        raise HTTPException(404, "Groupe introuvable")

    user = db.query(models.Utilisateur).filter(models.Utilisateur.id == user_id).first()
    if not user:
        raise HTTPException(404, "Utilisateur introuvable")

    # Vérifier les droits
    is_chef = (groupe.chef_id == user_id or groupe.createur_id == user_id)
    is_coordinateur = (user.role == "coordinateur")

    if not is_chef and not is_coordinateur:
        raise HTTPException(403, "Seul le chef du groupe ou le coordinateur peut supprimer ce groupe")

    # Supprimer les données liées
    db.query(models.Choix).filter(models.Choix.groupe_id == groupe_id).delete()
    db.query(models.Affectation).filter(models.Affectation.groupe_id == groupe_id).delete()
    db.query(models.Etudiant).filter(models.Etudiant.groupe_id == groupe_id).delete()

    # Mettre à null groupe_id des utilisateurs liés
    db.query(models.Utilisateur).filter(
        models.Utilisateur.groupe_id == groupe_id
    ).update({"groupe_id": None})

    db.delete(groupe)
    db.commit()
    return {"message": f"Groupe '{groupe.nom}' supprimé avec succès"}


# ═══════════════════════════════════════════════════════════
# ETUDIANTS
# ═══════════════════════════════════════════════════════════

@app.get("/etudiants/", response_model=list[schemas.Etudiant])
def get_etudiants(db: Session = Depends(get_db)):
    return db.query(models.Etudiant).all()


# ═══════════════════════════════════════════════════════════
# ENCADRANTS
# ═══════════════════════════════════════════════════════════

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


# ═══════════════════════════════════════════════════════════
# PROJETS
# ═══════════════════════════════════════════════════════════

@app.post("/projets/", response_model=schemas.Projet)
def create_projet(projet: schemas.ProjetCreate, db: Session = Depends(get_db)):
    encadrant = db.query(models.Encadrant).filter(
        models.Encadrant.id == projet.encadrant_id
    ).first()
    if not encadrant:
        raise HTTPException(404, "Encadrant introuvable")
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
    """Retourne les projets avec les infos de contact de l'encadrant."""
    projets = db.query(models.Projet).all()
    result = []
    for p in projets:
        enc = db.query(models.Encadrant).filter(
            models.Encadrant.id == p.encadrant_id
        ).first()
        result.append({
            "id":                   p.id,
            "titre":                p.titre,
            "description":          p.description,
            "competences_requises": p.competences_requises,
            "encadrant_id":         p.encadrant_id,
            "encadrant_nom":        f"{enc.prenom} {enc.nom}" if enc else None,
            "encadrant_email":      enc.email if enc else None,
        })
    return result


# ═══════════════════════════════════════════════════════════
# CHOIX — avec modification et verrouillage
# ═══════════════════════════════════════════════════════════

@app.post("/choix/", response_model=schemas.Choix)
def create_choix(choix: schemas.ChoixCreate, db: Session = Depends(get_db)):
    if choix.priorite not in [1, 2, 3]:
        raise HTTPException(400, "La priorité doit être 1, 2 ou 3")

    # Vérifier que les choix ne sont pas verrouillés
    existing_locked = db.query(models.Choix).filter(
        models.Choix.groupe_id == choix.groupe_id,
        models.Choix.locked == 1
    ).first()
    if existing_locked:
        raise HTTPException(400, "Les choix sont verrouillés après le lancement de l'affectation")

    existant = db.query(models.Choix).filter(
        models.Choix.groupe_id == choix.groupe_id,
        models.Choix.projet_id == choix.projet_id
    ).first()
    if existant:
        raise HTTPException(400, "Ce groupe a déjà choisi ce projet")

    nb_choix = db.query(models.Choix).filter(
        models.Choix.groupe_id == choix.groupe_id
    ).count()
    if nb_choix >= 3:
        raise HTTPException(400, "Ce groupe a déjà fait ses 3 choix")

    new_choix = models.Choix(**choix.model_dump())
    db.add(new_choix)
    db.commit()
    db.refresh(new_choix)
    return new_choix

@app.get("/choix/", response_model=list[schemas.Choix])
def get_choix(db: Session = Depends(get_db)):
    return db.query(models.Choix).all()

@app.put("/choix/{choix_id}")
def modifier_choix(choix_id: int, data: schemas.ChoixUpdate, db: Session = Depends(get_db)):
    """Modifie un choix existant tant que l'affectation n'est pas lancée."""
    choix = db.query(models.Choix).filter(models.Choix.id == choix_id).first()
    if not choix:
        raise HTTPException(404, "Choix introuvable")
    if choix.locked:
        raise HTTPException(400, "Ce choix est verrouillé — l'affectation a déjà été lancée")

    # Vérifier que le nouveau projet n'est pas déjà choisi par ce groupe
    conflit = db.query(models.Choix).filter(
        models.Choix.groupe_id == choix.groupe_id,
        models.Choix.projet_id == data.projet_id,
        models.Choix.id != choix_id
    ).first()
    if conflit:
        raise HTTPException(400, "Ce projet est déjà dans vos choix")

    choix.projet_id = data.projet_id
    choix.priorite  = data.priorite
    db.commit()
    return {"message": "Choix modifié avec succès", "choix_id": choix_id}

@app.delete("/choix/groupe/{groupe_id}")
def reset_choix(groupe_id: int, db: Session = Depends(get_db)):
    """Supprime tous les choix d'un groupe (pour recommencer)."""
    locked = db.query(models.Choix).filter(
        models.Choix.groupe_id == groupe_id,
        models.Choix.locked == 1
    ).first()
    if locked:
        raise HTTPException(400, "Les choix sont verrouillés")

    db.query(models.Choix).filter(models.Choix.groupe_id == groupe_id).delete()
    db.commit()
    return {"message": "Choix réinitialisés"}


# ═══════════════════════════════════════════════════════════
# AFFECTATION — MOTEUR IA avec config dynamique
# ═══════════════════════════════════════════════════════════

@app.post("/affecter/")
def lancer_affectation(
    config: Optional[schemas.MoteurConfig] = None,
    db: Session = Depends(get_db)
):
    """
    Lance le moteur IA d'affectation.
    Accepte une config optionnelle pour les poids α, β, γ et les contraintes.
    """
    tous_les_choix = db.query(models.Choix).all()
    if not tous_les_choix:
        raise HTTPException(400, "Aucun choix enregistré")

    # Config par défaut si non fournie
    if config is None:
        config = schemas.MoteurConfig()

    # Valider que les poids somment à ~1.0
    total_poids = config.poids_priorite + config.poids_adequation + config.poids_charge
    if not (0.99 <= total_poids <= 1.01):
        raise HTTPException(400, f"La somme des poids doit être 1.0 (actuellement {total_poids:.2f})")

    choix_list = [
        {"groupe_id": c.groupe_id, "projet_id": c.projet_id, "priorite": c.priorite}
        for c in tous_les_choix
    ]

    projets_info = [
        {
            "id":                   p.id,
            "competences_requises": p.competences_requises,
            "encadrant_id":         p.encadrant_id,
        }
        for p in db.query(models.Projet).all()
    ]

    # Enrichissement stacks réels des étudiants
    groupes_db   = db.query(models.Groupe).all()
    groupes_info = []
    for g in groupes_db:
        etudiants_stacks = []
        for e in g.etudiants:
            etudiants_stacks.append({
                "filiere": e.filiere,
                "stacks":  e.stacks or "",
            })
        groupes_info.append({"id": g.id, "etudiants": etudiants_stacks})

    # Passer les poids au moteur
    resultats, rapport = affecter_projets_avec_rapport(
        choix_list   = choix_list,
        projets_info = projets_info,
        groupes_info = groupes_info,
        poids_override = {
            "priorite":  config.poids_priorite,
            "adequation": config.poids_adequation,
            "charge":    config.poids_charge,
        }
    )

    # Sauvegarder les affectations
    db.query(models.Affectation).delete()
    db.commit()

    for groupe_id, projet_id in resultats.items():
        db.add(models.Affectation(
            groupe_id=groupe_id,
            projet_id=projet_id,
            valide="en_attente",
        ))

    # Verrouiller les choix
    db.query(models.Choix).update({"locked": 1})
    db.commit()

    reponse = []
    for groupe_id, projet_id in resultats.items():
        groupe = db.query(models.Groupe).filter(models.Groupe.id == groupe_id).first()
        projet = db.query(models.Projet).filter(models.Projet.id == projet_id).first() if projet_id else None
        enc    = None
        if projet:
            enc = db.query(models.Encadrant).filter(
                models.Encadrant.id == projet.encadrant_id
            ).first()
        rang = next(
            (c.priorite for c in tous_les_choix
             if c.groupe_id == groupe_id and c.projet_id == projet_id),
            None
        )
        reponse.append({
            "groupe":            groupe.nom if groupe else f"Groupe {groupe_id}",
            "projet_affecte":    projet.titre if projet else "Aucun projet disponible",
            "projet_description": projet.description if projet else None,
            "encadrant_nom":     f"{enc.prenom} {enc.nom}" if enc else None,
            "encadrant_email":   enc.email if enc else None,
            "statut":            "en_attente",
            "rang_obtenu":       rang,
        })

    return {
        "affectations": reponse,
        "rapport":      rapport,
        "config_utilisee": {
            "alpha": config.poids_priorite,
            "beta":  config.poids_adequation,
            "gamma": config.poids_charge,
        }
    }

@app.get("/affectations/", response_model=list[schemas.Affectation])
def get_affectations(db: Session = Depends(get_db)):
    return db.query(models.Affectation).all()

@app.put("/affectations/{affectation_id}/valider")
def valider_affectation(affectation_id: int, db: Session = Depends(get_db)):
    aff = db.query(models.Affectation).filter(models.Affectation.id == affectation_id).first()
    if not aff:
        raise HTTPException(404, "Affectation introuvable")
    aff.valide = "validé"
    db.commit()
    return {"message": f"Affectation {affectation_id} validée ✅"}

@app.put("/affectations/{affectation_id}/modifier")
def modifier_affectation(affectation_id: int, nouveau_projet_id: int, db: Session = Depends(get_db)):
    aff = db.query(models.Affectation).filter(models.Affectation.id == affectation_id).first()
    if not aff:
        raise HTTPException(404, "Affectation introuvable")
    projet = db.query(models.Projet).filter(models.Projet.id == nouveau_projet_id).first()
    if not projet:
        raise HTTPException(404, "Projet introuvable")
    aff.projet_id = nouveau_projet_id
    aff.valide    = "modifié"
    db.commit()
    return {"message": f"Affectation {affectation_id} modifiée → {projet.titre} ✅"}


# ═══════════════════════════════════════════════════════════
# ENDPOINTS PERSONNALISÉS — ÉTUDIANT
# ═══════════════════════════════════════════════════════════

@app.get("/mon-groupe/{user_id}")
def get_mon_groupe(user_id: int, db: Session = Depends(get_db)):
    user = db.query(models.Utilisateur).filter(models.Utilisateur.id == user_id).first()
    if not user:
        raise HTTPException(404, "Utilisateur introuvable")

    groupe = _find_groupe_for_user(user, db)
    if not groupe:
        raise HTTPException(404, "Aucun groupe trouvé pour cet utilisateur")

    etudiants = db.query(models.Etudiant).filter(
        models.Etudiant.groupe_id == groupe.id
    ).all()

    return {
        "id":      groupe.id,
        "nom":     groupe.nom,
        "chef_id": groupe.chef_id,
        "etudiants": [
            {
                "nom":    e.nom,
                "prenom": e.prenom,
                "filiere": e.filiere,
                "stacks": e.stacks,
            }
            for e in etudiants
        ],
    }


@app.get("/mon-affectation/{user_id}")
def get_mon_affectation(user_id: int, db: Session = Depends(get_db)):
    user = db.query(models.Utilisateur).filter(models.Utilisateur.id == user_id).first()
    if not user:
        raise HTTPException(404, "Utilisateur introuvable")

    groupe = _find_groupe_for_user(user, db)
    if not groupe:
        raise HTTPException(404, "Aucun groupe trouvé")

    aff = db.query(models.Affectation).filter(
        models.Affectation.groupe_id == groupe.id
    ).first()
    if not aff:
        raise HTTPException(404, "Aucune affectation pour ce groupe")

    projet = None
    enc    = None
    if aff.projet_id:
        projet = db.query(models.Projet).filter(models.Projet.id == aff.projet_id).first()
        if projet:
            enc = db.query(models.Encadrant).filter(
                models.Encadrant.id == projet.encadrant_id
            ).first()

    rang_obtenu = None
    if aff.projet_id:
        cm = db.query(models.Choix).filter(
            models.Choix.groupe_id == groupe.id,
            models.Choix.projet_id == aff.projet_id
        ).first()
        if cm:
            rang_obtenu = cm.priorite

    return {
        "affectation_id":     aff.id,
        "groupe_nom":         groupe.nom,
        "projet_titre":       projet.titre       if projet else None,
        "projet_description": projet.description if projet else None,
        "encadrant_nom":      f"{enc.prenom} {enc.nom}" if enc else None,
        "encadrant_email":    enc.email           if enc else None,
        "valide":             aff.valide,
        "rang_obtenu":        rang_obtenu,
    }


@app.put("/users/{user_id}/lier-groupe/{groupe_id}")
def lier_groupe(user_id: int, groupe_id: int, db: Session = Depends(get_db)):
    user = db.query(models.Utilisateur).filter(models.Utilisateur.id == user_id).first()
    if not user:
        raise HTTPException(404, "Utilisateur introuvable")
    groupe = db.query(models.Groupe).filter(models.Groupe.id == groupe_id).first()
    if not groupe:
        raise HTTPException(404, "Groupe introuvable")

    user.groupe_id = groupe_id
    if not groupe.createur_id:
        groupe.createur_id = user_id
    if not groupe.chef_id:
        groupe.chef_id = user_id

    # Lier aussi l'étudiant correspondant
    prenom = user.nom.strip().split()[0] if user.nom else ""
    e = db.query(models.Etudiant).filter(
        models.Etudiant.groupe_id == groupe_id,
        models.Etudiant.nom.ilike(f"%{prenom}%")
    ).first()
    if e and not e.utilisateur_id:
        e.utilisateur_id = user_id

    db.commit()
    return {
        "message":    f"Utilisateur #{user_id} lié au groupe '{groupe.nom}' comme chef",
        "user_id":    user_id,
        "groupe_id":  groupe_id,
        "chef":       True,
    }


# ═══════════════════════════════════════════════════════════
# EXPORT DONNÉES
# ═══════════════════════════════════════════════════════════

@app.get("/export/json")
def export_json(db: Session = Depends(get_db)):
    """Exporte toutes les données de la plateforme en JSON."""
    groupes      = db.query(models.Groupe).all()
    projets      = db.query(models.Projet).all()
    affectations = db.query(models.Affectation).all()
    choix        = db.query(models.Choix).all()

    data = {
        "export_date": datetime.now().isoformat(),
        "groupes": [
            {
                "id":  g.id, "nom": g.nom,
                "etudiants": [
                    {"nom": e.nom, "prenom": e.prenom,
                     "filiere": e.filiere, "stacks": e.stacks}
                    for e in g.etudiants
                ]
            }
            for g in groupes
        ],
        "projets": [
            {
                "id": p.id, "titre": p.titre,
                "description": p.description,
                "competences_requises": p.competences_requises,
            }
            for p in projets
        ],
        "choix": [
            {"groupe_id": c.groupe_id, "projet_id": c.projet_id, "priorite": c.priorite}
            for c in choix
        ],
        "affectations": [
            {"groupe_id": a.groupe_id, "projet_id": a.projet_id, "valide": a.valide}
            for a in affectations
        ],
    }
    return data


# ═══════════════════════════════════════════════════════════
# AUTHENTIFICATION
# ═══════════════════════════════════════════════════════════

@app.post("/register", response_model=schemas.UserResponse)
def register(user: schemas.UserRegister, db: Session = Depends(get_db)):
    existant = db.query(models.Utilisateur).filter(
        models.Utilisateur.email == user.email
    ).first()
    if existant:
        raise HTTPException(400, "Email déjà utilisé")
    if user.role not in ["etudiant", "encadrant", "coordinateur"]:
        raise HTTPException(400, "Rôle invalide")

    new_user = models.Utilisateur(
        nom=user.nom, email=user.email,
        mot_de_passe=hash_password(user.mot_de_passe),
        role=user.role
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    if user.role == "encadrant":
        parts  = user.nom.strip().split(' ')
        new_enc = models.Encadrant(
            nom=parts[0],
            prenom=parts[1] if len(parts) > 1 else parts[0],
            email=user.email
        )
        db.add(new_enc)
        db.commit()
        db.refresh(new_enc)
        new_user.encadrant_id = new_enc.id
        db.commit()

    return new_user

@app.post("/login", response_model=schemas.UserResponse)
def login(user: schemas.UserLogin, db: Session = Depends(get_db)):
    db_user = db.query(models.Utilisateur).filter(
        models.Utilisateur.email == user.email
    ).first()
    if not db_user or db_user.mot_de_passe != hash_password(user.mot_de_passe):
        raise HTTPException(401, "Email ou mot de passe incorrect")
    return db_user

@app.get("/user-by-email", response_model=schemas.UserResponse)
def get_user_by_email(email: str, db: Session = Depends(get_db)):
    user = db.query(models.Utilisateur).filter(
        models.Utilisateur.email == email
    ).first()
    if not user:
        raise HTTPException(404, "Utilisateur introuvable")
    return user

@app.get("/admin/export")
def export_resultats(
    format: str = "json",   # "json" ou "csv"
    db: Session = Depends(get_db),
):
    affectations = db.query(models.Affectation).all()
    rows = []
    for a in affectations:
        groupe = db.query(models.Groupe).filter(models.Groupe.id == a.groupe_id).first()
        projet = db.query(models.Projet).filter(models.Projet.id == a.projet_id).first() if a.projet_id else None
        enc = db.query(models.Encadrant).filter(models.Encadrant.id == projet.encadrant_id).first() if projet else None
        rows.append({
            "groupe_id": a.groupe_id,
            "groupe_nom": groupe.nom if groupe else None,
            "projet_id": a.projet_id,
            "projet_titre": projet.titre if projet else None,
            "encadrant": f"{enc.prenom} {enc.nom}" if enc else None,
            "encadrant_email": enc.email if enc else None,
            "statut": a.valide,
        })

    if format == "csv":
        buffer = io.StringIO()
        writer = csv.DictWriter(buffer, fieldnames=rows[0].keys() if rows else [])
        writer.writeheader()
        writer.writerows(rows)
        buffer.seek(0)
        return StreamingResponse(
            iter([buffer.getvalue()]),
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=affectations.csv"},
        )

    # JSON par défaut
    return rows