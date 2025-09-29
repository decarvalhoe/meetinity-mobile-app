import { fireEvent, render, screen, waitFor, act } from '@testing-library/react'
import React from 'react'
import { afterEach, beforeEach, describe, expect, vi } from 'vitest'
import DiscoveryScreen from '../screens/DiscoveryScreen'
import { AppStoreProvider } from '../../../store/AppStore'
import type { MatchFeedItem } from '../types'

const matchHandlers: Array<(matches: MatchFeedItem[]) => void> = []

vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: {
    div: ({ children, ...rest }: React.PropsWithChildren<React.HTMLAttributes<HTMLDivElement>>) => (
      <div {...rest}>{children}</div>
    ),
  },
}))

vi.mock('../../../auth/AuthContext', () => ({
  useAuth: () => ({ token: 'token-123' }),
}))

const mockProfileService = vi.hoisted(() => ({
  getProfile: vi.fn(),
  updateProfile: vi.fn(),
}))
vi.mock('../../../services/profileService', () => ({
  default: mockProfileService,
}))

const mockEventsService = vi.hoisted(() => ({
  list: vi.fn(),
  join: vi.fn(),
  leave: vi.fn(),
}))
vi.mock('../../../services/eventsService', () => ({
  default: mockEventsService,
}))

const mockMessagingService = vi.hoisted(() => ({
  listConversations: vi.fn(),
  listMessages: vi.fn(),
  sendMessage: vi.fn(),
}))
vi.mock('../../../services/messagingService', () => ({
  default: mockMessagingService,
}))

const mockRealtimeMessaging = vi.hoisted(() => ({
  start: vi.fn(),
  stop: vi.fn(),
  announcePresence: vi.fn(),
  markConversationRead: vi.fn(),
  subscribeToMessages: vi.fn(() => vi.fn()),
  subscribeToMatches: vi.fn((handler: (matches: MatchFeedItem[]) => void) => {
    matchHandlers.push(handler)
    return () => {}
  }),
  disconnect: vi.fn(),
}))
vi.mock('../../../services/realtimeMessaging', () => ({
  createRealtimeMessaging: vi.fn((config: any) => {
    if (config?.onMatches) {
      matchHandlers.push(config.onMatches)
    }
    return mockRealtimeMessaging
  }),
}))

const mockMatchingService = vi.hoisted(() => ({
  getFeed: vi.fn(),
  getStatus: vi.fn(),
  syncLikes: vi.fn(),
  accept: vi.fn(),
  decline: vi.fn(),
}))
vi.mock('../../../services/matchingService', () => ({
  default: mockMatchingService,
}))

const renderDiscovery = () =>
  render(
    <AppStoreProvider>
      <DiscoveryScreen />
    </AppStoreProvider>,
  )

describe('Swipe flow integration', () => {
  beforeEach(() => {
    mockMatchingService.getFeed.mockResolvedValue({
      items: [
        {
          id: 'match-1',
          compatibilityScore: 0.8,
          status: 'pending',
          profile: {
            id: 'user-2',
            fullName: 'Jane Doe',
            headline: 'Designer',
            interests: ['UX'],
          },
          sharedInterests: ['UX'],
          metadata: {},
        },
      ],
      meta: { fetchedAt: new Date().toISOString(), nextCursor: null },
    })
    mockMatchingService.getStatus.mockResolvedValue({
      liked: [],
      passed: [],
      matched: [],
      pending: ['match-1'],
      updatedAt: new Date().toISOString(),
    })
    mockMatchingService.syncLikes.mockResolvedValue({ processed: ['match-1'], failed: [] })
    mockProfileService.getProfile.mockResolvedValue({ id: 'user-1' })
    mockEventsService.list.mockResolvedValue({
      items: [],
      page: 1,
      pageSize: 20,
      total: 0,
      hasMore: false,
      filters: {},
    })
    mockMessagingService.listConversations.mockResolvedValue([])
    mockMessagingService.listMessages.mockResolvedValue([])
    matchHandlers.length = 0
    localStorage.clear()
  })

  afterEach(() => {
    vi.clearAllMocks()
    matchHandlers.length = 0
  })

  it('sends likes to the API and updates the UI', async () => {
    renderDiscovery()

    await waitFor(() => expect(mockMatchingService.getFeed).toHaveBeenCalled())
    await screen.findByText('Jane Doe')

    const likeButtons = screen.getAllByRole('button', { name: 'Entrer en contact' })
    await act(async () => {
      fireEvent.click(likeButtons[0])
    })

    await waitFor(() => {
      expect(mockMatchingService.syncLikes).toHaveBeenCalled()
    })

    const payload = mockMatchingService.syncLikes.mock.calls[0][0]
    expect(payload.likes[0]).toMatchObject({ id: 'match-1', decision: 'like' })
  })

  it('keeps actions pending when the network is offline', async () => {
    mockMatchingService.syncLikes.mockRejectedValue(new Error('Network Error'))
    renderDiscovery()

    await waitFor(() => expect(mockMatchingService.getFeed).toHaveBeenCalled())
    await screen.findByText('Jane Doe')

    const likeButtons = screen.getAllByRole('button', { name: 'Entrer en contact' })
    await act(async () => {
      fireEvent.click(likeButtons[0])
    })

    await screen.findByText(/action\(s\)\s+en attente de synchronisation/i)
  })

  it('displays a match dialog when realtime pushes a match', async () => {
    renderDiscovery()

    await waitFor(() => expect(mockMatchingService.getFeed).toHaveBeenCalled())
    await screen.findByText('Jane Doe')
    await waitFor(() => expect(matchHandlers.length).toBeGreaterThan(0))

    await act(async () => {
      matchHandlers.forEach((handler) =>
        handler([
          {
            id: 'match-1',
            compatibilityScore: 0.8,
            status: 'matched',
            profile: {
              id: 'user-2',
              fullName: 'Jane Doe',
              headline: 'Designer',
              interests: ['UX'],
            },
            sharedInterests: ['UX'],
            metadata: { matchedAt: new Date().toISOString() },
          },
        ]),
      )
    })

    await screen.findByRole('dialog')
    expect(screen.getByText(/Nouveau match/)).toBeInTheDocument()
  })
})
