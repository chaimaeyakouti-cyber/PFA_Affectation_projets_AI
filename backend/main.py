from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session
import models, schemas
from database import engine, SessionLocal

models.Base.metadata.create_all(bind=engine)
app = FastAPI()

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
    # Vérifier que l'encadrant existe
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
    # Vérifier que la priorité est entre 1 et 3
    if choix.priorite not in [1, 2, 3]:
        raise HTTPException(status_code=400, detail="La priorité doit être 1, 2 ou 3")
    # Vérifier que le groupe n'a pas déjà choisi ce projet
    existant = db.query(models.Choix).filter(
        models.Choix.groupe_id == choix.groupe_id,
        models.Choix.projet_id == choix.projet_id
    ).first()
    if existant:
        raise HTTPException(status_code=400, detail="Ce groupe a déjà choisi ce projet")
    # Vérifier que le groupe n'a pas déjà 3 choix
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