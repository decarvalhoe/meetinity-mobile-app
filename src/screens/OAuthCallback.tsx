import React, { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import AuthService from '../services/AuthService'

const OAuthCallback: React.FC = () => {
  const { search } = useLocation()
  const navigate = useNavigate()
  const { setToken } = useAuth()

  useEffect(() => {
    const params = new URLSearchParams(search)
    const code = params.get('code')
    const state = params.get('state')
    if (code && state) {
      AuthService.handleCallback({ code, state })
        .then((token) => setToken(token))
        .then(() => navigate('/profile'))
        .catch(() => navigate('/login'))
    } else {
      navigate('/login')
    }
  }, [search, navigate, setToken])

  return <p>Signing in...</p>
}

export default OAuthCallback
