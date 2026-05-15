from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session
import models, schemas
from database import engine, SessionLocal

# Création des tables
models.Base.metadata.create_all(bind=engine)

app = FastAPI()

# Dépendance pour ouvrir/fermer la connexion à la base à chaque requête
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
    # Vérification : max 3 étudiants
    if len(groupe.etudiants) > 3:
        raise HTTPException(status_code=400, detail="Un groupe ne peut pas dépasser 3 étudiants")
    
    
    new_groupe = models.Groupe(nom=groupe.nom)
    db.add(new_groupe)
    db.commit()
    db.refresh(new_groupe)
    
    
    for etudiant_data in groupe.etudiants:
        new_etudiant = models.Etudiant(
            **etudiant_data.model_dump(),
            groupe_id=new_groupe.id
        )
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