"""
GDS : PageRank et Louvain sur le réseau d'influence artistique.

Un seul script :
- crée la projection GDS
- lance PageRank
- lance Louvain

Graphe :
(:Artiste)-[:INFLUENCE_ARTISTIQUE]->(:Artiste)
"""

from connection import get_driver, run_query


GRAPH_NAME = "artistGraph"


def drop_graph(driver):
    run_query(
        driver,
        """
        CALL gds.graph.exists($name)
        YIELD exists
        WITH exists
        WHERE exists = true
        CALL gds.graph.drop($name)
        YIELD graphName
        RETURN graphName
        """,
        {
            "name": GRAPH_NAME
        },
    )


def create_graph(driver):

    drop_graph(driver)

    print("Projection GDS...")

    run_query(
        driver,
        """
        CALL gds.graph.project(
            $name,
            'Artiste',
            'INFLUENCE_ARTISTIQUE',
            {
                memory: '2GB'
            }
        )
        YIELD graphName
        RETURN graphName
        """,
        {
            "name": GRAPH_NAME
        },
    )


def pagerank(driver):

    return run_query(
        driver,
        """
        CALL gds.pageRank.stream($graph)

        YIELD nodeId, score

        RETURN
            gds.util.asNode(nodeId).nom AS artiste,
            round(score, 4) AS score

        ORDER BY score DESC

        LIMIT 15
        """,
        {
            "graph": GRAPH_NAME
        },
    )


def louvain(driver):

    return run_query(
        driver,
        """
        CALL gds.louvain.stream($graph)

        YIELD nodeId, communityId

        WITH
            gds.util.asNode(nodeId) AS artiste,
            communityId

        WITH
            communityId,
            collect(artiste.nom) AS artistes

        WHERE size(artistes) >= 5

        RETURN
            communityId,
            artistes

        ORDER BY size(artistes) DESC
        """,
        {
            "graph": GRAPH_NAME
        },
    )

def main():

    driver = get_driver()

    try:

        create_graph(driver)

        print("\n=== PageRank ===\n")

        for row in pagerank(driver):
            print(
                f"{row['artiste']} : {row['score']}"
            )


        print("\n=== Louvain ===\n")

        for row in louvain(driver):
            print(
                f"\nCommunauté {row['communityId']}"
            )

            for artiste in row["artistes"]:
                print("-", artiste)


    finally:
        driver.close()


if __name__ == "__main__":
    main()