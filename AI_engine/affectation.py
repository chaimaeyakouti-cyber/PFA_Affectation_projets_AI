from typing import Dict, Optional


# Poids par defaut du moteur d'affectation.
POIDS_PRIORITE = 0.70
POIDS_ADEQUATION = 0.20
POIDS_CHARGE = 0.10

# Capacite par defaut : un projet est affecte a un seul groupe.
CAPACITE_PROJET_DEFAUT = 1

# Charge maximale indicative d'un encadrant.
CHARGE_MAX_ENCADRANT = 5


def score_priorite(priorite: int) -> float:
    """Convertit le rang du choix en score numerique."""
    if priorite == 1:
        return 1.0
    if priorite == 2:
        return 0.67
    if priorite == 3:
        return 0.33
    return 0.0


def score_adequation(
    filiere_groupe: Optional[str],
    competences_projet: Optional[str],
    stacks_groupe: Optional[str] = None,
) -> float:
    """Calcule l'adequation entre le profil du groupe et les competences requises."""
    if not filiere_groupe and not stacks_groupe:
        return 0.5
    if not competences_projet:
        return 0.5

    profil_groupe = " ".join(
        partie for partie in [filiere_groupe, stacks_groupe] if partie
    )

    stop_words = {
        "et",
        "de",
        "du",
        "des",
        "la",
        "le",
        "les",
        "en",
        "avec",
        "pour",
        "sur",
        "un",
        "une",
        "application",
        "systeme",
    }

    mots_groupe = {
        mot.strip().lower()
        for mot in profil_groupe.replace(",", " ").split()
        if mot.strip() and mot.strip().lower() not in stop_words
    }
    mots_projet = {
        mot.strip().lower()
        for mot in competences_projet.replace(",", " ").split()
        if mot.strip() and mot.strip().lower() not in stop_words
    }

    if not mots_groupe or not mots_projet:
        return 0.5

    mots_communs = mots_groupe.intersection(mots_projet)
    mots_union = mots_groupe.union(mots_projet)
    return len(mots_communs) / len(mots_union)


def score_charge(encadrant_id: Optional[int], charge_encadrants: Dict[int, int]) -> float:
    """Favorise les encadrants ayant encore une charge disponible."""
    if encadrant_id is None:
        return 1.0

    charge_actuelle = charge_encadrants.get(encadrant_id, 0)
    return max(0.0, 1.0 - charge_actuelle / CHARGE_MAX_ENCADRANT)


def calculer_score(
    priorite: int,
    filiere_groupe: Optional[str] = None,
    competences_projet: Optional[str] = None,
    encadrant_id: Optional[int] = None,
    charge_encadrants: Optional[Dict[int, int]] = None,
    stacks_groupe: Optional[str] = None,
    poids: Optional[dict] = None,
) -> float:
    """Calcule le score global utilise pour departager les affectations."""
    charge_encadrants = charge_encadrants or {}

    alpha = poids["priorite"] if poids else POIDS_PRIORITE
    beta = poids["adequation"] if poids else POIDS_ADEQUATION
    gamma = poids["charge"] if poids else POIDS_CHARGE

    s_priorite = score_priorite(priorite)
    s_adequation = score_adequation(filiere_groupe, competences_projet, stacks_groupe)
    s_charge = score_charge(encadrant_id, charge_encadrants)

    return alpha * s_priorite + beta * s_adequation + gamma * s_charge


def affecter_projets(
    choix_list: list[dict],
    projets_info: Optional[list[dict]] = None,
    groupes_info: Optional[list[dict]] = None,
    capacite_projets: Optional[Dict[int, int]] = None,
    poids_override: Optional[dict] = None,
) -> dict:
    """
    Affecte les projets aux groupes selon leurs preferences et un score global.

    Le score combine trois criteres :
    - priorite du choix exprime par le groupe ;
    - adequation entre competences du groupe et competences requises ;
    - charge d'encadrement associee au projet.
    """
    projets_idx = {p["id"]: p for p in projets_info} if projets_info else {}
    filieres_idx: dict[int, str] = {}
    stacks_idx: dict[int, str] = {}

    if groupes_info:
        for groupe in groupes_info:
            morceaux = []

            if groupe.get("competences"):
                morceaux.append(groupe.get("competences", ""))

            if groupe.get("etudiants"):
                filieres = [
                    etudiant.get("filiere", "")
                    for etudiant in groupe["etudiants"]
                    if etudiant.get("filiere")
                ]
                morceaux.extend(filieres)

                stacks = [
                    etudiant.get("stacks", "")
                    for etudiant in groupe["etudiants"]
                    if etudiant.get("stacks")
                ]
                if stacks:
                    stacks_idx[groupe["id"]] = " ".join(stacks)

            if morceaux:
                filieres_idx[groupe["id"]] = " ".join(morceaux)

    capacites = capacite_projets or {}

    preferences: dict[int, list[tuple[int, int]]] = {}
    for choix in choix_list:
        groupe_id = choix["groupe_id"]
        preferences.setdefault(groupe_id, []).append((choix["projet_id"], choix["priorite"]))

    for groupe_id in preferences:
        preferences[groupe_id].sort(key=lambda item: item[1])

    groupes_libres = list(preferences.keys())
    index_courant = {groupe_id: 0 for groupe_id in groupes_libres}
    affectations_projet: dict[int, list[tuple[float, int]]] = {}

    # La charge reflete le nombre de projets proposes par chaque encadrant.
    charge_encadrants: dict[int, int] = {}
    for projet in projets_idx.values():
        encadrant_id = projet.get("encadrant_id")
        if encadrant_id is not None:
            charge_encadrants[encadrant_id] = charge_encadrants.get(encadrant_id, 0) + 1

    iterations = 0
    max_iterations = max(1, len(groupes_libres) * 10)

    while groupes_libres and iterations < max_iterations:
        iterations += 1
        groupe_id = groupes_libres.pop(0)
        preferences_groupe = preferences.get(groupe_id, [])
        index_pref = index_courant[groupe_id]

        if index_pref >= len(preferences_groupe):
            continue

        projet_id, priorite = preferences_groupe[index_pref]
        index_courant[groupe_id] = index_pref + 1

        projet_info = projets_idx.get(projet_id, {})
        filiere_groupe = filieres_idx.get(groupe_id)
        stacks_groupe = stacks_idx.get(groupe_id)
        competences_requises = projet_info.get("competences_requises")
        encadrant_id = projet_info.get("encadrant_id")

        score = calculer_score(
            priorite,
            filiere_groupe=filiere_groupe,
            competences_projet=competences_requises,
            encadrant_id=encadrant_id,
            charge_encadrants=charge_encadrants,
            stacks_groupe=stacks_groupe,
            poids=poids_override,
        )

        capacite = capacites.get(projet_id, CAPACITE_PROJET_DEFAUT)
        affectations_projet.setdefault(projet_id, [])
        groupes_affectes = affectations_projet[projet_id]

        if len(groupes_affectes) < capacite:
            groupes_affectes.append((score, groupe_id))
            groupes_affectes.sort(reverse=True)
            continue

        score_min, groupe_evince = groupes_affectes[-1]
        if score > score_min:
            groupes_affectes[-1] = (score, groupe_id)
            groupes_affectes.sort(reverse=True)
            groupes_libres.append(groupe_evince)
        else:
            groupes_libres.append(groupe_id)

    resultat = {}
    for projet_id, groupes_affectes in affectations_projet.items():
        for _, groupe_id in groupes_affectes:
            resultat[groupe_id] = projet_id

    for groupe_id in preferences:
        resultat.setdefault(groupe_id, None)

    rapport = _generer_rapport(resultat, preferences)
    _afficher_rapport(rapport)

    return resultat


def _generer_rapport(resultat: dict, preferences: dict) -> dict:
    """Genere des indicateurs de qualite pour les affectations."""
    nb_total = len(preferences)
    satisfactions = {1: 0, 2: 0, 3: 0, "hors_pref": 0, "non_affecte": 0}
    total_affectes = 0
    somme_equity = 0

    for groupe_id, projet_id in resultat.items():
        if projet_id is None:
            satisfactions["non_affecte"] += 1
            continue

        total_affectes += 1
        preferences_groupe = preferences.get(groupe_id, [])
        rang_obtenu = None

        for projet_pref, priorite in preferences_groupe:
            if projet_pref == projet_id:
                rang_obtenu = priorite
                break

        if rang_obtenu in (1, 2, 3):
            satisfactions[rang_obtenu] += 1
            somme_equity += 4 - rang_obtenu
        else:
            satisfactions["hors_pref"] += 1

    equity_score = somme_equity / (3 * total_affectes) if total_affectes > 0 else 0.0
    taux_premier_voeu = (
        satisfactions[1] / nb_total * 100 if nb_total > 0 else 0.0
    )

    return {
        "equity_score": round(equity_score, 4),
        "taux_premier_voeu": round(taux_premier_voeu, 1),
        "satisfactions": satisfactions,
        "nb_groupes_total": nb_total,
        "nb_affectes": total_affectes,
        "nb_non_affectes": satisfactions["non_affecte"],
        "conforme_cdc": taux_premier_voeu >= 60.0,
    }


def _afficher_rapport(rapport: dict) -> None:
    """Affiche un rapport lisible en console pour le debug."""
    print("\n" + "=" * 52)
    print("RAPPORT D'EQUITE - MiniProj-AI Moteur IA")
    print("=" * 52)
    print(f"Score d'equite global      : {rapport['equity_score']:.4f} / 1.0")
    print(f"Taux 1er voeu satisfait    : {rapport['taux_premier_voeu']}%")
    print(f"Conforme CDC (> 60%)       : {'OUI' if rapport['conforme_cdc'] else 'NON'}")
    print(f"Groupes total              : {rapport['nb_groupes_total']}")
    print(f"Groupes affectes           : {rapport['nb_affectes']}")
    print(f"Groupes non affectes       : {rapport['nb_non_affectes']}")

    satisfactions = rapport["satisfactions"]
    print("-" * 52)
    print(f"1er choix obtenu           : {satisfactions.get(1, 0)} groupe(s)")
    print(f"2e choix obtenu            : {satisfactions.get(2, 0)} groupe(s)")
    print(f"3e choix obtenu            : {satisfactions.get(3, 0)} groupe(s)")
    print(f"Hors preferences           : {satisfactions.get('hors_pref', 0)} groupe(s)")
    print(f"Non affectes               : {satisfactions.get('non_affecte', 0)} groupe(s)")
    print("=" * 52 + "\n")


def affecter_projets_avec_rapport(
    choix_list: list[dict],
    projets_info: Optional[list[dict]] = None,
    groupes_info: Optional[list[dict]] = None,
    capacite_projets: Optional[Dict[int, int]] = None,
    poids_override: Optional[dict] = None,
) -> tuple[dict, dict]:
    """Point d'entree utilise par FastAPI : retourne les affectations et le rapport."""
    resultat = affecter_projets(
        choix_list,
        projets_info=projets_info,
        groupes_info=groupes_info,
        capacite_projets=capacite_projets,
        poids_override=poids_override,
    )

    preferences: dict[int, list[tuple[int, int]]] = {}
    for choix in choix_list:
        preferences.setdefault(choix["groupe_id"], []).append(
            (choix["projet_id"], choix["priorite"])
        )

    for groupe_id in preferences:
        preferences[groupe_id].sort(key=lambda item: item[1])

    rapport = _generer_rapport(resultat, preferences)
    return resultat, rapport


if __name__ == "__main__":
    print("TEST 1 : affectation simple")
    choix_test = [
        {"groupe_id": 1, "projet_id": 101, "priorite": 1},
        {"groupe_id": 1, "projet_id": 102, "priorite": 2},
        {"groupe_id": 1, "projet_id": 103, "priorite": 3},
        {"groupe_id": 2, "projet_id": 101, "priorite": 1},
        {"groupe_id": 2, "projet_id": 103, "priorite": 2},
        {"groupe_id": 2, "projet_id": 102, "priorite": 3},
        {"groupe_id": 3, "projet_id": 102, "priorite": 1},
        {"groupe_id": 3, "projet_id": 101, "priorite": 2},
        {"groupe_id": 3, "projet_id": 103, "priorite": 3},
    ]

    resultat_test = affecter_projets(choix_test)
    print("Resultat :", resultat_test)

    assert len(resultat_test) == 3
    assert len(set(resultat_test.values())) == 3
    print("OK : tous les groupes ont un projet unique.\n")

    print("TEST 2 : score avec adequation et charge")
    projets_test = [
        {"id": 101, "competences_requises": "IA Python data", "encadrant_id": 1},
        {"id": 102, "competences_requises": "web React FastAPI", "encadrant_id": 1},
        {"id": 103, "competences_requises": "reseau securite", "encadrant_id": 2},
    ]
    groupes_test = [
        {
            "id": 1,
            "competences": "Python IA data",
            "etudiants": [{"filiere": "DATA", "stacks": "Python pandas"}],
        },
        {
            "id": 2,
            "competences": "React web",
            "etudiants": [{"filiere": "ASEDS", "stacks": "React FastAPI"}],
        },
        {
            "id": 3,
            "competences": "reseau securite",
            "etudiants": [{"filiere": "ICCN", "stacks": "Cisco Linux"}],
        },
    ]

    resultat_test_2 = affecter_projets(
        choix_test,
        projets_info=projets_test,
        groupes_info=groupes_test,
    )
    print("Resultat avec score :", resultat_test_2, "\n")

    print("TEST 3 : plus de groupes que de projets")
    choix_test_3 = choix_test + [
        {"groupe_id": 4, "projet_id": 101, "priorite": 1},
        {"groupe_id": 4, "projet_id": 102, "priorite": 2},
        {"groupe_id": 4, "projet_id": 103, "priorite": 3},
    ]
    resultat_test_3 = affecter_projets(
        choix_test_3,
        projets_info=projets_test,
        groupes_info=groupes_test,
    )
    print("Resultat avec saturation :", resultat_test_3)
    print("Groupes non affectes :", [g for g, p in resultat_test_3.items() if p is None], "\n")

    print("TEST 4 : capacite multiple par projet")
    choix_test_4 = [
        {"groupe_id": 1, "projet_id": 10, "priorite": 1},
        {"groupe_id": 2, "projet_id": 10, "priorite": 1},
        {"groupe_id": 3, "projet_id": 10, "priorite": 1},
        {"groupe_id": 1, "projet_id": 11, "priorite": 2},
        {"groupe_id": 2, "projet_id": 11, "priorite": 2},
        {"groupe_id": 3, "projet_id": 11, "priorite": 2},
    ]
    resultat_test_4 = affecter_projets(choix_test_4, capacite_projets={10: 2, 11: 1})
    print("Resultat avec capacite :", resultat_test_4)
    assert list(resultat_test_4.values()).count(10) <= 2
    print("OK : la capacite des projets est respectee.")
