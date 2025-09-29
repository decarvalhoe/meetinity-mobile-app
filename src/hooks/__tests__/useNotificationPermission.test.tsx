import { act, renderHook } from '@testing-library/react'
import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import useNotificationPermission from '../useNotificationPermission'
import { AppStoreProvider } from '../../store/AppStore'

const requestPermissionMock = vi.fn<Promise<NotificationPermission>, []>()

vi.mock('../../auth/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'user-1', fullName: 'Jane Doe', headline: 'PM' },
    token: null,
    isAuthenticated: false,
    isLoading: false,
    login: vi.fn(),
    setToken: vi.fn(),
    logout: vi.fn(),
  }),
}))

vi.mock('../../services/profileService', () => ({
  default: {
    getProfile: vi.fn(async () => null),
    updateProfile: vi.fn(async () => {}),
    getPreferences: vi.fn(async () => ({
      discoveryRadiusKm: 25,
      industries: [],
      interests: [],
      eventTypes: [],
    })),
  },
}))

vi.mock('../../services/matchingService', () => ({
  default: {
    getFeed: vi.fn(async () => ({ items: [], meta: { fetchedAt: new Date().toISOString(), nextCursor: null } })),
    getStatus: vi.fn(async () => ({ liked: [], passed: [], matched: [], pending: [], updatedAt: new Date().toISOString() })),
    syncLikes: vi.fn(async () => ({ processed: [], failed: [] })),
    accept: vi.fn(),
    decline: vi.fn(),
  },
}))

vi.mock('../../services/eventsService', () => ({
  default: {
    list: vi.fn(async () => ({ items: [], page: 1, pageSize: 20, total: 0, hasMore: false })),
    details: vi.fn(async () => undefined),
    join: vi.fn(async () => {}),
    leave: vi.fn(async () => {}),
  },
}))

vi.mock('../../services/messagingService', () => ({
  default: {
    listConversations: vi.fn(async () => []),
    listMessages: vi.fn(async () => []),
    sendMessage: vi.fn(async () => ({
      id: 'msg-1',
      conversationId: 'conv-1',
      senderId: 'user-2',
      content: 'Hello',
      createdAt: new Date().toISOString(),
      status: 'sent',
    })),
    markConversationRead: vi.fn(async () => {}),
  },
}))

vi.mock('../../services/realtimeMessaging', () => ({
  createRealtimeMessaging: vi.fn(() => ({
    start: vi.fn(),
    stop: vi.fn(),
    announcePresence: vi.fn(),
    markConversationRead: vi.fn(),
  })),
}))

const wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <AppStoreProvider>{children}</AppStoreProvider>
)

const notificationMock: { permission: NotificationPermission; requestPermission: typeof requestPermissionMock } = {
  permission: 'default',
  requestPermission: requestPermissionMock,
}

const setNotificationPermission = (permission: NotificationPermission) => {
  requestPermissionMock.mockReset()
  requestPermissionMock.mockImplementation(async () => {
    notificationMock.permission = permission
    return permission
  })
  notificationMock.permission = permission
}

describe('useNotificationPermission', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'Notification', {
      configurable: true,
      writable: true,
      value: notificationMock as unknown as typeof Notification,
    })
  })

  afterEach(() => {
    requestPermissionMock.mockReset()
    delete (window as { Notification?: typeof Notification }).Notification
  })

  it('requests permission after a user interaction when state is default', async () => {
    setNotificationPermission('default')

    const { result } = renderHook(() => useNotificationPermission(), { wrapper })

    expect(result.current.permission).toBe('default')
    expect(requestPermissionMock).not.toHaveBeenCalled()

    await act(async () => {
      window.dispatchEvent(new Event('click'))
      await Promise.resolve()
    })

    expect(requestPermissionMock).toHaveBeenCalledTimes(1)
  })

  it('does not request permission when already granted', async () => {
    setNotificationPermission('granted')

    renderHook(() => useNotificationPermission(), { wrapper })

    await act(async () => {
      window.dispatchEvent(new Event('click'))
      await Promise.resolve()
    })

    expect(requestPermissionMock).not.toHaveBeenCalled()
  })

  it('does not request permission when denied', async () => {
    setNotificationPermission('denied')

    renderHook(() => useNotificationPermission(), { wrapper })

    await act(async () => {
      window.dispatchEvent(new Event('click'))
      await Promise.resolve()
    })

    expect(requestPermissionMock).not.toHaveBeenCalled()
  })

  it('reports unsupported state when the Notification API is missing', async () => {
    requestPermissionMock.mockReset()
    delete (window as { Notification?: typeof Notification }).Notification

    const { result } = renderHook(() => useNotificationPermission(), { wrapper })

    expect(result.current.permission).toBe('unsupported')
    expect(result.current.isSupported).toBe(false)

    await act(async () => {
      result.current.requestPermission()
      await Promise.resolve()
    })

    expect(requestPermissionMock).not.toHaveBeenCalled()
  })
})
