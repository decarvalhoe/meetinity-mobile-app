import React, { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef } from 'react'
import { useAuth } from '../auth/AuthContext'
import type { UserProfile, ProfileUpdatePayload } from '../features/profile/types'
import type {
  MatchFeedItem,
  MatchFeedMeta,
  MatchMetadata,
  MatchRelationshipStatus,
  MatchStatusSnapshot,
  PendingSwipeAction,
  SwipeDecision,
} from '../features/discovery/types'
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
  matches: ResourceState<MatchFeedItem[]>
  events: ResourceState<EventSummary[]>
  conversations: ResourceState<Conversation[]>
  messages: Record<string, Message[]>
  activeConversationId: string | null
  matchFeedMeta: MatchFeedMeta | null
  pendingMatchActions: PendingSwipeAction[]
  matchNotifications: MatchFeedItem[]
}

const createInitialState = (): AppState => ({
  profile: { status: 'idle', data: null },
  matches: { status: 'idle', data: [] },
  events: { status: 'idle', data: [] },
  conversations: { status: 'idle', data: [] },
  messages: {},
  activeConversationId: null,
  matchFeedMeta: null,
  pendingMatchActions: [],
  matchNotifications: [],
})

type AppAction =
  | { type: 'profile/loading' }
  | { type: 'profile/success'; payload: UserProfile }
  | { type: 'profile/error'; error: string }
  | { type: 'matches/loading' }
  | { type: 'matches/success'; payload: MatchFeedItem[] }
  | { type: 'matches/error'; error: string }
  | { type: 'matches/meta'; payload: MatchFeedMeta | null }
  | { type: 'matches/pending/add'; payload: PendingSwipeAction }
  | { type: 'matches/pending/remove'; payload: string[] }
  | { type: 'matches/pending/update'; payload: PendingSwipeAction }
  | { type: 'matches/notify'; payload: MatchFeedItem[] }
  | { type: 'matches/notification/ack'; payload: string }
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
    case 'matches/meta':
      return { ...state, matchFeedMeta: action.payload }
    case 'matches/pending/add': {
      const existingIndex = state.pendingMatchActions.findIndex((item) => item.id === action.payload.id)
      if (existingIndex !== -1) {
        const pending = [...state.pendingMatchActions]
        pending[existingIndex] = { ...pending[existingIndex], ...action.payload }
        return { ...state, pendingMatchActions: pending }
      }
      return { ...state, pendingMatchActions: [...state.pendingMatchActions, action.payload] }
    }
    case 'matches/pending/remove': {
      const ids = new Set(action.payload)
      return {
        ...state,
        pendingMatchActions: state.pendingMatchActions.filter((item) => !ids.has(item.id)),
      }
    }
    case 'matches/pending/update': {
      const existingIndex = state.pendingMatchActions.findIndex((item) => item.id === action.payload.id)
      if (existingIndex === -1) {
        return { ...state, pendingMatchActions: [...state.pendingMatchActions, action.payload] }
      }
      const pending = [...state.pendingMatchActions]
      pending[existingIndex] = { ...pending[existingIndex], ...action.payload }
      return { ...state, pendingMatchActions: pending }
    }
    case 'matches/notify': {
      if (action.payload.length === 0) return state
      const knownIds = new Set(state.matchNotifications.map((match) => match.id))
      const additions = action.payload.filter((match) => !knownIds.has(match.id))
      if (additions.length === 0) return state
      return { ...state, matchNotifications: [...state.matchNotifications, ...additions] }
    }
    case 'matches/notification/ack':
      return {
        ...state,
        matchNotifications: state.matchNotifications.filter((match) => match.id !== action.payload),
      }
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
  acknowledgeMatchNotification: (matchId: string) => void
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

const ensureMetadata = (
  item: MatchFeedItem,
  source: MatchMetadata['source'],
  fallbackSyncedAt?: string,
): MatchFeedItem => {
  const now = new Date().toISOString()
  const metadata: MatchMetadata = {
    likedAt: item.metadata?.likedAt,
    passedAt: item.metadata?.passedAt,
    matchedAt: item.metadata?.matchedAt,
    syncedAt: item.metadata?.syncedAt ?? fallbackSyncedAt ?? now,
    source,
    ...item.metadata,
  }
  return {
    ...item,
    metadata,
  }
}

const normalizeFeedItems = (
  items: MatchFeedItem[],
  source: MatchMetadata['source'],
  fallbackSyncedAt?: string,
): MatchFeedItem[] => items.map((item) => ensureMetadata(item, source, fallbackSyncedAt))

const applyStatusSnapshot = (items: MatchFeedItem[], snapshot?: MatchStatusSnapshot): MatchFeedItem[] => {
  if (!snapshot) return items
  const statusMap = new Map<string, MatchRelationshipStatus>()
  snapshot.pending.forEach((id) => statusMap.set(id, 'pending'))
  snapshot.liked.forEach((id) => statusMap.set(id, 'liked'))
  snapshot.passed.forEach((id) => statusMap.set(id, 'passed'))
  snapshot.matched.forEach((id) => statusMap.set(id, 'matched'))
  return items.map((item) => {
    const status = statusMap.get(item.id)
    if (!status) return item
    const metadata: MatchMetadata = {
      ...item.metadata,
      syncedAt: snapshot.updatedAt,
    }
    if (status === 'liked' && !metadata.likedAt) {
      metadata.likedAt = snapshot.updatedAt
    }
    if (status === 'passed' && !metadata.passedAt) {
      metadata.passedAt = snapshot.updatedAt
    }
    if (status === 'matched' && !metadata.matchedAt) {
      metadata.matchedAt = snapshot.updatedAt
    }
    return {
      ...item,
      status,
      metadata,
    }
  })
}

const mergeMatchItems = (current: MatchFeedItem[], incoming: MatchFeedItem[]): MatchFeedItem[] => {
  if (incoming.length === 0) return current
  const byId = new Map(incoming.map((item) => [item.id, item]))
  const merged: MatchFeedItem[] = current.map((item) => {
    const update = byId.get(item.id)
    if (!update) return item
    byId.delete(item.id)
    return {
      ...item,
      ...update,
      metadata: { ...item.metadata, ...update.metadata },
    }
  })
  byId.forEach((item) => {
    merged.push(item)
  })
  return merged
}

const detectNewMatches = (previous: MatchFeedItem[], next: MatchFeedItem[]): MatchFeedItem[] => {
  if (next.length === 0) return []
  const previousMatched = new Set(previous.filter((item) => item.status === 'matched').map((item) => item.id))
  return next.filter((item) => item.status === 'matched' && !previousMatched.has(item.id))
}

const isOfflineError = (error: unknown): boolean => {
  if (typeof window !== 'undefined' && typeof navigator !== 'undefined' && navigator.onLine === false) {
    return true
  }
  if (!error || typeof error !== 'object') return false
  const maybeError = error as { code?: string; message?: string; isAxiosError?: boolean; response?: unknown }
  if (maybeError.code === 'ERR_NETWORK') return true
  if (maybeError.isAxiosError && maybeError.response === undefined) return true
  if (typeof maybeError.message === 'string' && maybeError.message.toLowerCase().includes('network')) {
    return true
  }
  return false
}

const applyDecisionToMatches = (
  matches: MatchFeedItem[],
  matchId: string,
  decision: SwipeDecision,
  timestamp: string,
): MatchFeedItem[] =>
  matches.map((item) => {
    if (item.id !== matchId) return item
    const metadata: MatchMetadata = {
      ...item.metadata,
      syncedAt: timestamp,
      source: 'local',
    }
    if (decision === 'like') {
      metadata.likedAt = timestamp
    } else {
      metadata.passedAt = timestamp
    }
    const status: MatchRelationshipStatus =
      decision === 'like' ? (item.status === 'matched' ? 'matched' : 'liked') : 'passed'
    return {
      ...item,
      status,
      metadata,
    }
  })

export const AppStoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token } = useAuth()
  const [state, dispatch] = useReducer(reducer, undefined, hydrateState)

  const triggerMatchNotifications = useCallback(
    (matches: MatchFeedItem[]) => {
      if (matches.length === 0) return
      dispatch({ type: 'matches/notify', payload: matches })
      if (typeof window === 'undefined') return
      if (!('Notification' in window)) return
      if (Notification.permission !== 'granted') return
      matches.forEach((match) => {
        try {
          new Notification('Nouveau match 🎉', {
            body: `${match.profile.fullName} est aussi intéressé(e)`,
            tag: match.id,
          })
        } catch (error) {
          if (import.meta.env.DEV) {
            console.warn('Unable to display native notification', error)
          }
        }
      })
    },
    [dispatch],
  )

  const matchesRef = useRef<MatchFeedItem[]>(state.matches.data)

  useEffect(() => {
    matchesRef.current = state.matches.data
  }, [state.matches.data])

  const commitMatches = useCallback(
    (
      items: MatchFeedItem[],
      options?: {
        meta?: MatchFeedMeta | null
        status?: MatchStatusSnapshot
        merge?: boolean
        source?: MatchMetadata['source']
      },
    ) => {
      const source = options?.source ?? 'initial'
      const normalized = normalizeFeedItems(items, source, options?.meta?.fetchedAt)
      const base = options?.merge ? mergeMatchItems(matchesRef.current, normalized) : normalized
      const withStatus = applyStatusSnapshot(base, options?.status)
      dispatch({ type: 'matches/success', payload: withStatus })
      matchesRef.current = withStatus
      if (options && 'meta' in options) {
        dispatch({ type: 'matches/meta', payload: options.meta ?? null })
        metaRef.current = options.meta ?? null
      }
    },
    [dispatch],
  )

  const previousMatchesRef = useRef<MatchFeedItem[]>(state.matches.data)

  useEffect(() => {
    const previous = previousMatchesRef.current
    const next = state.matches.data
    const newMatches = detectNewMatches(previous, next)
    if (newMatches.length) {
      triggerMatchNotifications(newMatches)
    }
    previousMatchesRef.current = next
  }, [state.matches.data, triggerMatchNotifications])


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
      const [feed, status] = await Promise.all([
        matchingService.getFeed(token),
        matchingService.getStatus(token).catch(() => undefined),
      ])
      commitMatches(feed.items, { meta: feed.meta, status, source: 'initial' })
    } catch (error) {
      dispatch({ type: 'matches/error', error: (error as Error).message })
    }
  }, [token, commitMatches])

  const performSwipe = useCallback(
    async (matchId: string, decision: SwipeDecision) => {
      if (!token) return
      const previousMatches = matchesRef.current
      if (!previousMatches.some((item) => item.id === matchId)) return
      const timestamp = new Date().toISOString()
      const optimisticMatches = applyDecisionToMatches(previousMatches, matchId, decision, timestamp)
      dispatch({ type: 'matches/success', payload: optimisticMatches })
      matchesRef.current = optimisticMatches
      const pendingAction: PendingSwipeAction = { id: matchId, decision, clientTimestamp: timestamp }
      dispatch({ type: 'matches/pending/add', payload: pendingAction })
      try {
        const result = await matchingService.syncLikes(token, { likes: [pendingAction] })
        const failedIds = new Set(result.failed.map((item) => item.id))
        if (result.processed.includes(matchId) || failedIds.has(matchId)) {
          dispatch({ type: 'matches/pending/remove', payload: [matchId] })
        }
        if (failedIds.has(matchId)) {
          dispatch({ type: 'matches/success', payload: previousMatches })
          matchesRef.current = previousMatches
          throw new Error(result.failed.find((item) => item.id === matchId)?.error ?? 'Unable to synchronise swipe')
        }
        if (result.feed) {
          commitMatches(result.feed.items, { meta: result.feed.meta, status: result.status, source: 'replay', merge: true })
        } else if (result.status) {
          const normalized = normalizeFeedItems(matchesRef.current, 'replay', result.status.updatedAt)
          const withStatus = applyStatusSnapshot(normalized, result.status)
          dispatch({ type: 'matches/success', payload: withStatus })
          matchesRef.current = withStatus
        }
      } catch (error) {
        if (isOfflineError(error)) {
          dispatch({
            type: 'matches/pending/update',
            payload: { ...pendingAction, error: (error as Error).message },
          })
          return
        }
        dispatch({ type: 'matches/pending/remove', payload: [matchId] })
        dispatch({ type: 'matches/success', payload: previousMatches })
        matchesRef.current = previousMatches
        throw error
      }
    },
    [token, commitMatches],
  )

  const acceptMatch = useCallback(
    async (matchId: string) => {
      await performSwipe(matchId, 'like')
    },
    [performSwipe],
  )

  const declineMatch = useCallback(
    async (matchId: string) => {
      await performSwipe(matchId, 'pass')
    },
    [performSwipe],
  )

  const syncPendingLikes = useCallback(async () => {
    if (!token) return
    if (state.pendingMatchActions.length === 0) return
    try {
      const result = await matchingService.syncLikes(token, { likes: state.pendingMatchActions })
      if (result.processed.length > 0) {
        dispatch({ type: 'matches/pending/remove', payload: result.processed })
      }
      if (result.feed) {
        commitMatches(result.feed.items, { meta: result.feed.meta, status: result.status, source: 'replay', merge: true })
      } else if (result.status) {
        const normalized = normalizeFeedItems(matchesRef.current, 'replay', result.status.updatedAt)
        const withStatus = applyStatusSnapshot(normalized, result.status)
        dispatch({ type: 'matches/success', payload: withStatus })
        matchesRef.current = withStatus
      }
    } catch (error) {
      if (!isOfflineError(error)) {
        dispatch({
          type: 'matches/pending/remove',
          payload: state.pendingMatchActions.map((item) => item.id),
        })
        dispatch({ type: 'matches/error', error: (error as Error).message })
      }
    }
  }, [token, state.pendingMatchActions, commitMatches])

  useEffect(() => {
    if (!token) return
    if (state.pendingMatchActions.length === 0) return
    const hasPendingWithoutError = state.pendingMatchActions.some((action) => !action.error)
    if (!hasPendingWithoutError) return
    void syncPendingLikes()
  }, [token, state.pendingMatchActions, syncPendingLikes])

  useEffect(() => {
    if (!token) return
    if (typeof window === 'undefined') return
    const handleOnline = () => {
      void syncPendingLikes()
    }
    window.addEventListener('online', handleOnline)
    return () => {
      window.removeEventListener('online', handleOnline)
    }
  }, [token, syncPendingLikes])

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
    const unsubscribeMatches = realtime.subscribeToMatches((matches) => {
      commitMatches(matches, { source: 'realtime', merge: true })
    })
    return () => {
      unsubscribeMessages()
      unsubscribeMatches()
      realtime.disconnect()
    }
  }, [token, commitMatches])

  const setActiveConversation = useCallback((conversationId: string | null) => {
    dispatch({ type: 'activeConversation/set', payload: conversationId })
  }, [])

  const acknowledgeMatchNotification = useCallback((matchId: string) => {
    dispatch({ type: 'matches/notification/ack', payload: matchId })
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
      acknowledgeMatchNotification,
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
      acknowledgeMatchNotification,
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
