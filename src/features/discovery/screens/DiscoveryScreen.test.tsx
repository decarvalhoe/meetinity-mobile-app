import { fireEvent, render, screen } from '@testing-library/react'
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

  it('allows accepting a match', () => {
    const acceptMatch = vi.fn()
    const suggestion = {
      id: 'match-1',
      compatibilityScore: 0.8,
      profile: {
        id: 'user-2',
        fullName: 'John Smith',
        headline: 'Designer',
        interests: ['UX'],
      },
      sharedInterests: ['UX'],
    }

    mockUseAppStore.mockReturnValue({
      ...baseStore,
      state: { ...baseStore.state, matches: { status: 'success', data: [suggestion] } },
      acceptMatch,
    })

    render(<DiscoveryScreen />)

    fireEvent.click(screen.getByText('Entrer en contact'))

    expect(acceptMatch).toHaveBeenCalledWith('match-1')
  })
})
