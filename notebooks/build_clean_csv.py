import re
from pathlib import Path

import numpy as np
import pandas as pd

CSV_PATH = "../../joconde.csv" # à télécharger ici : https://www.data.gouv.fr/fr/datasets/joconde/ et mettre à la racine
OUT_DIR = Path("../data")
OUT_PATH = OUT_DIR / "oeuvres_clean.csv"

pd.set_option("display.max_columns", None)
pd.set_option("display.width", 200)


def main():
    # ------------------------------------------------------------------
    # 1. Chargement du CSV source avec les parametres valides
    # ------------------------------------------------------------------
    print("=" * 80)
    print("1. Chargement du CSV source")
    print("=" * 80)
    df = pd.read_csv(
        CSV_PATH,
        sep="|",
        quotechar='"',
        dtype=str,
        na_values=[""],
        encoding="utf-8",
        engine="pyarrow",
    )
    print(f"Lignes chargees : {len(df):,}")
    print(f"Colonnes chargees : {len(df.columns)}")

    # ------------------------------------------------------------------
    # 2. Filtre domaine artistique
    # ------------------------------------------------------------------
    print()
    print("=" * 80)
    print("2. Filtre sur le domaine artistique (peinture|sculpture|beaux-arts)")
    print("=" * 80)
    mask_domaine = df["Domaine"].fillna("").str.contains(
        "peinture|sculpture|beaux-arts", case=False
    )
    df = df[mask_domaine].copy()
    print(f"Lignes apres filtre domaine : {len(df):,} (attendu ~178 481)")

    # ------------------------------------------------------------------
    # 3. Exclusion des auteurs anonymes/non renseignes
    # ------------------------------------------------------------------
    print()
    print("=" * 80)
    print("3. Exclusion des auteurs anonymes/non renseignes")
    print("=" * 80)
    mask_auteur = df["Auteur"].notna() & ~df["Auteur"].fillna("").str.contains(
        "anonyme", case=False
    )
    df = df[mask_auteur].copy()
    print(f"Lignes apres filtre auteur : {len(df):,} (attendu ~137 474)")

    # ------------------------------------------------------------------
    # 4. Normalisation du champ Region
    # ------------------------------------------------------------------
    print()
    print("=" * 80)
    print("4. Normalisation du champ Region")
    print("=" * 80)
    region_map = {
        "Ile-de-France": "Île-de-France",
        "Provence-Alpes-Côte-d'Azur": "Provence-Alpes-Côte d'Azur",
    }
    before_counts = df["Region"].value_counts(dropna=False)
    n_idf = (df["Region"] == "Ile-de-France").sum()
    n_pac = (df["Region"] == "Provence-Alpes-Côte-d'Azur").sum()
    print(f"Lignes 'Ile-de-France' (sans accent) avant normalisation : {n_idf:,}")
    print(f"Lignes 'Provence-Alpes-Cote-d'Azur' (avec tiret) avant normalisation : {n_pac:,}")

    df["Region"] = df["Region"].replace(region_map)

    n_idf_after = (df["Region"] == "Ile-de-France").sum()
    n_pac_after = (df["Region"] == "Provence-Alpes-Côte-d'Azur").sum()
    print(f"Lignes 'Ile-de-France' (sans accent) apres normalisation : {n_idf_after:,} (doit etre 0)")
    print(f"Lignes 'Provence-Alpes-Cote-d'Azur' (avec tiret) apres normalisation : {n_pac_after:,} (doit etre 0)")

    # ------------------------------------------------------------------
    # 5. Extraction de l'annee de creation
    # ------------------------------------------------------------------
    print()
    print("=" * 80)
    print("5. Extraction de annee_creation")
    print("=" * 80)

    print("Echantillon de Millesime_de_creation (valeurs non nulles) :")
    sample = df["Millesime_de_creation"].dropna()
    n_sample = min(20, len(sample))
    if n_sample:
        print(sample.sample(n_sample, random_state=0).tolist())
    else:
        print("(aucune valeur non nulle)")

    year_re = re.compile(r"(\d{4})")

    def extract_year_millesime(val):
        if pd.isna(val):
            return np.nan
        m = year_re.search(str(val))
        if not m:
            return np.nan
        y = int(m.group(1))
        if 1000 <= y <= 2026:
            return y
        return np.nan

    def extract_year_date_creation(val):
        if pd.isna(val):
            return np.nan
        for m in year_re.finditer(str(val)):
            y = int(m.group(1))
            if 1000 <= y <= 2026:
                return y
        return np.nan

    annee_millesime = df["Millesime_de_creation"].apply(extract_year_millesime)
    resolved_millesime = annee_millesime.notna()

    annee_date_creation = pd.Series(np.nan, index=df.index, dtype=float)
    need_fallback = ~resolved_millesime
    annee_date_creation.loc[need_fallback] = df.loc[need_fallback, "Date_creation"].apply(
        extract_year_date_creation
    )
    resolved_date_creation = need_fallback & annee_date_creation.notna()

    annee_creation = annee_millesime.copy()
    annee_creation.loc[resolved_date_creation] = annee_date_creation.loc[resolved_date_creation]

    n_millesime = int(resolved_millesime.sum())
    n_regex = int(resolved_date_creation.sum())
    n_unresolved = int(len(df) - n_millesime - n_regex)

    print()
    print(f"Resolu via Millesime_de_creation direct : {n_millesime:,}")
    print(f"Resolu via regex sur Date_creation (fallback) : {n_regex:,}")
    print(f"Non resolu (annee_creation vide) : {n_unresolved:,}")
    print(f"Total : {n_millesime + n_regex + n_unresolved:,} (doit egaler {len(df):,})")

    # entier nullable (Int64) pour eviter les décimales .0 dans le CSV
    df["annee_creation"] = annee_creation.astype("Int64")

    # ------------------------------------------------------------------
    # 6. Parsing des coordonnees GPS
    # ------------------------------------------------------------------
    print()
    print("=" * 80)
    print("6. Parsing des coordonnees GPS")
    print("=" * 80)
    print(f"coordonnees renseignees : {df['coordonnees'].notna().mean() * 100:.2f}%")

    coords_split = df["coordonnees"].str.split(",", n=1, expand=True)
    lat = pd.to_numeric(coords_split[0], errors="coerce") if 0 in coords_split.columns else pd.Series(np.nan, index=df.index)
    lon = pd.to_numeric(coords_split[1], errors="coerce") if 1 in coords_split.columns else pd.Series(np.nan, index=df.index)
    df["lat"] = lat
    df["lon"] = lon
    print(f"lat/lon extraites avec succes : {df['lat'].notna().mean() * 100:.2f}%")

    # ------------------------------------------------------------------
    # 7. Construction du DataFrame final
    # ------------------------------------------------------------------
    print()
    print("=" * 80)
    print("7. Construction du DataFrame final")
    print("=" * 80)

    final = pd.DataFrame(
        {
            "id_oeuvre": df["Reference"],
            "titre": df["Titre"],
            "auteur_brut": df["Auteur"],
            "annee_creation": df["annee_creation"],
            "domaine": df["Domaine"],
            "epoque": df["Epoque"],
            "ecole_pays": df["Ecole_pays"],
            "materiaux_techniques": df["Materiaux_techniques"],
            "mesures": df["Mesures"],
            "description": df["Description"],
            "code_museofile": df["Code_Museofile"],
            "nom_musee": df["Nom_officiel_musee"],
            "ville": df["Ville"],
            "departement": df["Departement"],
            "region": df["Region"],
            "lat": df["lat"],
            "lon": df["lon"],
        }
    )

    n_dupes = final["id_oeuvre"].duplicated().sum()
    print(f"Doublons sur id_oeuvre : {n_dupes:,} (doit etre 0)")
    if n_dupes:
        print("ATTENTION : des doublons existent sur id_oeuvre, verification necessaire !")

    # ------------------------------------------------------------------
    # 8. Sauvegarde
    # ------------------------------------------------------------------
    print()
    print("=" * 80)
    print("8. Sauvegarde du CSV propre")
    print("=" * 80)
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    final.to_csv(OUT_PATH, index=False, encoding="utf-8")
    print(f"Fichier ecrit : {OUT_PATH.resolve()}")

    # ------------------------------------------------------------------
    # 9. Resume de controle
    # ------------------------------------------------------------------
    print()
    print("=" * 80)
    print("9. Resume de controle")
    print("=" * 80)
    print(f"Nombre de lignes finales : {len(final):,}")
    print(f"Nombre de colonnes finales : {final.shape[1]}")
    print()
    print("Pourcentage de valeurs manquantes par colonne :")
    print((final.isna().mean() * 100).round(2).to_string())
    print()
    n_multi_auteurs = final["auteur_brut"].fillna("").str.contains(";").sum()
    print(f"Lignes avec auteurs multiples (';' dans auteur_brut) : {n_multi_auteurs:,}")
    print()
    print("Exemple de 5 lignes :")
    print(final.head())


if __name__ == "__main__":
    main()
