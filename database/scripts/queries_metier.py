"""
Chaque requête est exposée comme une fonction paramétrable (réutilisable
telle quelle par l'API Express de Conambot) + une démo exécutable avec
des valeurs réelles du graphe importé.

Usage : uv run scripts/queries_metier.py
"""
from connection import get_driver, run_query, NEO4J_DATABASE

def artistes_centraux_mouvement(driver, mouvement: str, limit: int = 10) -> list[dict]:
    query = """
    MATCH (a:Artiste)-[:APPARTIENT_AU_MOUVEMENT]->(mv:MouvementArtistique {nom: $mouvement})
    OPTIONAL MATCH (a)-[r:INFLUENCE_PAR]-()
    RETURN a.label_wikidata AS artiste, count(r) AS degre_influence
    ORDER BY degre_influence DESC, artiste
    LIMIT $limit
    """
    return run_query(driver, query, {"mouvement": mouvement, "limit": limit})

def chaine_influence(driver, depart: str, arrivee: str) -> list[dict]:
    query = """
    MATCH p = shortestPath(
        (a:Artiste {label_wikidata: $depart})-[:INFLUENCE_PAR*1..6]->(b:Artiste {label_wikidata: $arrivee})
    )
    RETURN [n IN nodes(p) | coalesce(n.label_wikidata, n.nom)] AS chaine, length(p) AS nb_sauts
    """
    return run_query(driver, query, {"depart": depart, "arrivee": arrivee})

def concentration_geo_mouvement(driver, mouvement: str) -> list[dict]:
    query = """
    MATCH (a:Artiste)-[:APPARTIENT_AU_MOUVEMENT]->(mv:MouvementArtistique {nom: $mouvement})
    MATCH (a)-[:A_CREE]->(o:Oeuvre)-[:EXPOSEE_A]->(:Musee)-[:SITUE_A]->(:Ville)-[:DANS]->(:Departement)-[:DANS]->(r:Region)
    RETURN r.nom AS region, count(DISTINCT o) AS nb_oeuvres
    ORDER BY nb_oeuvres DESC
    """
    return run_query(driver, query, {"mouvement": mouvement})

def musees_hubs_mouvement(driver, mouvement: str, limit: int = 10) -> list[dict]:
    query = """
    MATCH (a:Artiste)-[:APPARTIENT_AU_MOUVEMENT]->(mv:MouvementArtistique {nom: $mouvement})
    MATCH (a)-[:A_CREE]->(o:Oeuvre)-[:EXPOSEE_A]->(m:Musee)
    RETURN m.nom AS musee, count(DISTINCT o) AS nb_oeuvres
    ORDER BY nb_oeuvres DESC
    LIMIT $limit
    """
    return run_query(driver, query, {"mouvement": mouvement, "limit": limit})

def repartition_oeuvres_artiste(driver, artiste_nom: str) -> list[dict]:
    query = """
    MATCH (a:Artiste {nom: $artiste_nom})-[:A_CREE]->(o:Oeuvre)-[:EXPOSEE_A]->(m:Musee)
        -[:SITUE_A]->(:Ville)-[:DANS]->(:Departement)-[:DANS]->(r:Region)
    RETURN m.nom AS musee, r.nom AS region, count(o) AS nb_oeuvres
    ORDER BY nb_oeuvres DESC
    """
    return run_query(driver, query, {"artiste_nom": artiste_nom})


def _print(title: str, rows: list[dict]) -> None:
    print(f"\n=== {title} ===")
    if not rows:
        print("(aucun résultat)")
    for r in rows:
        print(r)


def main() -> None:
    driver = get_driver()
    try:
        _print(
            "1. Artistes centraux - mouvement 'symbolisme'",
            artistes_centraux_mouvement(driver, "symbolisme"),
        )
        _print(
            "2. Chaîne d'influence - Raoul Dufy → Gustave Courbet",
            chaine_influence(driver, "Raoul Dufy", "Gustave Courbet"),
        )
        _print(
            "3. Concentration géographique - mouvement 'symbolisme'",
            concentration_geo_mouvement(driver, "symbolisme"),
        )
        _print(
            "4. Musées hubs - mouvement 'symbolisme'",
            musees_hubs_mouvement(driver, "symbolisme"),
        )
        _print(
            "5. Répartition des œuvres - Rodin Auguste (1840-1917)",
            repartition_oeuvres_artiste(driver, "Rodin Auguste (1840-1917)"),
        )
    finally:
        driver.close()


if __name__ == "__main__":
    main()
