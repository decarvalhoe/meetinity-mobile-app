import { fireEvent, render, screen } from '@testing-library/react'
import React from 'react'
import { vi } from 'vitest'
import ProfileScreen from './ProfileScreen'

const mockUseAppStore = vi.fn()

vi.mock('../../../store/AppStore', () => ({
  useAppStore: () => mockUseAppStore(),
}))

const baseState = {
  matches: { status: 'idle', data: [] },
  events: { status: 'idle', data: [] },
  conversations: { status: 'idle', data: [] },
  messages: {},
  activeConversationId: null,
} as const

interface StoreStub {
  state: any
  refreshProfile: ReturnType<typeof vi.fn>
  saveProfile: ReturnType<typeof vi.fn>
  refreshMatches: ReturnType<typeof vi.fn>
  acceptMatch: ReturnType<typeof vi.fn>
  declineMatch: ReturnType<typeof vi.fn>
  refreshEvents: ReturnType<typeof vi.fn>
  toggleEventRegistration: ReturnType<typeof vi.fn>
  refreshConversations: ReturnType<typeof vi.fn>
  loadMessages: ReturnType<typeof vi.fn>
  sendMessage: ReturnType<typeof vi.fn>
  setActiveConversation: ReturnType<typeof vi.fn>
}

const createStore = (overrides: Partial<StoreStub> = {}): StoreStub => ({
  state: { ...baseState, profile: { status: 'success', data: profile } },
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
  ...overrides,
})

const profile = {
  id: 'user-1',
  fullName: 'Jane Doe',
  headline: 'Product Manager',
  interests: ['Tech'],
}

describe('ProfileScreen', () => {
  beforeEach(() => {
    mockUseAppStore.mockReset()
  })

  it('render loading state while profile is being fetched', () => {
    const refreshProfile = vi.fn()
    mockUseAppStore.mockReturnValue(
      createStore({ state: { ...baseState, profile: { status: 'loading', data: null } }, refreshProfile }),
    )

    render(<ProfileScreen />)

    expect(screen.getByText('Chargement du profil…')).toBeInTheDocument()
    expect(refreshProfile).not.toHaveBeenCalled()
  })

  it('triggers refresh when profile state is idle', () => {
    const refreshProfile = vi.fn()
    mockUseAppStore.mockReturnValue(
      createStore({ state: { ...baseState, profile: { status: 'idle', data: null } }, refreshProfile }),
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
