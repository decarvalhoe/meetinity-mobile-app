import React from 'react'
import { AuthProvider } from './auth/AuthContext'
import AppRouter from './router/AppRouter'

const App: React.FC = () => (
  <AuthProvider>
    <AppRouter />
  </AuthProvider>
)

export default App
