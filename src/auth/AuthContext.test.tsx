import { act, render, screen, waitFor } from '@testing-library/react'
import React from 'react'
import { describe, expect, it, beforeEach, vi } from 'vitest'
import { AuthProvider, useAuth } from './AuthContext'
import AuthService from '../services/AuthService'
import { AUTH_TOKEN_STORAGE_KEY } from './constants'

vi.mock('../services/AuthService', () => ({
  default: {
    getAuthUrl: vi.fn(),
    handleCallback: vi.fn(),
    verify: vi.fn(),
    profile: vi.fn(),
  },
}))

type AuthServiceMock = {
  getAuthUrl: ReturnType<typeof vi.fn>
  handleCallback: ReturnType<typeof vi.fn>
  verify: ReturnType<typeof vi.fn>
  profile: ReturnType<typeof vi.fn>
}

const mockedAuthService = AuthService as unknown as AuthServiceMock

const ContextReader: React.FC = () => {
  const auth = useAuth()
  return (
    <div>
      <span data-testid="is-auth">{auth.isAuthenticated ? 'yes' : 'no'}</span>
      <span data-testid="user-email">{auth.user?.email ?? 'anonymous'}</span>
      <button type="button" onClick={() => auth.logout()}>
        logout
      </button>
    </div>
  )
}

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  it('restores a persisted session after successful verification', async () => {
    localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, 'stored-token')
    mockedAuthService.verify.mockResolvedValue(true)
    mockedAuthService.profile.mockResolvedValue({
      id: '1',
      name: 'Ada Lovelace',
      email: 'ada@example.com',
    })

    render(
      <AuthProvider>
        <ContextReader />
      </AuthProvider>
    )

    await screen.findByText('ada@example.com')
    expect(screen.getByTestId('is-auth').textContent).toBe('yes')
  })

  it('persists token, fetches profile and exposes user data', async () => {
    mockedAuthService.verify.mockResolvedValue(true)
    mockedAuthService.profile.mockResolvedValue({
      id: '2',
      name: 'Grace Hopper',
      email: 'grace@example.com',
    })

    let contextValue: ReturnType<typeof useAuth> | null = null
    const Capture: React.FC = () => {
      contextValue = useAuth()
      return null
    }

    render(
      <AuthProvider>
        <Capture />
      </AuthProvider>
    )

    await waitFor(() => expect(contextValue).not.toBeNull())

    await act(async () => {
      await contextValue!.setToken('fresh-token')
    })

    expect(localStorage.getItem(AUTH_TOKEN_STORAGE_KEY)).toBe('fresh-token')
    expect(contextValue!.user?.email).toBe('grace@example.com')
    expect(contextValue!.isAuthenticated).toBe(true)
    expect(mockedAuthService.verify).toHaveBeenCalledWith('fresh-token')
  })

  it('logs out and notifies when token verification fails', async () => {
    mockedAuthService.verify.mockResolvedValue(false)
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {})

    let contextValue: ReturnType<typeof useAuth> | null = null
    const Capture: React.FC = () => {
      contextValue = useAuth()
      return null
    }

    render(
      <AuthProvider>
        <Capture />
      </AuthProvider>
    )

    await waitFor(() => expect(contextValue).not.toBeNull())

    await act(async () => {
      await expect(contextValue!.setToken('invalid')).rejects.toThrow()
    })

    await waitFor(() => {
      expect(localStorage.getItem(AUTH_TOKEN_STORAGE_KEY)).toBeNull()
      expect(contextValue!.isAuthenticated).toBe(false)
      expect(alertSpy).toHaveBeenCalled()
    })

    alertSpy.mockRestore()
  })

  it('clears session data when logout is invoked', async () => {
    mockedAuthService.verify.mockResolvedValue(true)
    mockedAuthService.profile.mockResolvedValue({
      id: '99',
      name: 'Test User',
      email: 'user@example.com',
    })

    let contextValue: ReturnType<typeof useAuth> | null = null
    const Capture: React.FC = () => {
      contextValue = useAuth()
      return null
    }

    render(
      <AuthProvider>
        <Capture />
      </AuthProvider>
    )

    await waitFor(() => expect(contextValue).not.toBeNull())

    await act(async () => {
      await contextValue!.setToken('session-token')
    })

    expect(contextValue!.isAuthenticated).toBe(true)

    await act(async () => {
      contextValue!.logout()
    })

    expect(localStorage.getItem(AUTH_TOKEN_STORAGE_KEY)).toBeNull()
    expect(contextValue!.isAuthenticated).toBe(false)
    expect(contextValue!.user).toBeNull()
  })
})
