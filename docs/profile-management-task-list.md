# Plan de tâches — Gestion du profil utilisateur

## 1. Cartographier les endpoints & modèles
- [ ] Recenser les endpoints User Service (création, mise à jour, suppression d'avatar, récupération de profil).
- [ ] Définir les DTO d'entrée/sortie pour le client mobile et documenter dans `/docs/api-contracts`.
- [ ] Identifier les règles de validation côté backend (longueurs, formats, champs requis) et les intégrer dans la documentation.
- [ ] Aligner la stratégie d'authentification (token refresh, erreurs 401/403) avec l'équipe backend.

## 2. UX/UI & états d'écran
- [ ] Produire les wireframes (création, édition, aperçu) et les faire valider par le design lead.
- [ ] Lister les composants existants à réutiliser et planifier les nouveaux (inputs, sélecteurs de compétences, chips).
- [ ] Définir les états de chargement, d'erreur, et empty states pour chaque écran.
- [ ] Documenter les guidelines d'accessibilité (contraste, tailles de police, labels).

## 3. Persistance locale & édition optimiste
- [ ] Choisir la solution de stockage (AsyncStorage/SQLite) et valider la structure des schémas.
- [ ] Implémenter la sauvegarde automatique des brouillons à chaque modification de champ.
- [ ] Concevoir la logique d'édition optimiste avec rollback en cas d'échec réseau.
- [ ] Couvrir ces flows par des tests unitaires et d'intégration.

## 4. Upload & gestion de photo de profil
- [ ] Sélectionner les librairies (image picker, cropper, compresseur) compatibles iOS/Android.
- [ ] Implémenter le recadrage et la compression côté client en respectant les limites backend.
- [ ] Gérer l'upload résumable et la reprise après coupure réseau.
- [ ] Mettre en place le cache local des avatars (cache busting, invalidation à la mise à jour).

## 5. Validation, erreurs & qualité
- [ ] Ajouter les validations de formulaire (obligatoires, formats email/téléphone, longueurs bio).
- [ ] Centraliser les messages d'erreur localisés et cohérents avec le design system.
- [ ] Écrire les tests d'intégration avec le service utilisateur (mock API + scénarios happy path/erreurs).
- [ ] Mettre à jour la checklist QA et les critères d'acceptation pour la mise en production.
