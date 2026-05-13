from sqlalchemy import Column, Integer, String, ForeignKey, Text
from sqlalchemy.orm import relationship
from database import Base

class Groupe(Base):
    __tablename__ = "groupes"
    id = Column(Integer, primary_key=True, index=True)
    nom = Column(String(50), unique=True)
    # Un groupe contient plusieurs étudiants (Agrégation)
    etudiants = relationship("Etudiant", back_populates="groupe")

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
    # Un encadrant peut proposer plusieurs projets
    projets = relationship("Projet", back_populates="encadrant")

class Projet(Base):
    __tablename__ = "projets"
    id = Column(Integer, primary_key=True, index=True)
    titre = Column(String(100))
    description = Column(Text)
    encadrant_id = Column(Integer, ForeignKey("encadrants.id"))
    encadrant = relationship("Encadrant", back_populates="projets")
    
