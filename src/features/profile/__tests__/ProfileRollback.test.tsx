import { act, renderHook, waitFor } from '@testing-library/react'
import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AppStoreProvider, useAppStore } from '../../../store/AppStore'
import { appCache } from '../../../lib/cache'
import type { UserProfile } from '../types'

const getProfileMock = vi.fn()
const updateProfileMock = vi.fn()
const createProfileMock = vi.fn()

vi.mock('../../../auth/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'user-1', fullName: 'Jane Doe', headline: 'PM' },
    token: 'token-123',
    isAuthenticated: true,
    isLoading: false,
    login: vi.fn(),
    setToken: vi.fn(),
    logout: vi.fn(),
  }),
}))

vi.mock('../../../services/profileService', () => ({
  default: {
    getProfile: (...args: unknown[]) => getProfileMock(...args),
    updateProfile: (...args: unknown[]) => updateProfileMock(...args),
    createProfile: (...args: unknown[]) => createProfileMock(...args),
    getPreferences: vi.fn(async () => ({
      discoveryRadiusKm: 25,
      industries: [],
      interests: [],
      eventTypes: [],
    })),
  },
}))

vi.mock('../../../services/matchingService', () => ({
  default: {
    getFeed: vi.fn(async () => ({ items: [], meta: { fetchedAt: new Date().toISOString(), nextCursor: null } })),
    getStatus: vi.fn(async () => ({ liked: [], passed: [], matched: [], pending: [], updatedAt: new Date().toISOString() })),
    syncLikes: vi.fn(async () => ({ processed: [], failed: [] })),
    accept: vi.fn(),
    decline: vi.fn(),
  },
}))

vi.mock('../../../services/eventsService', () => ({
  default: {
    list: vi.fn(async () => ({ items: [], page: 1, pageSize: 20, total: 0, hasMore: false })),
    details: vi.fn(async () => ({
      id: 'event-1',
      title: 'Event',
      description: 'Desc',
      startAt: new Date().toISOString(),
      endAt: new Date().toISOString(),
      location: 'Paris',
      capacity: 10,
      attendingCount: 0,
      organizer: { id: 'org', name: 'Org' },
      participants: [],
    })),
    join: vi.fn(async () => {}),
    leave: vi.fn(async () => {}),
  },
}))

vi.mock('../../../services/messagingService', () => ({
  default: {
    listConversations: vi.fn(async () => []),
    listMessages: vi.fn(async () => []),
    sendMessage: vi.fn(async () => ({
      id: 'msg',
      conversationId: 'conv',
      senderId: 'user-1',
      content: 'Hello',
      createdAt: new Date().toISOString(),
      status: 'sent',
    })),
    markConversationRead: vi.fn(async () => {}),
  },
}))

vi.mock('../../../services/realtimeMessaging', () => ({
  createRealtimeMessaging: vi.fn(() => ({
    start: vi.fn(),
    stop: vi.fn(),
    announcePresence: vi.fn(),
    markConversationRead: vi.fn(),
  })),
}))

const initialProfile: UserProfile = {
  id: 'user-1',
  fullName: 'Jane Doe',
  headline: 'Product Manager',
  interests: ['Tech'],
  availability: 'Soirées',
  location: 'Paris',
  preferences: {
    discoveryRadiusKm: 25,
    industries: ['Tech'],
    interests: ['IA'],
    eventTypes: ['Meetup'],
  },
}

const wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <AppStoreProvider>{children}</AppStoreProvider>
)

describe('AppStore.saveProfile rollback', () => {
  beforeEach(() => {
    appCache.clear()
    getProfileMock.mockReset()
    getProfileMock.mockResolvedValue(initialProfile)
    updateProfileMock.mockReset()
    updateProfileMock.mockRejectedValue(new Error('Network failure'))
    createProfileMock.mockReset()
  })

  afterEach(() => {
    appCache.clear()
  })

  it('restores the previous profile when the update fails', async () => {
    const { result } = renderHook(() => useAppStore(), { wrapper })

    await waitFor(() => {
      expect(result.current.state.profile.data).not.toBeNull()
    })

    const update = {
      fullName: 'Jane Updated',
      preferences: {
        discoveryRadiusKm: 40,
        industries: ['Tech'],
        interests: ['IA'],
        eventTypes: ['Meetup'],
      },
    }

    await expect(result.current.saveProfile(update)).rejects.toThrow('Network failure')

    expect(updateProfileMock).toHaveBeenCalledWith(update)
    const cached = appCache.read<UserProfile>('profile')
    expect(cached.value?.fullName).toBe(initialProfile.fullName)
    expect(result.current.state.profile.data?.fullName).toBe(initialProfile.fullName)
    expect(result.current.state.profile.status).toBe('success')
  })

  it('creates the profile when none exists yet', async () => {
    const newProfile: UserProfile = {
      ...initialProfile,
      id: 'user-2',
      fullName: 'Jane New',
    }
    getProfileMock.mockRejectedValue(new Error('Not found'))
    createProfileMock.mockResolvedValue(newProfile)
    const { result } = renderHook(() => useAppStore(), { wrapper })

    await waitFor(() => {
      expect(result.current.state.profile.status).toBe('error')
    })

    await act(async () => {
      await result.current.saveProfile({ fullName: 'Jane New' })
    })

    expect(createProfileMock).toHaveBeenCalledWith(expect.objectContaining({ fullName: 'Jane New' }))
    expect(result.current.state.profile.data).toEqual(newProfile)
    expect(result.current.state.profile.status).toBe('success')
  })
})
