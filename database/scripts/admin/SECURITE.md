# Sécurisation des accès — Bloc 3

## Ce qui est déjà en place

- **`.env` jamais commité** : présent dans `database/.gitignore` dès le Bloc 1,
  vérifié par `git check-ignore -v database/.env` avant chaque push.
- **`.env.example`** versionné à la place, avec des valeurs factices — chacun
  crée son propre `.env` local à partir de ce modèle.
- **Un seul point de vérité pour les identifiants réels** : le fichier
  `Neo4j-<instance>-Created-<date>.txt` téléchargé une fois depuis la console
  Aura à la création de l'instance.

## Limite connue : pas de RBAC granulaire sur AuraDB Free

Sur le plan **Free**, l'instance ne fournit qu'**un seul utilisateur/rôle**
(ici `feb23e78`, généré à la création). Il n'est pas possible de créer :
- un rôle **lecture seule** pour le backend Express de Conambot (qui n'a besoin
  que de lire, jamais d'écrire depuis les routes de démo hors CRUD) ;
- un rôle distinct pour les scripts d'administration (import/dump/restore) vs
  l'API web.

C'est une limitation de plateforme (RBAC multi-rôles = fonctionnalité
AuraDB Professional/Enterprise), pas un oubli — à assumer et mentionner
devant le jury plutôt que de prétendre l'avoir contournée.

## Recommandations appliquées à l'équipe

1. **Rotation du mot de passe** si le fichier de credentials Aura a été
   partagé par un canal non chiffré (ex. copié-collé dans un chat d'équipe) :
   regénérable depuis console.neo4j.io → instance → "Reset password".
2. **Ne pas laisser le fichier `Neo4j-*-Created-*.txt` dans `~/Téléchargements`**
   une fois le `.env` créé — le déplacer vers un gestionnaire de mots de passe
   ou le supprimer, il contient le mot de passe en clair.
3. **Le backend Express (Railway)** doit lire `NEO4J_URI/USERNAME/PASSWORD`
   depuis des **variables d'environnement Railway**, jamais commitées dans le
   repo — même règle que `.env` en local.
4. **CORS côté Express** : n'autoriser que l'origine du frontend déployé
   (Netlify/Vercel), pas `*`, une fois l'URL de prod connue (tâche de
   Conambot au Bloc 3, à vérifier ensemble avant la démo).
5. **Ne jamais exposer le driver `neo4j` côté navigateur** — rappel de
   l'architecture validée au kickoff (section 1 de
   `Repartition-Taches-Journee.md`) : c'est justement pour ça que le backend
   Node/Express est obligatoire.
