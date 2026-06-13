from pydantic import BaseModel, Field
from typing import Optional, List


class EtudiantCreate(BaseModel):
    nom: str
    prenom: str
    email: Optional[str] = None
    filiere: str
    stacks: Optional[str] = None
    utilisateur_id: Optional[int] = None


class Etudiant(EtudiantCreate):
    id: int
    groupe_id: Optional[int] = None

    class Config:
        from_attributes = True


class EtudiantPublic(BaseModel):
    nom: str
    prenom: str
    filiere: str
    stacks: Optional[str] = None

    class Config:
        from_attributes = True


class GroupeCreate(BaseModel):
    nom: str
    etudiants: List[EtudiantCreate]
    createur_id: Optional[int] = None
    competences_techniques: List[str] = Field(default_factory=list)
    soft_skills: List[str] = Field(default_factory=list)


class Groupe(BaseModel):
    id: int
    nom: str
    createur_id: Optional[int] = None
    chef_id: Optional[int] = None
    chef_nom: Optional[str] = None
    competences_techniques: Optional[str] = None
    soft_skills: Optional[str] = None
    etudiants: List[Etudiant] = Field(default_factory=list)

    class Config:
        from_attributes = True


class MonGroupeResponse(BaseModel):
    id: int
    nom: str
    createur_id: Optional[int] = None
    chef_id: Optional[int] = None
    chef_nom: Optional[str] = None
    competences_techniques: Optional[str] = None
    soft_skills: Optional[str] = None
    etudiants: List[EtudiantPublic] = Field(default_factory=list)

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
    domaine: Optional[str] = None
    encadrant_id: int


class Projet(ProjetCreate):
    id: int

    class Config:
        from_attributes = True


class ProjetAvecEncadrant(BaseModel):
    id: int
    titre: str
    description: str
    competences_requises: str
    domaine: Optional[str] = None
    encadrant_id: int
    encadrant_nom: Optional[str] = None
    encadrant_email: Optional[str] = None

    class Config:
        from_attributes = True


class ChoixCreate(BaseModel):
    groupe_id: int
    projet_id: int
    priorite: int


class ChoixUpdate(BaseModel):
    projet_id: int
    priorite: int


class Choix(ChoixCreate):
    id: int
    locked: Optional[int] = 0

    class Config:
        from_attributes = True


class Affectation(BaseModel):
    id: int
    groupe_id: int
    projet_id: Optional[int] = None
    valide: str

    class Config:
        from_attributes = True


class MonAffectationResponse(BaseModel):
    affectation_id: int
    groupe_nom: str
    projet_titre: Optional[str] = None
    projet_description: Optional[str] = None
    encadrant_nom: Optional[str] = None
    encadrant_email: Optional[str] = None
    valide: str
    rang_obtenu: Optional[int] = None

    class Config:
        from_attributes = True


class MoteurConfig(BaseModel):
    poids_priorite: float = 0.70
    poids_adequation: float = 0.20
    poids_charge: float = 0.10
    interdire_double: bool = True
    respecter_capacite_max: bool = True
    ordre_soumission: bool = True


class UserRegister(BaseModel):
    nom: str
    email: str
    mot_de_passe: str
    role: str


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
