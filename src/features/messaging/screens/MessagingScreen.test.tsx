import { fireEvent, render, screen } from '@testing-library/react'
import React from 'react'
import { vi } from 'vitest'
import MessagingScreen from './MessagingScreen'

const mockUseAppStore = vi.fn()
const mockUseAuth = vi.fn()

vi.mock('../../../store/AppStore', () => ({
  useAppStore: () => mockUseAppStore(),
}))

vi.mock('../../../auth/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}))

const conversation = {
  id: 'conv-1',
  participants: [
    { id: 'user-1', fullName: 'Jane Doe' },
    { id: 'user-2', fullName: 'John Smith' },
  ],
  unreadCount: 0,
  updatedAt: new Date().toISOString(),
}

const baseStore = {
  state: {
    profile: { status: 'success', data: null },
    matches: { status: 'success', data: [] },
    events: { status: 'success', data: [] },
    conversations: { status: 'success', data: [conversation] },
    messages: { 'conv-1': [] },
    activeConversationId: null,
    pendingMessages: [],
    messagingRealtime: { status: 'connected', sessionId: 'session', since: new Date().toISOString(), presence: {} },
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
  markConversationRead: vi.fn(),
  retryMessage: vi.fn(),
  setTypingState: vi.fn(),
  setActiveConversation: vi.fn(),
}

describe('MessagingScreen', () => {
  beforeEach(() => {
    mockUseAppStore.mockReset()
    mockUseAuth.mockReturnValue({ user: { id: 'user-1' } })
  })

  it('refreshes conversations when idle', () => {
    const refreshConversations = vi.fn()
    mockUseAppStore.mockReturnValue({
      ...baseStore,
      state: { ...baseStore.state, conversations: { status: 'idle', data: [] } },
      refreshConversations,
    })

    render(<MessagingScreen />)

    expect(refreshConversations).toHaveBeenCalled()
  })

  it('loads messages when selecting a conversation', () => {
    const loadMessages = vi.fn()
    const setActiveConversation = vi.fn()
    mockUseAppStore.mockReturnValue({
      ...baseStore,
      loadMessages,
      setActiveConversation,
    })

    render(<MessagingScreen />)

    fireEvent.click(screen.getByText('Jane Doe, John Smith'))

    expect(setActiveConversation).toHaveBeenCalledWith('conv-1')
    expect(loadMessages).toHaveBeenCalledWith('conv-1')
  })
})
