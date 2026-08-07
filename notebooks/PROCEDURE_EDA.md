# Procédure d'exploration et de nettoyage - base Joconde

Document de méthodologie : résume la démarche suivie pour explorer et nettoyer `joconde.csv` avant modélisation graphe. Le détail exécuté (code, sorties réelles) reste dans [`eda_joconde.ipynb`](eda_joconde.ipynb) - ce document en est la synthèse narrative, pensée pour être lue sans rouvrir le notebook. L'analyse sur les données déjà nettoyées (rapport analytique, ETL-Query-Plot) est dans un notebook séparé : [`rapport_analytique.ipynb`](rapport_analytique.ipynb).

---

## 1. Premier piège : le séparateur

`joconde.csv` n'est pas un CSV classique séparé par des virgules : les champs sont séparés par des `|` (pipe) et entourés de guillemets doubles. Rien ne l'indique dans le nom du fichier ni sur la page data.gouv.fr - seule l'inspection des premières lignes brutes le révèle.

## 2. Deuxième piège (le plus vicieux) : l'encodage silencieux

Avec le moteur `pyarrow` de pandas (nécessaire pour charger 1,1 Go en quelques secondes plutôt qu'en 1-2 minutes avec le moteur C par défaut), **si `encoding="utf-8"` n'est pas précisé explicitement, pandas ne plante pas - il charge quand même, mais remplace silencieusement les caractères accentués par `�`**. Aucune erreur, aucun warning. Vérifié en comparant un chargement avec et sans l'encodage explicite sur les mêmes lignes : `Auvergne-Rhône-Alpes` devient `Auvergne-Rh�ne-Alpes` sans l'option.

Confirmation en lisant les octets bruts du fichier : `ô` y est bien encodé `\xc3\xb4`, la séquence UTF-8 standard. Le fichier **est** en UTF-8 - c'est uniquement le moteur `pyarrow` qui ne le détecte pas fiablement tout seul sur ce fichier. **Règle retenue : toujours forcer `encoding="utf-8"` explicitement**, quel que soit le moteur pandas utilisé.

## 3. Dimensions et qualité générale

- **1 035 342 lignes × 68 colonnes**, ~1,6 Go une fois chargé en mémoire (tout en texte).
- **Aucun doublon** sur `Reference` (identifiant de notice) - clé fiable pour construire les nœuds `Oeuvre`.
- Les valeurs manquantes ne sont pas des `NaN` par défaut : dans ce fichier, un champ vide est une chaîne `""` entre guillemets. Sans `na_values=[""]` au chargement, `.isna()` ne détecterait presque aucune valeur manquante alors que la majorité des champs le sont.
- Les champs de liens croisés (`References_Merimee`, `References_Palissy`, `References_Memoires`, `Lien_INHA`, `Lien_Video`) sont vides à plus de 99% - enrichissements optionnels saisis par une minorité de musées, pas des champs à intégrer au cœur du graphe.
- Les champs qui portent le modèle de graphe (`Reference`, `Code_Museofile`, `Nom_officiel_musee`, `Ville`, `Region`, `Domaine`) sont quasiment complets (<0,05% de vide).

## 4. Filtrage du domaine

Joconde couvre *tout* objet de musée (archéologie, ethnologie, numismatique...), pas seulement la peinture/sculpture. Filtrer sur `Domaine` contenant `peinture`, `sculpture` ou `beaux-arts` ramène le corpus à **178 481 notices (17,2% du total)** - un chiffre à retenir : ce n'est pas "la plupart" des notices comme on aurait pu le supposer, c'est une petite fraction.

## 5. `Epoque` ne peut pas servir de source pour `MouvementArtistique`

Hypothèse de départ : `Epoque` (documenté "Renaissance, Impressionnisme, Classicisme...") alimenterait le nœud `MouvementArtistique`. Sur les vraies données, même restreint au sous-ensemble beaux-arts, `Epoque` n'est renseigné que dans **~6% des cas**, et son contenu réel est majoritairement des **périodes archéologiques** (gallo-romain, néolithique, moyen âge...) plutôt que des mouvements artistiques au sens propre. Quelques mouvements apparaissent bien ("époque Renaissance", "Réalisme", "pré-impressionnisme") mais trop rarement pour être une source fiable.

**Conséquence** : `MouvementArtistique` est finalement construit à partir de **Wikidata** (propriété P135, mouvement), rapproché par artiste - voir `artistes_mouvement.csv`. `Epoque` reste un attribut optionnel sur `Oeuvre`, rien de plus.

## 6. `Genre` ne veut pas dire ce que la documentation annonçait

La documentation des champs décrit `Genre` comme "portrait, paysage, scène historique, nature morte". Dans les vraies données, les valeurs sont `masculin` / `féminin` / `inconnu` : ce champ encode en réalité le **genre (H/F) du sujet représenté**, pas un genre artistique. Leçon retenue : toujours vérifier le contenu réel d'un champ avant de s'appuyer sur sa description - la doc peut être trompeuse ou porter sur une version différente de l'export. `Genre` n'est pas utilisé dans la modélisation.

## 7. `Ecole_pays` - ambiguïté confirmée

Mélange de pays ("France", "Italie"), de villes/régions ("Florence", "France, Sèvres"), d'écoles adjectivées ("flamande", "bolonaise") et de valeurs multiples commentées ("France;Allemagne (à la naissance)"). Renseigné à ~68-72% sur le sous-ensemble beaux-arts, mais nécessite un parsing dédié - pas un simple `split(";")` - s'il doit être exploité au-delà d'un attribut brut. Non résolu à ce stade, volontairement laissé pour une itération ultérieure.

## 8. `Region` - doublons de graphie

Deux régions apparaissent sous deux graphies distinctes dans le fichier brut :
- `Île-de-France` (266 195 notices) et `Ile-de-France` sans accent (265 665) - quasiment 50/50, pas une variante rare.
- `Provence-Alpes-Côte d'Azur` (43 125) et `Provence-Alpes-Côte-d'Azur` avec un tiret en plus (17 618).

Sans normalisation, on aurait créé deux nœuds `Region` différents pour la même région réelle. Corrigé lors de la construction de l'export propre (les deux variantes fusionnées vers la graphie officielle).

## 9. `Auteur` - le nettoyage le plus lourd

Champ critique pour construire les nœuds `Artiste`, et le plus casse-tête : **120 548 graphies distinctes** sur l'ensemble du fichier (39 315 sur le seul sous-ensemble beaux-arts).

Illustration sur un cas réel (toutes les graphies contenant "Monet") : deux dangers opposés.
1. **Sous-détection** : `Monet Claude (1840-1926)` (260 notices) vs `MONET Claude Oscar` (16 notices, majuscules + prénom complet) désignent la même personne mais ne seraient pas fusionnées par une comparaison exacte.
2. **Sur-détection**, plus dangereuse : une recherche naïve sur "Monet" attraperait aussi `Hoschedé-Monet Blanche` (belle-fille de Claude Monet, peintre elle-même - une personne différente) ou `Monet Goyon firme` (un fabricant, pas un artiste).

**Conséquence** : pas de fuzzy matching automatique sans relecture. Un dictionnaire de correspondance vérifié à la main a été construit pour les 150 artistes les plus fréquents (voir `artistes_wikidata.csv`), les cas plus rares restant non résolus plutôt que fusionnés à l'aveugle.

`anonyme` (et ses variantes) représente une part énorme des notices (31 875 sur le sous-ensemble beaux-arts) - normal pour un catalogue patrimonial, mais ces œuvres n'auront jamais de nœud `Artiste` exploitable. Elles sont exclues de l'export propre, qui ne conserve que les **137 474 notices à auteur nommé**.

## 10. Dates de création

Trois champs concurrents existent : `Millesime_de_creation` (51,6% renseigné, le plus propre en théorie), `Date_creation` (93,6%, texte libre - "vers 1850", plage, siècle), `Periode_de_creation` (78,5%, plus grossier). Stratégie retenue pour l'export propre : `Millesime_de_creation` en priorité, sinon extraction d'un nombre à 4 chiffres plausible depuis `Date_creation` par regex, sinon la donnée reste vide plutôt que d'être devinée.

## 11. Localisation géographique - bonne surprise

99,8% des notices ont déjà des coordonnées GPS présentes et bien formées (`"lat, lon"`, un seul format, aucune anomalie), cohérentes avec le territoire français. Aucun géocodage supplémentaire nécessaire pour la carte des musées de la WebApp.

---

## Synthèse - décisions de modélisation actées

| Hypothèse initiale | Ce que montrent les vraies données | Décision |
|---|---|---|
| `Domaine` filtre les beaux-arts | Confirmé, mais seuls 17,2% des notices concernées | Filtrage strict dès l'extraction |
| `Epoque` alimente `MouvementArtistique` | ~6% rempli sur le sous-ensemble beaux-arts, contenu surtout archéologique | Abandonné → mouvement construit depuis Wikidata (P135) |
| `Genre` = genre artistique | En réalité : genre du sujet représenté | Non utilisé |
| `Ecole_pays` ambigu | Confirmé | Parsing dédié à prévoir, non résolu à ce stade |
| `Region` propre | 2 graphies pour au moins 2 régions | Normalisée dans l'export propre |
| `Auteur` nécessite dédoublonnage | Confirmé, avec risque de faux positifs documenté | Dictionnaire vérifié à la main (top 150), pas de fuzzy matching automatique |
| `coordonnees` à géocoder | Déjà présentes et propres à 99,8% | Aucun travail supplémentaire |
| Volumétrie vs AuraDB Free (~200k nœuds) | 178 481 notices beaux-arts, 137 474 à auteur nommé | Volume compatible en ne gardant que les auteurs nommés |

## Fichiers produits à partir de cette procédure

- `../data/oeuvres_clean.csv` - 137 474 œuvres, filtrées et nettoyées (voir `../data/README.md` pour le dictionnaire complet)
- `../data/artistes_wikidata.csv`, `../data/rel_influence_par.csv`, `../data/artistes_mouvement.csv` - rapprochement Wikidata pour les 150 artistes les plus fréquents

La suite (analyse sur ces données propres, en attendant l'import Neo4j) est dans [`rapport_analytique.ipynb`](rapport_analytique.ipynb).
