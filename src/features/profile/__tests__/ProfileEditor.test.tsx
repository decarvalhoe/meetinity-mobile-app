import { fireEvent, render, screen } from '@testing-library/react'
import React from 'react'
import { vi } from 'vitest'
import ProfileEditor from '../components/ProfileEditor'
import type { AvatarUploadDraft, ProfileDraft, ProfilePreferences, UserProfile } from '../types'
import type { PhotoUploadState } from '../services/photoUpload'

const profile: UserProfile = {
  id: 'user-1',
  fullName: 'Jane Doe',
  headline: 'Product Manager',
  interests: ['Tech'],
  location: 'Paris',
  availability: 'Soirées',
  company: 'Meetinity',
  position: 'Product Manager',
  skills: ['Product'],
}

const preferences: ProfilePreferences = {
  discoveryRadiusKm: 25,
  industries: ['Tech'],
  interests: ['IA'],
  eventTypes: ['Meetup'],
}

const avatarDraft: AvatarUploadDraft = {
  id: 'draft-1',
  dataUrl: 'data:image/png;base64,AAA',
  fileName: 'avatar.png',
  mimeType: 'image/png',
  size: 120,
  crop: { x: 0, y: 0, width: 1, height: 1, scale: 1, rotation: 0 },
  status: 'ready',
  updatedAt: new Date().toISOString(),
}

const avatarState: PhotoUploadState = {
  status: 'ready',
  draft: avatarDraft,
  previewUrl: avatarDraft.dataUrl,
}

const buildDraft = (): ProfileDraft => ({
  profile: {
    fullName: 'Jane Doe',
    headline: 'Product Manager',
    bio: 'Hello',
    interests: ['Tech'],
    location: 'Paris',
    availability: 'Soirées',
    company: 'Meetinity ',
    position: 'Product Manager',
    skills: ['Product', 'Leadership'],
    experiences: [
      {
        id: 'exp-1',
        title: 'Product Manager',
        company: 'Meetinity',
        startDate: '2021-01-01',
        endDate: '',
        description: 'Responsable de la roadmap',
      },
      {
        title: '',
        company: '',
        startDate: '',
        endDate: '',
        description: '',
      },
    ],
    links: [
      { label: ' LinkedIn ', url: ' https://linkedin.com/in/jane ' },
      { label: '', url: '' },
    ],
    avatarUrl: profile.avatarUrl,
  },
  preferences,
  updatedAt: new Date().toISOString(),
})

describe('ProfileEditor', () => {
  it('submits the merged payload with preferences and avatar draft', async () => {
    const handleSave = vi.fn().mockResolvedValue(undefined)
    const draft = buildDraft()

    render(
      <ProfileEditor
        profile={profile}
        draft={draft}
        avatarState={avatarState}
        onFieldChange={vi.fn()}
        onPreferenceChange={vi.fn()}
        onAvatarSelect={vi.fn()}
        onAvatarCrop={vi.fn()}
        onAvatarConfirm={vi.fn()}
        onAvatarReset={vi.fn()}
        onSave={handleSave}
        onCancel={vi.fn()}
      />,
    )

    fireEvent.submit(screen.getByRole('form', { name: 'Édition du profil' }))

    expect(handleSave).toHaveBeenCalledWith(
      expect.objectContaining({
        fullName: 'Jane Doe',
        company: 'Meetinity',
        position: 'Product Manager',
        skills: ['Product', 'Leadership'],
        preferences: preferences,
        avatarUpload: avatarDraft,
        experiences: [
          {
            id: 'exp-1',
            title: 'Product Manager',
            company: 'Meetinity',
            startDate: '2021-01-01',
            description: 'Responsable de la roadmap',
          },
        ],
        links: [
          { label: 'LinkedIn', url: 'https://linkedin.com/in/jane' },
        ],
      }),
    )
  })

  it('prevents submission and shows validation errors for missing and invalid fields', () => {
    const handleSave = vi.fn()
    const draft = buildDraft()
    draft.profile.fullName = ''
    draft.profile.headline = ''
    draft.profile.bio = 'a'.repeat(350)
    draft.profile.interests = []
    draft.profile.links = [{ label: 'Portfolio', url: 'notaurl' }]
    draft.preferences.discoveryRadiusKm = -10

    render(
      <ProfileEditor
        profile={profile}
        draft={draft}
        avatarState={{ status: 'idle', draft: null }}
        onFieldChange={vi.fn()}
        onPreferenceChange={vi.fn()}
        onAvatarSelect={vi.fn()}
        onAvatarCrop={vi.fn()}
        onAvatarConfirm={vi.fn()}
        onAvatarReset={vi.fn()}
        onSave={handleSave}
        onCancel={vi.fn()}
      />,
    )

    expect(screen.getByText('La bio ne doit pas dépasser 280 caractères.')).toBeInTheDocument()
    expect(screen.queryByText('Le nom complet est requis.')).not.toBeInTheDocument()

    fireEvent.submit(screen.getByRole('form', { name: 'Édition du profil' }))

    expect(handleSave).not.toHaveBeenCalled()
    expect(screen.getByText('Le nom complet est requis.')).toBeInTheDocument()
    expect(screen.getByText('Le titre est requis.')).toBeInTheDocument()
    expect(screen.getByText('Ajoutez au moins un intérêt.')).toBeInTheDocument()
    expect(screen.getByText("L'URL doit être valide.")).toBeInTheDocument()
    expect(screen.getByText('Indiquez un rayon valide (en kilomètres).')).toBeInTheDocument()
    expect(screen.getByLabelText('Nom complet')).toHaveAttribute('aria-invalid', 'true')
  })

  it('allows submission once validation errors are fixed', async () => {
    const handleSave = vi.fn().mockResolvedValue(undefined)
    const initialDraft = buildDraft()
    initialDraft.profile.fullName = ''
    initialDraft.profile.headline = ''
    initialDraft.profile.interests = []
    initialDraft.profile.links = [{ label: 'Portfolio', url: 'notaurl' }]
    initialDraft.preferences.discoveryRadiusKm = -5

    const { rerender } = render(
      <ProfileEditor
        profile={profile}
        draft={initialDraft}
        avatarState={{ status: 'idle', draft: null }}
        onFieldChange={vi.fn()}
        onPreferenceChange={vi.fn()}
        onAvatarSelect={vi.fn()}
        onAvatarCrop={vi.fn()}
        onAvatarConfirm={vi.fn()}
        onAvatarReset={vi.fn()}
        onSave={handleSave}
        onCancel={vi.fn()}
      />,
    )

    fireEvent.submit(screen.getByRole('form', { name: 'Édition du profil' }))
    expect(handleSave).not.toHaveBeenCalled()

    const validDraft: ProfileDraft = {
      ...initialDraft,
      profile: {
        ...initialDraft.profile,
        fullName: 'Jane Doe',
        headline: 'Product Manager',
        bio: 'Bio valide',
        interests: ['Tech'],
        links: [{ label: 'Portfolio', url: 'https://example.com' }],
      },
      preferences: {
        ...initialDraft.preferences,
        discoveryRadiusKm: 15,
      },
    }

    rerender(
      <ProfileEditor
        profile={profile}
        draft={validDraft}
        avatarState={{ status: 'idle', draft: null }}
        onFieldChange={vi.fn()}
        onPreferenceChange={vi.fn()}
        onAvatarSelect={vi.fn()}
        onAvatarCrop={vi.fn()}
        onAvatarConfirm={vi.fn()}
        onAvatarReset={vi.fn()}
        onSave={handleSave}
        onCancel={vi.fn()}
      />,
    )

    fireEvent.submit(screen.getByRole('form', { name: 'Édition du profil' }))

    expect(handleSave).toHaveBeenCalledTimes(1)
  })

  it('parses list inputs for profile and preferences', () => {
    const onFieldChange = vi.fn()
    const onPreferenceChange = vi.fn()
    const draft = buildDraft()

    render(
      <ProfileEditor
        profile={profile}
        draft={draft}
        avatarState={{ status: 'idle', draft: null }}
        onFieldChange={onFieldChange}
        onPreferenceChange={onPreferenceChange}
        onAvatarSelect={vi.fn()}
        onAvatarCrop={vi.fn()}
        onAvatarConfirm={vi.fn()}
        onAvatarReset={vi.fn()}
        onSave={vi.fn()}
        onCancel={vi.fn()}
      />,
    )

    fireEvent.change(screen.getByLabelText('Intérêts (séparés par des virgules)'), {
      target: { value: 'Design, IA' },
    })
    fireEvent.change(screen.getByLabelText('Compétences (séparées par des virgules)'), {
      target: { value: 'Produit, Leadership' },
    })
    fireEvent.change(screen.getByLabelText('Industries ciblées'), {
      target: { value: 'Tech, Finance' },
    })
    fireEvent.change(screen.getByLabelText('Intérêts à mettre en avant'), {
      target: { value: 'Communauté, Innovation' },
    })

    expect(onFieldChange).toHaveBeenCalledWith('interests', ['Design', 'IA'])
    expect(onFieldChange).toHaveBeenCalledWith('skills', ['Produit', 'Leadership'])
    expect(onPreferenceChange).toHaveBeenCalledWith('industries', ['Tech', 'Finance'])
    expect(onPreferenceChange).toHaveBeenCalledWith('interests', ['Communauté', 'Innovation'])
  })

  it('manages experiences and links collections', () => {
    const onFieldChange = vi.fn()
    const draft = buildDraft()
    draft.profile.experiences = []
    draft.profile.links = [{ label: 'Site', url: 'https://example.com' }]

    render(
      <ProfileEditor
        profile={profile}
        draft={draft}
        avatarState={{ status: 'idle', draft: null }}
        onFieldChange={onFieldChange}
        onPreferenceChange={vi.fn()}
        onAvatarSelect={vi.fn()}
        onAvatarCrop={vi.fn()}
        onAvatarConfirm={vi.fn()}
        onAvatarReset={vi.fn()}
        onSave={vi.fn()}
        onCancel={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Ajouter une expérience' }))
    expect(onFieldChange).toHaveBeenCalledWith('experiences', [
      { title: '', company: '', startDate: undefined, endDate: undefined, description: undefined },
    ])

    const removeLinkButton = screen.getByRole('button', { name: 'Supprimer ce lien' })
    fireEvent.click(removeLinkButton)
    expect(onFieldChange).toHaveBeenCalledWith('links', [])
  })
})
