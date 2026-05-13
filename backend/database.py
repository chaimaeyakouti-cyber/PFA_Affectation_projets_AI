from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# L'adresse de ta base de données Docker
SQLALCHEMY_DATABASE_URL = "mysql+pymysql://chaimae:marmotte12EyEy@localhost:3307/miniproj_db"

# Création du moteur de connexion
engine = create_engine(SQLALCHEMY_DATABASE_URL)

# Création d'une session (pour envoyer des requêtes)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base pour nos futurs modèles
Base = declarative_base()