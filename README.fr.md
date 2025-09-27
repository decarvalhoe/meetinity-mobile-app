# Application Mobile Meetinity

Ce repository contient le code source de l'application mobile Meetinity, une plateforme de networking professionnel.

## Vue d'ensemble

L'application mobile est développée avec **React 18**, **TypeScript** et **Vite**. Elle offre une interface utilisateur moderne et réactive pour interagir avec la plateforme Meetinity.

### Fonctionnalités

- **Authentification utilisateur**: Connexion sécurisée avec OAuth 2.0 (Google et LinkedIn).
- **Routes protégées**: L'accès au contenu spécifique à l'utilisateur est réservé aux utilisateurs authentifiés.
- **Gestion de profil**: Les utilisateurs peuvent consulter les informations de leur profil après s'être connectés.
- **Services HTTP**: La communication avec l'API backend est gérée par **Axios**.

## Stack Technique

- **React 18**: Pour la construction de l'interface utilisateur.
- **TypeScript**: Pour le typage statique et l'amélioration de la qualité du code.
- **Vite**: Comme outil de build pour un développement rapide et des builds optimisés.
- **React Router**: Pour la gestion de la navigation au sein de l'application.
- **Vitest**: Pour l'exécution des tests unitaires.

## État du Projet

- **Avancement**: 70%
- **Détails**: L'application dispose d'une structure complète avec un système d'authentification fonctionnel. Le principal objectif pour le développement futur sera d'implémenter les fonctionnalités de base de la plateforme, telles que la découverte d'événements et la mise en relation d'utilisateurs.

## Installation

- Copiez `.env.example` dans `.env` et ajustez si nécessaire.
- Installez les dépendances: `npm install`

## Développement

- Lancez le serveur de développement: `npm run dev` (port par défaut 5173)
- L'API est attendue à l'adresse `http://localhost:5000`

## Tests

- Lancez les tests unitaires: `npm test`

