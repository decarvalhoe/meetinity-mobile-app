import { render, screen } from '@testing-library/react'
import React from 'react'
import MatchCard from '../components/MatchCard'
import type { MatchSuggestion } from '../types'

describe('MatchCard', () => {
  const suggestion: MatchSuggestion = {
    id: 'match-1',
    compatibilityScore: 0.92,
    sharedInterests: ['Tech'],
    profile: {
      id: 'user-2',
      fullName: 'John Smith',
      headline: 'Développeur full-stack',
      position: 'Lead Developer',
      company: 'Meetinity',
      bio: 'Toujours prêt à collaborer sur de nouveaux projets.',
      interests: ['Tech', 'Randonnée'],
      skills: ['React', 'TypeScript'],
      links: [{ label: 'GitHub', url: 'https://github.com/johnsmith' }],
    },
  }

  it('affiche les informations détaillées du match', () => {
    render(<MatchCard suggestion={suggestion} />)

    expect(screen.getByText('John Smith')).toBeInTheDocument()
    expect(screen.getByText('Développeur full-stack')).toBeInTheDocument()
    expect(screen.getByText('Lead Developer • Meetinity')).toBeInTheDocument()
    expect(screen.getByText('Toujours prêt à collaborer sur de nouveaux projets.')).toBeInTheDocument()
    expect(screen.getByText('React')).toBeInTheDocument()
    expect(screen.getByText('TypeScript')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'GitHub' })).toHaveAttribute(
      'href',
      'https://github.com/johnsmith',
    )
  })
})
