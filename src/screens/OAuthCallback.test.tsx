import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { vi } from 'vitest'
import OAuthCallback from './OAuthCallback'
import { AuthContext } from '../auth/AuthContext'
import AuthService from '../services/AuthService'

vi.mock('../services/AuthService')

const mockedHandle = AuthService.handleCallback as unknown as vi.Mock

beforeEach(() => {
  mockedHandle.mockReset()
  mockedHandle.mockResolvedValue('token123')
})

test('handles callback and redirects to profile', async () => {
  const setToken = vi.fn().mockResolvedValue(undefined)
  render(
    <AuthContext.Provider value={{ token: null, user: null, login: vi.fn(), setToken, logout: vi.fn() }}>
      <MemoryRouter initialEntries={['/auth/callback?code=abc&state=def']}>
        <Routes>
          <Route path="/auth/callback" element={<OAuthCallback />} />
          <Route path="/profile" element={<div>Profile</div>} />
          <Route path="/login" element={<div>Login</div>} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>
  )

  await waitFor(() => {
    expect(mockedHandle).toHaveBeenCalledTimes(1)
    expect(setToken).toHaveBeenCalledWith('token123')
  })

  expect(setToken).toHaveBeenCalledTimes(1)
  await waitFor(() => expect(screen.getByText('Profile')).toBeInTheDocument())
})
