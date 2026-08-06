"""
Enrichissement Wikidata des artistes Joconde : influences (P737) et mouvements (P135).

Contexte
--------
Le modele de graphe cible pour le projet Neo4j comporte :
  - une relation (Artiste)-[:INFLUENCE_PAR]->(Artiste)
  - un noeud (MouvementArtistique)
Ces deux informations ne sont PAS fiables dans Joconde (le champ `Epoque` n'est
rempli qu'a ~6% et contient surtout des periodes archeologiques). On va donc les
chercher sur Wikidata, via son endpoint SPARQL public, pour les artistes les plus
representes dans notre extrait Joconde.

Etapes
------
1. Charger joconde.csv, filtrer sur Domaine ~ peinture/sculpture/beaux-arts, exclure
   les anonymes, prendre les 150 valeurs les plus frequentes de `Auteur`.
2. Parser chaque graphie "NOM Prenom (naissance-mort)" en heuristique.
3. Interroger Wikidata par lots (VALUES sur les labels "Prenom Nom"@fr/@en),
   recuperer P737 (influence par) et P135 (mouvement), avec P569 (date de
   naissance) comme filtre de desambiguisation entre homonymes.
4. Ecrire 3 CSV dans ../data/.

Usage : uv run python scrape_wikidata_artistes.py
"""

from __future__ import annotations

import re
import time
from pathlib import Path

import pandas as pd
import requests

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

SCRIPT_DIR = Path(__file__).resolve().parent
JOCONDE_CSV = SCRIPT_DIR.parent.parent / "joconde.csv"  # fichier brut, non versionne, a la racine de Projet/
DATA_DIR = SCRIPT_DIR.parent / "data"

N_TARGET_ARTISTS = 10000
BATCH_SIZE = 50

SPARQL_ENDPOINT = "https://query.wikidata.org/sparql"
HEADERS = {
    "User-Agent": "ProjetNoSQL-IPSSI/1.0 (etudiant; usage academique)",
    "Accept": "application/sparql-results+json",
}
SLEEP_BETWEEN_BATCHES = 1.0
MAX_RETRIES = 3
RETRY_BACKOFF_S = 5.0
DOB_TOLERANCE_YEARS = 1


# ---------------------------------------------------------------------------
# Etape 1 : extraction des artistes cibles depuis Joconde
# ---------------------------------------------------------------------------

def _read_joconde_csv(csv_path: Path) -> pd.DataFrame:
    """Charge joconde.csv en essayant d'abord le moteur strict pyarrow (rapide),
    et bascule sur un moteur tolerant si une ou plusieurs lignes sont malformees
    (deja rencontre : une mise a jour Joconde a introduit une ligne avec une
    sequence de guillemets cassee dans le champ Bibliographie, qui fait echouer
    pyarrow avec "Expected 68 columns, got 67"). Les lignes malformees sont
    ignorees et comptees, jamais silencieusement perdues sans le signaler."""
    common_kwargs = dict(
        sep="|", quotechar='"', dtype=str, na_values=[""], encoding="utf-8"
    )
    try:
        return pd.read_csv(csv_path, engine="pyarrow", **common_kwargs)
    except pd.errors.ParserError as exc:
        print(f"[avertissement] lecture stricte (pyarrow) echouee : {exc}")
        print("[avertissement] nouvel essai avec le moteur python (plus lent, plus tolerant), lignes malformees ignorees...")
        bad_lines: list[list[str]] = []

        def _on_bad_line(bad_line: list[str]):
            bad_lines.append(bad_line)
            return None  # None = ignorer la ligne plutot que de planter

        df = pd.read_csv(
            csv_path, engine="python", on_bad_lines=_on_bad_line, **common_kwargs
        )
        print(
            f"[avertissement] {len(bad_lines)} ligne(s) malformee(s) ignoree(s) "
            f"sur {len(df) + len(bad_lines)} lignes lues au total."
        )
        return df


def load_top_artists(csv_path: Path, n: int) -> pd.Series:
    """Retourne une Series (index=graphie Auteur, value=count) des n artistes
    les plus frequents parmi les oeuvres de peinture/sculpture/beaux-arts, hors
    anonymes."""
    df = _read_joconde_csv(csv_path)
    mask = df["Domaine"].fillna("").str.contains("peinture|sculpture|beaux-arts", case=False)
    sub = df[mask]
    sub = sub[sub["Auteur"].notna() & ~sub["Auteur"].fillna("").str.contains("anonyme", case=False)]
    return sub["Auteur"].value_counts().head(n)


# Un contenu de parenthese qui ressemble a des dates de naissance/mort, avec
# tolerance pour "vers", une seule annee, ou une borne manquante.
_DATE_RANGE_RE = re.compile(
    r"^\s*(?:vers\s+|n[ée]\s+(?:vers\s+|en\s+)?|actif\s+(?:vers\s+)?)?"
    r"(\d{3,4})?\s*-\s*(\d{3,4})?\s*$",
    re.IGNORECASE,
)
_DATE_SINGLE_RE = re.compile(r"^\s*(?:vers\s+)?(\d{3,4})\s*$")

# Particules nobiliaires/patronymiques frequentes en fin de graphie Joconde
# (ex. "Champaigne Philippe de" -> Philippe de Champaigne). Sans ce traitement
# special, l'heuristique "dernier mot = prenom" prendrait "de" comme prenom.
_PARTICLES = {"de", "du", "des", "van", "von", "di", "del", "la", "le", "da"}

_ALPHA_RUN_RE = re.compile(r"[A-Za-zÀ-ÖØ-öø-ÿ]+")


def _smart_capitalize(word: str) -> str:
    """Normalise un mot tout-en-majuscules ("DERAIN", "D'ANGERS") en casse
    standard ("Derain", "D'Angers"), en laissant intacts les mots deja en casse
    mixte (ex. "d'Angers", "McDonald"). Necessaire car Joconde ecrit certains
    auteurs entierement en capitales, alors que le rdfs:label Wikidata est en
    casse standard et le matching SPARQL est sensible a la casse."""
    if not word or not word.isupper():
        return word
    return _ALPHA_RUN_RE.sub(lambda m: m.group(0).capitalize(), word)


def parse_auteur(raw: str) -> dict:
    """Parse une graphie Joconde "NOM Prenom (naissance-mort)" en heuristique.

    Hypotheses documentees (cf. enonce) :
      - Si plusieurs contributeurs sont separes par ';' (ex. artiste + fondeur),
        on ne garde que le premier segment (l'artiste principal).
      - Le dernier "mot" avant les parentheses est suppose etre le prenom, le ou
        les mots precedents le nom de famille. C'est une heuristique qui echoue
        pour les prenoms composes avec espace (ex. "Jean Pierre" -> le mot
        "Pierre" seul est pris comme prenom) : ce cas est documente via le flag
        `parse_ok` reste True mais le nom reconstruit peut etre errone. C'est un
        compromis explicitement accepte par l'enonce.
      - Si moins de 2 mots restent apres suppression des parentheses, on ne peut
        pas distinguer nom/prenom : `parse_ok=False`, on utilise la chaine brute
        telle quelle comme "recherche" (peu de chances de matcher sur Wikidata,
        mais on n'echoue pas).
      - Les dates sont recherchees dans TOUS les groupes parentheses (pas
        seulement le dernier), pour gerer les cas comme
        "Dantan Jean Pierre (dit Dantan Jeune) (1800-1869)".
    """
    first = raw.split(";")[0].strip()
    parens = re.findall(r"\(([^()]*)\)", first)

    naissance = None
    deces = None
    for p in parens:
        p_stripped = p.strip()
        m = _DATE_RANGE_RE.match(p_stripped)
        if m and (m.group(1) or m.group(2)):
            naissance = m.group(1)
            deces = m.group(2)
            continue
        m2 = _DATE_SINGLE_RE.match(p_stripped)
        if m2 and naissance is None and deces is None:
            # Annee isolee sans tiret : on suppose qu'il s'agit d'une naissance
            # (heuristique faible, documentee).
            naissance = m2.group(1)

    name_part = re.sub(r"\([^()]*\)", "", first).strip()
    name_part = re.sub(r"\s+", " ", name_part)
    words = [_smart_capitalize(w) for w in name_part.split(" ")] if name_part else []

    if len(words) >= 3 and words[-1].lower() in _PARTICLES:
        # Cas "Champaigne Philippe de" -> prenom="Philippe", nom="de Champaigne".
        prenom = words[-2]
        nom = f"{words[-1]} {' '.join(words[:-2])}"
        prenom_nom = f"{prenom} {nom}"
        parse_ok = True
    elif len(words) >= 2:
        prenom = words[-1]
        nom = " ".join(words[:-1])
        prenom_nom = f"{prenom} {nom}"
        parse_ok = True
    else:
        # Moins de 2 mots : impossible d'appliquer l'heuristique nom/prenom.
        prenom = None
        nom = name_part or raw
        prenom_nom = name_part or raw
        parse_ok = False

    return {
        "auteur_joconde": raw,
        "nom_brut": name_part,
        "nom": nom,
        "prenom": prenom,
        "prenom_nom": prenom_nom,
        "naissance": int(naissance) if naissance else None,
        "deces": int(deces) if deces else None,
        "parse_ok": parse_ok,
    }


def _escape_sparql_string(s: str) -> str:
    return s.replace("\\", "\\\\").replace('"', '\\"')


# ---------------------------------------------------------------------------
# Etape 2 : interrogation Wikidata par lots
# ---------------------------------------------------------------------------

SPARQL_TEMPLATE = """
SELECT ?artist ?searchLabel ?artistLabel ?dob ?influencedByLabel ?movementLabel WHERE {{
  VALUES ?searchLabel {{ {values} }}
  ?artist rdfs:label ?searchLabel .
  ?artist wdt:P31 wd:Q5 .
  OPTIONAL {{ ?artist wdt:P569 ?dob . }}
  OPTIONAL {{
    ?artist wdt:P737 ?influencedBy .
    ?influencedBy rdfs:label ?influencedByLabel .
    FILTER(LANG(?influencedByLabel) = "fr")
  }}
  OPTIONAL {{
    ?artist wdt:P135 ?movement .
    ?movement rdfs:label ?movementLabel .
    FILTER(LANG(?movementLabel) = "fr")
  }}
  SERVICE wikibase:label {{ bd:serviceParam wikibase:language "fr,en". }}
}}
"""


def run_sparql_batch(labels: list[str]) -> list[dict]:
    # @mul (label "multilingue") est necessaire car Wikidata a migre une partie
    # des labels de personnes (noms identiques dans toutes les langues) vers ce
    # tag depuis 2023 ; sans lui, des entites pourtant valides (ex. Q314350,
    # "Antoine Bourdelle") ne matchent ni sur @fr ni sur @en.
    values = " ".join(
        f'"{_escape_sparql_string(lbl)}"@fr "{_escape_sparql_string(lbl)}"@en "{_escape_sparql_string(lbl)}"@mul'
        for lbl in labels
    )
    query = SPARQL_TEMPLATE.format(values=values)

    last_exc = None
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            resp = requests.get(
                SPARQL_ENDPOINT,
                params={"query": query, "format": "json"},
                headers=HEADERS,
                timeout=90,
            )
            if resp.status_code == 200:
                data = resp.json()
                rows = []
                for b in data["results"]["bindings"]:
                    rows.append(
                        {
                            "search_label": b["searchLabel"]["value"],
                            "artist_qid": b["artist"]["value"].rsplit("/", 1)[-1],
                            "artist_label": b.get("artistLabel", {}).get("value"),
                            "dob": b.get("dob", {}).get("value"),
                            "influenced_by_label": b.get("influencedByLabel", {}).get("value"),
                            "movement_label": b.get("movementLabel", {}).get("value"),
                        }
                    )
                return rows
            else:
                print(f"  [!] HTTP {resp.status_code}, tentative {attempt}/{MAX_RETRIES}")
        except requests.RequestException as exc:
            last_exc = exc
            print(f"  [!] Erreur reseau ({exc}), tentative {attempt}/{MAX_RETRIES}")
        time.sleep(RETRY_BACKOFF_S * attempt)

    print(f"  [x] Echec definitif du lot apres {MAX_RETRIES} tentatives ({last_exc}).")
    return []


def query_wikidata_for_artists(search_labels: list[str], batch_size: int = BATCH_SIZE) -> pd.DataFrame:
    all_rows: list[dict] = []
    n_batches = (len(search_labels) + batch_size - 1) // batch_size
    for i in range(0, len(search_labels), batch_size):
        batch = search_labels[i : i + batch_size]
        batch_num = i // batch_size + 1
        print(f"[Wikidata] Lot {batch_num}/{n_batches} ({len(batch)} artistes)...")
        rows = run_sparql_batch(batch)
        print(f"  -> {len(rows)} lignes recues")
        all_rows.extend(rows)
        if batch_num < n_batches:
            time.sleep(SLEEP_BETWEEN_BATCHES)
    if not all_rows:
        return pd.DataFrame(
            columns=["search_label", "artist_qid", "artist_label", "dob", "influenced_by_label", "movement_label"]
        )
    return pd.DataFrame(all_rows)


# ---------------------------------------------------------------------------
# Etape 3 : desambiguisation + construction des sorties
# ---------------------------------------------------------------------------

def _dob_to_year(dob) -> int | None:
    if not dob or not isinstance(dob, str):
        return None
    m = re.match(r"^(-?\d+)-", dob)
    if not m:
        return None
    try:
        return int(m.group(1))
    except ValueError:
        return None


def resolve_and_build_outputs(
    artists_df: pd.DataFrame, wikidata_df: pd.DataFrame
) -> tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    """Pour chaque artiste cible, choisit le meilleur QID candidat (desambiguisation
    par annee de naissance a +/-1 an), puis construit les 3 dataframes de sortie."""

    wikidata_df = wikidata_df.copy()
    wikidata_df["dob_year"] = wikidata_df["dob"].apply(_dob_to_year)

    result_rows = []
    influence_rows = []
    movement_rows = []
    n_ambiguous = 0

    for _, artist in artists_df.iterrows():
        label = artist["prenom_nom"]
        candidates = wikidata_df[wikidata_df["search_label"] == label]

        if candidates.empty:
            result_rows.append(
                {
                    "auteur_joconde": artist["auteur_joconde"],
                    "qid_wikidata": None,
                    "label_wikidata": None,
                    "naissance": artist["naissance"],
                    "deces": artist["deces"],
                    "trouve": False,
                }
            )
            continue

        qid_groups = candidates.groupby("artist_qid")
        distinct_qids = list(qid_groups.groups.keys())

        chosen_qid = None
        if len(distinct_qids) == 1:
            chosen_qid = distinct_qids[0]
        else:
            # Plusieurs homonymes : on tente de departager par annee de naissance.
            matches = []
            for qid in distinct_qids:
                grp = qid_groups.get_group(qid)
                dob_years = grp["dob_year"].dropna().unique()
                if pd.notna(artist["naissance"]) and len(dob_years) > 0:
                    if any(abs(int(y) - int(artist["naissance"])) <= DOB_TOLERANCE_YEARS for y in dob_years):
                        matches.append(qid)
            if len(matches) == 1:
                chosen_qid = matches[0]
            else:
                # Ambigu : on garde le candidat qui a le plus de lignes (proxy
                # pour "entite la plus documentee"), a defaut de mieux.
                n_ambiguous += 1
                chosen_qid = max(distinct_qids, key=lambda q: len(qid_groups.get_group(q)))

        chosen = qid_groups.get_group(chosen_qid)
        artist_label = chosen["artist_label"].dropna().iloc[0] if chosen["artist_label"].notna().any() else label
        dob_year = chosen["dob_year"].dropna().iloc[0] if chosen["dob_year"].notna().any() else None

        result_rows.append(
            {
                "auteur_joconde": artist["auteur_joconde"],
                "qid_wikidata": chosen_qid,
                "label_wikidata": artist_label,
                "naissance": int(dob_year) if dob_year is not None else artist["naissance"],
                "deces": artist["deces"],
                "trouve": True,
            }
        )

        for infl in chosen["influenced_by_label"].dropna().unique():
            influence_rows.append({"artiste": artist_label, "influenceur": infl})
        for mvt in chosen["movement_label"].dropna().unique():
            movement_rows.append({"artiste": artist_label, "mouvement": mvt})

    print(f"[Desambiguisation] {n_ambiguous} artiste(s) avec homonymes non tranches par la date de naissance.")

    artistes_out = pd.DataFrame(
        result_rows, columns=["auteur_joconde", "qid_wikidata", "label_wikidata", "naissance", "deces", "trouve"]
    )
    influence_out = pd.DataFrame(influence_rows, columns=["artiste", "influenceur"])
    movement_out = pd.DataFrame(movement_rows, columns=["artiste", "mouvement"])
    return artistes_out, influence_out, movement_out


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)

    print(f"[1/3] Chargement de {JOCONDE_CSV} et extraction des {N_TARGET_ARTISTS} artistes cibles...")
    top_counts = load_top_artists(JOCONDE_CSV, N_TARGET_ARTISTS)
    print(f"  -> {len(top_counts)} artistes cibles extraits.")

    parsed = [parse_auteur(raw) for raw in top_counts.index]
    artists_df = pd.DataFrame(parsed)
    artists_df["count"] = top_counts.values

    n_parse_fail = (~artists_df["parse_ok"]).sum()
    print(f"  -> {n_parse_fail} graphie(s) n'ont pas pu etre decomposees en (prenom, nom) [< 2 mots].")

    search_labels = sorted(artists_df["prenom_nom"].dropna().unique().tolist())
    print(f"[2/3] Interrogation de Wikidata pour {len(search_labels)} labels de recherche distincts...")
    wikidata_df = query_wikidata_for_artists(search_labels)
    print(f"  -> {len(wikidata_df)} lignes brutes recues au total depuis Wikidata.")

    print("[3/3] Desambiguisation et construction des fichiers de sortie...")
    artistes_out, influence_out, movement_out = resolve_and_build_outputs(artists_df, wikidata_df)

    artistes_path = DATA_DIR / "artistes_wikidata.csv"
    influence_path = DATA_DIR / "rel_influence_par.csv"
    movement_path = DATA_DIR / "artistes_mouvement.csv"

    artistes_out.to_csv(artistes_path, index=False, encoding="utf-8")
    influence_out.to_csv(influence_path, index=False, encoding="utf-8")
    movement_out.to_csv(movement_path, index=False, encoding="utf-8")

    n_found = int(artistes_out["trouve"].sum())
    n_with_influence = influence_out["artiste"].nunique()
    n_with_movement = movement_out["artiste"].nunique()

    print()
    print("=" * 70)
    print("RESUME")
    print("=" * 70)
    print(f"Artistes cibles              : {len(artistes_out)}")
    print(f"Trouves sur Wikidata (QID)    : {n_found}")
    print(f"Avec >=1 relation d'influence : {n_with_influence}")
    print(f"Avec >=1 mouvement renseigne  : {n_with_movement}")
    print(f"Lignes rel_influence_par.csv  : {len(influence_out)}")
    print(f"Lignes artistes_mouvement.csv : {len(movement_out)}")
    print()
    print("Exemples de relations d'influence trouvees :")
    for _, row in influence_out.head(8).iterrows():
        print(f"  - {row['artiste']} influence par {row['influenceur']}")
    print()
    print(f"Fichiers ecrits :\n  {artistes_path}\n  {influence_path}\n  {movement_path}")


if __name__ == "__main__":
    main()
