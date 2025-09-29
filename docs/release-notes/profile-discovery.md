# Notes de livraison – Profil & Découverte

## Résumé
- Implémentation d’un client API unifié avec rafraîchissement automatique des tokens pour les modules Profil, Matching, Événements et Messagerie.
- Nouvelle couche de cache partagée (stale-while-revalidate + expiration) intégrée au store global pour garantir une expérience offline.
- Optimisations UI : lazy-loading des écrans, mémoïsation des listes, suivi et enregistrement des FPS.

## Critères d’acceptation
- ✅ Navigation profil/découverte disponible hors-ligne avec les dernières données synchronisées.
- ✅ Synchronisation automatique des likes, des inscriptions événement et des messages dès le retour en ligne.
- ✅ Benchmarks : FPS moyen ≥ 55 sur Chrome desktop, revalidation réseau < 1,5 s pour profil/matchs.
- ✅ Conformité UX : fallback offline explicites, boutons d’action accessibles (labels et rôles).

## Tests & QA
- Matrice de tests publiée (`docs/testing-strategy.md`).
- Pipeline CI exécutant lint + tests unitaires/intégration/e2e (`.github/workflows/ci.yml`).
- Vérifications manuelles : parcours login → découverte → messagerie, bascule offline/online, récupération automatique des notifications.

## Monitoring & métriques
- Stockage local des métriques de performance (FPS) via `usePerformanceMonitor`.
- Données prêtes à être collectées par la CI pour analyse de régression.

## Points d’attention
- Le cache évènementiel est invalidé automatiquement lors des changements de filtres.
- Les listeners d’erreurs d’authentification déclenchent une déconnexion contrôlée et alertent l’utilisateur.
