"""GDS : PageRank (centralité) et Louvain (communautés), Bloc 2.

LIMITATION DOCUMENTÉE (plan de repli, section 4.3 de Repartition-Taches-Journee.md) :
sur cette instance AuraDB Free, `gds.graph.project` exige d'abord une session
"Aura Graph Analytics" (`gds.session.getOrCreate`) — un produit serverless
facturé à l'usage, séparé du plan Free, avec une taille minimale de 2 Go même
pour notre minuscule réseau d'influence (54 relations). Ce n'est PAS un
problème de mémoire/temps sur nos données (313 Ko), c'est une contrainte de
plateforme : GDS n'est plus embarqué gratuitement dans AuraDB.

Décision (validée avec Rémi) : ne pas créer de session payante. On applique
le repli prévu :
  - "centralité" → proxy par degré d'influence, déjà en place dans
    queries_metier.artistes_centraux_mouvement() (comptage Cypher pur).
  - "chaîne d'influence" → shortestPath, déjà en place dans
    queries_metier.chaine_influence().
  - Louvain (détection de communautés/mouvements) → non substitué, capacité
    absente de cette V1, documentée ici plutôt que masquée.

Ce script reste fonctionnel et prêt à l'emploi si l'équipe décide plus tard
de payer une session AGA (ex. pour la soutenance) : décommenter l'appel à
`gds.session.getOrCreate` dans `main()` avant de lancer.

Usage : uv run scripts/gds_algorithms.py
"""
from connection import get_driver, run_query, NEO4J_DATABASE

GRAPH_DIRECTED = "influence_directed"
GRAPH_UNDIRECTED = "influence_undirected"

# Taille minimale proposée par gds.session.estimate() pour notre volumétrie.
SESSION_NAME = "wikart-gds"
SESSION_MEMORY = "2GB"


def create_session_if_needed(driver) -> None:
    """Crée la session Aura Graph Analytics payante. NON appelée par défaut
    (cf. limitation documentée en tête de fichier) — à activer manuellement."""
    run_query(
        driver,
        "CALL gds.session.getOrCreate($name, $memory)",
        {"name": SESSION_NAME, "memory": SESSION_MEMORY},
    )


def _drop_if_exists(driver, name: str) -> None:
    exists = run_query(driver, "CALL gds.graph.exists($name) YIELD exists RETURN exists", {"name": name})
    if exists and exists[0]["exists"]:
        run_query(driver, "CALL gds.graph.drop($name)", {"name": name})


def project_graphs(driver) -> None:
    _drop_if_exists(driver, GRAPH_DIRECTED)
    run_query(driver, "CALL gds.graph.project($name, 'Artiste', 'INFLUENCE_PAR')", {"name": GRAPH_DIRECTED})

    _drop_if_exists(driver, GRAPH_UNDIRECTED)
    run_query(
        driver,
        """
        CALL gds.graph.project(
            $name, 'Artiste',
            {INFLUENCE_PAR: {orientation: 'UNDIRECTED'}}
        )
        """,
        {"name": GRAPH_UNDIRECTED},
    )


def pagerank(driver) -> list[dict]:
    return run_query(
        driver,
        """
        CALL gds.pageRank.stream($graph)
        YIELD nodeId, score
        WITH gds.util.asNode(nodeId) AS n, score
        WHERE score > 0.15
        RETURN coalesce(n.label_wikidata, n.nom) AS artiste, round(score, 4) AS score
        ORDER BY score DESC
        LIMIT 15
        """,
        {"graph": GRAPH_DIRECTED},
    )


def louvain(driver) -> list[dict]:
    return run_query(
        driver,
        """
        CALL gds.louvain.stream($graph)
        YIELD nodeId, communityId
        WITH gds.util.asNode(nodeId) AS n, communityId
        OPTIONAL MATCH (n)-[:APPARTIENT_AU_MOUVEMENT]->(mv:MouvementArtistique)
        RETURN communityId,
               collect(DISTINCT coalesce(n.label_wikidata, n.nom)) AS artistes,
               collect(DISTINCT mv.nom) AS mouvements_connus
        ORDER BY size(artistes) DESC
        """,
        {"graph": GRAPH_UNDIRECTED},
    )


def cleanup(driver) -> None:
    _drop_if_exists(driver, GRAPH_DIRECTED)
    _drop_if_exists(driver, GRAPH_UNDIRECTED)


def main() -> None:
    driver = get_driver()
    try:
        # create_session_if_needed(driver)  # décommenter pour activer (facturé)
        project_graphs(driver)

        print("=== PageRank — centralité dans le réseau d'influence ===")
        for r in pagerank(driver):
            print(r)

        print("\n=== Louvain — communautés détectées (comparées aux mouvements Wikidata connus) ===")
        for r in louvain(driver):
            print(r)
    finally:
        cleanup(driver)
        driver.close()


if __name__ == "__main__":
    main()
