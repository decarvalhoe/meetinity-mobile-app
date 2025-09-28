import React from 'react'
import { describe, beforeEach, it, expect, vi, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { AppStoreProvider, useAppStore } from '../../src/store/AppStore'
import type { Message } from '../../src/features/messaging/types'
import type { RealtimeMessagingConfig } from '../../src/services/realtimeMessaging'

class FakeNotification {
  static permission: NotificationPermission = 'granted'
  static instances: Array<{ title: string; options?: NotificationOptions }> = []
  static requestPermission = vi.fn(async () => 'granted' as const)
  title: string
  options?: NotificationOptions
  constructor(title: string, options?: NotificationOptions) {
    this.title = title
    this.options = options
    FakeNotification.instances.push({ title, options })
  }
}

if (typeof Notification === 'undefined') {
  // @ts-expect-error override for tests
  globalThis.Notification = FakeNotification
}

if (!globalThis.crypto || !('randomUUID' in globalThis.crypto)) {
  // @ts-expect-error assign webcrypto for tests
  globalThis.crypto = require('node:crypto').webcrypto
}

const mocks = vi.hoisted(() => {
  const profileServiceMock = {
    getProfile: vi.fn().mockResolvedValue({ id: 'user-1', fullName: 'Test User' }),
    updateProfile: vi.fn().mockResolvedValue({ id: 'user-1', fullName: 'Test User' }),
  }

  const matchingServiceMock = {
    getFeed: vi.fn().mockResolvedValue({ items: [], meta: { fetchedAt: new Date().toISOString() } }),
    getStatus: vi.fn().mockResolvedValue({
      pending: [],
      liked: [],
      passed: [],
      matched: [],
      updatedAt: new Date().toISOString(),
    }),
    syncLikes: vi.fn().mockResolvedValue({ processed: [], failed: [], feed: undefined, status: undefined }),
  }

  const eventsServiceMock = {
    list: vi.fn().mockResolvedValue({ items: [], page: 1, total: 0, hasMore: false }),
    filters: vi.fn().mockResolvedValue({}),
    join: vi.fn().mockResolvedValue(undefined),
    leave: vi.fn().mockResolvedValue(undefined),
    details: vi.fn().mockResolvedValue(undefined),
  }

  const messagingServiceMock = {
    listConversations: vi.fn(),
    listMessages: vi.fn(),
    sendMessage: vi.fn(),
    markConversationRead: vi.fn().mockResolvedValue(undefined),
  }

  return { profileServiceMock, matchingServiceMock, eventsServiceMock, messagingServiceMock }
})

const realtimeInstances: FakeRealtimeMessaging[] = []

class FakeRealtimeMessaging {
  private readonly config: RealtimeMessagingConfig
  constructor(config: RealtimeMessagingConfig) {
    this.config = config
    realtimeInstances.push(this)
  }
  start = vi.fn(() => {
    this.config.onSession?.({ id: 'session-1', status: 'connected', since: new Date().toISOString() })
  })
  stop = vi.fn()
  announcePresence = vi.fn()
  markConversationRead = vi.fn()
  emitMessage(message: Message) {
    this.config.onMessage(message)
  }
  emitPresence(participantId: string, status: 'online' | 'offline' | 'typing') {
    this.config.onPresence?.({ participantId, status, at: new Date().toISOString() })
  }
}

vi.mock('../../src/auth/AuthContext', () => ({
  useAuth: () => ({
    token: 'test-token',
    user: { id: 'user-1', fullName: 'Test User' },
  }),
}))

vi.mock('../../src/services/profileService', () => ({
  __esModule: true,
  default: mocks.profileServiceMock,
}))

vi.mock('../../src/services/matchingService', () => ({
  __esModule: true,
  default: mocks.matchingServiceMock,
}))

vi.mock('../../src/services/eventsService', () => ({
  __esModule: true,
  default: mocks.eventsServiceMock,
}))

vi.mock('../../src/services/messagingService', () => ({
  __esModule: true,
  default: mocks.messagingServiceMock,
}))

vi.mock('../../src/services/realtimeMessaging', () => {
  const createRealtimeMessagingMock = vi.fn((config: RealtimeMessagingConfig) => new FakeRealtimeMessaging(config))
  return {
    __esModule: true,
    createRealtimeMessaging: createRealtimeMessagingMock,
  }
})

const profileServiceMock = mocks.profileServiceMock
const matchingServiceMock = mocks.matchingServiceMock
const eventsServiceMock = mocks.eventsServiceMock
const messagingServiceMock = mocks.messagingServiceMock

const wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <AppStoreProvider>{children}</AppStoreProvider>
)

describe('Messaging flows', () => {
  beforeEach(() => {
    realtimeInstances.splice(0, realtimeInstances.length)
    messagingServiceMock.listConversations.mockReset()
    messagingServiceMock.listMessages.mockReset()
    messagingServiceMock.sendMessage.mockReset()
    messagingServiceMock.markConversationRead.mockClear()
    localStorage.clear()
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true })
    messagingServiceMock.listConversations.mockResolvedValue([
      {
        id: 'conv-1',
        participants: [
          { id: 'user-1', fullName: 'Test User' },
          { id: 'user-2', fullName: 'Alice' },
        ],
        lastMessage: {
          id: 'msg-1',
          conversationId: 'conv-1',
          senderId: 'user-2',
          content: 'Bonjour',
          createdAt: '2024-01-01T10:00:00.000Z',
          status: 'delivered',
        },
        unreadCount: 1,
        updatedAt: '2024-01-01T10:00:00.000Z',
      },
      {
        id: 'conv-2',
        participants: [
          { id: 'user-1', fullName: 'Test User' },
          { id: 'user-3', fullName: 'Bob' },
        ],
        lastMessage: {
          id: 'msg-2',
          conversationId: 'conv-2',
          senderId: 'user-3',
          content: 'Salut',
          createdAt: '2024-02-01T09:00:00.000Z',
          status: 'sent',
        },
        unreadCount: 0,
        updatedAt: '2024-02-01T09:00:00.000Z',
      },
    ])
    messagingServiceMock.listMessages.mockResolvedValue([])
    messagingServiceMock.sendMessage.mockResolvedValue({
      id: 'server-msg',
      conversationId: 'conv-1',
      senderId: 'user-1',
      content: 'Hello world',
      createdAt: new Date().toISOString(),
      status: 'sent',
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('orders conversations and keeps cached data offline', async () => {
    const { result } = renderHook(() => useAppStore(), { wrapper })

    await waitFor(() => expect(result.current.state.conversations.status).toBe('success'))
    expect(result.current.state.conversations.data[0].id).toBe('conv-2')

    messagingServiceMock.listConversations.mockRejectedValueOnce(new Error('network'))
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true })

    await act(async () => {
      await result.current.refreshConversations()
    })

    expect(result.current.state.conversations.data[0].id).toBe('conv-2')
  })

  it('queues outgoing messages when offline and retries on reconnect', async () => {
    const { result } = renderHook(() => useAppStore(), { wrapper })
    await waitFor(() => expect(result.current.state.conversations.status).toBe('success'))

    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true })

    await act(async () => {
      await result.current.sendMessage('conv-1', 'Hello offline')
    })

    expect(result.current.state.pendingMessages).toHaveLength(1)
    expect(result.current.state.messages['conv-1']).toHaveLength(1)
    expect(messagingServiceMock.sendMessage).not.toHaveBeenCalled()

    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true })
    messagingServiceMock.sendMessage.mockResolvedValueOnce({
      id: 'server-msg-2',
      conversationId: 'conv-1',
      senderId: 'user-1',
      content: 'Hello offline',
      createdAt: new Date().toISOString(),
      status: 'delivered',
    })

    await act(async () => {
      window.dispatchEvent(new Event('online'))
      await waitFor(() => expect(messagingServiceMock.sendMessage).toHaveBeenCalled())
    })

    expect(result.current.state.pendingMessages).toHaveLength(0)
    expect(result.current.state.messages['conv-1'].some((msg) => msg.id === 'server-msg-2')).toBe(true)
  })

  it('avoids duplicate messages when realtime confirms delivery', async () => {
    const { result } = renderHook(() => useAppStore(), { wrapper })
    await waitFor(() => expect(result.current.state.conversations.status).toBe('success'))

    await act(async () => {
      await result.current.sendMessage('conv-1', 'Hello realtime')
    })

    const [realtime] = realtimeInstances
    const optimistic = result.current.state.messages['conv-1'].find((message) => message.clientGeneratedId)
    expect(optimistic).toBeTruthy()

    const serverMessage: Message = {
      id: 'server-rt',
      conversationId: 'conv-1',
      senderId: 'user-1',
      content: 'Hello realtime',
      createdAt: new Date().toISOString(),
      status: 'delivered',
      clientGeneratedId: optimistic?.clientGeneratedId,
    }

    await act(async () => {
      realtime.emitMessage(serverMessage)
    })

    const messages = result.current.state.messages['conv-1']
    const occurrences = messages.filter((message) => message.content === 'Hello realtime').length
    expect(occurrences).toBe(1)
  })
})
