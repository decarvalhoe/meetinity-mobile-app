import type { UserProfile } from '../profile/types'

export interface MatchSuggestion {
  id: string
  compatibilityScore: number
  profile: UserProfile
  sharedInterests: string[]
  lastActiveAt?: string
}

export interface DiscoveryFilters {
  industries: string[]
  interests: string[]
  radiusKm: number
  availability?: string
}
