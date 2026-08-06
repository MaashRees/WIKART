"""Import d'un petit échantillon FICTIF pour valider le pipeline en attendant
la vraie livraison de Seer (Bloc 1 — cf. Repartition-Taches-Journee.md).

Usage : uv run scripts/import_sample.py

Le jeu de données reprend volontairement les mêmes artistes/musées/mouvements
que les mocks du frontend (frontend/src/api/mocks.js) pour que la démo reste
cohérente tant que le vrai import (Bloc 2) n'a pas eu lieu.
"""
from connection import get_driver, NEO4J_DATABASE

ARTISTES = [
    {"nom": "Claude Monet", "label_wikidata": "Claude Monet", "naissance": 1840, "deces": 1926},
    {"nom": "Eugène Boudin", "label_wikidata": "Eugène Boudin", "naissance": 1824, "deces": 1898},
    {"nom": "Johan Barthold Jongkind", "label_wikidata": "Johan Barthold Jongkind", "naissance": 1819, "deces": 1891},
    {"nom": "Camille Pissarro", "label_wikidata": "Camille Pissarro", "naissance": 1830, "deces": 1903},
    {"nom": "Auguste Renoir", "label_wikidata": "Auguste Renoir", "naissance": 1841, "deces": 1919},
]

MOUVEMENTS = ["Impressionnisme", "Renaissance", "Art nouveau", "Cubisme"]

ARTISTE_MOUVEMENT = [
    ("Claude Monet", "Impressionnisme"),
    ("Camille Pissarro", "Impressionnisme"),
    ("Auguste Renoir", "Impressionnisme"),
]

INFLUENCES = [
    ("Claude Monet", "Eugène Boudin"),
    ("Claude Monet", "Johan Barthold Jongkind"),
    ("Auguste Renoir", "Claude Monet"),
]

REGIONS = ["Île-de-France", "Normandie", "Provence-Alpes-Côte d'Azur"]

DEPARTEMENTS = [
    ("Paris", "Île-de-France"),
    ("Calvados", "Normandie"),
    ("Bouches-du-Rhône", "Provence-Alpes-Côte d'Azur"),
]

VILLES = [
    ("Paris", "Paris"),
    ("Caen", "Calvados"),
    ("Marseille", "Bouches-du-Rhône"),
]

MUSEES = [
    {"code_museofile": "M_FAKE_001", "nom": "Musée Marmottan", "ville": "Paris", "lat": 48.8583, "lon": 2.2761},
    {"code_museofile": "M_FAKE_002", "nom": "Musée de l'Orangerie", "ville": "Paris", "lat": 48.8638, "lon": 2.3223},
    {"code_museofile": "M_FAKE_003", "nom": "Musée d'Orsay", "ville": "Paris", "lat": 48.8600, "lon": 2.3266},
]

OEUVRES = [
    {"reference": "FAKE-0001", "titre": "Impression, soleil fictif", "artiste": "Claude Monet", "annee": 1872, "musee": "M_FAKE_001"},
    {"reference": "FAKE-0002", "titre": "Nymphéas (étude fictive)", "artiste": "Claude Monet", "annee": 1900, "musee": "M_FAKE_002"},
    {"reference": "FAKE-0003", "titre": "Plage fictive à Trouville", "artiste": "Eugène Boudin", "annee": 1865, "musee": "M_FAKE_003"},
    {"reference": "FAKE-0004", "titre": "Bal fictif", "artiste": "Auguste Renoir", "annee": 1876, "musee": "M_FAKE_003"},
    {"reference": "FAKE-0005", "titre": "Les toits fictifs de Pontoise", "artiste": "Camille Pissarro", "annee": 1868, "musee": "M_FAKE_002"},
]


def main() -> None:
    driver = get_driver()
    try:
        with driver.session(database=NEO4J_DATABASE) as session:
            session.execute_write(_import_all)
    finally:
        driver.close()
    print("Échantillon fictif importé avec succès.")


def _import_all(tx):
    for r in REGIONS:
        tx.run("MERGE (:Region {nom: $nom})", nom=r)

    for dep, region in DEPARTEMENTS:
        tx.run(
            """
            MATCH (r:Region {nom: $region})
            MERGE (d:Departement {nom: $dep})
            MERGE (d)-[:DANS]->(r)
            """,
            dep=dep, region=region,
        )

    for ville, dep in VILLES:
        tx.run(
            """
            MATCH (d:Departement {nom: $dep})
            MERGE (v:Ville {nom: $ville, departement: $dep})
            MERGE (v)-[:DANS]->(d)
            """,
            ville=ville, dep=dep,
        )

    for m in MUSEES:
        tx.run(
            """
            MATCH (v:Ville {nom: $ville})
            MERGE (mu:Musee {code_museofile: $code_museofile})
            SET mu.nom = $nom, mu.lat = $lat, mu.lon = $lon
            MERGE (mu)-[:SITUE_A]->(v)
            """,
            ville=m["ville"], code_museofile=m["code_museofile"],
            nom=m["nom"], lat=m["lat"], lon=m["lon"],
        )

    for a in ARTISTES:
        tx.run(
            """
            MERGE (a:Artiste {nom: $nom})
            SET a.label_wikidata = $label_wikidata, a.naissance = $naissance, a.deces = $deces
            """,
            **a,
        )

    for mv in MOUVEMENTS:
        tx.run("MERGE (:MouvementArtistique {nom: $nom})", nom=mv)

    for artiste, mouvement in ARTISTE_MOUVEMENT:
        tx.run(
            """
            MATCH (a:Artiste {nom: $artiste}), (mv:MouvementArtistique {nom: $mouvement})
            MERGE (a)-[:APPARTIENT_AU_MOUVEMENT]->(mv)
            """,
            artiste=artiste, mouvement=mouvement,
        )

    for artiste, influenceur in INFLUENCES:
        tx.run(
            """
            MATCH (a:Artiste {nom: $artiste}), (i:Artiste {nom: $influenceur})
            MERGE (a)-[:INFLUENCE_PAR]->(i)
            """,
            artiste=artiste, influenceur=influenceur,
        )

    for o in OEUVRES:
        tx.run(
            """
            MATCH (a:Artiste {nom: $artiste}), (m:Musee {code_museofile: $musee})
            MERGE (o:Oeuvre {reference: $reference})
            SET o.titre = $titre, o.annee_creation = $annee
            MERGE (a)-[:A_CREE {annee: $annee}]->(o)
            MERGE (o)-[:EXPOSEE_A]->(m)
            """,
            reference=o["reference"], titre=o["titre"], annee=o["annee"],
            artiste=o["artiste"], musee=o["musee"],
        )


if __name__ == "__main__":
    main()
