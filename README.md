# Meetinity Mobile App

This repository contains the source code for the Meetinity mobile application, a professional networking platform.

## Overview

The mobile application is built with **React 18**, **TypeScript**, and **Vite**. It provides a modern and responsive user interface for interacting with the Meetinity platform.

### Features

- **User Authentication**: Secure login with OAuth 2.0 (Google and LinkedIn).
- **Protected Routes**: Access to user-specific content is restricted to authenticated users.
- **Profile Management**: Users can view their profile information after logging in.
- **Realtime Messaging**: Conversations, read receipts, and attachments are kept in sync through the realtime transport with automatic reconnection and presence updates.
- **Offline Resilience**: Conversation and message queues persist in local storage, enabling message retry and duplicate prevention even when the device goes offline.
- **HTTP Services**: Communication with the backend API is handled by **Axios**.

## Tech Stack

- **React 18**: For building the user interface.
- **TypeScript**: For static typing and improved code quality.
- **Vite**: As a build tool for fast development and optimized builds.
- **React Router**: for handling navigation within the application.
- **Vitest**: For running unit tests.

## OAuth 2.0 flow

The authentication flow relies on short-lived API tokens issued by the backend. The sequence is as follows:

1. From the login screen the user chooses “Continuer avec …”. The mobile app calls `POST /api/auth/<provider>` to obtain an authorization URL and redirects the browser to the provider.
2. After user consent, the provider redirects back to the frontend on `/auth/callback` with the following parameters:
   - `provider`: the provider identifier (`google` or `linkedin`).
   - Either a `code`/`state` pair or a `token` directly returned by the backend (e.g. for one-tap flows).
3. The callback screen calls the backend endpoint `POST /api/auth/<provider>/callback` when `code/state` are present, or uses the provided `token` directly.
4. `AuthContext` validates every token with `GET /api/auth/verify` before persisting it to `localStorage` (`auth.token`). Valid tokens are then used to fetch the user profile via `GET /api/auth/profile` and to authorise future API and realtime calls.
5. When the verification fails, the context clears the session, notifies the user and redirects them back to the login screen.

## Environment

Create a `.env` file based on `.env.example` and adjust it to match your backend configuration. The defaults mirror the values baked into the application.

| Variable | Default | Description |
| --- | --- | --- |
| `VITE_API_BASE_URL` | `http://localhost:8080` | Base URL for all REST calls performed by the Axios client. |
| `VITE_API_TIMEOUT` | `30000` | Request timeout (ms) applied to HTTP calls. |
| `VITE_TOKEN_REFRESH_THRESHOLD` | `120000` | Refresh window (ms) used to renew tokens before expiry. |
| `VITE_REALTIME_URL` | _unset_ | Optional SSE/WebSocket endpoint overriding `${VITE_API_BASE_URL}/realtime`. |
| `VITE_OAUTH_REDIRECT_URI` | _unset_ | Optional callback URL reference for OAuth documentation/tests. |
| `VITE_ENABLE_ANALYTICS` | _unset_ | Optional flag enabling performance telemetry. |

> Offline resilience is handled internally by the messaging store and cannot be toggled via environment variables.

## Setup

- Install dependencies: `npm install`
- Start the dev server: `npm run dev` (default port 5173)

## Testing

- Run unit tests: `npm test`
