import React, { Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import ProtectedRoute from '../auth/ProtectedRoute'
import TabLayout from './TabLayout'

const LoginScreen = React.lazy(() => import('../screens/LoginScreen'))
const OAuthCallback = React.lazy(() => import('../screens/OAuthCallback'))
const ProfileScreen = React.lazy(() => import('../features/profile/screens/ProfileScreen'))
const DiscoveryScreen = React.lazy(() => import('../features/discovery/screens/DiscoveryScreen'))
const EventsScreen = React.lazy(() => import('../features/events/screens/EventsScreen'))
const EventListScreen = React.lazy(() => import('../features/events/screens/EventListScreen'))
const EventDetailScreen = React.lazy(() => import('../features/events/screens/EventDetailScreen'))
const MyEventsScreen = React.lazy(() => import('../features/events/screens/MyEventsScreen'))
const MessagingScreen = React.lazy(() => import('../features/messaging/screens/MessagingScreen'))

const AppRouter: React.FC = () => (
  <BrowserRouter>
    <Suspense fallback={<div className="loading">Chargement…</div>}>
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
    </Suspense>
  </BrowserRouter>
)

export default AppRouter
