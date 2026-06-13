from pydantic import BaseModel
from typing import Optional, List


# ── ETUDIANTS ────────────────────────────────────────────────────────────────

class EtudiantCreate(BaseModel):
    nom:    str
    prenom: str
    filiere: str
    stacks: Optional[str] = None   # ex: "Python, React, Docker"

class Etudiant(EtudiantCreate):
    id:       int
    groupe_id: Optional[int] = None
    class Config:
        from_attributes = True

class EtudiantPublic(BaseModel):
    nom:    str
    prenom: str
    filiere: str
    stacks: Optional[str] = None
    class Config:
        from_attributes = True


# ── GROUPES ──────────────────────────────────────────────────────────────────

class GroupeCreate(BaseModel):
    nom:       str
    etudiants: List[EtudiantCreate]

class Groupe(BaseModel):
    id:       int
    nom:      str
    chef_id:  Optional[int] = None
    etudiants: List[Etudiant] = []
    class Config:
        from_attributes = True

class MonGroupeResponse(BaseModel):
    id:       int
    nom:      str
    chef_id:  Optional[int] = None
    etudiants: List[EtudiantPublic] = []
    class Config:
        from_attributes = True


# ── ENCADRANTS ───────────────────────────────────────────────────────────────

class EncadrantCreate(BaseModel):
    nom:    str
    prenom: str
    email:  str

class Encadrant(EncadrantCreate):
    id: int
    class Config:
        from_attributes = True


# ── PROJETS ──────────────────────────────────────────────────────────────────

class ProjetCreate(BaseModel):
    titre:               str
    description:         str
    competences_requises: str
    domaine: Optional[str] = None 
    encadrant_id:        int

class Projet(ProjetCreate):
    id: int
    class Config:
        from_attributes = True

class ProjetAvecEncadrant(BaseModel):
    id:                  int
    titre:               str
    description:         str
    competences_requises: str
    encadrant_id:        int
    encadrant_nom:       Optional[str] = None
    encadrant_email:     Optional[str] = None
    class Config:
        from_attributes = True


# ── CHOIX ────────────────────────────────────────────────────────────────────

class ChoixCreate(BaseModel):
    groupe_id: int
    projet_id: int
    priorite:  int

class ChoixUpdate(BaseModel):
    projet_id: int
    priorite:  int

class Choix(ChoixCreate):
    id:     int
    locked: Optional[int] = 0
    class Config:
        from_attributes = True


# ── AFFECTATIONS ─────────────────────────────────────────────────────────────

class Affectation(BaseModel):
    id:        int
    groupe_id: int
    projet_id: Optional[int] = None
    valide:    str
    class Config:
        from_attributes = True

class MonAffectationResponse(BaseModel):
    affectation_id:     int
    groupe_nom:         str
    projet_titre:       Optional[str] = None
    projet_description: Optional[str] = None
    encadrant_nom:      Optional[str] = None
    encadrant_email:    Optional[str] = None
    valide:             str
    rang_obtenu:        Optional[int] = None
    class Config:
        from_attributes = True


# ── CONFIG MOTEUR ─────────────────────────────────────────────────────────────

class MoteurConfig(BaseModel):
    poids_priorite:         float = 0.70   # alpha
    poids_adequation:       float = 0.20   # beta
    poids_charge:           float = 0.10   # gamma
    interdire_double:       bool  = True
    respecter_capacite_max: bool  = True
    ordre_soumission:       bool  = True


# ── AUTH ─────────────────────────────────────────────────────────────────────

class UserRegister(BaseModel):
    nom:          str
    email:        str
    mot_de_passe: str
    role:         str

class UserLogin(BaseModel):
    email:        str
    mot_de_passe: str

class UserResponse(BaseModel):
    id:           int
    nom:          str
    email:        str
    role:         str
    encadrant_id: Optional[int] = None
    groupe_id:    Optional[int] = None
    class Config:
        from_attributes = True