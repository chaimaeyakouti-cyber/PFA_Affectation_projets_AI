from fastapi import FastAPI
import models
from database import engine, Base

# Cette ligne crée les tables dans MySQL si elles n'existent pas
Base.metadata.create_all(bind=engine)

app = FastAPI()

@app.get("/")
def read_root():
    return {"message": "Serveur connecté à MySQL via Docker !"}