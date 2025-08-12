import { render, screen } from '@testing-library/react'
import App from './App'

test('renders Meetinity title', () => {
  render(<App />)
  const titleElement = screen.getByText(/Meetinity Mobile App/i)
  expect(titleElement).toBeInTheDocument()
})

test('renders features list', () => {
  render(<App />)
  const swipeFeature = screen.getByText(/Swipe profiles/i)
  expect(swipeFeature).toBeInTheDocument()
})