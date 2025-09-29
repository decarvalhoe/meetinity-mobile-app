import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, describe } from 'vitest'
import useProfileDraft from '../hooks/useProfileDraft'
import photoUpload from '../services/photoUpload'
import type { ProfilePreferences, UserProfile } from '../types'
import { appCache } from '../../../lib/cache'

const profile: UserProfile = {
  id: 'user-1',
  fullName: 'Jane Doe',
  headline: 'Product Manager',
  interests: ['Tech'],
  availability: 'Soirées',
  location: 'Paris',
}

const preferences: ProfilePreferences = {
  discoveryRadiusKm: 20,
  industries: ['Tech'],
  interests: ['IA'],
  eventTypes: ['Meetup'],
}

describe('useProfileDraft', () => {
  beforeEach(() => {
    appCache.clear()
    photoUpload.reset()
  })

  afterEach(() => {
    appCache.clear()
    photoUpload.reset()
  })

  it('restores draft and avatar state from persisted cache', async () => {
    const file = new File(['avatar-data'], 'avatar.png', { type: 'image/png' })
    const { result, unmount } = renderHook(() => useProfileDraft(profile, preferences))

    act(() => {
      result.current.updateField('fullName', 'Jane Updated')
    })

    await act(async () => {
      await result.current.selectAvatar(file)
      result.current.confirmAvatar()
    })

    unmount()

    const { result: resumed } = renderHook(() => useProfileDraft(profile, preferences))

    expect(resumed.current.draft.profile.fullName).toBe('Jane Updated')
    expect(resumed.current.avatarState.draft).not.toBeNull()
    expect(resumed.current.avatarState.draft?.status).toBe('ready')

    act(() => {
      resumed.current.clearDraft()
    })
  })
})
