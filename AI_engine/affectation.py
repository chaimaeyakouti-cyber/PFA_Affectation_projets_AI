"""
MiniProj-AI Ã¢â‚¬â€ Moteur d'affectation intelligent
================================================
Conforme au Cahier des Charges v1.0 Ã¢â‚¬â€ section 4.4

L'algorithme combine :
1. Scoring pondÃƒÂ©rÃƒÂ©  : quantifie l'adÃƒÂ©quation groupe Ã¢â€ â€ projet
2. Gale-Shapley     : rÃƒÂ©solution stable des conflits (Stable Matching)
3. Score d'ÃƒÂ©quitÃƒÂ©   : mesure la satisfaction globale [0..1]

EntrÃƒÂ©e  : liste de choix  [{ groupe_id, projet_id, priorite }]
Sortie  : dict            { groupe_id Ã¢â€ â€™ projet_id | None }
          + rapport       { equity_score, satisfactions, non_affectes }
"""

from typing import Optional, Dict


# Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
# PONDÃƒâ€°RATIONS PAR DÃƒâ€°FAUT (ajustables via API)
# Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
POIDS_PRIORITE   = 0.70   # ÃŽÂ± Ã¢â‚¬â€ importance du rang de prÃƒÂ©fÃƒÂ©rence
POIDS_ADEQUATION = 0.20   # ÃŽÂ² Ã¢â‚¬â€ adÃƒÂ©quation compÃƒÂ©tences / projet
POIDS_CHARGE     = 0.10   # ÃŽÂ³ Ã¢â‚¬â€ ÃƒÂ©quilibre de la charge encadrant

# CapacitÃƒÂ© par dÃƒÂ©faut d'un projet (nb max de groupes simultanÃƒÂ©s)
CAPACITE_PROJET_DEFAUT = 1
CHARGE_MAX_ENCADRANT = 5


# Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â
# FONCTIONS UTILITAIRES
# Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â

def score_priorite(priorite: int) -> float:
    """
    Transforme un rang (1, 2, 3) en score dÃƒÂ©croissant.
    Rang 1 (meilleur choix) Ã¢â€ â€™ 1.0
    Rang 2                  Ã¢â€ â€™ 0.67
    Rang 3                  Ã¢â€ â€™ 0.33
    Non choisi              Ã¢â€ â€™ 0.0
    """
    if priorite == 1:
        return 1.0
    elif priorite == 2:
        return 0.67
    elif priorite == 3:
        return 0.33
    return 0.0


def score_adequation(filiere_groupe: Optional[str],
                     competences_projet: Optional[str],
                     stacks_groupe: Optional[str] = None) -> float:
    """
    Mesure l'adÃƒÂ©quation entre le profil du groupe et les
    compÃƒÂ©tences requises par le projet.

    Utilise en prioritÃƒÂ© les stacks rÃƒÂ©els des ÃƒÂ©tudiants,
    puis la filiÃƒÂ¨re comme fallback.
    Retourne un score Jaccard entre 0.0 et 1.0.
    """
    # Combiner filiÃƒÂ¨re + stacks pour un profil complet
    profil_parts = []
    if filiere_groupe:
        profil_parts.append(filiere_groupe)
    if stacks_groupe:
        profil_parts.append(stacks_groupe)

    profil = " ".join(profil_parts)

    if not profil or not competences_projet:
        return 0.5  # pas d'info Ã¢â€ â€™ neutre

    stop_words = {"de", "la", "le", "les", "et", "en", "un", "une",
                  "des", "du", "ou", "avec", "pour", "sur", "dans",
                  "the", "and", "or", "of", "with", "for"}

    mots_profil = set(profil.lower().replace(",", " ").split()) - stop_words
    mots_projet = set(competences_projet.lower().replace(",", " ").split()) - stop_words

    if not mots_profil or not mots_projet:
        return 0.5

    communs = mots_profil & mots_projet
    union   = mots_profil | mots_projet

    return len(communs) / len(union)


def score_charge(encadrant_id: Optional[int],
                 charge_encadrants: dict) -> float:
    """
    PÃƒÂ©nalise les projets dont l'encadrant encadre dÃƒÂ©jÃƒÂ  beaucoup de groupes.
    Plus la charge est ÃƒÂ©levÃƒÂ©e, plus le score est bas.

    charge_encadrants : { encadrant_id Ã¢â€ â€™ nb_groupes_dÃƒÂ©jÃƒÂ _affectÃƒÂ©s }
    """
    if encadrant_id is None:
        return 1.0

    charge_actuelle = charge_encadrants.get(encadrant_id, 0)

    # Penalite lineaire : plus l'encadrant a de projets/groupes, plus le score baisse.
    return max(0.0, 1.0 - charge_actuelle / CHARGE_MAX_ENCADRANT)


def calculer_score(priorite: int,
                   filiere_groupe: Optional[str],
                   competences_projet: Optional[str],
                   encadrant_id: Optional[int],
                   charge_encadrants: dict,
                   stacks_groupe: Optional[str] = None,
                   poids: Optional[Dict[str, float]] = None) -> float:
    """
    Score composite pondÃƒÂ©rÃƒÂ© :
    score = ÃŽÂ±Ã‚Â·prioritÃƒÂ© + ÃŽÂ²Ã‚Â·adÃƒÂ©quation + ÃŽÂ³Ã‚Â·charge

    poids optionnel : {"priorite": 0.70, "adequation": 0.20, "charge": 0.10}
    """
    alpha = poids["priorite"]  if poids else POIDS_PRIORITE
    beta  = poids["adequation"] if poids else POIDS_ADEQUATION
    gamma = poids["charge"]    if poids else POIDS_CHARGE

    s_prio  = score_priorite(priorite)
    s_adeq  = score_adequation(filiere_groupe, competences_projet, stacks_groupe)
    s_charg = score_charge(encadrant_id, charge_encadrants)

    return alpha * s_prio + beta * s_adeq + gamma * s_charg


# Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â
# MOTEUR PRINCIPAL : GALE-SHAPLEY MODIFIÃƒâ€°
# Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â

def affecter_projets(
    choix_list: list[dict],
    projets_info: Optional[list[dict]]   = None,
    groupes_info: Optional[list[dict]]   = None,
    capacite_projets: Optional[dict]     = None,
    poids_override: Optional[Dict[str, float]] = None,
) -> dict:
    """
    Algorithme principal d'affectation.

    groupes_info : [{ id, etudiants: [{ filiere, stacks }] }]
    poids_override : {"priorite": 0.70, "adequation": 0.20, "charge": 0.10}
    """

    # Ã¢â€â‚¬Ã¢â€â‚¬ 0. Normalisation Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

    projets_idx: dict = {}
    if projets_info:
        for p in projets_info:
            projets_idx[p["id"]] = p

    # Index groupe_id -> profil complet (competences declarees + filieres + stacks)
    filieres_idx: dict = {}
    stacks_idx: dict = {}
    if groupes_info:
        for g in groupes_info:
            morceaux = []
            if g.get("competences"):
                morceaux.append(g.get("competences", ""))
            if g.get("etudiants"):
                filieres = [e.get("filiere", "") for e in g["etudiants"] if e.get("filiere")]
                morceaux.extend(filieres)
                stacks = [e.get("stacks", "") for e in g["etudiants"] if e.get("stacks")]
                if stacks:
                    stacks_idx[g["id"]] = " ".join(stacks)
            if morceaux:
                filieres_idx[g["id"]] = " ".join(morceaux)

    caps = capacite_projets or {}

    # Ã¢â€â‚¬Ã¢â€â‚¬ 1. Construction des prÃƒÂ©fÃƒÂ©rences ordonnÃƒÂ©es par groupe Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
    #
    # preferences[groupe_id] = liste ordonnÃƒÂ©e de (projet_id, priorite)
    # triÃƒÂ©e par prioritÃƒÂ© croissante (1 = meilleur)

    preferences: dict[int, list[tuple[int, int]]] = {}
    for c in choix_list:
        gid = c["groupe_id"]
        pid = c["projet_id"]
        pri = c["priorite"]
        preferences.setdefault(gid, [])
        preferences[gid].append((pid, pri))

    for gid in preferences:
        preferences[gid].sort(key=lambda x: x[1])

    # Ã¢â€â‚¬Ã¢â€â‚¬ 2. Initialisation de l'algorithme Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

    # Groupes encore en attente d'affectation
    groupes_libres: list[int] = list(preferences.keys())

    # Pointeur dans la liste de prÃƒÂ©fÃƒÂ©rences de chaque groupe
    # (ÃƒÂ  quel rang on en est pour ce groupe)
    index_courant: dict[int, int] = {gid: 0 for gid in groupes_libres}

    # Ãƒâ€°tat courant d'un projet : { projet_id Ã¢â€ â€™ [(score, groupe_id)] }
    # TriÃƒÂ© par score dÃƒÂ©croissant (meilleur score en premier)
    affectations_projet: dict[int, list[tuple[float, int]]] = {}

    # Charge des encadrants : nombre de projets proposes.
    charge_encadrants: dict[int, int] = {}
    for p in projets_idx.values():
        enc_id = p.get("encadrant_id")
        if enc_id is not None:
            charge_encadrants[enc_id] = charge_encadrants.get(enc_id, 0) + 1

    # Ã¢â€â‚¬Ã¢â€â‚¬ 3. Boucle principale Gale-Shapley Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

    iterations = 0
    max_iterations = len(groupes_libres) * 10  # garde-fou anti-boucle infinie

    while groupes_libres and iterations < max_iterations:
        iterations += 1
        groupe_id = groupes_libres.pop(0)

        idx = index_courant[groupe_id]
        prefs_groupe = preferences.get(groupe_id, [])

        if idx >= len(prefs_groupe):
            # Ce groupe a ÃƒÂ©puisÃƒÂ© toutes ses prÃƒÂ©fÃƒÂ©rences Ã¢â€ â€™ pas d'affectation
            continue

        projet_id, priorite = prefs_groupe[idx]
        index_courant[groupe_id] = idx + 1

        # Calcul du score composite pour ce couple (groupe, projet)
        p_info    = projets_idx.get(projet_id, {})
        filiere   = filieres_idx.get(groupe_id)
        stacks    = stacks_idx.get(groupe_id)
        comp_req  = p_info.get("competences_requises")
        enc_id    = p_info.get("encadrant_id")

        score = calculer_score(
            priorite           = priorite,
            filiere_groupe     = filiere,
            competences_projet = comp_req,
            encadrant_id       = enc_id,
            charge_encadrants  = charge_encadrants,
            stacks_groupe      = stacks,
            poids              = poids_override,
        )

        # CapacitÃƒÂ© maximale du projet
        cap = caps.get(projet_id, CAPACITE_PROJET_DEFAUT)

        affectations_projet.setdefault(projet_id, [])
        slots = affectations_projet[projet_id]

        if len(slots) < cap:
            # Slot disponible Ã¢â€ â€™ affectation directe
            slots.append((score, groupe_id))
            slots.sort(reverse=True)

        else:
            # Projet plein : comparer avec le groupe le moins bien scorÃƒÂ©
            score_min, groupe_evince = slots[-1]

            if score > score_min:
                # Ce groupe dÃƒÂ©place le moins bien scorÃƒÂ©
                slots[-1] = (score, groupe_id)
                slots.sort(reverse=True)


                # Le groupe ÃƒÂ©vincÃƒÂ© retourne dans la file d'attente
                groupes_libres.append(groupe_evince)
            else:
                # Ce groupe n'est pas retenu Ã¢â€ â€™ essaie son choix suivant
                groupes_libres.append(groupe_id)

    # Ã¢â€â‚¬Ã¢â€â‚¬ 4. Construction du rÃƒÂ©sultat final Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

    # Inversion : projet Ã¢â€ â€™ groupes_affectÃƒÂ©s Ã¢Å¸Â¹ groupe Ã¢â€ â€™ projet
    resultat: dict[int, Optional[int]] = {}

    for projet_id, slots in affectations_projet.items():
        for (_, groupe_id) in slots:
            resultat[groupe_id] = projet_id

    # Groupes sans affectation (ont ÃƒÂ©puisÃƒÂ© leurs choix)
    for gid in preferences:
        if gid not in resultat:
            resultat[gid] = None

    # Ã¢â€â‚¬Ã¢â€â‚¬ 5. Rapport d'ÃƒÂ©quitÃƒÂ© Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

    rapport = _generer_rapport(resultat, preferences)
    _afficher_rapport(rapport)

    return resultat


# Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â
# RAPPORT D'Ãƒâ€°QUITÃƒâ€° (section 4.4 CDC)
# Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â

def _generer_rapport(
    resultat: dict[int, Optional[int]],
    preferences: dict[int, list[tuple[int, int]]],
) -> dict:
    """
    Calcule le score d'ÃƒÂ©quitÃƒÂ© global et les statistiques de satisfaction.

    Score d'ÃƒÂ©quitÃƒÂ© :
        equity = ÃŽÂ£ (4 - rang_obtenu) / (3 Ãƒâ€” nb_groupes_affectÃƒÂ©s)

    InterprÃƒÂ©tation :
        1.0 Ã¢â€ â€™ tous les groupes ont obtenu leur 1er choix
        0.67 Ã¢â€ â€™ tous ont obtenu leur 2e choix
        0.33 Ã¢â€ â€™ tous ont obtenu leur 3e choix
        0.0  Ã¢â€ â€™ personne n'a obtenu de choix listÃƒÂ©s (affectations hors prÃƒÂ©fÃƒÂ©rences)
    """
    satisfactions = {1: 0, 2: 0, 3: 0, "hors_pref": 0, "non_affecte": 0}
    total_affectes = 0
    somme_equity   = 0.0

    for groupe_id, projet_id in resultat.items():
        if projet_id is None:
            satisfactions["non_affecte"] += 1
            continue

        total_affectes += 1

        # Chercher le rang dans les prÃƒÂ©fÃƒÂ©rences de ce groupe
        rang_obtenu = None
        for (pid, priorite) in preferences.get(groupe_id, []):
            if pid == projet_id:
                rang_obtenu = priorite
                break

        if rang_obtenu is not None:
            satisfactions[rang_obtenu] = satisfactions.get(rang_obtenu, 0) + 1
            somme_equity += (4 - rang_obtenu)  # rang 1 Ã¢â€ â€™ +3, rang 2 Ã¢â€ â€™ +2, rang 3 Ã¢â€ â€™ +1
        else:
            satisfactions["hors_pref"] += 1
            # AffectÃƒÂ© hors prÃƒÂ©fÃƒÂ©rences Ã¢â€ â€™ contribute 0 ÃƒÂ  l'ÃƒÂ©quitÃƒÂ©

    nb_total = len(resultat)
    equity_score = (somme_equity / (3 * total_affectes)) if total_affectes > 0 else 0.0

    # Taux de satisfaction des 1ers vÃ…â€œux (critÃƒÂ¨re d'acceptation CDC : Ã¢â€°Â¥ 60%)
    taux_premier_voeu = (
        satisfactions[1] / nb_total * 100 if nb_total > 0 else 0.0
    )

    return {
        "equity_score":       round(equity_score, 4),
        "taux_premier_voeu":  round(taux_premier_voeu, 1),
        "satisfactions":      satisfactions,
        "nb_groupes_total":   nb_total,
        "nb_affectes":        total_affectes,
        "nb_non_affectes":    satisfactions["non_affecte"],
        "conforme_cdc":       taux_premier_voeu >= 60.0,  # critÃƒÂ¨re CDC Ã‚Â§12
    }


def _afficher_rapport(rapport: dict) -> None:
    """Affiche le rapport d'ÃƒÂ©quitÃƒÂ© en console (mode debug)."""
    print("\n" + "Ã¢â€¢Â" * 52)
    print("   RAPPORT D'Ãƒâ€°QUITÃƒâ€° Ã¢â‚¬â€ MiniProj-AI Moteur IA")
    print("Ã¢â€¢Â" * 52)
    print(f"  Score d'ÃƒÂ©quitÃƒÂ© global   : {rapport['equity_score']:.4f} / 1.0")
    print(f"  Taux 1er vÃ…â€œu satisfait  : {rapport['taux_premier_voeu']}%")
    print(f"  Conforme CDC (Ã¢â€°Â¥60%)     : {'Ã¢Å“â€œ OUI' if rapport['conforme_cdc'] else 'Ã¢Å“â€” NON'}")
    print(f"  Groupes total           : {rapport['nb_groupes_total']}")
    print(f"  Groupes affectÃƒÂ©s        : {rapport['nb_affectes']}")
    print(f"  Groupes non affectÃƒÂ©s    : {rapport['nb_non_affectes']}")
    s = rapport["satisfactions"]
    print(f"  Ã¢â€Å“Ã¢â€â‚¬ 1er choix obtenu     : {s.get(1, 0)} groupe(s)")
    print(f"  Ã¢â€Å“Ã¢â€â‚¬ 2e  choix obtenu     : {s.get(2, 0)} groupe(s)")
    print(f"  Ã¢â€Å“Ã¢â€â‚¬ 3e  choix obtenu     : {s.get(3, 0)} groupe(s)")
    print(f"  Ã¢â€Å“Ã¢â€â‚¬ Hors prÃƒÂ©fÃƒÂ©rences     : {s.get('hors_pref', 0)} groupe(s)")
    print(f"  Ã¢â€â€Ã¢â€â‚¬ Non affectÃƒÂ©s         : {s.get('non_affecte', 0)} groupe(s)")
    print("Ã¢â€¢Â" * 52 + "\n")


# Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â
# POINT D'ENTRÃƒâ€°E POUR FASTAPI (main.py)
# Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â

def affecter_projets_avec_rapport(
    choix_list: list[dict],
    projets_info: Optional[list[dict]] = None,
    groupes_info: Optional[list[dict]] = None,
    capacite_projets: Optional[dict]   = None,
    poids_override: Optional[Dict[str, float]] = None,
) -> tuple[dict, dict]:
    """
    Version ÃƒÂ©tendue retournant (rÃƒÂ©sultat, rapport).
    """
    resultat = affecter_projets(
        choix_list, projets_info, groupes_info,
        capacite_projets, poids_override
    )

    # Reconstruction des prÃƒÂ©fÃƒÂ©rences pour le rapport
    preferences: dict[int, list[tuple[int, int]]] = {}
    for c in choix_list:
        gid, pid, pri = c["groupe_id"], c["projet_id"], c["priorite"]
        preferences.setdefault(gid, [])
        preferences[gid].append((pid, pri))
    for gid in preferences:
        preferences[gid].sort(key=lambda x: x[1])

    rapport = _generer_rapport(resultat, preferences)
    return resultat, rapport


# Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â
# TESTS RAPIDES (python affectation.py)
# Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â

if __name__ == "__main__":
    print("=== TEST 1 : Cas nominal Ã¢â‚¬â€ 3 groupes, 3 projets ===")
    choix = [
        {"groupe_id": 1, "projet_id": 10, "priorite": 1},
        {"groupe_id": 1, "projet_id": 20, "priorite": 2},
        {"groupe_id": 1, "projet_id": 30, "priorite": 3},
        {"groupe_id": 2, "projet_id": 10, "priorite": 1},  # conflit avec groupe 1
        {"groupe_id": 2, "projet_id": 20, "priorite": 2},
        {"groupe_id": 2, "projet_id": 30, "priorite": 3},
        {"groupe_id": 3, "projet_id": 20, "priorite": 1},
        {"groupe_id": 3, "projet_id": 10, "priorite": 2},
        {"groupe_id": 3, "projet_id": 30, "priorite": 3},
    ]
    res, rap = affecter_projets_avec_rapport(choix)
    print("RÃƒÂ©sultats :", res)
    print("Ãƒâ€°quitÃƒÂ©    :", rap["equity_score"], "| 1er vÃ…â€œu :", rap["taux_premier_voeu"], "%")
    assert all(v is not None for v in res.values()), "Tous doivent ÃƒÂªtre affectÃƒÂ©s !"
    assert len(set(res.values())) == 3, "Chaque projet doit ÃƒÂªtre unique !"
    print("Ã¢Å“â€œ Test 1 OK\n")

    print("=== TEST 2 : Avec enrichissement compÃƒÂ©tences ===")
    projets_info = [
        {"id": 10, "competences_requises": "Python, IA, Machine Learning", "encadrant_id": 100},
        {"id": 20, "competences_requises": "React, TypeScript, Web",        "encadrant_id": 101},
        {"id": 30, "competences_requises": "Cloud, Docker, DevOps",         "encadrant_id": 100},
    ]
    groupes_info = [
        {"id": 1, "etudiants": [{"filiere": "DATA"}, {"filiere": "IA"}]},
        {"id": 2, "etudiants": [{"filiere": "ICCN"}, {"filiere": "Web"}]},
        {"id": 3, "etudiants": [{"filiere": "Cloud"}, {"filiere": "CLOUD"}]},
    ]
    res2, rap2 = affecter_projets_avec_rapport(choix, projets_info, groupes_info)
    print("RÃƒÂ©sultats :", res2)
    print("Ãƒâ€°quitÃƒÂ©    :", rap2["equity_score"], "| 1er vÃ…â€œu :", rap2["taux_premier_voeu"], "%")
    print("Ã¢Å“â€œ Test 2 OK\n")

    print("=== TEST 3 : Cas limite Ã¢â‚¬â€ plus de groupes que de projets ===")
    choix3 = [
        {"groupe_id": 1, "projet_id": 10, "priorite": 1},
        {"groupe_id": 1, "projet_id": 20, "priorite": 2},
        {"groupe_id": 2, "projet_id": 10, "priorite": 1},
        {"groupe_id": 2, "projet_id": 20, "priorite": 2},
        {"groupe_id": 3, "projet_id": 10, "priorite": 1},
        {"groupe_id": 3, "projet_id": 20, "priorite": 2},
    ]
    res3, rap3 = affecter_projets_avec_rapport(choix3)
    print("RÃƒÂ©sultats :", res3)
    print("Non affectÃƒÂ©s :", rap3["nb_non_affectes"])
    print("Ã¢Å“â€œ Test 3 OK\n")

    print("=== TEST 4 : CapacitÃƒÂ© multiple (un projet peut accueillir 2 groupes) ===")
    caps = {10: 2, 20: 1}
    res4, rap4 = affecter_projets_avec_rapport(choix3, capacite_projets=caps)
    print("RÃƒÂ©sultats (cap. multiple) :", res4)
    assert list(res4.values()).count(10) <= 2, "Projet 10 ne peut accueillir que 2 groupes"
    print("Ã¢Å“â€œ Test 4 OK\n")
