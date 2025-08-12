import { render, screen, fireEvent } from '@testing-library/react'
import { vi } from 'vitest'
import LoginScreen from './LoginScreen'
import { AuthContext } from '../auth/AuthContext'

test('renders sign in buttons and triggers login', () => {
  const login = vi.fn()
  render(
    <AuthContext.Provider value={{ login, logout: vi.fn(), setToken: vi.fn(), user: null, token: null }}>
      <LoginScreen />
    </AuthContext.Provider>
  )
  fireEvent.click(screen.getByText(/Google/i))
  expect(login).toHaveBeenCalledWith('google')
})
