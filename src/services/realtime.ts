import type { Message } from '../features/messaging/types'
import type { MatchSuggestion } from '../features/discovery/types'

export type RealtimeMessageHandler = (message: Message) => void
export type RealtimeMatchesHandler = (matches: MatchSuggestion[]) => void

interface RealtimeTransportHandlers {
  onMessage: RealtimeMessageHandler
  onMatches: RealtimeMatchesHandler
  onError?: (error: Event | Error) => void
}

export interface RealtimeTransport {
  connect: (token: string, handlers: RealtimeTransportHandlers) => () => void
}

export interface RealtimeClient {
  subscribeToMessages: (handler: RealtimeMessageHandler) => () => void
  subscribeToMatches: (handler: RealtimeMatchesHandler) => () => void
  disconnect: () => void
}

const defaultBaseUrl = import.meta.env.VITE_REALTIME_URL ?? '/realtime'

const resolveUrl = (path: string) => {
  if (typeof window === 'undefined') return path
  try {
    return new URL(path, window.location.origin).toString()
  } catch (error) {
    console.warn('Unable to resolve realtime URL', error)
    return path
  }
}

export const createRealtimeClient = (token: string, options?: { baseUrl?: string; transport?: RealtimeTransport }): RealtimeClient => {
  const messageListeners = new Set<RealtimeMessageHandler>()
  const matchesListeners = new Set<RealtimeMatchesHandler>()
  const emitMessage = (message: Message) => {
    messageListeners.forEach((listener) => listener(message))
  }
  const emitMatches = (matches: MatchSuggestion[]) => {
    matchesListeners.forEach((listener) => listener(matches))
  }

  let disconnect: () => void = () => {}

  const handlers: RealtimeTransportHandlers = {
    onMessage: emitMessage,
    onMatches: emitMatches,
    onError: (error) => {
      if (import.meta.env.DEV) {
        console.warn('Realtime connection error', error)
      }
    },
  }

  if (options?.transport) {
    disconnect = options.transport.connect(token, handlers)
  } else if (typeof window !== 'undefined') {
    if (typeof EventSource !== 'undefined') {
      const baseUrl = resolveUrl(options?.baseUrl ?? defaultBaseUrl)
      const url = new URL(baseUrl)
      url.searchParams.set('token', token)
      const eventSource = new EventSource(url.toString())
      eventSource.addEventListener('message', (event) => {
        try {
          const payload = JSON.parse((event as MessageEvent).data) as Message
          emitMessage(payload)
        } catch (error) {
          handlers.onError?.(error as Error)
        }
      })
      eventSource.addEventListener('matches', (event) => {
        try {
          const payload = JSON.parse((event as MessageEvent).data) as MatchSuggestion[]
          emitMatches(payload)
        } catch (error) {
          handlers.onError?.(error as Error)
        }
      })
      eventSource.onerror = (event) => handlers.onError?.(event)
      disconnect = () => eventSource.close()
    } else if (typeof WebSocket !== 'undefined') {
      const baseUrl = resolveUrl(options?.baseUrl ?? defaultBaseUrl)
      const wsUrl = baseUrl.replace('http', 'ws')
      const socket = new WebSocket(`${wsUrl}?token=${token}`)
      socket.addEventListener('message', (event) => {
        try {
          const data = JSON.parse(event.data)
          if (Array.isArray(data)) {
            emitMatches(data as MatchSuggestion[])
          } else {
            emitMessage(data as Message)
          }
        } catch (error) {
          handlers.onError?.(error as Error)
        }
      })
      socket.addEventListener('error', (event) => handlers.onError?.(event))
      disconnect = () => socket.close()
    }
  }

  return {
    subscribeToMessages: (handler: RealtimeMessageHandler) => {
      messageListeners.add(handler)
      return () => messageListeners.delete(handler)
    },
    subscribeToMatches: (handler: RealtimeMatchesHandler) => {
      matchesListeners.add(handler)
      return () => matchesListeners.delete(handler)
    },
    disconnect: () => {
      disconnect()
      messageListeners.clear()
      matchesListeners.clear()
    },
  }
}
