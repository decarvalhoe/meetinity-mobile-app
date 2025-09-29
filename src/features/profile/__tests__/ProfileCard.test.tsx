import { render, screen } from '@testing-library/react'
import React from 'react'
import ProfileCard from '../components/ProfileCard'
import type { UserProfile } from '../types'

describe('ProfileCard', () => {
  const profile: UserProfile = {
    id: 'user-1',
    fullName: 'Jane Doe',
    headline: 'Cheffe de produit',
    position: 'Product Manager',
    company: 'Meetinity',
    bio: 'Passionnée par la création de communautés.',
    avatarUrl: 'https://example.com/avatar.jpg',
    interests: ['Networking', 'Tech'],
    skills: ['Leadership', 'Design'],
    links: [
      { label: 'LinkedIn', url: 'https://linkedin.com/in/janedoe' },
      { label: 'Portfolio', url: 'https://janedoe.dev' },
    ],
    preferences: {
      discoveryRadiusKm: 10,
      industries: ['Tech'],
      interests: ['Networking'],
      eventTypes: ['Meetup'],
    },
  }

  it('affiche les informations enrichies du profil', () => {
    render(<ProfileCard profile={profile} />)

    expect(screen.getByText('Jane Doe')).toBeInTheDocument()
    expect(screen.getByText('Cheffe de produit')).toBeInTheDocument()
    expect(screen.getByText('Product Manager • Meetinity')).toBeInTheDocument()
    expect(screen.getByText('Passionnée par la création de communautés.')).toBeInTheDocument()
    expect(screen.getByText('Leadership')).toBeInTheDocument()
    expect(screen.getByText('Design')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'LinkedIn' })).toHaveAttribute(
      'href',
      'https://linkedin.com/in/janedoe',
    )
    expect(screen.getByRole('link', { name: 'Portfolio' })).toHaveAttribute(
      'href',
      'https://janedoe.dev',
    )
  })
})
