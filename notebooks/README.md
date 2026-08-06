# notebooks/ — Données & analyse (base Joconde)

Volet Données du projet (Seer). Le fichier brut `joconde.csv` (Ministère de la Culture, data.gouv.fr, 1,1 Go, ~1,03M lignes) n'est **pas versionné** dans ce repo (trop volumineux) — à télécharger séparément et à placer à la racine du dossier parent de `WIKART/` si on veut relancer `eda_joconde.ipynb` ou les scripts d'extraction depuis zéro. Les données déjà nettoyées, elles, sont versionnées dans [`../data/`](../data/).

## Setup (une seule fois)

```bash
cd notebooks
uv venv -p 3.11 .venv
uv sync
```

## Lancer un notebook

```bash
uv run jupyter notebook eda_joconde.ipynb          # exploration du fichier brut (nécessite joconde.csv en local)
uv run jupyter notebook rapport_analytique.ipynb   # analyse sur les données déjà nettoyées (LIVRABLE)
```

## Contenu

- **`eda_joconde.ipynb`** : exploration technique du CSV Joconde brut — dimensions, types, valeurs manquantes, doublons, pièges (séparateur, encodage), cardinalité des colonnes clés. Détail exécuté, pas destiné à être relu tel quel pour le rapport final.
- **`PROCEDURE_EDA.md`** : la synthèse narrative de ce qui précède — à lire à la place du notebook pour comprendre la démarche sans rouvrir le code. Sert de base à la partie "problèmes rencontrés / exploration et nettoyage" du livrable final.
- **`build_clean_csv.py`** → produit `../data/oeuvres_clean.csv` (137 474 œuvres filtrées/nettoyées). Nécessite `joconde.csv` en local pour être relancé.
- **`scrape_wikidata_artistes.py`** → produit les 3 fichiers Wikidata dans `../data/` (influence, mouvement) pour les 150 artistes les plus fréquents. Nécessite `joconde.csv` en local + un accès réseau à Wikidata.
- **`rapport_analytique.ipynb`** : **le notebook livrable** — analyse sur les données déjà nettoyées (`../data/*.csv`), répond aux premières questions métier en pandas/networkx (répartition géographique, couverture Wikidata, réseau d'influence, mouvements) en attendant l'import Neo4j complet par Rémi. Ne nécessite pas `joconde.csv`.

Le dictionnaire de données complet (une ligne = un champ, avec son format et son contenu) est dans [`../data/README.md`](../data/README.md).
