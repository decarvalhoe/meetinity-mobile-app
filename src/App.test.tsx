import { render, screen, fireEvent } from '@testing-library/react'
import App from './App'

beforeEach(() => {
  localStorage.clear()
})

test('shows auth when not authenticated', () => {
  render(<App />)
  expect(screen.getByText(/Sign in with Google/i)).toBeInTheDocument()
})

test('sign in stores token and shows home', () => {
  render(<App />)
  fireEvent.click(screen.getByText(/Sign in with Google/i))
  expect(localStorage.getItem('authToken')).toBe('google-mock-token')
  expect(screen.getByText(/Meetinity Mobile App/i)).toBeInTheDocument()
  expect(screen.getByText(/Swipe profiles/i)).toBeInTheDocument()
})
