import React, { createContext, useCallback, useContext, useEffect, useState } from 'react'
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

  const logout = useCallback(() => {
    localStorage.removeItem('authToken')
    setTokenState(null)
    setUser(null)
  }, [])

  useEffect(() => {
    if (token) {
      AuthService.profile().then(setUser).catch(() => logout())
    } else {
      setUser(null)
    }
  }, [token, logout])

  const login = async (provider: 'google' | 'linkedin') => {
    const url = await AuthService.getAuthUrl(provider)
    window.location.href = url
  }

  const setToken = async (newToken: string) => {
    localStorage.setItem('authToken', newToken)
    setTokenState(newToken)
  }

  return <AuthContext.Provider value={{ user, token, login, setToken, logout }}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
