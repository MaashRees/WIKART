# Collection Bruno WIKART

1. Démarrer l'API avec `cd backend && npm run dev`.
2. Ouvrir Bruno, puis `Import Collection > Bruno Collection`.
3. Sélectionner **le dossier** `backend/bruno/WIKART API` — pas un fichier `.bru` isolé.
4. Dans la liste des environnements de la collection, sélectionner `local`.

Les requêtes sont fondées sur le jeu de données de démonstration `database/scripts/import_sample.py`.

Pour tester le CRUD sans conserver de donnée, lancer dans cet ordre :

1. `12 - Creer oeuvre test - 201`
2. `13 - Verifier oeuvre test`
3. `14 - Modifier oeuvre test`
4. `15 - Supprimer oeuvre test`

La requête 12 capture la `reference` générée par le backend (`res.body.reference`)
dans la variable de collection `oeuvreTestReference` via un script post-response ;
les requêtes 13 à 15 l'utilisent ensuite dans leur URL (`{{oeuvreTestReference}}`)
au lieu du titre codé en dur, car l'identifiant d'une œuvre est sa `reference`
(le `titre` n'est pas unique). Il faut donc bien exécuter la 12 avant les
suivantes dans la même session Bruno.
