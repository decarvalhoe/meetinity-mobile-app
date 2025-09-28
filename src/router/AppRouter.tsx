import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import LoginScreen from '../screens/LoginScreen'
import OAuthCallback from '../screens/OAuthCallback'
import ProtectedRoute from '../auth/ProtectedRoute'
import TabLayout from './TabLayout'
import ProfileScreen from '../features/profile/screens/ProfileScreen'
import DiscoveryScreen from '../features/discovery/screens/DiscoveryScreen'
import EventsScreen from '../features/events/screens/EventsScreen'
import MessagingScreen from '../features/messaging/screens/MessagingScreen'

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
        <Route path="events" element={<EventsScreen />} />
        <Route path="messaging" element={<MessagingScreen />} />
      </Route>
      <Route path="/" element={<Navigate to="/app/profile" replace />} />
      <Route path="*" element={<Navigate to="/app/profile" replace />} />
    </Routes>
  </BrowserRouter>
)

export default AppRouter
