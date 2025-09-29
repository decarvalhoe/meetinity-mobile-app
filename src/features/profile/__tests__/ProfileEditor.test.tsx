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

const draft: ProfileDraft = {
  profile: {
    fullName: 'Jane Doe',
    headline: 'Product Manager',
    bio: 'Hello',
    interests: ['Tech'],
    location: 'Paris',
    availability: 'Soirées',
    avatarUrl: profile.avatarUrl,
  },
  preferences,
  updatedAt: new Date().toISOString(),
}

describe('ProfileEditor', () => {
  it('submits the merged payload with preferences and avatar draft', async () => {
    const handleSave = vi.fn().mockResolvedValue(undefined)

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
        preferences: preferences,
        avatarUpload: avatarDraft,
      }),
    )
  })

  it('parses list inputs for profile and preferences', () => {
    const onFieldChange = vi.fn()
    const onPreferenceChange = vi.fn()

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
    fireEvent.change(screen.getByLabelText('Industries ciblées'), {
      target: { value: 'Tech, Finance' },
    })
    fireEvent.change(screen.getByLabelText('Intérêts à mettre en avant'), {
      target: { value: 'Communauté, Innovation' },
    })

    expect(onFieldChange).toHaveBeenCalledWith('interests', ['Design', 'IA'])
    expect(onPreferenceChange).toHaveBeenCalledWith('industries', ['Tech', 'Finance'])
    expect(onPreferenceChange).toHaveBeenCalledWith('interests', ['Communauté', 'Innovation'])
  })
})
