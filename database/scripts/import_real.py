"""Import réel des données livrées par Seer dans AuraDB (Bloc 2).

Remplace l'échantillon fictif du Bloc 1 : vide le graphe puis importe
les 137k œuvres, artistes, musées/villes/départements/régions, mouvements
et relations d'influence Wikidata depuis le dossier data/ situé à la racine.

Usage :
    uv run scripts/import_real.py           # Vide le graphe puis importe tout
    uv run scripts/import_real.py --no-wipe # Rajoute/met à jour sans vider le graphe
"""
from __future__ import annotations

import argparse
import math
from pathlib import Path

import pandas as pd

from connection import get_driver, NEO4J_DATABASE

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
BATCH_SIZE = 2000


def chunks(lst: list, n: int):
    for i in range(0, len(lst), n):
        yield lst[i : i + n]


def clean_nan(v):
    if isinstance(v, float) and math.isnan(v):
        return None
    return v


def to_int(v):
    if v is None or (isinstance(v, float) and math.isnan(v)):
        return None
    return int(v)


def split_multi(v) -> list[str]:
    if v is None or (isinstance(v, float) and math.isnan(v)):
        return []
    return [s.strip() for s in str(v).split(";") if s.strip()]


def wipe_graph(session) -> None:
    session.run("MATCH (n) DETACH DELETE n")
    print("Graphe vidé (échantillon fictif du Bloc 1 supprimé).")


def import_geo_and_musees(session, df: pd.DataFrame) -> None:
    subset = df[
        ["region", "departement", "ville", "code_museofile", "nom_musee", "lat", "lon"]
    ].drop_duplicates(subset=["code_museofile"])
    rows = [
        {
            "region": r.region,
            "departement": r.departement,
            "ville": r.ville,
            "code_museofile": r.code_museofile,
            "nom_musee": r.nom_musee,
            "lat": clean_nan(r.lat),
            "lon": clean_nan(r.lon),
        }
        for r in subset.itertuples()
    ]
    query = """
    UNWIND $rows AS row
    MERGE (reg:Region {nom: row.region})
    MERGE (dep:Departement {nom: row.departement})
    MERGE (dep)-[:DANS]->(reg)
    MERGE (v:Ville {nom: row.ville, departement: row.departement})
    MERGE (v)-[:DANS]->(dep)
    MERGE (m:Musee {code_museofile: row.code_museofile})
      SET m.nom = row.nom_musee, m.lat = row.lat, m.lon = row.lon
    MERGE (m)-[:SITUE_A]->(v)
    """
    for batch in chunks(rows, BATCH_SIZE):
        session.run(query, rows=batch)
    print(f"{len(rows)} musées (+ villes/départements/régions) importés.")


def import_oeuvres(session, df: pd.DataFrame) -> None:
    rows = [
        {
            "reference": r.id_oeuvre,
            "titre": clean_nan(r.titre),
            "annee_creation": to_int(r.annee_creation),
            "domaine": split_multi(r.domaine),
            "epoque": clean_nan(r.epoque),
            "ecole_pays": split_multi(r.ecole_pays),
            "materiaux_techniques": clean_nan(r.materiaux_techniques),
            "mesures": clean_nan(r.mesures),
            "code_museofile": r.code_museofile,
        }
        for r in df.itertuples()
    ]
    query = """
    UNWIND $rows AS row
    MATCH (m:Musee {code_museofile: row.code_museofile})
    MERGE (o:Oeuvre {reference: row.reference})
    SET o.titre = row.titre, o.annee_creation = row.annee_creation,
        o.domaine = row.domaine, o.epoque = row.epoque,
        o.ecole_pays = row.ecole_pays, o.materiaux_techniques = row.materiaux_techniques,
        o.mesures = row.mesures
    MERGE (o)-[:EXPOSEE_A]->(m)
    """
    total = 0
    for batch in chunks(rows, BATCH_SIZE):
        session.run(query, rows=batch)
        total += len(batch)
        print(f"  Oeuvres : {total}/{len(rows)}")
    print(f"{len(rows)} œuvres importées.")


def load_wikidata_lookup() -> dict[str, dict]:
    df = pd.read_csv(DATA_DIR / "artistes_wikidata.csv")
    lookup: dict[str, dict] = {}
    for r in df.itertuples():
        lookup[r.auteur_joconde] = {
            "label_wikidata": clean_nan(r.label_wikidata),
            "qid_wikidata": clean_nan(r.qid_wikidata),
            "naissance": to_int(r.naissance),
            "deces": to_int(r.deces),
        }
    return lookup


def import_artistes(session, df: pd.DataFrame, wikidata_lookup: dict[str, dict]) -> None:
    pairs = []
    for r in df.itertuples():
        for auteur_nom in split_multi(r.auteur_brut):
            enrich = wikidata_lookup.get(auteur_nom, {})
            pairs.append(
                {
                    "reference": r.id_oeuvre,
                    "nom": auteur_nom,
                    "annee": to_int(r.annee_creation),
                    "label_wikidata": enrich.get("label_wikidata"),
                    "qid_wikidata": enrich.get("qid_wikidata"),
                    "naissance": enrich.get("naissance"),
                    "deces": enrich.get("deces"),
                }
            )
    query = """
    UNWIND $rows AS row
    MATCH (o:Oeuvre {reference: row.reference})
    MERGE (a:Artiste {nom: row.nom})
    SET a.label_wikidata = coalesce(row.label_wikidata, a.label_wikidata),
        a.qid_wikidata = coalesce(row.qid_wikidata, a.qid_wikidata),
        a.naissance = coalesce(row.naissance, a.naissance),
        a.deces = coalesce(row.deces, a.deces)
    MERGE (a)-[rel:A_CREE]->(o)
    SET rel.annee = row.annee
    """
    total = 0
    for batch in chunks(pairs, BATCH_SIZE):
        session.run(query, rows=batch)
        total += len(batch)
        print(f"  Relations A_CREE : {total}/{len(pairs)}")
    distinct = len({p["nom"] for p in pairs})
    print(f"{len(pairs)} relations Artiste→Œuvre importées ({distinct} artistes distincts).")


def import_mouvements(session) -> None:
    df = pd.read_csv(DATA_DIR / "artistes_mouvement.csv")
    rows = df.to_dict("records")
    query = """
    UNWIND $rows AS row
    MATCH (a:Artiste {label_wikidata: row.artiste})
    MERGE (mv:MouvementArtistique {nom: row.mouvement})
    MERGE (a)-[:APPARTIENT_AU_MOUVEMENT]->(mv)
    """
    session.run(query, rows=rows)
    print(f"{len(rows)} relations APPARTIENT_AU_MOUVEMENT importées.")


def import_influences(session, known_artist_labels: set[str]) -> None:
    df = pd.read_csv(DATA_DIR / "rel_influence_par.csv")
    rows = df.to_dict("records")
    to_artist = [r for r in rows if r["influenceur"] in known_artist_labels]
    to_concept = [r for r in rows if r["influenceur"] not in known_artist_labels]

    if to_artist:
        session.run(
            """
            UNWIND $rows AS row
            MATCH (a:Artiste {label_wikidata: row.artiste})
            MATCH (i:Artiste {label_wikidata: row.influenceur})
            MERGE (a)-[:INFLUENCE_PAR]->(i)
            """,
            rows=to_artist,
        )
    if to_concept:
        session.run(
            """
            UNWIND $rows AS row
            MATCH (a:Artiste {label_wikidata: row.artiste})
            MERGE (c:Concept {nom: row.influenceur})
            MERGE (a)-[:INFLUENCE_PAR]->(c)
            """,
            rows=to_concept,
        )
    print(
        f"{len(to_artist)} relations INFLUENCE_PAR vers un Artiste, "
        f"{len(to_concept)} vers un Concept."
    )


def main() -> None:
    df = pd.read_csv(DATA_DIR / "oeuvres_clean.csv")
    wikidata_lookup = load_wikidata_lookup()
    known_artist_labels = {
        v["label_wikidata"] for v in wikidata_lookup.values() if v["label_wikidata"]
    }

    driver = get_driver()
    try:
        with driver.session(database=NEO4J_DATABASE) as session:
            wipe_graph(session)
            import_geo_and_musees(session, df)
            import_oeuvres(session, df)
            import_artistes(session, df, wikidata_lookup)
            import_mouvements(session)
            import_influences(session, known_artist_labels)
    finally:
        driver.close()
    print("\nImport réel terminé.")


if __name__ == "__main__":
    main()
