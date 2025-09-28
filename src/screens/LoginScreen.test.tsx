import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { AuthContext } from '../auth/AuthContext'
import LoginScreen from './LoginScreen'

const baseContext = {
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,
  setToken: vi.fn(),
  logout: vi.fn(),
}

describe('LoginScreen', () => {
  it('launches the OAuth flow for the selected provider and shows loading state', async () => {
    const login = vi.fn().mockResolvedValue(undefined)
    render(
      <AuthContext.Provider value={{ ...baseContext, login }}>
        <LoginScreen />
      </AuthContext.Provider>
    )

    const googleButton = screen.getByRole('button', { name: /continuer avec google/i })
    fireEvent.click(googleButton)

    expect(login).toHaveBeenCalledWith('google')
    expect(googleButton).toBeDisabled()
    expect(googleButton).toHaveAttribute('aria-busy', 'true')

    await waitFor(() => expect(googleButton).not.toBeDisabled())
  })

  it('surfaces an error message when the OAuth flow fails', async () => {
    const login = vi.fn().mockRejectedValue(new Error('network error'))
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    render(
      <AuthContext.Provider value={{ ...baseContext, login }}>
        <LoginScreen />
      </AuthContext.Provider>
    )

    const linkedinButton = screen.getByRole('button', { name: /continuer avec linkedin/i })
    fireEvent.click(linkedinButton)

    expect(login).toHaveBeenCalledWith('linkedin')

    await screen.findByRole('alert')
    expect(screen.getByRole('alert').textContent).toContain('Impossible de démarrer la connexion')

    consoleSpy.mockRestore()
  })
})
