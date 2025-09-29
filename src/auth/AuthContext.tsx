import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import AuthService, { type User } from '../services/AuthService'
import apiClient, { type TokenUpdate } from '../services/apiClient'
import { AUTH_REFRESH_TOKEN_STORAGE_KEY, AUTH_TOKEN_STORAGE_KEY } from './constants'

interface AuthContextType {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (provider: 'google' | 'linkedin') => Promise<void>
  setToken: (token: string, options?: Omit<TokenUpdate, 'accessToken'>) => Promise<void>
  logout: () => void
}

const AUTH_FAILURE_MESSAGE = 'Votre session a expiré. Merci de vous reconnecter.'

export const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,
  login: async () => {},
  setToken: async () => {},
  logout: () => {},
})

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setTokenState] = useState<string | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const notifyAuthError = useCallback((message: string, error?: unknown) => {
    console.error(message, error)
    if (typeof window !== 'undefined' && typeof window.alert === 'function') {
      window.alert(message)
    }
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY)
    localStorage.removeItem(AUTH_REFRESH_TOKEN_STORAGE_KEY)
    apiClient.clearTokens()
    setTokenState(null)
    setUser(null)
  }, [])

  const setToken = useCallback(
    async (newToken: string, options?: Omit<TokenUpdate, 'accessToken'>) => {
      try {
        const isValid = await AuthService.verify(newToken)
        if (!isValid) {
          throw new Error('Token verification failed')
        }
        localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, newToken)
        if (options?.refreshToken) {
          localStorage.setItem(AUTH_REFRESH_TOKEN_STORAGE_KEY, options.refreshToken)
        }
        apiClient.setTokens({ accessToken: newToken, ...options })
        setTokenState(newToken)
        const profile = await AuthService.profile()
        setUser(profile)
      } catch (error) {
        logout()
        notifyAuthError(AUTH_FAILURE_MESSAGE, error)
        throw error
      }
    },
    [logout, notifyAuthError]
  )

  const login = useCallback(async (provider: 'google' | 'linkedin') => {
    const url = await AuthService.getAuthUrl(provider)
    window.location.assign(url)
  }, [])

  useEffect(() => {
    return apiClient.addAuthErrorListener((error) => {
      console.warn('Authentication error detected, clearing session', error)
      logout()
      notifyAuthError(AUTH_FAILURE_MESSAGE, error)
    })
  }, [logout, notifyAuthError])

  useEffect(() => {
    const bootstrap = async () => {
      const storedToken = localStorage.getItem(AUTH_TOKEN_STORAGE_KEY)
      if (!storedToken) {
        setIsLoading(false)
        return
      }

      try {
        const refreshToken = localStorage.getItem(AUTH_REFRESH_TOKEN_STORAGE_KEY) ?? undefined
        await setToken(storedToken, { refreshToken })
      } catch (error) {
        console.warn('Unable to restore session from storage', error)
      } finally {
        setIsLoading(false)
      }
    }

    bootstrap()
  }, [setToken])

  const value = useMemo(
    () => ({
      user,
      token,
      isAuthenticated: Boolean(token),
      isLoading,
      login,
      setToken,
      logout,
    }),
    [user, token, isLoading, login, setToken, logout]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
