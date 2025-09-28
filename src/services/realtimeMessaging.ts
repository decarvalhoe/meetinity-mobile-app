import { createRealtimeClient, type RealtimeClient, type RealtimeTransport } from './realtime'
import type { Message } from '../features/messaging/types'
import type { MatchFeedItem } from '../features/discovery/types'
import type { PresenceStatus, PresenceUpdate } from '../features/messaging/types'

export type MessagingSessionStatus = 'connecting' | 'connected' | 'reconnecting' | 'disconnected'

export interface MessagingSessionSnapshot {
  id: string
  status: MessagingSessionStatus
  since: string
}

export interface RealtimeMessagingConfig {
  token: string
  userId?: string
  onMessage: (message: Message) => void
  onMatches?: (matches: MatchFeedItem[]) => void
  onPresence?: (presence: PresenceUpdate) => void
  onSession?: (snapshot: MessagingSessionSnapshot) => void
  baseUrl?: string
  transport?: RealtimeTransport
  heartbeatIntervalMs?: number
  reconnectDelayMs?: number
}

export interface RealtimeMessaging {
  start: () => void
  stop: () => void
  announcePresence: (status: PresenceStatus, conversationId?: string) => void
  markConversationRead: (conversationId: string) => void
}

const generateId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `session-${Math.random().toString(36).slice(2)}`
}

const now = () => new Date().toISOString()

export const createRealtimeMessaging = (config: RealtimeMessagingConfig): RealtimeMessaging => {
  const reconnectDelay = config.reconnectDelayMs ?? 2000
  const heartbeatInterval = config.heartbeatIntervalMs ?? 30000
  const presenceParticipantId = config.userId ?? 'self'

  let client: RealtimeClient | null = null
  let unsubscribeMessages: (() => void) | null = null
  let unsubscribeMatches: (() => void) | null = null
  let reconnectTimer: ReturnType<typeof setTimeout> | undefined
  let heartbeatTimer: ReturnType<typeof setInterval> | undefined
  let started = false
  let sessionId: string | null = null
  let currentStatus: MessagingSessionStatus = 'disconnected'

  const notifySession = (status: MessagingSessionStatus) => {
    currentStatus = status
    if (!sessionId) {
      sessionId = generateId()
    }
    config.onSession?.({ id: sessionId, status, since: now() })
  }

  const cleanupClient = () => {
    unsubscribeMessages?.()
    unsubscribeMatches?.()
    unsubscribeMessages = null
    unsubscribeMatches = null
    client?.disconnect()
    client = null
  }

  const stopHeartbeat = () => {
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer)
      heartbeatTimer = undefined
    }
  }

  const startHeartbeat = () => {
    stopHeartbeat()
    if (typeof window === 'undefined') return
    heartbeatTimer = setInterval(() => {
      config.onPresence?.({
        participantId: presenceParticipantId,
        status: 'online',
        at: now(),
      })
    }, heartbeatInterval)
  }

  const connect = () => {
    if (!started) return
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      notifySession('reconnecting')
      return
    }

    cleanupClient()
    clearReconnect()
    if (!sessionId) {
      sessionId = generateId()
    }
    const nextStatus: MessagingSessionStatus =
      currentStatus === 'connecting' || currentStatus === 'disconnected' ? 'connecting' : 'reconnecting'
    notifySession(nextStatus)
    try {
      client = createRealtimeClient(config.token, {
        baseUrl: config.baseUrl,
        transport: config.transport,
      })
      unsubscribeMessages = client.subscribeToMessages((message) => {
        config.onMessage(message)
      })
      if (config.onMatches) {
        unsubscribeMatches = client.subscribeToMatches((matches) => {
          config.onMatches?.(matches)
        })
      }
      notifySession('connected')
      config.onPresence?.({
        participantId: presenceParticipantId,
        status: 'online',
        at: now(),
      })
      startHeartbeat()
    } catch (error) {
      console.warn('Unable to open realtime messaging connection', error)
      scheduleReconnect()
    }
  }

  const clearReconnect = () => {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer)
      reconnectTimer = undefined
    }
  }

  const scheduleReconnect = () => {
    if (!started) return
    if (reconnectTimer) return
    notifySession('reconnecting')
    reconnectTimer = setTimeout(() => {
      reconnectTimer = undefined
      connect()
    }, reconnectDelay)
  }

  const handleOffline = () => {
    notifySession('reconnecting')
    config.onPresence?.({
      participantId: presenceParticipantId,
      status: 'offline',
      at: now(),
    })
    cleanupClient()
    stopHeartbeat()
    scheduleReconnect()
  }

  const handleOnline = () => {
    clearReconnect()
    connect()
  }

  const handleVisibility = () => {
    if (typeof document === 'undefined') return
    const status: PresenceStatus = document.visibilityState === 'hidden' ? 'offline' : 'online'
    config.onPresence?.({
      participantId: presenceParticipantId,
      status,
      at: now(),
    })
    if (status === 'offline') {
      stopHeartbeat()
    } else {
      startHeartbeat()
    }
  }

  const addEventListeners = () => {
    if (typeof window === 'undefined') return
    window.addEventListener('offline', handleOffline)
    window.addEventListener('online', handleOnline)
    document.addEventListener('visibilitychange', handleVisibility)
  }

  const removeEventListeners = () => {
    if (typeof window === 'undefined') return
    window.removeEventListener('offline', handleOffline)
    window.removeEventListener('online', handleOnline)
    document.removeEventListener('visibilitychange', handleVisibility)
  }

  const start = () => {
    if (started) return
    started = true
    notifySession('connecting')
    addEventListeners()
    if (typeof navigator === 'undefined' || navigator.onLine !== false) {
      connect()
    } else {
      scheduleReconnect()
    }
  }

  const stop = () => {
    if (!started) return
    started = false
    clearReconnect()
    stopHeartbeat()
    removeEventListeners()
    cleanupClient()
    notifySession('disconnected')
    config.onPresence?.({
      participantId: presenceParticipantId,
      status: 'offline',
      at: now(),
    })
  }

  const announcePresence = (status: PresenceStatus, conversationId?: string) => {
    config.onPresence?.({
      participantId: presenceParticipantId,
      status,
      conversationId,
      at: now(),
    })
    if (status === 'online') {
      startHeartbeat()
    }
  }

  const markConversationRead = (conversationId: string) => {
    config.onPresence?.({
      participantId: presenceParticipantId,
      status: 'online',
      conversationId,
      at: now(),
    })
  }

  return {
    start,
    stop,
    announcePresence,
    markConversationRead,
  }
}

export type { PresenceStatus } from '../features/messaging/types'
