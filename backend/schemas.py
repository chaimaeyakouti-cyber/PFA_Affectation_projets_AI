from pydantic import BaseModel
from typing import Optional


class EtudiantCreate(BaseModel):
    nom: str
    prenom: str
    email: Optional[str] = None
    filiere: str
    utilisateur_id: Optional[int] = None

class Etudiant(EtudiantCreate):
    id: int
    groupe_id: Optional[int] = None
    class Config:
        from_attributes = True


class GroupeCreate(BaseModel):
    nom: str
    etudiants: list[EtudiantCreate]
    createur_id: Optional[int] = None

class Groupe(BaseModel):
    id: int
    nom: str
    createur_id: Optional[int] = None
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



class UserRegister(BaseModel):
    nom: str
    email: str
    mot_de_passe: str
    role: str  # etudiant, encadrant, coordinateur

class UserLogin(BaseModel):
    email: str
    mot_de_passe: str

class UserResponse(BaseModel):
    id: int
    nom: str
    email: str
    role: str
    encadrant_id: Optional[int] = None
    groupe_id: Optional[int] = None
    class Config:
        from_attributes = True

class AuthResponse(BaseModel):
    user: UserResponse
    access_token: str
    token_type: str = "bearer"
