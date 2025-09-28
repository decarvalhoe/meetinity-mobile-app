import { fireEvent, render, screen } from '@testing-library/react'
import React from 'react'
import { vi } from 'vitest'
import EventsScreen from './EventsScreen'

const mockUseAppStore = vi.fn()

vi.mock('../../../store/AppStore', () => ({
  useAppStore: () => mockUseAppStore(),
}))

const baseStore = {
  state: {
    profile: { status: 'success', data: null },
    matches: { status: 'success', data: [] },
    events: { status: 'success', data: [] },
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

describe('EventsScreen', () => {
  beforeEach(() => {
    mockUseAppStore.mockReset()
  })

  it('refreshes when idle', () => {
    const refreshEvents = vi.fn()
    mockUseAppStore.mockReturnValue({
      ...baseStore,
      state: { ...baseStore.state, events: { status: 'idle', data: [] } },
      refreshEvents,
    })

    render(<EventsScreen />)

    expect(refreshEvents).toHaveBeenCalled()
  })

  it('triggers registration action', () => {
    const toggleEventRegistration = vi.fn()
    const event = {
      id: 'event-1',
      title: 'Afterwork',
      description: 'Networking',
      startAt: new Date().toISOString(),
      endAt: new Date().toISOString(),
      location: 'Paris',
      capacity: 20,
      attendingCount: 10,
    }

    mockUseAppStore.mockReturnValue({
      ...baseStore,
      state: { ...baseStore.state, events: { status: 'success', data: [event] } },
      toggleEventRegistration,
    })

    render(<EventsScreen />)

    fireEvent.click(screen.getByText("S'inscrire"))

    expect(toggleEventRegistration).toHaveBeenCalledWith('event-1', true)
  })
})
