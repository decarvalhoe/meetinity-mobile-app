import React from 'react'
import { AuthProvider } from './auth/AuthContext'
import AppRouter from './router/AppRouter'
import { AccessibilityProvider } from './accessibility'
import { AppStoreProvider } from './store/AppStore'

const App: React.FC = () => (
  <AuthProvider>
    <AccessibilityProvider>
      <AppStoreProvider>
        <AppRouter />
      </AppStoreProvider>
    </AccessibilityProvider>
  </AuthProvider>
)

export default App
