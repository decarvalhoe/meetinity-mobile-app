import React from 'react'
import { useAuth } from '../auth/AuthContext'

const LoginScreen: React.FC = () => {
  const { login } = useAuth()
  return (
    <div className="auth-container">
      <h1>Sign In</h1>
      <button onClick={() => login('google')}>Sign in with Google</button>
      <button onClick={() => login('linkedin')}>Sign in with LinkedIn</button>
    </div>
  )
}

export default LoginScreen
