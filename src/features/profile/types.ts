export interface UserProfile {
  id: string
  fullName: string
  headline: string
  avatarUrl?: string
  bio?: string
  interests: string[]
  location?: string
  availability?: string
}

export interface ProfilePreferences {
  discoveryRadiusKm: number
  industries: string[]
  interests: string[]
  eventTypes: string[]
}

export interface ProfileUpdatePayload {
  fullName?: string
  headline?: string
  bio?: string
  interests?: string[]
  location?: string
  availability?: string
}
