from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session
import models, schemas
from database import engine, SessionLocal
import sys
import os
import hashlib
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'AI_engine'))
from affectation import affecter_projets

models.Base.metadata.create_all(bind=engine)
app = FastAPI()

from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
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


@app.get("/")
def read_root():
    return {"message": "Serveur opérationnel ! Allez sur /docs pour tester."}


@app.post("/groupes/", response_model=schemas.Groupe)
def create_groupe(groupe: schemas.GroupeCreate, db: Session = Depends(get_db)):
    if len(groupe.etudiants) > 3:
        raise HTTPException(status_code=400, detail="Un groupe ne peut pas dépasser 3 étudiants")
    new_groupe = models.Groupe(nom=groupe.nom)
    db.add(new_groupe)
    db.commit()
    db.refresh(new_groupe)
    for etudiant_data in groupe.etudiants:
        new_etudiant = models.Etudiant(**etudiant_data.model_dump(), groupe_id=new_groupe.id)
        db.add(new_etudiant)
    db.commit()
    db.refresh(new_groupe)
    return new_groupe

@app.get("/groupes/", response_model=list[schemas.Groupe])
def get_groupes(db: Session = Depends(get_db)):
    return db.query(models.Groupe).all()


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






@app.post("/affecter/")
def lancer_affectation(db: Session = Depends(get_db)):
    
    tous_les_choix = db.query(models.Choix).all()
    if not tous_les_choix:
        raise HTTPException(status_code=400, detail="Aucun choix enregistré")

    
    choix_list = [
        {"groupe_id": c.groupe_id, "projet_id": c.projet_id, "priorite": c.priorite}
        for c in tous_les_choix
    ]

    
    resultats = affecter_projets(choix_list)

    
    db.query(models.Affectation).delete()
    db.commit()

    
    for groupe_id, projet_id in resultats.items():
        nouvelle_affectation = models.Affectation(
            groupe_id=groupe_id,
            projet_id=projet_id,
            valide="en_attente"
        )
        db.add(nouvelle_affectation)
    db.commit()

    
    reponse = []
    for groupe_id, projet_id in resultats.items():
        groupe = db.query(models.Groupe).filter(models.Groupe.id == groupe_id).first()
        projet = db.query(models.Projet).filter(models.Projet.id == projet_id).first() if projet_id else None
        reponse.append({
            "groupe": groupe.nom if groupe else f"Groupe {groupe_id}",
            "projet_affecte": projet.titre if projet else "Aucun projet disponible",
            "statut": "en_attente"
        })

    return {"affectations": reponse}


@app.get("/affectations/", response_model=list[schemas.Affectation])
def get_affectations(db: Session = Depends(get_db)):
    return db.query(models.Affectation).all()


@app.put("/affectations/{affectation_id}/valider")
def valider_affectation(affectation_id: int, db: Session = Depends(get_db)):
    affectation = db.query(models.Affectation).filter(models.Affectation.id == affectation_id).first()
    if not affectation:
        raise HTTPException(status_code=404, detail="Affectation introuvable")
    affectation.valide = "validé"
    db.commit()
    return {"message": f"Affectation {affectation_id} validée ✅"}


@app.put("/affectations/{affectation_id}/modifier")
def modifier_affectation(affectation_id: int, nouveau_projet_id: int, db: Session = Depends(get_db)):
    affectation = db.query(models.Affectation).filter(models.Affectation.id == affectation_id).first()
    if not affectation:
        raise HTTPException(status_code=404, detail="Affectation introuvable")
    
    projet = db.query(models.Projet).filter(models.Projet.id == nouveau_projet_id).first()
    if not projet:
        raise HTTPException(status_code=404, detail="Projet introuvable")
    affectation.projet_id = nouveau_projet_id
    affectation.valide = "modifié"
    db.commit()
    return {"message": f"Affectation {affectation_id} modifiée → {projet.titre} ✅"}


# AUTHENTIFICATION


def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

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

@app.post("/login", response_model=schemas.UserResponse)
def login(user: schemas.UserLogin, db: Session = Depends(get_db)):
    db_user = db.query(models.Utilisateur).filter(
        models.Utilisateur.email == user.email
    ).first()
    if not db_user or db_user.mot_de_passe != hash_password(user.mot_de_passe):
        raise HTTPException(status_code=401, detail="Email ou mot de passe incorrect")
    return db_user

@app.get("/user-by-email", response_model=schemas.UserResponse)
def get_user_by_email(email: str, db: Session = Depends(get_db)):
    user = db.query(models.Utilisateur).filter(models.Utilisateur.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")
    return user