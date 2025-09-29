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
import type {
  Attachment,
  Conversation,
  Message,
  PresenceUpdate,
  QueuedMessage,
} from '../features/messaging/types'
import profileService from '../services/profileService'
import matchingService from '../services/matchingService'
import eventsService from '../services/eventsService'
import messagingService from '../services/messagingService'
import {
  createRealtimeMessaging,
  type MessagingSessionSnapshot,
  type RealtimeMessaging,
} from '../services/realtimeMessaging'
import { appCache, type CachePolicy } from '../lib/cache'

const STORAGE_KEY = 'meetinity-app-store'
const PROFILE_CACHE_KEY = 'profile'
const MATCHES_CACHE_KEY = 'matches'
const MATCH_META_CACHE_KEY = 'matches:meta'
const EVENTS_CACHE_KEY = 'events:list'
const EVENT_DETAILS_CACHE_KEY = 'events:details'
const CONVERSATIONS_CACHE_KEY = 'conversations'
const MESSAGES_CACHE_KEY = 'messages'

const PROFILE_CACHE_POLICY: CachePolicy = { maxAge: 5 * 60 * 1000, staleWhileRevalidate: 15 * 60 * 1000 }
const MATCHES_CACHE_POLICY: CachePolicy = { maxAge: 90 * 1000, staleWhileRevalidate: 5 * 60 * 1000 }
const MATCH_META_CACHE_POLICY: CachePolicy = { maxAge: 90 * 1000, staleWhileRevalidate: 5 * 60 * 1000 }
const EVENTS_CACHE_POLICY: CachePolicy = { maxAge: 2 * 60 * 1000, staleWhileRevalidate: 15 * 60 * 1000 }
const EVENT_DETAIL_CACHE_POLICY: CachePolicy = { maxAge: 10 * 60 * 1000, staleWhileRevalidate: 30 * 60 * 1000 }
const CONVERSATIONS_CACHE_POLICY: CachePolicy = { maxAge: 60 * 1000, staleWhileRevalidate: 5 * 60 * 1000 }
const MESSAGES_CACHE_POLICY: CachePolicy = { maxAge: 30 * 1000, staleWhileRevalidate: 5 * 60 * 1000 }

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

interface PresenceStateEntry {
  status: PresenceUpdate['status']
  lastSeenAt: string
  conversationId?: string
}

interface MessagingRealtimeState {
  status: MessagingSessionSnapshot['status']
  sessionId: string | null
  since: string | null
  presence: Record<string, PresenceStateEntry>
}

type PendingMessageState = QueuedMessage

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
  pendingMessages: PendingMessageState[]
  messagingRealtime: MessagingRealtimeState
  matchFeedMeta: MatchFeedMeta | null
  pendingMatchActions: PendingSwipeAction[]
  matchNotifications: MatchFeedItem[]
  messageNotifications: Message[]
  eventDetails: Record<string, EventDetails | undefined>
  pendingEventRegistrations: PendingEventRegistration[]
  notificationPermission: NotificationPermissionState
}

export type NotificationPermissionState = NotificationPermission | 'unsupported'

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
  pendingMessages: [],
  messagingRealtime: { status: 'disconnected', sessionId: null, since: null, presence: {} },
  matchFeedMeta: null,
  pendingMatchActions: [],
  matchNotifications: [],
  messageNotifications: [],
  eventDetails: {},
  pendingEventRegistrations: [],
  notificationPermission:
    typeof window !== 'undefined' && 'Notification' in window
      ? Notification.permission
      : 'unsupported',
})

type AppAction =
  | { type: 'profile/loading' }
  | { type: 'profile/success'; payload: UserProfile }
  | { type: 'profile/optimistic'; payload: UserProfile }
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
  | { type: 'messages/notification/add'; payload: Message }
  | { type: 'messages/notification/remove'; payload: string }
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
  | { type: 'conversations/unread'; payload: { conversationId: string; unreadCount: number } }
  | { type: 'messages/append'; payload: Message }
  | { type: 'messages/hydrate'; payload: { conversationId: string; messages: Message[] } }
  | { type: 'messages/replace'; payload: { conversationId: string; clientGeneratedId: string; message: Message } }
  | { type: 'messages/receipt'; payload: { conversationId: string; messageId: string; status: Message['status'] } }
  | { type: 'messages/queue/add'; payload: PendingMessageState }
  | { type: 'messages/queue/update'; payload: { id: string; patch: Partial<PendingMessageState> } }
  | { type: 'messages/queue/remove'; payload: string }
  | { type: 'messages/read'; payload: { conversationId: string } }
  | { type: 'activeConversation/set'; payload: string | null }
  | { type: 'presence/update'; payload: PresenceUpdate }
  | { type: 'realtime/session'; payload: MessagingSessionSnapshot }
  | { type: 'notification/permission'; payload: NotificationPermissionState }

const reducer = (state: AppState, action: AppAction): AppState => {
  switch (action.type) {
    case 'profile/loading':
      return { ...state, profile: { ...state.profile, status: 'loading', error: undefined } }
    case 'profile/success':
      return { ...state, profile: { status: 'success', data: action.payload } }
    case 'profile/optimistic':
      return { ...state, profile: { status: 'loading', data: action.payload } }
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
    case 'messages/notification/add': {
      const exists = state.messageNotifications.some((message) => message.id === action.payload.id)
      if (exists) return state
      return { ...state, messageNotifications: [...state.messageNotifications, action.payload] }
    }
    case 'messages/notification/remove':
      return {
        ...state,
        messageNotifications: state.messageNotifications.filter((message) => message.id !== action.payload),
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
      return { ...state, conversations: { status: 'success', data: sortConversationsByUpdate(action.payload) } }
    case 'conversations/error':
      return { ...state, conversations: { ...state.conversations, status: 'error', error: action.error } }
    case 'conversations/unread':
      if (state.conversations.status !== 'success') return state
      return {
        ...state,
        conversations: {
          ...state.conversations,
          data: state.conversations.data.map((conversation) =>
            conversation.id === action.payload.conversationId
              ? { ...conversation, unreadCount: action.payload.unreadCount }
              : conversation,
          ),
        },
      }
    case 'messages/append': {
      const message = action.payload
      const existing = state.messages[message.conversationId] ?? []
      const messages = upsertMessage(existing, message)
      const latest = messages[messages.length - 1]
      const pendingMessages = message.clientGeneratedId
        ? state.pendingMessages.filter((item) => item.clientGeneratedId !== message.clientGeneratedId)
        : state.pendingMessages
      const conversations =
        state.conversations.status === 'success'
          ? sortConversationsByUpdate(
              state.conversations.data.map((conversation) => {
                if (conversation.id !== message.conversationId) return conversation
                const isOwnMessage = message.senderId === state.profile.data?.id
                const currentLast = conversation.lastMessage
                const shouldUpdate =
                  !currentLast || new Date(latest.createdAt).getTime() >= new Date(currentLast.createdAt).getTime()
                return shouldUpdate
                  ? updateConversationPreview(
                      conversation,
                      latest,
                      Boolean(isOwnMessage),
                      state.activeConversationId === message.conversationId,
                    )
                  : conversation
              }),
            )
          : state.conversations.data
      return {
        ...state,
        messages: {
          ...state.messages,
          [message.conversationId]: messages,
        },
        conversations: state.conversations.status === 'success'
          ? { status: 'success', data: conversations }
          : state.conversations,
        pendingMessages,
      }
    }
    case 'messages/hydrate':
      if (action.payload.messages.length === 0) {
        return {
          ...state,
          messages: { ...state.messages, [action.payload.conversationId]: [] },
        }
      }
      if (state.conversations.status === 'success') {
        const lastMessage = action.payload.messages[action.payload.messages.length - 1]
        const conversations = sortConversationsByUpdate(
          state.conversations.data.map((conversation) => {
            if (conversation.id !== action.payload.conversationId) return conversation
            return updateConversationPreview(
              conversation,
              lastMessage,
              lastMessage.senderId === state.profile.data?.id,
              state.activeConversationId === action.payload.conversationId,
            )
          }),
        )
        return {
          ...state,
          conversations: { status: 'success', data: conversations },
          messages: {
            ...state.messages,
            [action.payload.conversationId]: sortMessages(action.payload.messages),
          },
        }
      }
      return {
        ...state,
        messages: {
          ...state.messages,
          [action.payload.conversationId]: sortMessages(action.payload.messages),
        },
      }
    case 'messages/replace': {
      const existing = state.messages[action.payload.conversationId] ?? []
      const replaced = upsertMessage(existing, action.payload.message)
      const conversations =
        state.conversations.status === 'success'
          ? sortConversationsByUpdate(
              state.conversations.data.map((conversation) => {
                if (conversation.id !== action.payload.conversationId) return conversation
                return updateConversationPreview(
                  conversation,
                  replaced[replaced.length - 1],
                  action.payload.message.senderId === state.profile.data?.id,
                  state.activeConversationId === action.payload.conversationId,
                )
              }),
            )
          : state.conversations.data
      return {
        ...state,
        pendingMessages: state.pendingMessages.filter((item) => item.clientGeneratedId !== action.payload.clientGeneratedId),
        messages: {
          ...state.messages,
          [action.payload.conversationId]: replaced,
        },
        conversations: state.conversations.status === 'success'
          ? { status: 'success', data: conversations }
          : state.conversations,
      }
    }
    case 'messages/receipt': {
      const existing = state.messages[action.payload.conversationId] ?? []
      const messages = existing.map((message) =>
        message.id === action.payload.messageId ? { ...message, status: action.payload.status } : message,
      )
      return {
        ...state,
        messages: {
          ...state.messages,
          [action.payload.conversationId]: messages,
        },
      }
    }
    case 'messages/queue/add': {
      const existingIndex = state.pendingMessages.findIndex((item) => item.id === action.payload.id)
      if (existingIndex !== -1) {
        const pending = [...state.pendingMessages]
        pending[existingIndex] = { ...pending[existingIndex], ...action.payload }
        return { ...state, pendingMessages: pending }
      }
      return { ...state, pendingMessages: [...state.pendingMessages, action.payload] }
    }
    case 'messages/queue/update':
      return {
        ...state,
        pendingMessages: state.pendingMessages.map((item) =>
          item.id === action.payload.id ? { ...item, ...action.payload.patch } : item,
        ),
      }
    case 'messages/queue/remove':
      return {
        ...state,
        pendingMessages: state.pendingMessages.filter((item) => item.id !== action.payload),
      }
    case 'messages/read': {
      const existing = state.messages[action.payload.conversationId] ?? []
      const messages = existing.map((message) =>
        message.senderId === state.profile.data?.id ? message : { ...message, status: 'read' },
      )
      return {
        ...state,
        messages: {
          ...state.messages,
          [action.payload.conversationId]: messages,
        },
      }
    }
    case 'activeConversation/set':
      return { ...state, activeConversationId: action.payload }
    case 'presence/update': {
      const presence: PresenceStateEntry = {
        status: action.payload.status,
        lastSeenAt: action.payload.at,
        conversationId: action.payload.conversationId,
      }
      return {
        ...state,
        messagingRealtime: {
          ...state.messagingRealtime,
          presence: {
            ...state.messagingRealtime.presence,
            [action.payload.participantId]: presence,
          },
        },
      }
    }
    case 'realtime/session':
      return {
        ...state,
        messagingRealtime: {
          ...state.messagingRealtime,
          status: action.payload.status,
          sessionId: action.payload.id,
          since: action.payload.since,
        },
      }
    case 'notification/permission':
      return {
        ...state,
        notificationPermission: action.payload,
      }
    default:
      return state
  }
}

interface AppStoreValue {
  state: AppState
  refreshProfile: (options?: { force?: boolean }) => Promise<void>
  saveProfile: (update: ProfileUpdatePayload) => Promise<void>
  refreshMatches: (options?: { force?: boolean }) => Promise<void>
  acceptMatch: (matchId: string) => Promise<void>
  declineMatch: (matchId: string) => Promise<void>
  refreshEvents: (filters?: EventListFilters, page?: number) => Promise<void>
  toggleEventRegistration: (eventId: string, register: boolean) => Promise<void>
  loadEventDetails: (eventId: string, options?: { force?: boolean }) => Promise<EventDetails | undefined>
  refreshConversations: (options?: { force?: boolean }) => Promise<void>
  loadMessages: (conversationId: string, options?: { force?: boolean }) => Promise<void>
  sendMessage: (conversationId: string, content: string, attachments?: Attachment[]) => Promise<void>
  markConversationRead: (conversationId: string) => void
  retryMessage: (queuedMessageId: string) => void
  setTypingState: (conversationId: string, typing: boolean) => void
  setActiveConversation: (conversationId: string | null) => void
  acknowledgeMatchNotification: (matchId: string) => void
  acknowledgeMessageNotification: (messageId: string) => void
  requestNotificationPermission: () => Promise<NotificationPermissionState>
  ensureNotificationPermission: () => void
}

const AppStoreContext = createContext<AppStoreValue | undefined>(undefined)

const hydrateState = (): AppState => {
  const base = createInitialState()
  const cachedProfile = appCache.read<UserProfile>(PROFILE_CACHE_KEY)
  if (cachedProfile.value) {
    base.profile = { status: 'success', data: cachedProfile.value }
  }
  const cachedMatches = appCache.read<MatchFeedItem[]>(MATCHES_CACHE_KEY)
  if (cachedMatches.value) {
    base.matches = { status: 'success', data: cachedMatches.value }
  }
  const cachedMatchMeta = appCache.read<MatchFeedMeta | null>(MATCH_META_CACHE_KEY)
  if (cachedMatchMeta.value) {
    base.matchFeedMeta = cachedMatchMeta.value
  }
  const cachedEvents = appCache.read<EventListState>(EVENTS_CACHE_KEY)
  if (cachedEvents.value) {
    base.events = {
      status: 'success',
      data: {
        ...base.events.data,
        ...cachedEvents.value,
        filters: cachedEvents.value.filters ?? base.events.data.filters,
        items: cachedEvents.value.items ?? base.events.data.items,
      },
    }
  }
  const cachedEventDetails = appCache.read<Record<string, EventDetails | undefined>>(EVENT_DETAILS_CACHE_KEY)
  if (cachedEventDetails.value) {
    base.eventDetails = cachedEventDetails.value
  }
  const cachedConversations = appCache.read<Conversation[]>(CONVERSATIONS_CACHE_KEY)
  if (cachedConversations.value) {
    base.conversations = { status: 'success', data: cachedConversations.value }
  }
  const cachedMessages = appCache.read<Record<string, Message[]>>(MESSAGES_CACHE_KEY)
  if (cachedMessages.value) {
    base.messages = cachedMessages.value
  }

  base.messageNotifications = []

  if (typeof window === 'undefined') {
    return base
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return base
    const parsed = JSON.parse(raw) as Partial<AppState>
    const merged: AppState = {
      ...base,
      ...parsed,
      profile: parsed.profile ?? base.profile,
      matches: parsed.matches ?? base.matches,
      conversations: parsed.conversations ?? base.conversations,
      messages: parsed.messages ?? base.messages,
      activeConversationId: parsed.activeConversationId ?? base.activeConversationId,
      pendingMessages: parsed.pendingMessages ?? base.pendingMessages,
      messagingRealtime: parsed.messagingRealtime
        ? {
            status: parsed.messagingRealtime.status ?? base.messagingRealtime.status,
            sessionId: parsed.messagingRealtime.sessionId ?? base.messagingRealtime.sessionId,
            since: parsed.messagingRealtime.since ?? base.messagingRealtime.since,
            presence: parsed.messagingRealtime.presence ?? base.messagingRealtime.presence,
          }
        : base.messagingRealtime,
      matchFeedMeta: parsed.matchFeedMeta ?? base.matchFeedMeta,
      pendingMatchActions: parsed.pendingMatchActions ?? base.pendingMatchActions,
      matchNotifications: parsed.matchNotifications ?? base.matchNotifications,
      messageNotifications: parsed.messageNotifications ?? base.messageNotifications,
      eventDetails: parsed.eventDetails ?? base.eventDetails,
      pendingEventRegistrations: parsed.pendingEventRegistrations ?? base.pendingEventRegistrations,
      notificationPermission:
        'Notification' in window
          ? Notification.permission
          : parsed.notificationPermission ?? 'unsupported',
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
): MatchFeedItem[] =>
  items.map((item) => {
    const normalized = ensureMetadata(item, source, fallbackSyncedAt)
    return {
      ...normalized,
      profile: normalizeUserProfile(normalized.profile),
      sharedInterests: normalized.sharedInterests ?? [],
    }
  })

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
      profile: mergeUserProfile(item.profile, update.profile),
      sharedInterests: update.sharedInterests ?? item.sharedInterests ?? [],
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

const sortMessages = (messages: Message[]): Message[] =>
  [...messages].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())

const upsertMessage = (messages: Message[], incoming: Message): Message[] => {
  const index = messages.findIndex(
    (message) => message.id === incoming.id || (incoming.clientGeneratedId && message.clientGeneratedId === incoming.clientGeneratedId),
  )
  if (index === -1) {
    return sortMessages([...messages, incoming])
  }
  const updated = [...messages]
  updated[index] = { ...updated[index], ...incoming }
  return sortMessages(updated)
}

const sortConversationsByUpdate = (conversations: Conversation[]): Conversation[] =>
  [...conversations].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())

const updateConversationPreview = (
  conversation: Conversation,
  message: Message,
  isOwnMessage: boolean,
  isActive: boolean,
): Conversation => {
  const unreadIncrement = isOwnMessage || isActive ? 0 : 1
  return {
    ...conversation,
    lastMessage: message,
    updatedAt: message.createdAt,
    unreadCount: Math.max(0, conversation.unreadCount + unreadIncrement),
  }
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

const mergeProfileUpdate = (profile: UserProfile, update: ProfileUpdatePayload): UserProfile => {
  const { avatarUpload, preferences, interests, skills, experiences, links, avatarUrl, ...rest } = update
  const optimisticAvatar = avatarUrl ?? avatarUpload?.dataUrl ?? profile.avatarUrl
  const next: UserProfile = {
    ...profile,
    ...rest,
    avatarUrl: optimisticAvatar,
    interests: interests ?? profile.interests,
    skills: skills ?? profile.skills,
    experiences: experiences ?? profile.experiences,
    links: links ?? profile.links,
  }
  if (preferences) {
    next.preferences = {
      discoveryRadiusKm: preferences.discoveryRadiusKm ?? profile.preferences?.discoveryRadiusKm ?? 0,
      industries: preferences.industries ?? profile.preferences?.industries ?? [],
      interests: preferences.interests ?? profile.preferences?.interests ?? [],
      eventTypes: preferences.eventTypes ?? profile.preferences?.eventTypes ?? [],
    }
  }
  return next
}

const normalizeUserProfile = (profile: UserProfile): UserProfile => ({
  ...profile,
  interests: profile.interests ?? [],
  skills: profile.skills ?? [],
  links: profile.links ?? [],
})

const mergeUserProfile = (current: UserProfile, incoming: UserProfile): UserProfile => {
  const merged: UserProfile = {
    ...current,
    ...incoming,
  }
  if (incoming.skills === undefined) {
    merged.skills = current.skills
  }
  if (incoming.links === undefined) {
    merged.links = current.links
  }
  if (incoming.company === undefined) {
    merged.company = current.company
  }
  if (incoming.position === undefined) {
    merged.position = current.position
  }
  return normalizeUserProfile(merged)
}

const serializeFilters = (filters: EventListFilters): string => {
  const entries = Object.entries(filters)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .sort(([a], [b]) => a.localeCompare(b))
  return JSON.stringify(Object.fromEntries(entries))
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
  const { token, user } = useAuth()
  const [state, dispatch] = useReducer(reducer, undefined, hydrateState)
  const profileRef = useRef<UserProfile | null>(state.profile.data)
  const matchesRef = useRef<MatchFeedItem[]>(state.matches.data)

  const eventsStateRef = useRef<EventListState>(state.events.data)
  const conversationsRef = useRef<Conversation[]>(state.conversations.data)

  useEffect(() => {
    matchesRef.current = state.matches.data
  }, [state.matches.data])

  useEffect(() => {
    eventsStateRef.current = state.events.data
  }, [state.events.data])

  useEffect(() => {
    conversationsRef.current = state.conversations.data
  }, [state.conversations.data])

  useEffect(() => {
    if (!state.activeConversationId) return
    state.messageNotifications
      .filter((notification) => notification.conversationId === state.activeConversationId)
      .forEach((notification) => {
        dispatch({ type: 'messages/notification/remove', payload: notification.id })
      })
  }, [dispatch, state.activeConversationId, state.messageNotifications])

  const pendingMessagesRef = useRef<PendingMessageState[]>(state.pendingMessages)
  useEffect(() => {
    pendingMessagesRef.current = state.pendingMessages
  }, [state.pendingMessages])

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!('Notification' in window)) {
      if (state.notificationPermission !== 'unsupported') {
        dispatch({ type: 'notification/permission', payload: 'unsupported' })
      }
      return
    }
    const current = Notification.permission
    if (current !== state.notificationPermission) {
      dispatch({ type: 'notification/permission', payload: current })
    }
  }, [dispatch, state.notificationPermission])

  const realtimeMessagingRef = useRef<RealtimeMessaging | null>(null)
  const isProcessingQueueRef = useRef(false)
  const permissionPromptCleanupRef = useRef<(() => void) | null>(null)

  const clearScheduledPermissionRequest = useCallback(() => {
    const cleanup = permissionPromptCleanupRef.current
    if (cleanup) {
      permissionPromptCleanupRef.current = null
      cleanup()
    }
  }, [])

  const requestNotificationPermission = useCallback(async (): Promise<NotificationPermissionState> => {
    clearScheduledPermissionRequest()
    if (typeof window === 'undefined') {
      return 'unsupported'
    }
    if (!('Notification' in window)) {
      if (state.notificationPermission !== 'unsupported') {
        dispatch({ type: 'notification/permission', payload: 'unsupported' })
      }
      return 'unsupported'
    }
    try {
      const result = await Notification.requestPermission()
      dispatch({ type: 'notification/permission', payload: result })
      return result
    } catch (error) {
      if (import.meta.env.DEV) {
        console.warn('Notification permission request failed', error)
      }
      return state.notificationPermission
    }
  }, [clearScheduledPermissionRequest, dispatch, state.notificationPermission])

  const ensureNotificationPermission = useCallback(() => {
    if (state.notificationPermission === 'unsupported') return
    if (state.notificationPermission === 'denied' || state.notificationPermission === 'granted') return
    if (typeof window === 'undefined') return
    if (!('Notification' in window)) {
      if (state.notificationPermission !== 'unsupported') {
        dispatch({ type: 'notification/permission', payload: 'unsupported' })
      }
      return
    }
    if (permissionPromptCleanupRef.current) return

    const interactionEvents: Array<keyof WindowEventMap> = ['click', 'keydown', 'touchend']
    const handleInteraction = async () => {
      clearScheduledPermissionRequest()
      await requestNotificationPermission()
    }

    interactionEvents.forEach((event) =>
      window.addEventListener(event, handleInteraction, { once: true } as AddEventListenerOptions),
    )
    permissionPromptCleanupRef.current = () => {
      interactionEvents.forEach((event) => window.removeEventListener(event, handleInteraction))
    }
  }, [clearScheduledPermissionRequest, dispatch, requestNotificationPermission, state.notificationPermission])

  const triggerMatchNotifications = useCallback(
    (matches: MatchFeedItem[]) => {
      if (matches.length === 0) return
      dispatch({ type: 'matches/notify', payload: matches })
      if (typeof window === 'undefined') return
      if (!('Notification' in window)) return
      if (state.notificationPermission === 'default') {
        ensureNotificationPermission()
        return
      }
      if (state.notificationPermission !== 'granted') return
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
    [dispatch, ensureNotificationPermission, state.notificationPermission],
  )

  useEffect(() => () => clearScheduledPermissionRequest(), [clearScheduledPermissionRequest])

  useEffect(() => {
    if (state.profile.status === 'success' && state.profile.data) {
      appCache.write(PROFILE_CACHE_KEY, state.profile.data, PROFILE_CACHE_POLICY)
    }
  }, [state.profile])

  useEffect(() => {
    if (state.matches.data.length > 0 || state.matches.status === 'success') {
      appCache.write(MATCHES_CACHE_KEY, state.matches.data, MATCHES_CACHE_POLICY)
    }
  }, [state.matches.data, state.matches.status])

  useEffect(() => {
    if (state.matchFeedMeta) {
      appCache.write(MATCH_META_CACHE_KEY, state.matchFeedMeta, MATCH_META_CACHE_POLICY)
    } else {
      appCache.invalidate(MATCH_META_CACHE_KEY)
    }
  }, [state.matchFeedMeta])

  useEffect(() => {
    if (state.events.data.items.length > 0 || state.events.status === 'success') {
      appCache.write(EVENTS_CACHE_KEY, state.events.data, EVENTS_CACHE_POLICY)
    }
  }, [state.events.data, state.events.status])

  useEffect(() => {
    if (Object.keys(state.eventDetails).length > 0) {
      appCache.write(EVENT_DETAILS_CACHE_KEY, state.eventDetails, EVENT_DETAIL_CACHE_POLICY)
    }
  }, [state.eventDetails])

  useEffect(() => {
    if (state.conversations.data.length > 0 || state.conversations.status === 'success') {
      appCache.write(CONVERSATIONS_CACHE_KEY, state.conversations.data, CONVERSATIONS_CACHE_POLICY)
    }
  }, [state.conversations.data, state.conversations.status])

  useEffect(() => {
    if (Object.keys(state.messages).length > 0) {
      appCache.write(MESSAGES_CACHE_KEY, state.messages, MESSAGES_CACHE_POLICY)
    }
  }, [state.messages])

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

  const processMessageQueue = useCallback(async () => {
    if (!token) return
    if (isProcessingQueueRef.current) return
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return
    const pending = pendingMessagesRef.current.filter((item) => item.status !== 'failed')
    if (pending.length === 0) return
    isProcessingQueueRef.current = true
    try {
      for (const item of pending) {
        dispatch({
          type: 'messages/queue/update',
          payload: { id: item.id, patch: { status: 'sending', attempts: item.attempts + 1, error: undefined } },
        })
        try {
          const delivered = await messagingService.sendMessage(
            item.conversationId,
            item.content,
            item.attachments,
          )
          const resolved: Message = {
            ...delivered,
            clientGeneratedId: item.clientGeneratedId,
            attachments: delivered.attachments ?? item.attachments.map((attachment) => ({
              ...attachment,
              temporary: false,
            })),
          }
          dispatch({
            type: 'messages/replace',
            payload: {
              conversationId: item.conversationId,
              clientGeneratedId: item.clientGeneratedId,
              message: resolved,
            },
          })
          dispatch({ type: 'messages/queue/remove', payload: item.id })
        } catch (error) {
          if (isOfflineError(error)) {
            dispatch({ type: 'messages/queue/update', payload: { id: item.id, patch: { status: 'queued' } } })
            break
          }
          dispatch({
            type: 'messages/queue/update',
            payload: {
              id: item.id,
              patch: { status: 'failed', error: (error as Error).message },
            },
          })
        }
      }
    } finally {
      isProcessingQueueRef.current = false
    }
  }, [token])

  const refreshProfile = useCallback(
    async (options?: { force?: boolean }) => {
      if (!token) return
      const cached = appCache.read<UserProfile>(PROFILE_CACHE_KEY)
      if (!options?.force && cached.value && !cached.shouldRevalidate) {
        if (state.profile.status === 'idle') {
          dispatch({ type: 'profile/success', payload: cached.value })
        }
        return
      }
      if (!cached.value || options?.force) {
        dispatch({ type: 'profile/loading' })
      } else {
        dispatch({ type: 'profile/success', payload: cached.value })
        profileRef.current = cached.value
      }
      try {
        const profile = await profileService.getProfile()
        dispatch({ type: 'profile/success', payload: profile })
        profileRef.current = profile
        appCache.write(PROFILE_CACHE_KEY, profile, PROFILE_CACHE_POLICY)
      } catch (error) {
        if (!cached.value) {
          dispatch({ type: 'profile/error', error: (error as Error).message })
        } else if (import.meta.env.DEV) {
          console.warn('Failed to refresh profile, serving cached data', error)
        }
      }
    },
    [token, state.profile.status, dispatch],
  )

  const saveProfile = useCallback(
    async (update: ProfileUpdatePayload) => {
      if (!token) return
      const previous = profileRef.current ?? state.profile.data
      if (previous) {
        const optimistic = mergeProfileUpdate(previous, update)
        dispatch({ type: 'profile/optimistic', payload: optimistic })
        profileRef.current = optimistic
        appCache.write(PROFILE_CACHE_KEY, optimistic, PROFILE_CACHE_POLICY)
      } else {
        dispatch({ type: 'profile/loading' })
      }
      try {
        const profile = previous
          ? await profileService.updateProfile(update)
          : await profileService.createProfile(update)
        dispatch({ type: 'profile/success', payload: profile })
        profileRef.current = profile
        appCache.write(PROFILE_CACHE_KEY, profile, PROFILE_CACHE_POLICY)
      } catch (error) {
        if (previous) {
          dispatch({ type: 'profile/success', payload: previous })
          profileRef.current = previous
          appCache.write(PROFILE_CACHE_KEY, previous, PROFILE_CACHE_POLICY)
        } else {
          dispatch({ type: 'profile/error', error: (error as Error).message })
        }
        throw error
      }
    },
    [token, state.profile.data],
  )

  const refreshMatches = useCallback(
    async (options?: { force?: boolean }) => {
      if (!token) return
      const cachedMatches = appCache.read<MatchFeedItem[]>(MATCHES_CACHE_KEY)
      const cachedMeta = appCache.read<MatchFeedMeta | null>(MATCH_META_CACHE_KEY)
      if (!options?.force && cachedMatches.value && !cachedMatches.shouldRevalidate) {
        if (state.matches.status === 'idle') {
          commitMatches(cachedMatches.value, { meta: cachedMeta.value ?? null, source: 'cache' })
        }
        return
      }
      if (!cachedMatches.value || options?.force) {
        dispatch({ type: 'matches/loading' })
      } else {
        commitMatches(cachedMatches.value, { meta: cachedMeta.value ?? null, source: 'cache' })
      }
      try {
        const [feed, status] = await Promise.all([
          matchingService.getFeed(),
          matchingService.getStatus().catch(() => undefined),
        ])
        commitMatches(feed.items, { meta: feed.meta, status, source: 'initial' })
      } catch (error) {
        if (!cachedMatches.value) {
          dispatch({ type: 'matches/error', error: (error as Error).message })
        } else if (import.meta.env.DEV) {
          console.warn('Failed to refresh matches feed, using cached data', error)
        }
      }
    },
    [token, commitMatches, state.matches.status],
  )

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
        const result = await matchingService.syncLikes({ likes: [pendingAction] })
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
      const result = await matchingService.syncLikes({ likes: state.pendingMatchActions })
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
      const sanitizedFilters = Object.fromEntries(
        Object.entries(filters).filter(([, value]) => value !== undefined && value !== ''),
      ) as EventListFilters
      const filterSignature = serializeFilters(sanitizedFilters)
      const cachedEvents = appCache.read<EventListState>(EVENTS_CACHE_KEY)
      const cachedSignature = cachedEvents.value ? serializeFilters(cachedEvents.value.filters ?? {}) : null
      const canUseCache =
        page === 1 && cachedEvents.value && cachedSignature === filterSignature && !cachedEvents.shouldRevalidate
      if (!canUseCache) {
        dispatch({ type: 'events/loading', payload: { append: page > 1 } })
      } else if (state.events.status === 'idle') {
        dispatch({
          type: 'events/success',
          payload: {
            ...cachedEvents.value,
            filters: cachedEvents.value.filters ?? sanitizedFilters,
          },
        })
        if (!cachedEvents.shouldRevalidate) {
          return
        }
      }
      try {
        const response = await eventsService.list({ ...sanitizedFilters, page })
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
        if (!cachedEvents.value) {
          dispatch({ type: 'events/error', error: (error as Error).message })
        } else if (import.meta.env.DEV) {
          console.warn('Failed to refresh events, serving cached list', error)
        }
      }
    },
    [token, state.events.status],
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
          await eventsService.join(eventId)
        } else {
          await eventsService.leave(eventId)
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
          await eventsService.join(action.eventId)
        } else {
          await eventsService.leave(action.eventId)
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
    if (state.pendingMessages.length === 0) return
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return
    void processMessageQueue()
  }, [token, state.pendingMessages, processMessageQueue])

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
      void processMessageQueue()
    }
    window.addEventListener('online', handleOnline)
    return () => {
      window.removeEventListener('online', handleOnline)
    }
  }, [token, syncPendingRegistrations, processMessageQueue, state.pendingEventRegistrations])

  const loadEventDetails = useCallback(
    async (eventId: string, options?: { force?: boolean }): Promise<EventDetails | undefined> => {
      if (!token) return state.eventDetails[eventId]
      const cached = state.eventDetails[eventId]
      if (cached && !options?.force) {
        return cached
      }
      try {
        const details = await eventsService.details(eventId)
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

  const refreshConversations = useCallback(
    async (options?: { force?: boolean }) => {
      if (!token) return
      const cached = appCache.read<Conversation[]>(CONVERSATIONS_CACHE_KEY)
      if (!options?.force && cached.value && !cached.shouldRevalidate) {
        if (state.conversations.status === 'idle') {
          dispatch({ type: 'conversations/success', payload: cached.value })
        }
        return
      }
      if (!cached.value || options?.force) {
        dispatch({ type: 'conversations/loading' })
      } else {
        dispatch({ type: 'conversations/success', payload: cached.value })
      }
      try {
        const conversations = await messagingService.listConversations()
        dispatch({ type: 'conversations/success', payload: conversations })
      } catch (error) {
        if (isOfflineError(error) && cached.value) {
          dispatch({ type: 'conversations/success', payload: cached.value })
          return
        }
        dispatch({ type: 'conversations/error', error: (error as Error).message })
      }
    },
    [token, state.conversations.status],
  )

  const loadMessages = useCallback(
    async (conversationId: string, options?: { force?: boolean }) => {
      if (!token) return
      if (!options?.force) {
        const cached = state.messages[conversationId]
        if (cached && cached.length > 0) {
          return
        }
      }
      try {
        const messages = await messagingService.listMessages(conversationId)
        dispatch({ type: 'messages/hydrate', payload: { conversationId, messages } })
      } catch (error) {
        if (isOfflineError(error)) {
          const cached = state.messages[conversationId]
          if (cached) {
            dispatch({ type: 'messages/hydrate', payload: { conversationId, messages: cached } })
          }
          return
        }
        throw error
      }
    },
    [token, state.messages],
  )

  const sendMessage = useCallback(
    async (conversationId: string, content: string, attachments?: Attachment[]) => {
      if (!token) return
      const trimmed = content.trim()
      if (!trimmed && (!attachments || attachments.length === 0)) {
        return
      }
      const timestamp = new Date().toISOString()
      const clientGeneratedId =
        typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `local-${Date.now()}`
      const sanitizedAttachments = (attachments ?? []).map((attachment) => ({
        id: attachment.id,
        name: attachment.name,
        size: attachment.size,
        mimeType: attachment.mimeType,
        url: attachment.url,
        previewUrl: attachment.previewUrl,
        temporary: attachment.temporary ?? true,
      }))
      const optimistic: Message = {
        id: clientGeneratedId,
        conversationId,
        senderId: user?.id ?? 'self',
        content: trimmed,
        createdAt: timestamp,
        status: 'sent',
        attachments: sanitizedAttachments,
        clientGeneratedId,
      }
      dispatch({ type: 'messages/append', payload: optimistic })
      const pending: PendingMessageState = {
        id: clientGeneratedId,
        conversationId,
        clientGeneratedId,
        content: trimmed,
        attachments: sanitizedAttachments,
        createdAt: timestamp,
        attempts: 0,
        status: 'queued',
      }
      dispatch({ type: 'messages/queue/add', payload: pending })
      pendingMessagesRef.current = [...pendingMessagesRef.current, pending]
      realtimeMessagingRef.current?.announcePresence('online', conversationId)
      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        return
      }
      await processMessageQueue()
    },
    [token, user?.id, processMessageQueue],
  )

  const markConversationRead = useCallback(
    (conversationId: string) => {
      dispatch({ type: 'conversations/unread', payload: { conversationId, unreadCount: 0 } })
      dispatch({ type: 'messages/read', payload: { conversationId } })
      realtimeMessagingRef.current?.markConversationRead(conversationId)
      if (!token) return
      void messagingService.markConversationRead(conversationId).catch((error) => {
        if (!isOfflineError(error)) {
          console.warn('Unable to mark conversation as read', error)
        }
      })
    },
    [token],
  )

  const retryMessage = useCallback(
    (queuedMessageId: string) => {
      dispatch({ type: 'messages/queue/update', payload: { id: queuedMessageId, patch: { status: 'queued', error: undefined } } })
      void processMessageQueue()
    },
    [processMessageQueue],
  )

  const setTypingState = useCallback((conversationId: string, typing: boolean) => {
    realtimeMessagingRef.current?.announcePresence(typing ? 'typing' : 'online', conversationId)
  }, [])

  const notifyIncomingMessage = useCallback(
    (message: Message) => {
      if (message.senderId === user?.id) return
      const isActiveConversation = state.activeConversationId === message.conversationId

      if (!isActiveConversation && state.notificationPermission !== 'granted') {
        dispatch({ type: 'messages/notification/add', payload: message })
      }

      if (typeof window === 'undefined') return
      if (!('Notification' in window)) return

      if (state.notificationPermission === 'default') {
        ensureNotificationPermission()
        return
      }

      if (state.notificationPermission !== 'granted') return

      const conversation = conversationsRef.current.find((item) => item.id === message.conversationId)
      const sender = conversation?.participants.find((participant) => participant.id === message.senderId)
      try {
        new Notification(sender?.fullName ?? 'Nouveau message', {
          body: message.content,
          tag: `conversation-${message.conversationId}`,
        })
      } catch (error) {
        if (import.meta.env.DEV) {
          console.warn('Unable to display message notification', error)
        }
      }
    },
    [
      ensureNotificationPermission,
      dispatch,
      state.activeConversationId,
      state.notificationPermission,
      user?.id,
    ],
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
    const realtime = createRealtimeMessaging({
      token,
      userId: user?.id ?? undefined,
      onMessage: (message) => {
        dispatch({ type: 'messages/append', payload: message })
        notifyIncomingMessage(message)
      },
      onMatches: (matches) => {
        commitMatches(matches, { source: 'realtime', merge: true })
      },
      onPresence: (presence) => {
        dispatch({ type: 'presence/update', payload: presence })
      },
      onSession: (snapshot) => {
        dispatch({ type: 'realtime/session', payload: snapshot })
      },
    })
    realtimeMessagingRef.current = realtime
    realtime.start()
    return () => {
      realtime.stop()
      realtimeMessagingRef.current = null
    }
  }, [token, user?.id, commitMatches, notifyIncomingMessage])

  useEffect(() => {
    if (!state.activeConversationId) return
    realtimeMessagingRef.current?.announcePresence('online', state.activeConversationId)
  }, [state.activeConversationId])

  const setActiveConversation = useCallback((conversationId: string | null) => {
    dispatch({ type: 'activeConversation/set', payload: conversationId })
  }, [])

  const acknowledgeMatchNotification = useCallback((matchId: string) => {
    dispatch({ type: 'matches/notification/ack', payload: matchId })
  }, [])

  const acknowledgeMessageNotification = useCallback((messageId: string) => {
    dispatch({ type: 'messages/notification/remove', payload: messageId })
  }, [])

  useEffect(() => {
    profileRef.current = state.profile.data
  }, [state.profile.data])

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
      markConversationRead,
      retryMessage,
      setTypingState,
      setActiveConversation,
      acknowledgeMatchNotification,
      acknowledgeMessageNotification,
      requestNotificationPermission,
      ensureNotificationPermission,
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
      markConversationRead,
      retryMessage,
      setTypingState,
      setActiveConversation,
      acknowledgeMatchNotification,
      acknowledgeMessageNotification,
      requestNotificationPermission,
      ensureNotificationPermission,
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

export type { AppState, AppStoreValue, NotificationPermissionState }
