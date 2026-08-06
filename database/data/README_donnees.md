# Dictionnaire de données — pour Rémi (import Neo4j)

4 fichiers CSV, tous encodés **UTF-8**, séparateur **virgule** standard (`,`), champs texte entre guillemets automatiquement dès qu'ils contiennent une virgule ou un retour à la ligne (ex. `description`) — un simple `pandas.read_csv("fichier.csv")` sans paramètre suffit à tout lire correctement, contrairement au fichier brut `joconde.csv` (celui-là reste en `|` avec encodage à préciser explicitement, voir `../eda_joconde.ipynb`).

Généré par [`build_clean_csv.py`](../build_clean_csv.py) (œuvres) et [`scrape_wikidata_artistes.py`](../scrape_wikidata_artistes.py) (influence/mouvement). Reproductible : relance ces deux scripts si besoin (`uv run python <script>.py` depuis `seer/`).

---

## 1. `oeuvres_clean.csv` — 137 474 lignes × 17 colonnes

Un sous-ensemble filtré de la base Joconde : domaine peinture/sculpture/beaux-arts uniquement, auteurs anonymes exclus. **C'est le fichier central**, il alimente les nœuds `Oeuvre`, `Musee`, `Ville`, `Region` et la relation `A_CREE` (via `auteur_brut`).

| Colonne | Type | % vide | Contenu / exemple | Notes pour l'import |
|---|---|---|---|---|
| `id_oeuvre` | texte | 0% | `"08030001474"` | **Clé unique** (vérifié : 0 doublon). À utiliser comme clé de `MERGE (o:Oeuvre {reference: row.id_oeuvre})`. |
| `titre` | texte | 0,95% | `"Portraits d'Hypéride et de Phrynée"` | — |
| `auteur_brut` | texte | 0% (filtré en amont) | `"ZEUXIADES (d'après);PRAXITELE (d'après)"` | **Pas dédoublonné/normalisé** — deux graphies différentes ("Monet Claude (1840-1926)" vs "MONET Claude Oscar") désignent probablement la même personne mais restent deux chaînes distinctes ici. **14 189 lignes (10,3%) contiennent plusieurs auteurs séparés par `;`** — décide si tu les split en plusieurs relations `A_CREE` ou si tu gardes un seul nœud "collectif" au format brut. Pour rapprocher un auteur du fichier `artistes_wikidata.csv`, il faut comparer à `auteur_joconde` là-bas (correspondance exacte de chaîne). |
| `annee_creation` | nombre (float, avec `.0` — à caster en entier) | 7,87% | `2001.0` | Résolu via `Millesime_de_creation` (91 852 lignes) ou en repli une regex sur `Date_creation` (34 809 lignes) ; sinon vide plutôt que deviné. Pas garanti d'être la date exacte (ex. une plage "1846-1847" donne juste le premier nombre à 4 chiffres trouvé). |
| `domaine` | texte, multi-valeurs `;` | 0% | `"archéologie;romain;sculpture"` | Garanti de contenir au moins un des mots `peinture`/`sculpture`/`beaux-arts` (c'est le filtre appliqué), mais peut contenir d'autres mots en plus (ex. `archéologie`) — normal, ne pas re-filtrer. |
| `epoque` | texte | 97,04% | `"époque Renaissance"` | **Très sparse et peu fiable** — mélange de périodes archéologiques et de rares mouvements artistiques. **Ne pas utiliser comme source du nœud `MouvementArtistique`** (voir `artistes_mouvement.csv` à la place, basé sur Wikidata). Garder juste comme attribut optionnel sur `Oeuvre` si tu veux. |
| `ecole_pays` | texte, multi-valeurs `;` | 27,26% | `"France;Alsace"` | Mélange pays/région/ville/école adjectivée selon les notices — pas de structure fixe, à parser toi-même si tu veux l'exploiter au-delà d'un attribut brut. |
| `materiaux_techniques` | texte | 6,17% | `"toile (peinture à l'huile);bois"` | — |
| `mesures` | texte libre | 2,06% | `"92, 79, 9"` | Pas structuré (pas de colonnes largeur/hauteur séparées) — texte libre à parser si besoin. |
| `description` | texte libre, parfois long | 69,51% | — | Peut contenir virgules et retours à la ligne, déjà géré par le quoting CSV standard. |
| `code_museofile` | texte | 0% | `"M0803"` | Identifiant officiel du musée — clé stable pour `MERGE (m:Musee {code_museofile: row.code_museofile})`. |
| `nom_musee` | texte | 0% | `"musée Antoine Vivenel"` | — |
| `ville` | texte | 0% | `"Compiègne"` | — |
| `departement` | texte | 0% | `"Oise"` | — |
| `region` | texte | 0% | `"Hauts-de-France"` | **Déjà normalisée** : les deux graphies concurrentes du fichier brut (`Ile-de-France`/`Île-de-France` et `Provence-Alpes-Côte-d'Azur`/`Provence-Alpes-Côte d'Azur`) ont été fusionnées en une seule chacune. Aucune autre région n'avait ce problème. |
| `lat` | nombre (float) | 0,21% | `49.417414` | Coordonnées GPS du musée, déjà présentes dans Joconde à 99,8%, aucun géocodage nécessaire. |
| `lon` | nombre (float) | 0,21% | `2.821526` | idem |

---

## 2. `artistes_wikidata.csv` — 150 lignes × 6 colonnes

Les **150 graphies d'auteur les plus fréquentes** dans `oeuvres_clean.csv` (pas les 39 315 graphies distinctes — trop pour interroger Wikidata en une journée), avec leur correspondance Wikidata quand elle a pu être établie.

| Colonne | Type | Contenu / exemple | Notes |
|---|---|---|---|
| `auteur_joconde` | texte | `"Rodin Auguste (1840-1917)"` | Correspond exactement à une valeur de `auteur_brut` dans `oeuvres_clean.csv` — clé de jointure entre les deux fichiers. |
| `qid_wikidata` | texte, vide si non trouvé | `"Q30755"` | Identifiant Wikidata de l'entité. |
| `label_wikidata` | texte, vide si non trouvé | `"Auguste Rodin"` | Nom canonique retenu — **c'est cette valeur (pas `auteur_joconde`) qui sert de clé `artiste` dans les deux fichiers suivants.** |
| `naissance` | nombre, parfois vide | `1840.0` | Année de naissance confirmée par Wikidata (P569) si `trouve=True`, sinon extraite directement de la parenthèse `(1840-1917)` de `auteur_joconde` — donc utilisable même quand `trouve=False`, mais alors non confirmée par une source externe. |
| `deces` | nombre, parfois vide | `1917.0` | Même logique que `naissance`. |
| `trouve` | booléen | `True` / `False` | **114/150 (76%) trouvés.** Si `False`, `qid_wikidata` et `label_wikidata` sont vides — dans ce cas, utilise `auteur_joconde` tel quel comme identifiant de l'artiste si tu veux tout de même créer un nœud `Artiste`. |

**Limites connues à ne pas découvrir à la dure** :
- Les prénoms composés séparés par un espace plutôt qu'un tiret (ex. `"RENOIR Pierre Auguste"`) cassent l'heuristique de reconstruction du nom et ne sont donc pas retrouvés, même si l'artiste existe sur Wikidata.
- 3 cas d'homonymes n'ont pas pu être départagés par l'année de naissance (le script garde alors l'entité Wikidata la plus documentée par défaut) — à vérifier à la main si ces 3 artistes comptent beaucoup d'œuvres.
- Les entrées de type atelier/manufacture (ex. `"Atelier de Pistillus"`) ne peuvent naturellement pas être trouvées sur Wikidata (ce ne sont pas des personnes).

---

## 3. `rel_influence_par.csv` — 56 lignes × 2 colonnes

| Colonne | Type | Contenu / exemple | Notes |
|---|---|---|---|
| `artiste` | texte | `"Auguste Rodin"` | **`label_wikidata`**, pas `auteur_joconde` — jointure via `artistes_wikidata.csv`. |
| `influenceur` | texte | `"Jean-Baptiste Carpeaux"` ou `"Sculpture africaine"` | Peut être un autre artiste **ou une entité non-personne** (concept, mouvement, culture — ex. "Sculpture africaine" pour Picasso). **Décision de modélisation à prendre** : soit tu restreins `INFLUENCE_PAR` aux entrées qui correspondent aussi à un artiste connu (jointure sur `label_wikidata`), soit tu acceptes des nœuds `Artiste` "fantômes" pour les influenceurs non-personnes, soit tu les routes vers un autre type de nœud (`Concept`/`Style`). Pas tranché côté extraction — c'est un choix de modélisation graphe. |

24 des 150 artistes ont au moins une relation d'influence renseignée sur Wikidata.

---

## 4. `artistes_mouvement.csv` — 77 lignes × 2 colonnes

| Colonne | Type | Contenu / exemple | Notes |
|---|---|---|---|
| `artiste` | texte | `"Pablo Picasso"` | **`label_wikidata`**, même jointure que ci-dessus. |
| `mouvement` | texte | `"cubisme"` | Nom du mouvement (label Wikidata de la propriété P135). Un artiste peut apparaître sur plusieurs lignes s'il a plusieurs mouvements (ex. Picasso : cubisme, surréalisme, postimpressionnisme...). |

**C'est la vraie source du nœud `MouvementArtistique`** (pas `epoque` dans `oeuvres_clean.csv`, voir plus haut) — mais elle ne couvre que 48 des 150 artistes ciblés, donc uniquement une fraction des œuvres. Pour les artistes hors de ce top 150 ou sans mouvement Wikidata trouvé, il n'y aura pas de `MouvementArtistique` — à assumer comme une limite de couverture plutôt qu'à combler artificiellement.

---

## Comment tout relier (schéma de jointure)

```
oeuvres_clean.csv.auteur_brut
        │  (égalité de chaîne exacte)
        ▼
artistes_wikidata.csv.auteur_joconde  →  artistes_wikidata.csv.label_wikidata
                                                  │
                                    ┌─────────────┴─────────────┐
                                    ▼                           ▼
                    rel_influence_par.csv.artiste   artistes_mouvement.csv.artiste
```

Sur les 137 474 œuvres, seules celles dont `auteur_brut` correspond **exactement** à une des 150 graphies de `artistes_wikidata.csv` pourront être reliées à une influence ou un mouvement. C'est un sous-ensemble volontairement restreint pour la V1 du graphe — étendre à plus d'artistes est possible en relançant `scrape_wikidata_artistes.py` avec un top N plus grand.
