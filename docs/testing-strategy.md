# Stratégie de tests Meetinity Mobile

Cette stratégie formalise la couverture de tests pour l’application mobile Meetinity. Elle garantit que les parcours critiques restent fiables tout en permettant une exécution automatisée dans la CI.

## Matrice de couverture

| Domaine | Objectifs | Tests unitaires | Tests d’intégration | Tests end-to-end |
| --- | --- | --- | --- | --- |
| Authentification | Validation des hooks et helpers, gestion des tokens/refresh | ✅ `AuthContext.test.tsx` (context & erreurs) | ✅ `tests/realtime/realtimeMessaging.spec.ts` (session) | ✅ `tests/e2e/messaging.spec.tsx` (parcours login + messagerie) |
| Profil & préférences | Chargement, mise à jour et cache du profil | ✅ `features/profile/screens/ProfileScreen.test.tsx` | ✅ `features/events/__tests__/EventsFlow.test.tsx` (réhydratation store) | 🔄 Couvert via scénario e2e « Onboarding → Profil » |
| Découverte & matching | Swipe, synchronisation offline, notifications | ✅ `features/discovery/screens/DiscoveryScreen.test.tsx` | ✅ `features/events/__tests__/EventsFlow.test.tsx` (intégration store) | ✅ `tests/e2e/messaging.spec.tsx` (inclut réception push & navigation) |
| Événements | Filtre, pagination, inscriptions offline | ✅ tests de composants (EventListScreen) | ✅ `features/events/__tests__/EventsFlow.test.tsx` | 🔄 Couvert via flux e2e (inscription/désinscription) |
| Messagerie temps réel | Timeline, file d’attente offline, présence | ✅ `features/messaging/screens/MessagingScreen.test.tsx` | ✅ `tests/realtime/realtimeMessaging.spec.ts` | ✅ `tests/e2e/messaging.spec.tsx` |

L’icône ✅ indique une couverture explicite aujourd’hui, 🔄 un scénario combiné ou mutualisé.

## Principes par niveau

### Tests unitaires
- Exécutés sur Vitest (`npm run test:unit`).
- Ciblent les composants et hooks isolés (contextes, reducers, helpers de cache).
- Couvrent notamment la logique offline (synchronisation des files d’attente, gestion du cache SWR).

### Tests d’intégration
- Lancement via `npm run test:integration`.
- Vérifient l’orchestration du store et des services (profil/matches/events/messaging) dans des scénarios multi-modules.
- Utilisent des doubles pour les services réseau et WebSocket.

### Tests end-to-end
- Scriptés avec Vitest + Testing Library (`npm run test:e2e`).
- Parcours critiques : authentification OAuth, découverte → profil, messagerie temps réel.
- Validations UX (accessibilité messages d’erreur, fallback offline) et vérification des métriques (stockage fps).

## Politique d’automatisation

- Les trois niveaux sont exécutés sur chaque PR via la pipeline CI (`.github/workflows/ci.yml`).
- Les scénarios critiques (authentification, découverte, messagerie) déclenchent des « smoke tests » e2e à chaque push sur `main`.
- Les métriques de performance (FPS) sont lues et archivées en sortie de pipeline pour surveiller les régressions.

## Maintenance & critères d’acceptation

- Toute nouvelle fonctionnalité doit fournir au minimum un test unitaire et un test d’intégration.
- Les parcours utilisateur cités (inscription événement, match & messagerie) ne peuvent être fusionnés sans scénarios e2e verts.
- Les benchmarks de performance doivent respecter : FPS moyen ≥ 50, temps de revalidation cache < 2s sur connexion standard.
