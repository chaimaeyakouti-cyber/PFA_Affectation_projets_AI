"""
MiniProj-AI — Moteur d'affectation intelligent
================================================
Conforme au Cahier des Charges v1.0 — section 4.4

L'algorithme combine :
1. Scoring pondéré  : quantifie l'adéquation groupe ↔ projet
2. Gale-Shapley     : résolution stable des conflits (Stable Matching)
3. Score d'équité   : mesure la satisfaction globale [0..1]

Entrée  : liste de choix  [{ groupe_id, projet_id, priorite }]
Sortie  : dict            { groupe_id → projet_id | None }
          + rapport       { equity_score, satisfactions, non_affectes }
"""

from typing import Optional, Dict


# ─────────────────────────────────────────────
# PONDÉRATIONS PAR DÉFAUT (ajustables via API)
# ─────────────────────────────────────────────
POIDS_PRIORITE   = 0.70   # α — importance du rang de préférence
POIDS_ADEQUATION = 0.20   # β — adéquation compétences / projet
POIDS_CHARGE     = 0.10   # γ — équilibre de la charge encadrant

# Capacité par défaut d'un projet (nb max de groupes simultanés)
CAPACITE_PROJET_DEFAUT = 1


# ═════════════════════════════════════════════
# FONCTIONS UTILITAIRES
# ═════════════════════════════════════════════

def score_priorite(priorite: int) -> float:
    """
    Transforme un rang (1, 2, 3) en score décroissant.
    Rang 1 (meilleur choix) → 1.0
    Rang 2                  → 0.67
    Rang 3                  → 0.33
    Non choisi              → 0.0
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
    Mesure l'adéquation entre le profil du groupe et les
    compétences requises par le projet.

    Utilise en priorité les stacks réels des étudiants,
    puis la filière comme fallback.
    Retourne un score Jaccard entre 0.0 et 1.0.
    """
    # Combiner filière + stacks pour un profil complet
    profil_parts = []
    if filiere_groupe:
        profil_parts.append(filiere_groupe)
    if stacks_groupe:
        profil_parts.append(stacks_groupe)

    profil = " ".join(profil_parts)

    if not profil or not competences_projet:
        return 0.5  # pas d'info → neutre

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
    Pénalise les projets dont l'encadrant encadre déjà beaucoup de groupes.
    Plus la charge est élevée, plus le score est bas.

    charge_encadrants : { encadrant_id → nb_groupes_déjà_affectés }
    """
    if encadrant_id is None:
        return 1.0

    charge_actuelle = charge_encadrants.get(encadrant_id, 0)

    # Pénalité linéaire : 0 groupe → 1.0, 5+ groupes → 0.0
    return max(0.0, 1.0 - charge_actuelle / 5.0)


def calculer_score(priorite: int,
                   filiere_groupe: Optional[str],
                   competences_projet: Optional[str],
                   encadrant_id: Optional[int],
                   charge_encadrants: dict,
                   stacks_groupe: Optional[str] = None,
                   poids: Optional[Dict[str, float]] = None) -> float:
    """
    Score composite pondéré :
    score = α·priorité + β·adéquation + γ·charge

    poids optionnel : {"priorite": 0.70, "adequation": 0.20, "charge": 0.10}
    """
    alpha = poids["priorite"]  if poids else POIDS_PRIORITE
    beta  = poids["adequation"] if poids else POIDS_ADEQUATION
    gamma = poids["charge"]    if poids else POIDS_CHARGE

    s_prio  = score_priorite(priorite)
    s_adeq  = score_adequation(filiere_groupe, competences_projet, stacks_groupe)
    s_charg = score_charge(encadrant_id, charge_encadrants)

    return alpha * s_prio + beta * s_adeq + gamma * s_charg


# ═════════════════════════════════════════════
# MOTEUR PRINCIPAL : GALE-SHAPLEY MODIFIÉ
# ═════════════════════════════════════════════

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

    # ── 0. Normalisation ──────────────────────────────────────────────────

    projets_idx: dict = {}
    if projets_info:
        for p in projets_info:
            projets_idx[p["id"]] = p

    # Index groupe_id → profil complet (filière + stacks de tous les membres)
    filieres_idx: dict = {}
    stacks_idx:   dict = {}
    if groupes_info:
        for g in groupes_info:
            if g.get("etudiants"):
                filieres = [e.get("filiere", "") for e in g["etudiants"] if e.get("filiere")]
                stacks   = [e.get("stacks", "")  for e in g["etudiants"] if e.get("stacks")]
                filieres_idx[g["id"]] = " ".join(filieres)
                stacks_idx[g["id"]]   = " ".join(stacks)

    caps = capacite_projets or {}

    # ── 1. Construction des préférences ordonnées par groupe ──────────────
    #
    # preferences[groupe_id] = liste ordonnée de (projet_id, priorite)
    # triée par priorité croissante (1 = meilleur)

    preferences: dict[int, list[tuple[int, int]]] = {}
    for c in choix_list:
        gid = c["groupe_id"]
        pid = c["projet_id"]
        pri = c["priorite"]
        preferences.setdefault(gid, [])
        preferences[gid].append((pid, pri))

    for gid in preferences:
        preferences[gid].sort(key=lambda x: x[1])

    # ── 2. Initialisation de l'algorithme ─────────────────────────────────

    # Groupes encore en attente d'affectation
    groupes_libres: list[int] = list(preferences.keys())

    # Pointeur dans la liste de préférences de chaque groupe
    # (à quel rang on en est pour ce groupe)
    index_courant: dict[int, int] = {gid: 0 for gid in groupes_libres}

    # État courant d'un projet : { projet_id → [(score, groupe_id)] }
    # Trié par score décroissant (meilleur score en premier)
    affectations_projet: dict[int, list[tuple[float, int]]] = {}

    # Compteur de charge des encadrants (mis à jour au fil de l'algo)
    charge_encadrants: dict[int, int] = {}

    # ── 3. Boucle principale Gale-Shapley ─────────────────────────────────

    iterations = 0
    max_iterations = len(groupes_libres) * 10  # garde-fou anti-boucle infinie

    while groupes_libres and iterations < max_iterations:
        iterations += 1
        groupe_id = groupes_libres.pop(0)

        idx = index_courant[groupe_id]
        prefs_groupe = preferences.get(groupe_id, [])

        if idx >= len(prefs_groupe):
            # Ce groupe a épuisé toutes ses préférences → pas d'affectation
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

        # Capacité maximale du projet
        cap = caps.get(projet_id, CAPACITE_PROJET_DEFAUT)

        affectations_projet.setdefault(projet_id, [])
        slots = affectations_projet[projet_id]

        if len(slots) < cap:
            # Slot disponible → affectation directe
            slots.append((score, groupe_id))
            slots.sort(reverse=True)
            # Mise à jour de la charge encadrant
            if enc_id is not None:
                charge_encadrants[enc_id] = charge_encadrants.get(enc_id, 0) + 1

        else:
            # Projet plein : comparer avec le groupe le moins bien scoré
            score_min, groupe_evince = slots[-1]

            if score > score_min:
                # Ce groupe déplace le moins bien scoré
                slots[-1] = (score, groupe_id)
                slots.sort(reverse=True)

                # Mise à jour charge encadrant
                if enc_id is not None:
                    charge_encadrants[enc_id] = charge_encadrants.get(enc_id, 0)
                    # +1 entrant déjà comptabilisé, -0 (même projet)

                # Le groupe évincé retourne dans la file d'attente
                groupes_libres.append(groupe_evince)
            else:
                # Ce groupe n'est pas retenu → essaie son choix suivant
                groupes_libres.append(groupe_id)

    # ── 4. Construction du résultat final ─────────────────────────────────

    # Inversion : projet → groupes_affectés ⟹ groupe → projet
    resultat: dict[int, Optional[int]] = {}

    for projet_id, slots in affectations_projet.items():
        for (_, groupe_id) in slots:
            resultat[groupe_id] = projet_id

    # Groupes sans affectation (ont épuisé leurs choix)
    for gid in preferences:
        if gid not in resultat:
            resultat[gid] = None

    # ── 5. Rapport d'équité ───────────────────────────────────────────────

    rapport = _generer_rapport(resultat, preferences)
    _afficher_rapport(rapport)

    return resultat


# ═════════════════════════════════════════════
# RAPPORT D'ÉQUITÉ (section 4.4 CDC)
# ═════════════════════════════════════════════

def _generer_rapport(
    resultat: dict[int, Optional[int]],
    preferences: dict[int, list[tuple[int, int]]],
) -> dict:
    """
    Calcule le score d'équité global et les statistiques de satisfaction.

    Score d'équité :
        equity = Σ (4 - rang_obtenu) / (3 × nb_groupes_affectés)

    Interprétation :
        1.0 → tous les groupes ont obtenu leur 1er choix
        0.67 → tous ont obtenu leur 2e choix
        0.33 → tous ont obtenu leur 3e choix
        0.0  → personne n'a obtenu de choix listés (affectations hors préférences)
    """
    satisfactions = {1: 0, 2: 0, 3: 0, "hors_pref": 0, "non_affecte": 0}
    total_affectes = 0
    somme_equity   = 0.0

    for groupe_id, projet_id in resultat.items():
        if projet_id is None:
            satisfactions["non_affecte"] += 1
            continue

        total_affectes += 1

        # Chercher le rang dans les préférences de ce groupe
        rang_obtenu = None
        for (pid, priorite) in preferences.get(groupe_id, []):
            if pid == projet_id:
                rang_obtenu = priorite
                break

        if rang_obtenu is not None:
            satisfactions[rang_obtenu] = satisfactions.get(rang_obtenu, 0) + 1
            somme_equity += (4 - rang_obtenu)  # rang 1 → +3, rang 2 → +2, rang 3 → +1
        else:
            satisfactions["hors_pref"] += 1
            # Affecté hors préférences → contribute 0 à l'équité

    nb_total = len(resultat)
    equity_score = (somme_equity / (3 * total_affectes)) if total_affectes > 0 else 0.0

    # Taux de satisfaction des 1ers vœux (critère d'acceptation CDC : ≥ 60%)
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
        "conforme_cdc":       taux_premier_voeu >= 60.0,  # critère CDC §12
    }


def _afficher_rapport(rapport: dict) -> None:
    """Affiche le rapport d'équité en console (mode debug)."""
    print("\n" + "═" * 52)
    print("   RAPPORT D'ÉQUITÉ — MiniProj-AI Moteur IA")
    print("═" * 52)
    print(f"  Score d'équité global   : {rapport['equity_score']:.4f} / 1.0")
    print(f"  Taux 1er vœu satisfait  : {rapport['taux_premier_voeu']}%")
    print(f"  Conforme CDC (≥60%)     : {'✓ OUI' if rapport['conforme_cdc'] else '✗ NON'}")
    print(f"  Groupes total           : {rapport['nb_groupes_total']}")
    print(f"  Groupes affectés        : {rapport['nb_affectes']}")
    print(f"  Groupes non affectés    : {rapport['nb_non_affectes']}")
    s = rapport["satisfactions"]
    print(f"  ├─ 1er choix obtenu     : {s.get(1, 0)} groupe(s)")
    print(f"  ├─ 2e  choix obtenu     : {s.get(2, 0)} groupe(s)")
    print(f"  ├─ 3e  choix obtenu     : {s.get(3, 0)} groupe(s)")
    print(f"  ├─ Hors préférences     : {s.get('hors_pref', 0)} groupe(s)")
    print(f"  └─ Non affectés         : {s.get('non_affecte', 0)} groupe(s)")
    print("═" * 52 + "\n")


# ═════════════════════════════════════════════
# POINT D'ENTRÉE POUR FASTAPI (main.py)
# ═════════════════════════════════════════════

def affecter_projets_avec_rapport(
    choix_list: list[dict],
    projets_info: Optional[list[dict]] = None,
    groupes_info: Optional[list[dict]] = None,
    capacite_projets: Optional[dict]   = None,
    poids_override: Optional[Dict[str, float]] = None,
) -> tuple[dict, dict]:
    """
    Version étendue retournant (résultat, rapport).
    """
    resultat = affecter_projets(
        choix_list, projets_info, groupes_info,
        capacite_projets, poids_override
    )

    # Reconstruction des préférences pour le rapport
    preferences: dict[int, list[tuple[int, int]]] = {}
    for c in choix_list:
        gid, pid, pri = c["groupe_id"], c["projet_id"], c["priorite"]
        preferences.setdefault(gid, [])
        preferences[gid].append((pid, pri))
    for gid in preferences:
        preferences[gid].sort(key=lambda x: x[1])

    rapport = _generer_rapport(resultat, preferences)
    return resultat, rapport


# ═════════════════════════════════════════════
# TESTS RAPIDES (python affectation.py)
# ═════════════════════════════════════════════

if __name__ == "__main__":
    print("=== TEST 1 : Cas nominal — 3 groupes, 3 projets ===")
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
    print("Résultats :", res)
    print("Équité    :", rap["equity_score"], "| 1er vœu :", rap["taux_premier_voeu"], "%")
    assert all(v is not None for v in res.values()), "Tous doivent être affectés !"
    assert len(set(res.values())) == 3, "Chaque projet doit être unique !"
    print("✓ Test 1 OK\n")

    print("=== TEST 2 : Avec enrichissement compétences ===")
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
    print("Résultats :", res2)
    print("Équité    :", rap2["equity_score"], "| 1er vœu :", rap2["taux_premier_voeu"], "%")
    print("✓ Test 2 OK\n")

    print("=== TEST 3 : Cas limite — plus de groupes que de projets ===")
    choix3 = [
        {"groupe_id": 1, "projet_id": 10, "priorite": 1},
        {"groupe_id": 1, "projet_id": 20, "priorite": 2},
        {"groupe_id": 2, "projet_id": 10, "priorite": 1},
        {"groupe_id": 2, "projet_id": 20, "priorite": 2},
        {"groupe_id": 3, "projet_id": 10, "priorite": 1},
        {"groupe_id": 3, "projet_id": 20, "priorite": 2},
    ]
    res3, rap3 = affecter_projets_avec_rapport(choix3)
    print("Résultats :", res3)
    print("Non affectés :", rap3["nb_non_affectes"])
    print("✓ Test 3 OK\n")

    print("=== TEST 4 : Capacité multiple (un projet peut accueillir 2 groupes) ===")
    caps = {10: 2, 20: 1}
    res4, rap4 = affecter_projets_avec_rapport(choix3, capacite_projets=caps)
    print("Résultats (cap. multiple) :", res4)
    assert list(res4.values()).count(10) <= 2, "Projet 10 ne peut accueillir que 2 groupes"
    print("✓ Test 4 OK\n")