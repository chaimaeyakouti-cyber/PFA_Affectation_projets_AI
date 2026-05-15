from pydantic import BaseModel
from typing import Optional



class EtudiantCreate(BaseModel):
    nom: str
    prenom: str
    filiere: str


class Etudiant(EtudiantCreate):
    id: int
    groupe_id: Optional[int] = None

    class Config:
        from_attributes = True




class GroupeCreate(BaseModel):
    nom: str
    etudiants: list[EtudiantCreate]  # max 3, vérifié dans main.py


class Groupe(BaseModel):
    id: int
    nom: str
    etudiants: list[Etudiant] = []

    class Config:
        from_attributes = True