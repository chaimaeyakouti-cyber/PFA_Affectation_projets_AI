# PFA_Affectation_projets_AI

> **Application d'affectation intelligente de mini-projets et Projets de Fin d'Année (PFA)**  
> Développée dans le cadre du cursus d'ingénieur à l'**Institut National des Postes et Télécommunications (INPT)**.

---

# À propos du projet

La gestion et l'affectation manuelle des Projets de Fin d'Année (PFA) représentent une charge administrative lourde et souffrent souvent des limites de la règle du *"premier arrivé, premier servi"*. 

**MiniProj-AI** résout cette problématique en proposant une plateforme web moderne et centralisée. Elle intègre un **moteur d'arbitrage scientifique** basé sur une adaptation de l'algorithme de **Gale-Shapley (matching stable)**, optimisé par une fonction de score multicritère pour garantir une distribution transparente, équitable et méritocratique des sujets de projets.

# Objectifs clés
* **Équité absolue** : Suppression du facteur "vitesse de connexion" ou du hasard.
* **Adéquation des profils** : Optimisation du matching selon les compétences réelles des étudiants et les exigences techniques des sujets.
* **Équilibre des charges** : Répartition juste des projets parmi le corps enseignant.



# Architecture Technique

Le projet adopte une architecture découplée, moderne et entièrement conteneurisée :

* **Frontend** : Développé avec **React.js** pour une interface utilisateur (UI) dynamique, fluide et responsive.
* **Backend** : Conçu avec **FastAPI**, offrant des performances élevées, une validation automatique des données et une documentation de l'API native (Swagger/OpenAPI).
* **Moteur IA (`AI_engine`)** : Module Python isolé dédié au calcul des scores multicritères et à l'exécution de la logique d'appariement stable.
* **Base de données** : Stockage relationnel pour garantir l'intégrité des données (utilisateurs, groupes, vœux, projets).
* **Conteneurisation** : Industrialisation globale de l'infrastructure via **Docker** pour un déploiement reproductible.

---

# Le Cœur Algorithmique : Matching Multicritère

Pour chaque couple (Groupe, Projet), le moteur d'affectation calcule un score global selon la formule suivante :

$$score\_total = (\alpha \times score\_priorit\acute{e}) + (\beta \times score\_ad\acute{e}quation) + (\gamma \times score\_charge)$$

1. **Score Priorité** : Valorise le choix exprimé par le groupe ($1.00$ pour le vœu 1, $0.67$ pour le vœu 2, $0.33$ pour le vœu 3).
2. **Score Adéquation** : Évalue la similarité entre les compétences techniques/filières du groupe (ex: ASEDS) et les exigences technologiques du sujet.
3. **Score Charge** : Pénalise les encadrants ayant déjà atteint leur capacité maximale pour équilibrer la distribution.

L'algorithme procède par **engagements provisoires itératifs** : en cas de conflit sur un projet saturé, les scores sont comparés, le meilleur score retient le projet, et le groupe évincé est remis en file d'attente pour postuler à son vœu suivant.



# Rôles et Fonctionnalités

La plateforme segmente les cas d'utilisation selon trois espaces utilisateurs sécurisés (authentification **JWT**) :

* **Espace Étudiant** : 
  * Constitution de binômes/groupes.
  * Saisie des compétences et soft skills de l'équipe.
  * Saisie et classement ordonné des vœux de projets.
  * Consultation des résultats finaux et export du livrable en **PDF**.
* **Espace Enseignant / Encadrant** :
  * Dépôt, édition et gestion des sujets de PFA.
  * Suivi en temps réel de sa charge d'encadrement.
  * Validation ou réaffectation des propositions calculées.
* **Espace Coordinateur (Administrateur)** :
  * Modération et validation du catalogue général des projets.
  * Configuration des poids ($\alpha, \beta, \gamma$) du moteur d'IA.
  * Lancement de l'algorithme d'affectation et édition du rapport global d'équité.

---

# Installation et Lancement

# Prérequis
* Docker et Docker Compose installés sur votre machine.

### Déploiement local rapide
1. Clonez le dépôt GitHub :
```bash
   git clone [https://github.com/votre-username/MiniProj-AI.git](https://github.com/votre-username/MiniProj-AI.git)
   cd MiniProj-AI
