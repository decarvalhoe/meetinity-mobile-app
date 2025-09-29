import { fireEvent, render, screen } from '@testing-library/react'
import React from 'react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import ProfileCreateScreen from '../screens/ProfileCreateScreen'
import type { ProfileDraft, ProfileUpdatePayload } from '../types'

const refreshProfile = vi.fn()
const saveProfile = vi.fn<Promise<void>, [ProfileUpdatePayload]>().mockResolvedValue()
const clearDraft = vi.fn()
const resetAvatar = vi.fn()
const refreshAvatar = vi.fn()
const updateField = vi.fn()
const updatePreferences = vi.fn()
const selectAvatar = vi.fn()
const updateAvatarCrop = vi.fn()
const confirmAvatar = vi.fn()
const useOnlineStatusMock = vi.fn(() => true)
const navigateMock = vi.fn()

const draft: ProfileDraft = {
  profile: {
    fullName: 'Jane Doe',
    headline: 'PM',
    interests: [],
  },
  preferences: {},
  updatedAt: new Date().toISOString(),
}

vi.mock('../hooks/useProfileDraft', () => ({
  __esModule: true,
  default: () => ({
    draft,
    updateField,
    updatePreferences,
    clearDraft,
    avatarState: { status: 'idle', draft: null },
    selectAvatar,
    updateAvatarCrop,
    confirmAvatar,
    resetAvatar,
    refreshAvatar,
  }),
}))

vi.mock('../../../store/AppStore', () => ({
  useAppStore: () => ({
    state: {
      profile: {
        status: 'success',
        data: null,
        error: undefined,
      },
    },
    refreshProfile,
    saveProfile,
  }),
}))

vi.mock('../../shared', () => ({
  LoadingState: ({ title }: { title: string }) => <div>{title}</div>,
  OfflinePlaceholder: ({ description }: { description: string }) => <div>{description}</div>,
  SkeletonBlock: () => <div data-testid="skeleton" />,
  useOnlineStatus: () => useOnlineStatusMock(),
}))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return {
    ...actual,
    useNavigate: () => navigateMock,
  }
})

vi.mock('../components/ProfileEditor', () => ({
  __esModule: true,
  default: ({ onSave, onCancel }: { onSave: (payload: ProfileUpdatePayload) => void; onCancel: () => void }) => (
    <div>
      <button type="button" onClick={() => onSave({ fullName: 'Created' })}>
        submit
      </button>
      <button type="button" onClick={onCancel}>
        cancel
      </button>
    </div>
  ),
}))

describe('ProfileCreateScreen', () => {
  beforeEach(() => {
    refreshProfile.mockClear()
    saveProfile.mockClear()
    clearDraft.mockClear()
    resetAvatar.mockClear()
    refreshAvatar.mockClear()
    navigateMock.mockClear()
    useOnlineStatusMock.mockReturnValue(true)
  })

  it('triggers profile creation when submitting the editor', () => {
    render(<ProfileCreateScreen />)

    fireEvent.click(screen.getByText('submit'))

    expect(saveProfile).toHaveBeenCalledWith({ fullName: 'Created' })
    expect(clearDraft).toHaveBeenCalled()
    expect(refreshAvatar).toHaveBeenCalled()
  })

  it('shows offline placeholder when offline', () => {
    useOnlineStatusMock.mockReturnValue(false)

    render(<ProfileCreateScreen />)

    expect(screen.getByText('Le profil est accessible uniquement en ligne.')).toBeInTheDocument()
  })
})
