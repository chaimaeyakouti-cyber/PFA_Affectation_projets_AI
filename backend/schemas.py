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
    etudiants: list[EtudiantCreate]

class Groupe(BaseModel):
    id: int
    nom: str
    etudiants: list[Etudiant] = []
    class Config:
        from_attributes = True


class EncadrantCreate(BaseModel):
    nom: str
    prenom: str
    email: str

class Encadrant(EncadrantCreate):
    id: int
    class Config:
        from_attributes = True


class ProjetCreate(BaseModel):
    titre: str
    description: str
    competences_requises: str
    encadrant_id: int

class Projet(ProjetCreate):
    id: int
    class Config:
        from_attributes = True


class ChoixCreate(BaseModel):
    groupe_id: int
    projet_id: int
    priorite: int  # 1, 2 ou 3

class Choix(ChoixCreate):
    id: int
    class Config:
        from_attributes = True



class Affectation(BaseModel):
    id: int
    groupe_id: int
    projet_id: Optional[int] = None
    valide: str

    class Config:
        from_attributes = True