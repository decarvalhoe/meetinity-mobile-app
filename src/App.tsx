import React from 'react'
import { AuthProvider } from './auth/AuthContext'
import AppRouter from './router/AppRouter'
import { AccessibilityProvider } from './accessibility'
import { AppStoreProvider } from './store/AppStore'
import usePerformanceMonitor from './lib/perf/usePerformanceMonitor'

const App: React.FC = () => {
  usePerformanceMonitor()
  return (
    <AuthProvider>
      <AccessibilityProvider>
        <AppStoreProvider>
          <AppRouter />
        </AppStoreProvider>
      </AccessibilityProvider>
    </AuthProvider>
  )
}

export default App
