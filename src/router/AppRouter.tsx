import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import LoginScreen from '../screens/LoginScreen'
import OAuthCallback from '../screens/OAuthCallback'
import ProtectedRoute from '../auth/ProtectedRoute'
import TabLayout from './TabLayout'
import ProfileScreen from '../features/profile/screens/ProfileScreen'
import DiscoveryScreen from '../features/discovery/screens/DiscoveryScreen'
import EventsScreen from '../features/events/screens/EventsScreen'
import EventListScreen from '../features/events/screens/EventListScreen'
import EventDetailScreen from '../features/events/screens/EventDetailScreen'
import MyEventsScreen from '../features/events/screens/MyEventsScreen'
import MessagingScreen from '../features/messaging/screens/MessagingScreen'

/**
 * Définition centralisée des transitions entre les modules applicatifs.
 *
 * - Utilisateur non authentifié → `/login` puis `/app/...` après connexion (AuthProvider).
 * - Module principal `/app` protégé par `ProtectedRoute`.
 * - Entrée par défaut : `/app/profile` (profil) pour garantir l'initialisation du store utilisateur.
 * - Navigation imbriquée :
 *   - `/app/events` → liste → `/app/events/:eventId` pour le détail.
 *   - `/app/events/mine` pour les événements inscrits.
 *   - `/app/messaging` gère les conversations ↔ chat via l'état global.
 * - Routes de repli : toute URL inconnue redirige vers `/app/profile`.
 */

const AppRouter: React.FC = () => (
  <BrowserRouter>
    <Routes>
      <Route path="/login" element={<LoginScreen />} />
      <Route path="/auth/callback" element={<OAuthCallback />} />
      <Route
        path="/app"
        element={
          <ProtectedRoute>
            <TabLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="profile" replace />} />
        <Route path="profile" element={<ProfileScreen />} />
        <Route path="discovery" element={<DiscoveryScreen />} />
        <Route path="events" element={<EventsScreen />}>
          <Route index element={<EventListScreen />} />
          <Route path="mine" element={<MyEventsScreen />} />
          <Route path=":eventId" element={<EventDetailScreen />} />
        </Route>
        <Route path="messaging" element={<MessagingScreen />} />
      </Route>
      <Route path="/" element={<Navigate to="/app/profile" replace />} />
      <Route path="*" element={<Navigate to="/app/profile" replace />} />
    </Routes>
  </BrowserRouter>
)

export default AppRouter
