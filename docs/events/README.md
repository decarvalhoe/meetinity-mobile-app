# Gestion des événements

Ce document détaille le fonctionnement des écrans « Événements », la liste paginée, la fiche détaillée, la section « Mes événements » ainsi que les règles métier associées aux filtres, à la pagination et aux inscriptions.

## Liste paginée

L'écran principal (`EventListScreen`) s'appuie sur l'action `refreshEvents(filters, page)` exposée par le `AppStore`. Les paramètres envoyés au service `/events` correspondent aux filtres actifs ainsi qu'à la pagination.

- **Pagination** : la page courante et la taille de page sont conservées dans le store (`AppStore.state.events.data`). Le bouton « Charger plus » incrémente la page et fusionne les éléments déjà présents avec ceux de la requête suivante (suppression des doublons par `id`).
- **Réinitialisation** : le bouton « Réinitialiser » vide l'ensemble des filtres et revient à la première page.

### Filtres disponibles

| Filtre         | Description                                                                 | Paramètre API |
| -------------- | ----------------------------------------------------------------------------- | ------------- |
| `categoryId`   | Identifiant de catégorie sélectionné dans la liste déroulante                | `categoryId`  |
| `location`     | Filtre textuel sur la ville / lieu                                            | `location`    |
| `startDate`    | Date minimale (format ISO `YYYY-MM-DD`)                                      | `startDate`   |
| `endDate`      | Date maximale (format ISO `YYYY-MM-DD`)                                      | `endDate`     |
| `search`       | Requête libre (titre, lieu, mot-clé) envoyée lors de la validation du champ  | `search`      |
| `sort`         | Option de tri (`upcoming`, `recent`, `popular`), `upcoming` par défaut       | `sort`        |

Les filtres vides sont automatiquement nettoyés avant l'appel réseau. Les suggestions de recherche (titre ou lieu) sont construites côté client à partir des événements déjà chargés.

## Fiche événement

`EventDetailScreen` récupère les détails via `loadEventDetails(eventId)`. Les données sont mises en cache dans `AppStore.state.eventDetails` afin de permettre :

- un affichage instantané lorsque l'utilisateur revient sur un événement déjà consulté ;
- un fallback hors-ligne basé sur les informations résumées si la requête échoue.

### Règles métier d'inscription

- Les actions d'inscription/désinscription utilisent `toggleEventRegistration(eventId, register)` avec une mise à jour optimiste du cache (`events` et `eventDetails`).
- En cas de perte de connexion, l'action est queue dans `pendingEventRegistrations` et rejouée automatiquement au retour en ligne. L'interface indique « Synchronisation… » et affiche un message lorsque l'action est en attente.
- En cas d'erreur serveur, la mutation est annulée (rollback) et un message est affiché.
- Le compteur `attendingCount` est borné entre 0 et la capacité déclarée de l'événement.

## Mes événements

`MyEventsScreen` affiche les événements où `isRegistered === true` depuis le cache local (`AppStore.state.events`). L'écran fonctionne en mode hors-ligne : si la dernière synchronisation a échoué (`state.events.status === 'error'`), un bandeau explicite informe l'utilisateur que les données proviennent du cache.

## Recherche et tri

Le composant `EventSearchBar` gère :

- la saisie libre avec validation (bouton « Rechercher ») ;
- l'affichage de suggestions contextualisées (liste `role="listbox"`) permettant d'appliquer rapidement un intitulé ou un lieu ;
- la sélection de l'ordre de tri.

Chaque interaction déclenche l'appel à `refreshEvents` avec les filtres consolidés, garantissant la cohérence des listes, de l'écran détail et de la section « Mes événements ».
