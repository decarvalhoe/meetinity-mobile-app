import React from 'react'
import { AuthProvider } from './auth/AuthContext'
import AppRouter from './router/AppRouter'
import { AppStoreProvider } from './store/AppStore'
import usePerformanceMonitor from './lib/perf/usePerformanceMonitor'

const App: React.FC = () => {
  usePerformanceMonitor()
  return (
    <AuthProvider>
      <AppStoreProvider>
        <AppRouter />
      </AppStoreProvider>
    </AuthProvider>
  )
}

export default App
