import React, { createContext, useCallback, useContext, useEffect, useMemo, useReducer } from 'react'
import { useAuth } from '../auth/AuthContext'
import type { UserProfile, ProfileUpdatePayload } from '../features/profile/types'
import type { MatchSuggestion } from '../features/discovery/types'
import type { EventSummary } from '../features/events/types'
import type { Conversation, Message } from '../features/messaging/types'
import profileService from '../services/profileService'
import matchingService from '../services/matchingService'
import eventsService from '../services/eventsService'
import messagingService from '../services/messagingService'
import { createRealtimeClient } from '../services/realtime'

const STORAGE_KEY = 'meetinity-app-store'

type Status = 'idle' | 'loading' | 'success' | 'error'

interface ResourceState<T> {
  status: Status
  data: T
  error?: string
}

interface AppState {
  profile: ResourceState<UserProfile | null>
  matches: ResourceState<MatchSuggestion[]>
  events: ResourceState<EventSummary[]>
  conversations: ResourceState<Conversation[]>
  messages: Record<string, Message[]>
  activeConversationId: string | null
}

const createInitialState = (): AppState => ({
  profile: { status: 'idle', data: null },
  matches: { status: 'idle', data: [] },
  events: { status: 'idle', data: [] },
  conversations: { status: 'idle', data: [] },
  messages: {},
  activeConversationId: null,
})

type AppAction =
  | { type: 'profile/loading' }
  | { type: 'profile/success'; payload: UserProfile }
  | { type: 'profile/error'; error: string }
  | { type: 'matches/loading' }
  | { type: 'matches/success'; payload: MatchSuggestion[] }
  | { type: 'matches/error'; error: string }
  | { type: 'events/loading' }
  | { type: 'events/success'; payload: EventSummary[] }
  | { type: 'events/error'; error: string }
  | { type: 'conversations/loading' }
  | { type: 'conversations/success'; payload: Conversation[] }
  | { type: 'conversations/error'; error: string }
  | { type: 'messages/append'; payload: Message }
  | { type: 'messages/hydrate'; payload: { conversationId: string; messages: Message[] } }
  | { type: 'activeConversation/set'; payload: string | null }

const reducer = (state: AppState, action: AppAction): AppState => {
  switch (action.type) {
    case 'profile/loading':
      return { ...state, profile: { ...state.profile, status: 'loading', error: undefined } }
    case 'profile/success':
      return { ...state, profile: { status: 'success', data: action.payload } }
    case 'profile/error':
      return { ...state, profile: { ...state.profile, status: 'error', error: action.error } }
    case 'matches/loading':
      return { ...state, matches: { ...state.matches, status: 'loading', error: undefined } }
    case 'matches/success':
      return { ...state, matches: { status: 'success', data: action.payload } }
    case 'matches/error':
      return { ...state, matches: { ...state.matches, status: 'error', error: action.error } }
    case 'events/loading':
      return { ...state, events: { ...state.events, status: 'loading', error: undefined } }
    case 'events/success':
      return { ...state, events: { status: 'success', data: action.payload } }
    case 'events/error':
      return { ...state, events: { ...state.events, status: 'error', error: action.error } }
    case 'conversations/loading':
      return { ...state, conversations: { ...state.conversations, status: 'loading', error: undefined } }
    case 'conversations/success':
      return { ...state, conversations: { status: 'success', data: action.payload } }
    case 'conversations/error':
      return { ...state, conversations: { ...state.conversations, status: 'error', error: action.error } }
    case 'messages/append': {
      const existing = state.messages[action.payload.conversationId] ?? []
      return {
        ...state,
        messages: {
          ...state.messages,
          [action.payload.conversationId]: [...existing, action.payload],
        },
      }
    }
    case 'messages/hydrate':
      return {
        ...state,
        messages: {
          ...state.messages,
          [action.payload.conversationId]: action.payload.messages,
        },
      }
    case 'activeConversation/set':
      return { ...state, activeConversationId: action.payload }
    default:
      return state
  }
}

interface AppStoreValue {
  state: AppState
  refreshProfile: () => Promise<void>
  saveProfile: (update: ProfileUpdatePayload) => Promise<void>
  refreshMatches: () => Promise<void>
  acceptMatch: (matchId: string) => Promise<void>
  declineMatch: (matchId: string) => Promise<void>
  refreshEvents: () => Promise<void>
  toggleEventRegistration: (eventId: string, register: boolean) => Promise<void>
  refreshConversations: () => Promise<void>
  loadMessages: (conversationId: string) => Promise<void>
  sendMessage: (conversationId: string, content: string) => Promise<void>
  setActiveConversation: (conversationId: string | null) => void
}

const AppStoreContext = createContext<AppStoreValue | undefined>(undefined)

const hydrateState = (): AppState => {
  if (typeof window === 'undefined') {
    return createInitialState()
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return createInitialState()
    const parsed = JSON.parse(raw) as AppState
    return {
      ...createInitialState(),
      ...parsed,
    }
  } catch (error) {
    console.warn('Unable to restore application state', error)
    return createInitialState()
  }
}

export const AppStoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token } = useAuth()
  const [state, dispatch] = useReducer(reducer, undefined, hydrateState)

  useEffect(() => {
    if (typeof window === 'undefined') return
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }, [state])

  const refreshProfile = useCallback(async () => {
    if (!token) return
    dispatch({ type: 'profile/loading' })
    try {
      const profile = await profileService.getProfile(token)
      dispatch({ type: 'profile/success', payload: profile })
    } catch (error) {
      dispatch({ type: 'profile/error', error: (error as Error).message })
    }
  }, [token])

  const saveProfile = useCallback(
    async (update: ProfileUpdatePayload) => {
      if (!token) return
      dispatch({ type: 'profile/loading' })
      try {
        const profile = await profileService.updateProfile(token, update)
        dispatch({ type: 'profile/success', payload: profile })
      } catch (error) {
        dispatch({ type: 'profile/error', error: (error as Error).message })
        throw error
      }
    },
    [token],
  )

  const refreshMatches = useCallback(async () => {
    if (!token) return
    dispatch({ type: 'matches/loading' })
    try {
      const matches = await matchingService.getSuggestions(token)
      dispatch({ type: 'matches/success', payload: matches })
    } catch (error) {
      dispatch({ type: 'matches/error', error: (error as Error).message })
    }
  }, [token])

  const acceptMatch = useCallback(
    async (matchId: string) => {
      if (!token) return
      await matchingService.accept(token, matchId)
      await refreshMatches()
    },
    [token, refreshMatches],
  )

  const declineMatch = useCallback(
    async (matchId: string) => {
      if (!token) return
      await matchingService.decline(token, matchId)
      await refreshMatches()
    },
    [token, refreshMatches],
  )

  const refreshEvents = useCallback(async () => {
    if (!token) return
    dispatch({ type: 'events/loading' })
    try {
      const events = await eventsService.list(token)
      dispatch({ type: 'events/success', payload: events })
    } catch (error) {
      dispatch({ type: 'events/error', error: (error as Error).message })
    }
  }, [token])

  const toggleEventRegistration = useCallback(
    async (eventId: string, register: boolean) => {
      if (!token) return
      if (register) {
        await eventsService.join(token, eventId)
      } else {
        await eventsService.leave(token, eventId)
      }
      await refreshEvents()
    },
    [token, refreshEvents],
  )

  const refreshConversations = useCallback(async () => {
    if (!token) return
    dispatch({ type: 'conversations/loading' })
    try {
      const conversations = await messagingService.listConversations(token)
      dispatch({ type: 'conversations/success', payload: conversations })
    } catch (error) {
      dispatch({ type: 'conversations/error', error: (error as Error).message })
    }
  }, [token])

  const loadMessages = useCallback(
    async (conversationId: string) => {
      if (!token) return
      const messages = await messagingService.listMessages(token, conversationId)
      dispatch({ type: 'messages/hydrate', payload: { conversationId, messages } })
    },
    [token],
  )

  const sendMessage = useCallback(
    async (conversationId: string, content: string) => {
      if (!token) return
      const message = await messagingService.sendMessage(token, conversationId, content)
      dispatch({ type: 'messages/append', payload: message })
    },
    [token],
  )

  useEffect(() => {
    if (!token) return
    refreshProfile()
    refreshMatches()
    refreshEvents()
    refreshConversations()
  }, [token, refreshProfile, refreshMatches, refreshEvents, refreshConversations])

  useEffect(() => {
    if (!token) return
    const realtime = createRealtimeClient(token)
    const unsubscribeMessages = realtime.subscribeToMessages((message) => {
      dispatch({ type: 'messages/append', payload: message })
    })
    const unsubscribeMatches = realtime.subscribeToMatches(() => {
      refreshMatches()
    })
    return () => {
      unsubscribeMessages()
      unsubscribeMatches()
      realtime.disconnect()
    }
  }, [token, refreshMatches])

  const setActiveConversation = useCallback((conversationId: string | null) => {
    dispatch({ type: 'activeConversation/set', payload: conversationId })
  }, [])

  const value = useMemo<AppStoreValue>(
    () => ({
      state,
      refreshProfile,
      saveProfile,
      refreshMatches,
      acceptMatch,
      declineMatch,
      refreshEvents,
      toggleEventRegistration,
      refreshConversations,
      loadMessages,
      sendMessage,
      setActiveConversation,
    }),
    [
      state,
      refreshProfile,
      saveProfile,
      refreshMatches,
      acceptMatch,
      declineMatch,
      refreshEvents,
      toggleEventRegistration,
      refreshConversations,
      loadMessages,
      sendMessage,
      setActiveConversation,
    ],
  )

  return <AppStoreContext.Provider value={value}>{children}</AppStoreContext.Provider>
}

export const useAppStore = (): AppStoreValue => {
  const context = useContext(AppStoreContext)
  if (!context) {
    throw new Error('useAppStore must be used within an AppStoreProvider')
  }
  return context
}
