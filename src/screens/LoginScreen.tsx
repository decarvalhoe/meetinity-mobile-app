import React, { useState } from 'react'
import { useAuth } from '../auth/AuthContext'

type Provider = 'google' | 'linkedin'

const labels: Record<Provider, string> = {
  google: 'Continuer avec Google',
  linkedin: 'Continuer avec LinkedIn',
}

const LoginScreen: React.FC = () => {
  const { login } = useAuth()
  const [loadingProvider, setLoadingProvider] = useState<Provider | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleLogin = async (provider: Provider) => {
    setError(null)
    setLoadingProvider(provider)
    try {
      await login(provider)
    } catch (err) {
      console.error('Unable to start OAuth flow', err)
      setError('Impossible de démarrer la connexion. Merci de réessayer.')
    } finally {
      setLoadingProvider(null)
    }
  }

  return (
    <div className="auth-container">
      <h1 className="auth-title">Connectez-vous</h1>
      <p className="auth-subtitle">Choisissez votre fournisseur d’identité préféré.</p>
      <div className="auth-providers">
        {(Object.keys(labels) as Provider[]).map((provider) => (
          <button
            key={provider}
            type="button"
            className={`auth-button auth-button--${provider}`}
            onClick={() => handleLogin(provider)}
            disabled={loadingProvider !== null}
            aria-busy={loadingProvider === provider}
          >
            {loadingProvider === provider ? 'Connexion…' : labels[provider]}
          </button>
        ))}
      </div>
      {error ? (
        <div className="auth-feedback" role="alert">
          {error}
        </div>
      ) : null}
    </div>
  )
}

export default LoginScreen
