import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from './AuthContext'

interface Props {
  children: JSX.Element
}

const ProtectedRoute: React.FC<Props> = ({ children }) => {
  const { token } = useAuth()
  if (!token) {
    return <Navigate to="/login" replace />
  }
  return children
}

export default ProtectedRoute
