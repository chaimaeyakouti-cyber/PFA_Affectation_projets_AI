def affecter_projets(choix_list):
    """
    choix_list : liste de dicts comme :
    [
        {"groupe_id": 1, "projet_id": 3, "priorite": 1},
        {"groupe_id": 1, "projet_id": 5, "priorite": 2},
        {"groupe_id": 1, "projet_id": 7, "priorite": 3},
        {"groupe_id": 2, "projet_id": 3, "priorite": 1},  ← conflit avec groupe 1
        ...
    ]
    Retourne un dict : {groupe_id: projet_id}
    """

    
    choix_par_groupe = {}
    for choix in choix_list:
        g = choix["groupe_id"]
        p = choix["priorite"]
        proj = choix["projet_id"]
        if g not in choix_par_groupe:
            choix_par_groupe[g] = {}
        choix_par_groupe[g][p] = proj

    
    demandes_par_projet = {}
    for groupe_id, priorites in choix_par_groupe.items():
        for priorite, projet_id in priorites.items():
            if projet_id not in demandes_par_projet:
                demandes_par_projet[projet_id] = []
            demandes_par_projet[projet_id].append((priorite, groupe_id))

    affectations = {}      
    projets_pris = set()   
    groupes_sans_projet = set(choix_par_groupe.keys())  # groupes pas encore affectés

    
    for priorite_courante in [1, 2, 3]:
        
        demandes_ce_tour = {}  
        for groupe_id in groupes_sans_projet:
            projet_voulu = choix_par_groupe.get(groupe_id, {}).get(priorite_courante)
            if projet_voulu and projet_voulu not in projets_pris:
                if projet_voulu not in demandes_ce_tour:
                    demandes_ce_tour[projet_voulu] = []
                demandes_ce_tour[projet_voulu].append(groupe_id)

        
        for projet_id, groupes_demandeurs in demandes_ce_tour.items():
            if len(groupes_demandeurs) == 1:
                
                groupe_id = groupes_demandeurs[0]
                affectations[groupe_id] = projet_id
                projets_pris.add(projet_id)
                groupes_sans_projet.discard(groupe_id)
            else:
                
                groupe_choisi = None
                min_alternatives = 999

                for groupe_id in groupes_demandeurs:
                    
                    alternatives = 0
                    for p in [1, 2, 3]:
                        proj = choix_par_groupe.get(groupe_id, {}).get(p)
                        if proj and proj not in projets_pris and proj != projet_id:
                            alternatives += 1
                    if alternatives < min_alternatives:
                        min_alternatives = alternatives
                        groupe_choisi = groupe_id

                
                affectations[groupe_choisi] = projet_id
                projets_pris.add(projet_id)
                groupes_sans_projet.discard(groupe_choisi)

    # Étape 4 — Groupes qui n'ont rien eu (aucun de leurs choix disponible)
    for groupe_id in groupes_sans_projet:
        affectations[groupe_id] = None  # pas de projet disponible

    return affectations