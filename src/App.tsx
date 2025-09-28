import React from 'react'
import { AuthProvider } from './auth/AuthContext'
import AppRouter from './router/AppRouter'
import { AppStoreProvider } from './store/AppStore'

const App: React.FC = () => (
  <AuthProvider>
    <AppStoreProvider>
      <AppRouter />
    </AppStoreProvider>
  </AuthProvider>
)

export default App
