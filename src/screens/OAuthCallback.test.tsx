import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, beforeEach, vi } from 'vitest'
import OAuthCallback from './OAuthCallback'
import { AuthContext } from '../auth/AuthContext'
import AuthService from '../services/AuthService'

vi.mock('../services/AuthService', () => ({
  default: {
    handleCallback: vi.fn(),
  },
}))

type AuthServiceMock = {
  handleCallback: ReturnType<typeof vi.fn>
}

const mockedAuthService = AuthService as unknown as AuthServiceMock

const baseContext = {
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,
  login: vi.fn(),
  setToken: vi.fn(),
  logout: vi.fn(),
}

describe('OAuthCallback screen', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('completes the OAuth callback and redirects to the profile page', async () => {
    mockedAuthService.handleCallback.mockResolvedValue({
      accessToken: 'token123',
      refreshToken: 'refresh123',
      expiresIn: 3600,
    })
    const setToken = vi.fn().mockResolvedValue(undefined)

    render(
      <AuthContext.Provider value={{ ...baseContext, setToken }}>
        <MemoryRouter initialEntries={['/auth/callback?provider=google&code=abc&state=def']}>
          <Routes>
            <Route path="/auth/callback" element={<OAuthCallback />} />
            <Route path="/profile" element={<div>Profile</div>} />
            <Route path="/login" element={<div>Login</div>} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>
    )

    expect(screen.getByText(/Connexion en cours/i)).toBeInTheDocument()

    await waitFor(() =>
      expect(setToken).toHaveBeenCalledWith(
        'token123',
        expect.objectContaining({ refreshToken: 'refresh123', expiresIn: 3600 }),
      ),
    )
    await waitFor(() => expect(screen.getByText('Profile')).toBeInTheDocument())
  })

  it('uses the token provided in the query string when available', async () => {
    mockedAuthService.handleCallback.mockImplementation((provider, code, state, tokenInQuery) =>
      Promise.resolve({ accessToken: tokenInQuery ?? 'server-token' }),
    )
    const setToken = vi.fn().mockResolvedValue(undefined)

    render(
      <AuthContext.Provider value={{ ...baseContext, setToken }}>
        <MemoryRouter initialEntries={['/auth/callback?provider=linkedin&token=direct-token']}>
          <Routes>
            <Route path="/auth/callback" element={<OAuthCallback />} />
            <Route path="/profile" element={<div>Profile</div>} />
            <Route path="/login" element={<div>Login</div>} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>
    )

    await waitFor(() => expect(mockedAuthService.handleCallback).toHaveBeenCalledWith('linkedin', null, null, 'direct-token'))
    await waitFor(() =>
      expect(setToken).toHaveBeenCalledWith(
        'direct-token',
        expect.objectContaining({ refreshToken: undefined, expiresIn: undefined }),
      ),
    )
  })

  it('displays an error when required parameters are missing', async () => {
    render(
      <AuthContext.Provider value={baseContext}>
        <MemoryRouter initialEntries={['/auth/callback?code=abc&state=def']}>
          <Routes>
            <Route path="/auth/callback" element={<OAuthCallback />} />
            <Route path="/login" element={<div>Login</div>} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>
    )

    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toContain('Fournisseur manquant')
    expect(screen.getByRole('button', { name: /retour à la connexion/i })).toBeInTheDocument()
    expect(mockedAuthService.handleCallback).not.toHaveBeenCalled()
  })

  it('notifies the user when the backend rejects the callback', async () => {
    mockedAuthService.handleCallback.mockRejectedValue(new Error('invalid code'))
    const setToken = vi.fn().mockRejectedValue(new Error('set-token-failure'))

    render(
      <AuthContext.Provider value={{ ...baseContext, setToken }}>
        <MemoryRouter initialEntries={['/auth/callback?provider=google&code=abc&state=def']}>
          <Routes>
            <Route path="/auth/callback" element={<OAuthCallback />} />
            <Route path="/login" element={<div>Login</div>} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>
    )

    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toContain('Impossible de finaliser l\'authentification')
  })
})
