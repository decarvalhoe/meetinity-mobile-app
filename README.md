# Meetinity Mobile App

This repository contains the source code for the Meetinity mobile application, a professional networking platform.

## Overview

The mobile application is built with **React 18**, **TypeScript**, and **Vite**. It provides a modern and responsive user interface for interacting with the Meetinity platform.

### Features

- **User Authentication**: Secure login with OAuth 2.0 (Google and LinkedIn).
- **Protected Routes**: Access to user-specific content is restricted to authenticated users.
- **Profile Management**: Users can view their profile information after logging in.
- **HTTP Services**: Communication with the backend API is handled by **Axios**.

## Tech Stack

- **React 18**: For building the user interface.
- **TypeScript**: For static typing and improved code quality.
- **Vite**: As a build tool for fast development and optimized builds.
- **React Router**: for handling navigation within the application.
- **Vitest**: For running unit tests.

## Project Status

- **Progress**: 70%
- **Details**: The application has a complete structure with a functional authentication system. The main focus for future development will be on implementing the core features of the platform, such as event discovery and user matching.

## Setup

- Copy `.env.example` to `.env` and adjust if needed.
- Install dependencies: `npm install`

## Development

- Start the dev server: `npm run dev` (default port 5173)
- API is expected at `http://localhost:5000`

## Testing

- Run unit tests: `npm test`

