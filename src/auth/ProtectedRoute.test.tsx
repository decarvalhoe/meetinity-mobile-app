import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { vi } from 'vitest'
import ProtectedRoute from './ProtectedRoute'
import { AuthContext } from './AuthContext'

const baseContext = {
  user: null,
  token: null,
  login: vi.fn(),
  setToken: vi.fn(),
  logout: vi.fn(),
}

test('renders a loading state while the authentication status is being resolved', () => {
  render(
    <AuthContext.Provider value={{ ...baseContext, isAuthenticated: false, isLoading: true }}>
      <MemoryRouter initialEntries={['/private']}>
        <Routes>
          <Route path="/private" element={<ProtectedRoute><div>Private</div></ProtectedRoute>} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>
  )
  expect(screen.getByText('Chargement de votre session…')).toBeInTheDocument()
})

test('redirects to login when not authenticated', () => {
  render(
    <AuthContext.Provider value={{ ...baseContext, isAuthenticated: false, isLoading: false }}>
      <MemoryRouter initialEntries={['/private']}>
        <Routes>
          <Route path="/private" element={<ProtectedRoute><div>Private</div></ProtectedRoute>} />
          <Route path="/login" element={<div>Login</div>} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>
  )
  expect(screen.getByText('Login')).toBeInTheDocument()
})

test('renders children when authenticated', () => {
  render(
    <AuthContext.Provider value={{ ...baseContext, isAuthenticated: true, isLoading: false }}>
      <MemoryRouter initialEntries={['/private']}>
        <Routes>
          <Route path="/private" element={<ProtectedRoute><div>Private</div></ProtectedRoute>} />
          <Route path="/login" element={<div>Login</div>} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>
  )
  expect(screen.getByText('Private')).toBeInTheDocument()
})
