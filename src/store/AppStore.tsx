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
import type {
  EventDetails,
  EventListFilters,
  EventSummary,
} from '../features/events/types'
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

interface EventListState {
  items: EventSummary[]
  page: number
  pageSize: number
  total: number
  hasMore: boolean
  filters: EventListFilters
}

interface PendingEventRegistration {
  id: string
  eventId: string
  register: boolean
  timestamp: string
  error?: string
  previousSummary?: EventSummary
  previousDetail?: EventDetails
}

interface AppState {
  profile: ResourceState<UserProfile | null>
  matches: ResourceState<MatchFeedItem[]>
  events: ResourceState<EventListState>
  conversations: ResourceState<Conversation[]>
  messages: Record<string, Message[]>
  activeConversationId: string | null
  matchFeedMeta: MatchFeedMeta | null
  pendingMatchActions: PendingSwipeAction[]
  matchNotifications: MatchFeedItem[]
  eventDetails: Record<string, EventDetails | undefined>
  pendingEventRegistrations: PendingEventRegistration[]
}

const createInitialState = (): AppState => ({
  profile: { status: 'idle', data: null },
  matches: { status: 'idle', data: [] },
  events: {
    status: 'idle',
    data: { items: [], page: 1, pageSize: 20, total: 0, hasMore: false, filters: {} },
  },
  conversations: { status: 'idle', data: [] },
  messages: {},
  activeConversationId: null,
  matchFeedMeta: null,
  pendingMatchActions: [],
  matchNotifications: [],
  eventDetails: {},
  pendingEventRegistrations: [],
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
  | { type: 'events/loading'; payload?: { append?: boolean } }
  | { type: 'events/success'; payload: EventListState }
  | { type: 'events/error'; error: string }
  | { type: 'events/update'; payload: { summary?: EventSummary; detail?: EventDetails } }
  | { type: 'events/rollback'; payload: { summary?: EventSummary; detail?: EventDetails; eventId: string } }
  | { type: 'events/detail/cache'; payload: EventDetails }
  | { type: 'events/pending/add'; payload: PendingEventRegistration }
  | { type: 'events/pending/remove'; payload: string }
  | { type: 'events/pending/error'; payload: { id: string; error: string } }
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
      return {
        ...state,
        events: {
          ...state.events,
          status: 'loading',
          error: undefined,
        },
      }
    case 'events/success':
      return {
        ...state,
        events: {
          status: 'success',
          data: action.payload,
        },
      }
    case 'events/error':
      return {
        ...state,
        events: {
          ...state.events,
          status: 'error',
          error: action.error,
        },
      }
    case 'events/update': {
      const summary = action.payload.summary
      const detail = action.payload.detail
      const items = summary
        ? state.events.data.items.map((event) => (event.id === summary.id ? { ...event, ...summary } : event))
        : state.events.data.items
      return {
        ...state,
        events: {
          ...state.events,
          data: {
            ...state.events.data,
            items,
          },
        },
        eventDetails:
          detail !== undefined
            ? {
                ...state.eventDetails,
                [detail.id]: {
                  ...state.eventDetails[detail.id],
                  ...detail,
                },
              }
            : state.eventDetails,
      }
    }
    case 'events/rollback': {
      const { summary, detail, eventId } = action.payload
      const items = summary
        ? state.events.data.items.map((event) => (event.id === summary.id ? summary : event))
        : state.events.data.items
      const nextDetails = { ...state.eventDetails }
      if (detail) {
        nextDetails[eventId] = detail
      }
      return {
        ...state,
        events: {
          ...state.events,
          data: {
            ...state.events.data,
            items,
          },
        },
        eventDetails: nextDetails,
      }
    }
    case 'events/detail/cache':
      return {
        ...state,
        eventDetails: {
          ...state.eventDetails,
          [action.payload.id]: action.payload,
        },
      }
    case 'events/pending/add': {
      const existingIndex = state.pendingEventRegistrations.findIndex((item) => item.id === action.payload.id)
      if (existingIndex !== -1) {
        const items = [...state.pendingEventRegistrations]
        items[existingIndex] = { ...items[existingIndex], ...action.payload }
        return { ...state, pendingEventRegistrations: items }
      }
      return {
        ...state,
        pendingEventRegistrations: [...state.pendingEventRegistrations, action.payload],
      }
    }
    case 'events/pending/remove':
      return {
        ...state,
        pendingEventRegistrations: state.pendingEventRegistrations.filter((item) => item.id !== action.payload),
      }
    case 'events/pending/error':
      return {
        ...state,
        pendingEventRegistrations: state.pendingEventRegistrations.map((item) =>
          item.id === action.payload.id ? { ...item, error: action.payload.error } : item,
        ),
      }
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
  refreshEvents: (filters?: EventListFilters, page?: number) => Promise<void>
  toggleEventRegistration: (eventId: string, register: boolean) => Promise<void>
  loadEventDetails: (eventId: string, options?: { force?: boolean }) => Promise<EventDetails | undefined>
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
    const parsed = JSON.parse(raw) as Partial<AppState>
    const base = createInitialState()
    const merged: AppState = {
      ...base,
      ...parsed,
      profile: parsed.profile ?? base.profile,
      matches: parsed.matches ?? base.matches,
      conversations: parsed.conversations ?? base.conversations,
      messages: parsed.messages ?? base.messages,
      activeConversationId: parsed.activeConversationId ?? base.activeConversationId,
      matchFeedMeta: parsed.matchFeedMeta ?? base.matchFeedMeta,
      pendingMatchActions: parsed.pendingMatchActions ?? base.pendingMatchActions,
      matchNotifications: parsed.matchNotifications ?? base.matchNotifications,
      eventDetails: parsed.eventDetails ?? base.eventDetails,
      pendingEventRegistrations: parsed.pendingEventRegistrations ?? base.pendingEventRegistrations,
    }
    const maybeEvents = parsed.events
    if (maybeEvents && !Array.isArray((maybeEvents as unknown as { data: unknown }).data)) {
      const data = (maybeEvents.data ?? base.events.data) as Partial<EventListState>
      merged.events = {
        status: maybeEvents.status ?? base.events.status,
        data: {
          ...base.events.data,
          ...data,
          filters: data.filters ?? base.events.data.filters,
          items: Array.isArray(data.items) ? data.items : base.events.data.items,
        },
      }
    } else {
      const items = Array.isArray(maybeEvents?.data) ? (maybeEvents?.data as EventSummary[]) : base.events.data.items
      merged.events = {
        status: maybeEvents?.status ?? base.events.status,
        data: {
          ...base.events.data,
          items,
        },
      }
    }
    return merged
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

  const eventsStateRef = useRef<EventListState>(state.events.data)

  useEffect(() => {
    matchesRef.current = state.matches.data
  }, [state.matches.data])

  useEffect(() => {
    eventsStateRef.current = state.events.data
  }, [state.events.data])

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

  const refreshEvents = useCallback(
    async (filters: EventListFilters = {}, page = 1) => {
      if (!token) return
      dispatch({ type: 'events/loading', payload: { append: page > 1 } })
      const sanitizedFilters = Object.fromEntries(
        Object.entries(filters).filter(([, value]) => value !== undefined && value !== ''),
      ) as EventListFilters
      try {
        const response = await eventsService.list(token, { ...sanitizedFilters, page })
        const shouldAppend = page > 1
        const baseState = eventsStateRef.current
        const mergedItems = shouldAppend
          ? (() => {
              const byId = new Map<string, EventSummary>()
              baseState.items.forEach((item) => {
                byId.set(item.id, item)
              })
              response.items.forEach((item) => {
                byId.set(item.id, item)
              })
              return Array.from(byId.values())
            })()
          : response.items
        const nextState: EventListState = {
          items: mergedItems,
          page: response.page,
          pageSize: response.pageSize,
          total: response.total,
          hasMore: response.hasMore,
          filters: response.filters ?? { ...sanitizedFilters },
        }
        dispatch({ type: 'events/success', payload: nextState })
      } catch (error) {
        dispatch({ type: 'events/error', error: (error as Error).message })
      }
    },
    [token],
  )

  const toggleEventRegistration = useCallback(
    async (eventId: string, register: boolean) => {
      if (!token) return
      const timestamp = new Date().toISOString()
      const actionId = `${eventId}-${timestamp}`
      const previousSummary = eventsStateRef.current.items.find((event) => event.id === eventId)
      const previousDetail = state.eventDetails[eventId]
      const delta = register ? 1 : -1
      const nextSummary = previousSummary
        ? {
            ...previousSummary,
            attendingCount: Math.max(
              0,
              Math.min(previousSummary.capacity, previousSummary.attendingCount + delta),
            ),
            isRegistered: register,
          }
        : undefined
      const currentUserId = state.profile.data?.id ?? 'me'
      const currentUserName = state.profile.data?.fullName ?? 'Vous'
      const currentUserAvatar = state.profile.data?.avatarUrl
      const nextDetail = previousDetail
        ? {
            ...previousDetail,
            attendingCount: Math.max(
              0,
              Math.min(previousDetail.capacity, previousDetail.attendingCount + delta),
            ),
            isRegistered: register,
            participants: register
              ? previousDetail.participants.some((participant) => participant.id === currentUserId)
                ? previousDetail.participants
                : [
                    ...previousDetail.participants,
                    { id: currentUserId, name: currentUserName, avatarUrl: currentUserAvatar },
                  ]
              : previousDetail.participants.filter((participant) => participant.id !== currentUserId),
          }
        : undefined
      if (nextSummary || nextDetail) {
        dispatch({ type: 'events/update', payload: { summary: nextSummary, detail: nextDetail } })
      }
      dispatch({
        type: 'events/pending/add',
        payload: {
          id: actionId,
          eventId,
          register,
          timestamp,
          previousSummary,
          previousDetail,
        },
      })
      try {
        if (register) {
          await eventsService.join(token, eventId)
        } else {
          await eventsService.leave(token, eventId)
        }
        dispatch({ type: 'events/pending/remove', payload: actionId })
      } catch (error) {
        if (isOfflineError(error)) {
          dispatch({
            type: 'events/pending/error',
            payload: { id: actionId, error: (error as Error).message ?? 'offline' },
          })
          return
        }
        dispatch({ type: 'events/pending/remove', payload: actionId })
        if (previousSummary || previousDetail) {
          dispatch({
            type: 'events/rollback',
            payload: { summary: previousSummary, detail: previousDetail, eventId },
          })
        }
        throw error
      }
    },
    [token, state.eventDetails, state.profile.data],
  )

  const syncPendingRegistrations = useCallback(async () => {
    if (!token) return
    if (state.pendingEventRegistrations.length === 0) return
    for (const action of state.pendingEventRegistrations) {
      if (action.error) {
        continue
      }
      try {
        if (action.register) {
          await eventsService.join(token, action.eventId)
        } else {
          await eventsService.leave(token, action.eventId)
        }
        dispatch({ type: 'events/pending/remove', payload: action.id })
      } catch (error) {
        if (isOfflineError(error)) {
          dispatch({
            type: 'events/pending/error',
            payload: { id: action.id, error: (error as Error).message ?? 'offline' },
          })
        } else {
          dispatch({ type: 'events/pending/remove', payload: action.id })
          if (action.previousSummary || action.previousDetail) {
            dispatch({
              type: 'events/rollback',
              payload: {
                summary: action.previousSummary,
                detail: action.previousDetail,
                eventId: action.eventId,
              },
            })
          }
        }
      }
    }
  }, [token, state.pendingEventRegistrations])

  useEffect(() => {
    if (!token) return
    if (state.pendingEventRegistrations.length === 0) return
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return
    const hasPendingWithoutError = state.pendingEventRegistrations.some((item) => !item.error)
    if (!hasPendingWithoutError) return
    void syncPendingRegistrations()
  }, [token, state.pendingEventRegistrations, syncPendingRegistrations])

  useEffect(() => {
    if (!token) return
    if (typeof window === 'undefined') return
    const handleOnline = () => {
      state.pendingEventRegistrations.forEach((item) => {
        if (item.error) {
          dispatch({ type: 'events/pending/add', payload: { ...item, error: undefined } })
        }
      })
      void syncPendingRegistrations()
    }
    window.addEventListener('online', handleOnline)
    return () => {
      window.removeEventListener('online', handleOnline)
    }
  }, [token, syncPendingRegistrations])

  const loadEventDetails = useCallback(
    async (eventId: string, options?: { force?: boolean }): Promise<EventDetails | undefined> => {
      if (!token) return state.eventDetails[eventId]
      const cached = state.eventDetails[eventId]
      if (cached && !options?.force) {
        return cached
      }
      try {
        const details = await eventsService.details(token, eventId)
        dispatch({ type: 'events/detail/cache', payload: details })
        return details
      } catch (error) {
        if (cached && isOfflineError(error)) {
          return cached
        }
        throw error
      }
    },
    [token, state.eventDetails],
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
      loadEventDetails,
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
      loadEventDetails,
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
