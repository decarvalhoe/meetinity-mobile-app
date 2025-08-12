import React from 'react'
import './index.css'

interface AuthProps {
  onAuth: (token: string) => void
}

const Auth: React.FC<AuthProps> = ({ onAuth }) => {
  const handleAuth = (provider: 'google' | 'linkedin') => {
    const token = `${provider}-mock-token`
    onAuth(token)
  }

  return (
    <div className="auth-container">
      <h1>Sign In</h1>
      <button onClick={() => handleAuth('google')}>Sign in with Google</button>
      <button onClick={() => handleAuth('linkedin')}>Sign in with LinkedIn</button>
    </div>
  )
}

export default Auth
