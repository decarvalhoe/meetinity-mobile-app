# Meetinity Mobile App – API Integration Guide

## Overview

The Meetinity mobile PWA communicates with the public API gateway for authentication, profile, and messaging features. This guide documents the environment variables, storage keys, and token lifecycle that the frontend expects so the backend team can validate compatibility before each release.

## Environment configuration

| Variable | Default | Description |
| --- | --- | --- |
| `VITE_API_BASE_URL` | `http://localhost:8080` | Base URL used by the Axios client for all REST calls. |
| `VITE_API_TIMEOUT` | `30000` | Request timeout (milliseconds) applied to every HTTP call. |
| `VITE_TOKEN_REFRESH_THRESHOLD` | `120000` | Time window (milliseconds) used to proactively refresh the token before it expires. |
| `VITE_REALTIME_URL` | `null` (falls back to `${VITE_API_BASE_URL}/realtime`) | Optional override for the realtime transport (SSE/WebSocket). |
| `VITE_APP_VERSION` | `1.0.0` | Sent as `X-Client-Version` to help the backend trace client builds. |
| `VITE_ENABLE_ANALYTICS` | _unset_ (falsy) | Optional flag enabling performance metrics collection in `usePerformanceMonitor`. |
| `VITE_OAUTH_REDIRECT_URI` | _optional_ | Only needed for automated flows that must know the public callback URI. |

⚠️ Offline resilience is always enabled by the messaging store and does **not** rely on an environment flag. Leaving historical variables such as `VITE_ENABLE_OFFLINE_MODE` in configuration files will have no effect.

## Persisted authentication state

Tokens and metadata are stored in `localStorage` with the following keys defined in [`src/auth/constants.ts`](src/auth/constants.ts):

- `auth.token`: last valid access token.
- `auth.refreshToken`: refresh token provided by the backend.
- `auth.tokenExpiry`: UNIX timestamp (ms) used to determine when the token expires.

The client reads these keys on bootstrap to rehydrate the session and remove them whenever authentication fails.

## HTTP client behaviour

The Axios instance defined in [`src/services/apiClient.ts`](src/services/apiClient.ts) centralises HTTP calls:

- It initialises with `baseURL = VITE_API_BASE_URL` (fallback `http://localhost:8080`) and attaches JSON headers plus client metadata.
- A request interceptor injects the `Authorization` header and triggers a proactive refresh when the expiry window is below the configured threshold.
- A response interceptor retries once after invoking the refresh flow on `401` responses.
- Helper methods (`get`, `post`, `put`, `delete`, `request`) expose the shared instance to the rest of the application.

## Token refresh flow

Token management is handled entirely inside `apiClient.ts` and follows the rules below:

1. **Threshold:** `shouldRefreshSoon` returns `true` when the expiry timestamp is less than `REFRESH_THRESHOLD` (default 120 s) ahead of the current time. When triggered, the request interceptor attempts a background refresh before the outgoing call.
2. **Endpoint:** refreshes call `POST {baseURL}/auth/refresh` with payload `{ refresh_token }`. The response is expected to include `access_token`, an optional `refresh_token`, and an optional `expires_in` field (seconds).
3. **Storage updates:** `setTokens` rewrites `auth.token`, `auth.refreshToken`, and `auth.tokenExpiry`. If `expires_in` is missing, the expiry is decoded from the JWT payload.
4. **Error handling:** failed refreshes clear all keys and notify listeners via `addAuthErrorListener`, letting higher-level stores redirect the user to the login screen.
5. **Retry:** when a refresh succeeds after a `401` response, the original request is replayed once with the new token.

## Realtime considerations

`src/services/realtime.ts` computes the realtime base URL as `VITE_REALTIME_URL ?? '/realtime'`, meaning the frontend will default to `${VITE_API_BASE_URL}/realtime` on browsers that support relative URLs. Ensure the backend exposes compatible authentication (Bearer token) on that endpoint.

## Backend alignment checklist

Before publishing a new mobile build, the backend team should confirm the following:

- `POST /auth/refresh` accepts `{ refresh_token }` and responds with `{ access_token, refresh_token?, expires_in? }`.
- Access tokens are valid for longer than the refresh threshold (120 s) to avoid refresh loops.
- The API gateway honours `Authorization: Bearer <token>` on protected endpoints and issues `401` responses when the token is invalid/expired.
- Realtime transport validates the same bearer tokens and is reachable either via `${VITE_API_BASE_URL}/realtime` or the explicit `VITE_REALTIME_URL`.
- Optional analytics instrumentation is safe to enable or disable via `VITE_ENABLE_ANALYTICS` without breaking API compatibility.

Keeping this checklist current provides the requested technical review to ensure frontend/backoffice alignment prior to release.
