import type { UserProfile } from '../profile/types'

export interface MatchSuggestion {
  id: string
  compatibilityScore: number
  profile: UserProfile
  sharedInterests: string[]
  lastActiveAt?: string
}

export type SwipeDecision = 'like' | 'pass'

export type MatchRelationshipStatus = 'pending' | 'liked' | 'passed' | 'matched'

export interface MatchMetadata {
  /** Date ISO lorsque l'utilisateur a liké le profil. */
  likedAt?: string
  /** Date ISO lorsque l'utilisateur a passé le profil. */
  passedAt?: string
  /** Date ISO lorsque le match a été confirmé par l'autre personne. */
  matchedAt?: string
  /** Date ISO de la dernière synchronisation avec l'API. */
  syncedAt?: string
  /** Origine de la dernière mise à jour (local/offline/realtime). */
  source?: 'initial' | 'local' | 'realtime' | 'replay'
}

export interface MatchFeedItem extends MatchSuggestion {
  status: MatchRelationshipStatus
  metadata: MatchMetadata
}

export interface MatchFeedMeta {
  nextCursor?: string | null
  fetchedAt: string
}

export interface MatchFeedResponse {
  items: MatchFeedItem[]
  meta: MatchFeedMeta
}

export interface MatchStatusSnapshot {
  liked: string[]
  passed: string[]
  matched: string[]
  pending: string[]
  updatedAt: string
}

export interface PendingSwipeAction {
  id: string
  decision: SwipeDecision
  clientTimestamp: string
  retries?: number
  error?: string
}

export interface SyncLikesPayload {
  likes: PendingSwipeAction[]
}

export interface SyncLikesResult {
  processed: string[]
  failed: PendingSwipeAction[]
  feed?: MatchFeedResponse
  status?: MatchStatusSnapshot
}

export interface DiscoveryFilters {
  industries: string[]
  interests: string[]
  radiusKm: number
  availability?: string
}
