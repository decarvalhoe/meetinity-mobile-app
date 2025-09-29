import { render, screen } from '@testing-library/react'
import React from 'react'
import { vi } from 'vitest'
import DiscoveryScreen from './DiscoveryScreen'

const mockUseAppStore = vi.fn()

vi.mock('../../../store/AppStore', () => ({
  useAppStore: () => mockUseAppStore(),
}))

const baseStore = {
  state: {
    profile: { status: 'success', data: null },
    matches: { status: 'success', data: [] },
    events: { status: 'idle', data: [] },
    conversations: { status: 'idle', data: [] },
    messages: {},
    activeConversationId: null,
    matchFeedMeta: null,
    pendingMatchActions: [],
    matchNotifications: [],
  },
  refreshProfile: vi.fn(),
  saveProfile: vi.fn(),
  refreshMatches: vi.fn(),
  acceptMatch: vi.fn(),
  declineMatch: vi.fn(),
  refreshEvents: vi.fn(),
  toggleEventRegistration: vi.fn(),
  refreshConversations: vi.fn(),
  loadMessages: vi.fn(),
  sendMessage: vi.fn(),
  setActiveConversation: vi.fn(),
  acknowledgeMatchNotification: vi.fn(),
}

describe('DiscoveryScreen', () => {
  beforeEach(() => {
    mockUseAppStore.mockReset()
  })

  it('requests matches when idle', () => {
    const refreshMatches = vi.fn()
    mockUseAppStore.mockReturnValue({
      ...baseStore,
      state: { ...baseStore.state, matches: { status: 'idle', data: [] } },
      refreshMatches,
    })

    render(<DiscoveryScreen />)

    expect(refreshMatches).toHaveBeenCalled()
  })

  it('renders the match dialog when notifications are available', () => {
    mockUseAppStore.mockReturnValue({
      ...baseStore,
      state: {
        ...baseStore.state,
        matchNotifications: [
          {
            id: 'match-1',
            compatibilityScore: 0.92,
            status: 'matched',
            sharedInterests: ['Tech'],
            profile: {
              id: 'user-2',
              fullName: 'Alex Martin',
              headline: 'Product Designer',
              interests: ['Tech'],
            },
            metadata: {},
          },
        ],
      },
    })

    render(<DiscoveryScreen />)

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText(/Alex Martin/)).toBeInTheDocument()
  })
})
