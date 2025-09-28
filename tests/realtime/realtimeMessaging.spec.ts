import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createRealtimeMessaging } from '../../src/services/realtimeMessaging'
import type { Message } from '../../src/features/messaging/types'

const messageHandlers = new Set<(message: Message) => void>()
const disconnectMock = vi.fn()

vi.mock('../../src/services/realtime', () => ({
  __esModule: true,
  createRealtimeClient: vi.fn(() => ({
    subscribeToMessages: (handler: (message: Message) => void) => {
      messageHandlers.add(handler)
      return () => messageHandlers.delete(handler)
    },
    subscribeToMatches: () => () => {},
    disconnect: disconnectMock,
  })),
}))

describe('createRealtimeMessaging', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    messageHandlers.clear()
    disconnectMock.mockReset()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('emits session updates and reconnects after offline events', () => {
    const sessions: string[] = []
    const presence: string[] = []
    const messages: Message[] = []

    const realtime = createRealtimeMessaging({
      token: 'token',
      userId: 'user-1',
      reconnectDelayMs: 10,
      onMessage: (message) => {
        messages.push(message)
      },
      onPresence: (update) => {
        presence.push(update.status)
      },
      onSession: (snapshot) => {
        sessions.push(snapshot.status)
      },
    })

    realtime.start()
    vi.runOnlyPendingTimers()

    expect(sessions).toContain('connected')
    expect(presence[presence.length - 1]).toBe('online')

    const sampleMessage: Message = {
      id: 'm-1',
      conversationId: 'c-1',
      senderId: 'user-2',
      content: 'Hello',
      createdAt: new Date().toISOString(),
      status: 'sent',
    }
    messageHandlers.forEach((handler) => handler(sampleMessage))
    expect(messages).toHaveLength(1)

    window.dispatchEvent(new Event('offline'))
    expect(sessions).toContain('reconnecting')
    vi.advanceTimersByTime(10)
    expect(sessions[sessions.length - 1]).toBe('connected')

    realtime.stop()
    expect(disconnectMock).toHaveBeenCalled()
    expect(sessions[sessions.length - 1]).toBe('disconnected')
    expect(presence[presence.length - 1]).toBe('offline')
  })
})
