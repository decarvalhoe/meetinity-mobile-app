# Contrat API — Profil utilisateur

Cette section décrit les échanges attendus entre l'application et l'API pour les fonctionnalités de profil et de préférences. Tous les exemples sont exprimés en JSON.

## Récupération du profil

`GET /profile`

Réponse : `200 OK`

```json
{
  "id": "user-1",
  "fullName": "Jane Doe",
  "headline": "Product Manager",
  "avatarUrl": "https://cdn.example.com/avatars/user-1.png",
  "bio": "Bio optionnelle",
  "interests": ["Tech", "IA"],
  "location": "Paris",
  "availability": "Soirées",
  "preferences": {
    "discoveryRadiusKm": 25,
    "industries": ["Tech"],
    "interests": ["IA"],
    "eventTypes": ["Meetup"]
  }
}
```

### Schéma `UserProfile`

| Champ | Type | Description |
| --- | --- | --- |
| `id` | `string` | Identifiant unique de l'utilisateur. |
| `fullName` | `string` | Nom complet. |
| `headline` | `string` | Titre professionnel affiché dans les cartes. |
| `avatarUrl` | `string` (optionnel) | URL absolue de l'avatar. |
| `bio` | `string` (optionnel) | Présentation courte. |
| `interests` | `string[]` | Intérêts principaux utilisés pour l'affichage du profil. |
| `location` | `string` (optionnel) | Ville ou zone géographique. |
| `availability` | `string` (optionnel) | Créneau de disponibilité affiché dans les cartes. |
| `preferences` | [`ProfilePreferences`](#schéma-profilepreferences) (optionnel) | Préférences de découverte associées au profil. |

### Schéma `ProfilePreferences`

| Champ | Type | Description |
| --- | --- | --- |
| `discoveryRadiusKm` | `number` | Rayon de recherche en kilomètres. |
| `industries` | `string[]` | Secteurs d'activité privilégiés pour les rencontres. |
| `interests` | `string[]` | Centres d'intérêt à mettre en avant pour la découverte. |
| `eventTypes` | `string[]` | Types d'évènements suggérés à l'utilisateur. |

## Mise à jour du profil

`PUT /profile`

La requête accepte un objet partiel décrivant les champs à mettre à jour. Les champs omis conservent leur valeur actuelle.

### Schéma `ProfileUpdateRequest`

```json
{
  "fullName": "Jane Updated",
  "headline": "Head of Product",
  "bio": "Nouvelle bio",
  "interests": ["Tech", "Design"],
  "location": "Lyon",
  "availability": "Week-end",
  "avatarUrl": "https://cdn.example.com/avatars/user-1.png",
  "preferences": {
    "discoveryRadiusKm": 40,
    "industries": ["Tech", "Finance"],
    "interests": ["IA", "Design"],
    "eventTypes": ["Meetup", "Workshop"]
  }
}
```

#### Champs

| Champ | Type | Description |
| --- | --- | --- |
| `fullName` | `string` (optionnel) | Mise à jour du nom complet. |
| `headline` | `string` (optionnel) | Nouveau titre professionnel. |
| `bio` | `string` (optionnel) | Description libre. |
| `interests` | `string[]` (optionnel) | Liste remplacée intégralement lors de l'envoi. |
| `location` | `string` (optionnel) | Nouvelle localisation. |
| `availability` | `string` (optionnel) | Nouvelle disponibilité affichée. |
| `avatarUrl` | `string` (optionnel) | URL finale de l'avatar (fournie après upload). |
| `preferences` | [`ProfilePreferences`](#schéma-profilepreferences) (optionnel) | Valeurs remplacées intégralement. Les tableaux envoyés vides annulent les valeurs précédentes. |

Réponse : `200 OK` avec le `UserProfile` complet (même schéma que `GET /profile`).

## Upload d'avatar

L'upload du fichier est découplé de la mise à jour du profil. L'application envoie l'image recadrée en base64 et récupère une URL exploitable pour le `avatarUrl` du `PUT /profile`.

`POST /profile/avatar`

### Requête `AvatarUploadRequest`

```json
{
  "image": "data:image/png;base64,iVBOR...",
  "fileName": "avatar.png",
  "mimeType": "image/png",
  "size": 125634,
  "crop": {
    "x": 0,
    "y": 0,
    "width": 1,
    "height": 1,
    "scale": 1.2,
    "rotation": 0
  }
}
```

| Champ | Type | Description |
| --- | --- | --- |
| `image` | `string` | Données de l'image au format data URL (PNG ou JPEG). |
| `fileName` | `string` | Nom d'origine du fichier, utilisé pour la métadonnée de CDN. |
| `mimeType` | `string` | Type MIME de l'image (`image/png`, `image/jpeg`, etc.). |
| `size` | `number` | Taille en octets du fichier original. |
| `crop` | [`AvatarCropSettings`](#schéma-avatarcropsettings) | Paramètres de recadrage appliqués côté serveur. |

### Schéma `AvatarCropSettings`

| Champ | Type | Description |
| --- | --- | --- |
| `x` | `number` | Décalage horizontal normalisé (-1 à 1). |
| `y` | `number` | Décalage vertical normalisé (-1 à 1). |
| `width` | `number` | Largeur relative de la zone retenue (0 à 1). |
| `height` | `number` | Hauteur relative de la zone retenue (0 à 1). |
| `scale` | `number` | Facteur de zoom appliqué lors du recadrage. |
| `rotation` | `number` | Rotation en degrés (optionnelle). |

Réponse : `201 Created`

```json
{
  "url": "https://cdn.example.com/avatars/user-1.png"
}
```

L'URL retournée est ensuite transmise dans le corps du `PUT /profile` via le champ `avatarUrl`.

## Préférences enregistrées

`GET /profile/preferences`

Renvoie les préférences actuellement persistées pour l'utilisateur connecté.

Réponse : `200 OK`

```json
{
  "discoveryRadiusKm": 25,
  "industries": ["Tech"],
  "interests": ["IA"],
  "eventTypes": ["Meetup"]
}
```

Ce contrat sert de source de vérité pour l'initialisation du formulaire de préférences et la reprise hors-ligne du brouillon.
