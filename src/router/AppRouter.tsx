import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import LoginScreen from '../screens/LoginScreen'
import OAuthCallback from '../screens/OAuthCallback'
import ProfileScreen from '../screens/ProfileScreen'
import ProtectedRoute from '../auth/ProtectedRoute'

const AppRouter: React.FC = () => (
  <BrowserRouter>
    <Routes>
      <Route path="/login" element={<LoginScreen />} />
      <Route path="/auth/callback" element={<OAuthCallback />} />
      <Route path="/profile" element={<ProtectedRoute><ProfileScreen /></ProtectedRoute>} />
      <Route path="/" element={<Navigate to="/profile" />} />
    </Routes>
  </BrowserRouter>
)

export default AppRouter
