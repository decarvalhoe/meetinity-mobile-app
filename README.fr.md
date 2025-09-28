# Application Mobile Meetinity

Ce repository contient le code source de l'application mobile Meetinity, une plateforme de networking professionnel.

## Vue d'ensemble

L'application mobile est développée avec **React 18**, **TypeScript** et **Vite**. Elle offre une interface utilisateur moderne et réactive pour interagir avec la plateforme Meetinity.

### Fonctionnalités

- **Authentification utilisateur**: Connexion sécurisée avec OAuth 2.0 (Google et LinkedIn).
- **Routes protégées**: L'accès au contenu spécifique à l'utilisateur est réservé aux utilisateurs authentifiés.
- **Hub multi-onglets**: Une navigation par onglets (profil, découverte, événements, messagerie) propose un accès rapide aux parcours clés.
- **Gestion de profil enrichie**: Consultation, édition et synchronisation des préférences directement depuis l'onglet Profil.
- **Découverte & matching**: Suggestions contextualisées avec actions d'acceptation/refus, mises à jour en temps réel.
- **Événements**: Listing, suivi du remplissage et inscription/désinscription instantanés.
- **Messagerie temps réel**: Gestion des conversations, historique hors-ligne et envoi de messages synchronisés.
- **Services HTTP**: La communication avec l'API backend est gérée par **Axios**.

## Stack Technique

- **React 18**: Pour la construction de l'interface utilisateur.
- **TypeScript**: Pour le typage statique et l'amélioration de la qualité du code.
- **Vite**: Comme outil de build pour un développement rapide et des builds optimisés.
- **React Router**: Pour la gestion de la navigation au sein de l'application.
- **Vitest**: Pour l'exécution des tests unitaires.

## Parcours utilisateur

1. **Profil** – l'utilisateur retrouve sa carte de profil, accède à l'éditeur (biographie, disponibilités, intérêts) et suit l'état de synchronisation.
2. **Découverte** – une série de cartes profil affiche le score de compatibilité et les intérêts communs; chaque action (passer/contacter) met à jour la liste en temps réel.
3. **Événements** – les événements à venir sont triés chronologiquement avec capacité et statut; un bouton unique permet de gérer l'inscription.
4. **Messagerie** – les conversations récentes apparaissent dans une liste avec indicateurs de non-lus; le panneau de discussion affiche l'historique, un compositeur asynchrone et la mise à jour instantanée des nouveaux messages.

## Exigences de performance

- **Temps de chargement**: Préchargement des données au montage de l'application et persistance locale pour un démarrage en < 1,5s sur réseau 4G.
- **Réactivité**: Actions critiques (envoi de message, inscription événement) doivent fournir un retour visuel en < 100 ms et confirmer la synchronisation en < 1s.
- **Résilience hors-ligne**: Les données mises en cache sont conservées pour consultation et réenvoi dès la reconnexion.
- **Temps réel**: La réception de nouveaux messages ou matchs doit apparaître dans l'UI en < 2s après émission côté serveur grâce au client SSE/WebSocket.

## Installation

- Copiez `.env.example` dans `.env` et ajustez si nécessaire.
- Installez les dépendances: `npm install`

## Développement

- Lancez le serveur de développement: `npm run dev` (port par défaut 5173)
- L'API est attendue à l'adresse `http://localhost:5000`

## Tests

- Lancez les tests unitaires: `npm test`

