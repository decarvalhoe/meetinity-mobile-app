import React, { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import AuthService from '../services/AuthService'

type Provider = 'google' | 'linkedin'

const OAuthCallback: React.FC = () => {
  const { search } = useLocation()
  const navigate = useNavigate()
  const { setToken } = useAuth()
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const params = new URLSearchParams(search)
    const provider = params.get('provider') as Provider | null
    const code = params.get('code')
    const state = params.get('state')
    const token = params.get('token')

    setError(null)
    setIsLoading(true)

    if (!provider) {
      setError('Fournisseur manquant dans la réponse OAuth.')
      setIsLoading(false)
      return
    }

    if (!token && (!code || !state)) {
      setError('Paramètres de validation manquants dans la réponse OAuth.')
      setIsLoading(false)
      return
    }

    let isActive = true

    const completeAuthentication = async () => {
      try {
        const resolvedToken = token
          ? await AuthService.handleCallback(provider, code, state, token)
          : await AuthService.handleCallback(provider, code, state)
        await setToken(resolvedToken)
        if (isActive) {
          navigate('/profile', { replace: true })
        }
      } catch (err) {
        console.error('OAuth callback handling failed', err)
        if (isActive) {
          setError("Impossible de finaliser l'authentification. Veuillez réessayer.")
          setIsLoading(false)
        }
      }
    }

    completeAuthentication()

    return () => {
      isActive = false
    }
  }, [navigate, search, setToken])

  if (isLoading) {
    return (
      <div className="auth-status" aria-busy="true">
        <p>Connexion en cours…</p>
      </div>
    )
  }

  return (
    <div className="auth-status auth-status--error" role="alert">
      <p>{error ?? "Une erreur inattendue est survenue."}</p>
      <button
        type="button"
        className="auth-button auth-button--secondary"
        onClick={() => navigate('/login', { replace: true })}
      >
        Retour à la connexion
      </button>
    </div>
  )
}

export default OAuthCallback
