"""CRUD Python — livrable séparé exigé par le sujet.

Démonstration Create/Read/Update/Delete sur le nœud Oeuvre, via le driver
`neo4j` Python DIRECTEMENT (pas d'appel HTTP à l'API Express de Conambot —
c'est un livrable indépendant du CRUD web, cf. section "Rappel exigence du
sujet" de Repartition-Taches-Journee.md).

Le nœud de démonstration utilise une référence préfixée `DEMO-CRUD-` pour ne
jamais entrer en collision avec les identifiants réels Joconde (numériques),
et le script nettoie derrière lui (delete en fin de démo).

Usage : uv run scripts/admin/crud.py
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from connection import get_driver, run_query, NEO4J_DATABASE  # noqa: E402


def create_oeuvre(
    driver, reference: str, titre: str, annee: int | None = None,
    artiste_nom: str | None = None, musee_code: str | None = None,
) -> dict:
    query = """
    MERGE (o:Oeuvre {reference: $reference})
    SET o.titre = $titre, o.annee_creation = $annee
    WITH o
    OPTIONAL MATCH (a:Artiste {nom: $artiste_nom})
    FOREACH (_ IN CASE WHEN a IS NOT NULL THEN [1] ELSE [] END |
        MERGE (a)-[rel:A_CREE]->(o) SET rel.annee = $annee
    )
    WITH o
    OPTIONAL MATCH (m:Musee {code_museofile: $musee_code})
    FOREACH (_ IN CASE WHEN m IS NOT NULL THEN [1] ELSE [] END |
        MERGE (o)-[:EXPOSEE_A]->(m)
    )
    RETURN properties(o) AS oeuvre
    """
    rows = run_query(driver, query, {
        "reference": reference, "titre": titre, "annee": annee,
        "artiste_nom": artiste_nom, "musee_code": musee_code,
    })
    return rows[0]["oeuvre"]


def read_oeuvre(driver, reference: str) -> dict | None:
    query = """
    MATCH (o:Oeuvre {reference: $reference})
    OPTIONAL MATCH (a:Artiste)-[:A_CREE]->(o)
    OPTIONAL MATCH (o)-[:EXPOSEE_A]->(m:Musee)
    RETURN properties(o) AS oeuvre, collect(DISTINCT a.nom) AS artistes, m.nom AS musee
    """
    rows = run_query(driver, query, {"reference": reference})
    return rows[0] if rows else None


def update_oeuvre(driver, reference: str, **fields) -> dict | None:
    query = """
    MATCH (o:Oeuvre {reference: $reference})
    SET o += $fields
    RETURN properties(o) AS oeuvre
    """
    rows = run_query(driver, query, {"reference": reference, "fields": fields})
    return rows[0]["oeuvre"] if rows else None


def delete_oeuvre(driver, reference: str) -> int:
    query = """
    MATCH (o:Oeuvre {reference: $reference})
    WITH o, o.reference AS ref
    DETACH DELETE o
    RETURN count(ref) AS supprime
    """
    rows = run_query(driver, query, {"reference": reference})
    return rows[0]["supprime"]


def main() -> None:
    driver = get_driver()
    ref = "DEMO-CRUD-0001"
    try:
        musee = run_query(driver, "MATCH (m:Musee {nom: 'musée Rodin'}) RETURN m.code_museofile AS code LIMIT 1")
        musee_code = musee[0]["code"] if musee else None

        print("--- CREATE ---")
        print(create_oeuvre(
            driver, ref, "Étude — démonstration CRUD Python", 2026,
            artiste_nom="Rodin Auguste (1840-1917)", musee_code=musee_code,
        ))

        print("\n--- READ ---")
        print(read_oeuvre(driver, ref))

        print("\n--- UPDATE ---")
        print(update_oeuvre(driver, ref, titre="Étude — démonstration CRUD Python (modifiée)"))
        print(read_oeuvre(driver, ref))

        print("\n--- DELETE ---")
        n = delete_oeuvre(driver, ref)
        print(f"{n} nœud(s) supprimé(s)")
        print("Vérification post-delete :", read_oeuvre(driver, ref))
    finally:
        driver.close()


if __name__ == "__main__":
    main()
