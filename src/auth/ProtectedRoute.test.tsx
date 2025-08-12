import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { vi } from 'vitest'
import ProtectedRoute from './ProtectedRoute'
import { AuthContext } from './AuthContext'

test('redirects to login when not authenticated', () => {
  render(
    <AuthContext.Provider value={{ token: null, user: null, login: vi.fn(), setToken: vi.fn(), logout: vi.fn() }}>
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
    <AuthContext.Provider value={{ token: 'abc', user: null, login: vi.fn(), setToken: vi.fn(), logout: vi.fn() }}>
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
