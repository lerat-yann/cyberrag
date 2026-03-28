# Évolutions envisagées — branche de backup

Cette branche conserve une version intermédiaire du projet CyberRAG afin de ne pas perdre certaines pistes explorées, même si elles ne sont pas retenues dans la démo principale.

## Rôle de cette branche

Elle sert à :

- garder une base de reprise
- conserver les idées écartées temporairement
- éviter de repartir de zéro plus tard

## Choix retenu pour la démo principale

Pour la démo principale, l’objectif est de rester centré sur :

- un corpus officiel backend
- un RAG cybersécurité simple et maîtrisé
- une architecture lisible
- des réponses basées uniquement sur les documents officiels

Les fonctionnalités plus complexes ont été mises de côté pour ne pas brouiller la démonstration.

## Pistes conservées dans cette branche

### 1. Documents utilisateur personnels

Possibilité d’ajouter des documents utilisateur pour enrichir les réponses.

Pistes explorées :

- stockage local navigateur
- persistance locale
- séparation entre corpus officiel et documents utilisateur

### 2. Corpus privé utilisateur côté backend

Architecture envisagée :

- corpus global officiel
- corpus privé utilisateur séparé
- récupération RAG combinée sans impact sur le corpus officiel

Points à traiter plus tard :

- isolation par utilisateur
- identification fiable
- séparation des index
- nettoyage des documents privés

### 3. Persistance locale navigateur

Gestion locale de documents utilisateur avec :

- ajout
- suppression
- liste des documents
- persistance locale

Question laissée ouverte :

- stockage seul
- ou vraie exploitation dans le contexte du modèle

### 4. Gestion du hors sujet et des demandes offensives

Amélioration possible du comportement du modèle pour distinguer :

- question cybersécurité absente des documents
- question hors sujet
- question offensive ou dangereuse

### 5. Sécurisation d’un éventuel upload utilisateur

À prévoir si cette piste est reprise plus tard :

- limite de taille
- types autorisés
- stockage isolé
- nettoyage automatique
- protection contre fichiers malveillants
- séparation stricte du corpus officiel

## Décision actuelle

Pour l’instant, la priorité est de garder une démo RAG simple, claire et centrée sur le corpus officiel backend.

Cette branche sert uniquement de point de reprise pour des évolutions futures.
