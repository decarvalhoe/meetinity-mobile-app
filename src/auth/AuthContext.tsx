import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import AuthService, { User } from '../services/AuthService'

interface AuthContextType {
  user: User | null
  token: string | null
  login: (provider: 'google' | 'linkedin') => Promise<void>
  setToken: (token: string) => Promise<void>
  logout: () => void
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  login: async () => {},
  setToken: async () => {},
  logout: () => {},
})

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setTokenState] = useState<string | null>(localStorage.getItem('authToken'))
  const [user, setUser] = useState<User | null>(null)

  const login = useCallback(async (provider: 'google' | 'linkedin') => {
    const url = await AuthService.getAuthUrl(provider)
    window.location.href = url
  }, [])

  const setToken = useCallback(
    async (newToken: string) => {
      localStorage.setItem('authToken', newToken)
      setTokenState(newToken)
      const profile = await AuthService.profile()
      setUser(profile)
    },
    [setTokenState, setUser]
  )

  const logout = useCallback(() => {
    localStorage.removeItem('authToken')
    setTokenState(null)
    setUser(null)
  }, [setTokenState, setUser])

  useEffect(() => {
    if (token) {
      AuthService.profile().then(setUser).catch(() => logout())
    }
  }, [token, logout])

  const value = useMemo(
    () => ({
      user,
      token,
      login,
      setToken,
      logout,
    }),
    [user, token, login, setToken, logout]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
