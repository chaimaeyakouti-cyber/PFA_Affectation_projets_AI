from sqlalchemy import Column, Integer, String, ForeignKey, Text
from sqlalchemy.orm import relationship
from database import Base

class Groupe(Base):
    __tablename__ = "groupes"
    id = Column(Integer, primary_key=True, index=True)
    nom = Column(String(50), unique=True)
    etudiants = relationship("Etudiant", back_populates="groupe")
    choix = relationship("Choix", back_populates="groupe")

class Etudiant(Base):
    __tablename__ = "etudiants"
    id = Column(Integer, primary_key=True, index=True)
    nom = Column(String(50))
    prenom = Column(String(50))
    filiere = Column(String(50))
    groupe_id = Column(Integer, ForeignKey("groupes.id"))
    groupe = relationship("Groupe", back_populates="etudiants")

class Encadrant(Base):
    __tablename__ = "encadrants"
    id = Column(Integer, primary_key=True, index=True)
    nom = Column(String(50))
    prenom = Column(String(50))
    email = Column(String(100), unique=True)
    projets = relationship("Projet", back_populates="encadrant")

class Projet(Base):
    __tablename__ = "projets"
    id = Column(Integer, primary_key=True, index=True)
    titre = Column(String(100))
    description = Column(Text)
    competences_requises = Column(String(200))
    encadrant_id = Column(Integer, ForeignKey("encadrants.id"))
    encadrant = relationship("Encadrant", back_populates="projets")
    choix = relationship("Choix", back_populates="projet")

class Choix(Base):
    __tablename__ = "choix"
    id = Column(Integer, primary_key=True, index=True)
    groupe_id = Column(Integer, ForeignKey("groupes.id"))
    projet_id = Column(Integer, ForeignKey("projets.id"))
    priorite = Column(Integer)  # 1, 2 ou 3
    groupe = relationship("Groupe", back_populates="choix")
    projet = relationship("Projet", back_populates="choix")

class Affectation(Base):
    __tablename__ = "affectations"
    id = Column(Integer, primary_key=True, index=True)
    groupe_id = Column(Integer, ForeignKey("groupes.id"))
    projet_id = Column(Integer, ForeignKey("projets.id"))
    valide = Column(String(20), default="en_attente")  # en_attente, validé, modifié
    groupe = relationship("Groupe")
    projet = relationship("Projet")

class Utilisateur(Base):
    __tablename__ = "utilisateurs"
    id = Column(Integer, primary_key=True, index=True)
    nom = Column(String(100))
    email = Column(String(100), unique=True)
    mot_de_passe = Column(String(255))
    role = Column(String(20))  