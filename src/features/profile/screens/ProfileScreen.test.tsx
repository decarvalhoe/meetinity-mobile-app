import { fireEvent, render, screen } from '@testing-library/react'
import React from 'react'
import { vi } from 'vitest'
import ProfileScreen from './ProfileScreen'
import type { AppState, AppStoreValue } from '../../../store/AppStore'

const mockUseAppStore = vi.fn()
const getPreferencesMock = vi.fn().mockResolvedValue({
  discoveryRadiusKm: 25,
  industries: [],
  interests: [],
  eventTypes: [],
})

vi.mock('../../../store/AppStore', () => ({
  useAppStore: () => mockUseAppStore(),
}))

vi.mock('../../../services/profileService', () => ({
  default: {
    getPreferences: (...args: unknown[]) => getPreferencesMock(...args),
  },
}))

const profile = {
  id: 'user-1',
  fullName: 'Jane Doe',
  headline: 'Product Manager',
  interests: ['Tech'],
}

const createBaseState = (): AppState => ({
  profile: { status: 'success', data: profile },
  matches: { status: 'idle', data: [] },
  events: {
    status: 'idle',
    data: { items: [], page: 1, pageSize: 20, total: 0, hasMore: false, filters: {} },
  },
  conversations: { status: 'idle', data: [] },
  messages: {},
  activeConversationId: null,
  pendingMessages: [],
  messagingRealtime: { status: 'disconnected', sessionId: null, since: null, presence: {} },
  matchFeedMeta: null,
  pendingMatchActions: [],
  matchNotifications: [],
  eventDetails: {},
  pendingEventRegistrations: [],
})

const createState = (overrides: Partial<AppState>): AppState => ({
  ...createBaseState(),
  ...overrides,
})

type StoreStub = Pick<
  AppStoreValue,
  |
    'state'
    | 'refreshProfile'
    | 'saveProfile'
    | 'refreshMatches'
    | 'acceptMatch'
    | 'declineMatch'
    | 'refreshEvents'
    | 'toggleEventRegistration'
    | 'refreshConversations'
    | 'loadMessages'
    | 'sendMessage'
    | 'setActiveConversation'
    | 'acknowledgeMatchNotification'
>

const createStore = (overrides: Partial<StoreStub> = {}): StoreStub => {
  const base: StoreStub = {
    state: createBaseState(),
    refreshProfile: vi.fn(async () => {}),
    saveProfile: vi.fn(async () => {}),
    refreshMatches: vi.fn(async () => {}),
    acceptMatch: vi.fn(async () => {}),
    declineMatch: vi.fn(async () => {}),
    refreshEvents: vi.fn(async () => {}),
    toggleEventRegistration: vi.fn(async () => {}),
    refreshConversations: vi.fn(async () => {}),
    loadMessages: vi.fn(async () => {}),
    sendMessage: vi.fn(async () => {}),
    setActiveConversation: vi.fn(),
    acknowledgeMatchNotification: vi.fn(),
  }

  return {
    ...base,
    ...overrides,
    state: overrides.state ?? base.state,
  }
}

describe('ProfileScreen', () => {
  beforeEach(() => {
    mockUseAppStore.mockReset()
  })

  it('render loading state while profile is being fetched', () => {
    const refreshProfile = vi.fn()
    mockUseAppStore.mockReturnValue(
      createStore({
        state: createState({ profile: { status: 'loading', data: null } }),
        refreshProfile,
      }),
    )

    render(<ProfileScreen />)

    expect(screen.getByText('Chargement du profil')).toBeInTheDocument()
    expect(refreshProfile).not.toHaveBeenCalled()
  })

  it('triggers refresh when profile state is idle', () => {
    const refreshProfile = vi.fn()
    mockUseAppStore.mockReturnValue(
      createStore({
        state: createState({ profile: { status: 'idle', data: null } }),
        refreshProfile,
      }),
    )

    render(<ProfileScreen />)

    expect(refreshProfile).toHaveBeenCalled()
  })

  it('allows switching to edit mode', () => {
    mockUseAppStore.mockReturnValue(
      createStore({ saveProfile: vi.fn().mockResolvedValue(undefined) }),
    )

    render(<ProfileScreen />)

    fireEvent.click(screen.getByText('Modifier'))

    expect(screen.getByLabelText('Nom complet')).toHaveValue('Jane Doe')
  })
})
