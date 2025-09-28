import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from './AuthContext'

interface Props {
  children: JSX.Element
}

const ProtectedRoute: React.FC<Props> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="auth-status" aria-busy="true">
        <p>Chargement de votre session…</p>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return children
}

export default ProtectedRoute
