import { render, screen, fireEvent } from '@testing-library/react'
import { vi } from 'vitest'
import Auth from './Auth'

test('renders sign in options', () => {
  render(<Auth onAuth={() => {}} />)
  expect(screen.getByText(/Sign in with Google/i)).toBeInTheDocument()
  expect(screen.getByText(/Sign in with LinkedIn/i)).toBeInTheDocument()
})

test('calls onAuth with provider token', () => {
  const handleAuth = vi.fn()
  render(<Auth onAuth={handleAuth} />)
  fireEvent.click(screen.getByText(/Sign in with Google/i))
  expect(handleAuth).toHaveBeenCalledWith('google-mock-token')
})
