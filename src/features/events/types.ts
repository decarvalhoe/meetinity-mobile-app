export interface EventCategory {
  id: string
  name: string
  color?: string
}

export type EventSortOption = 'upcoming' | 'recent' | 'popular'

export interface EventOrganizer {
  id: string
  name: string
  avatarUrl?: string
  bio?: string
}

export interface EventParticipant {
  id: string
  name: string
  avatarUrl?: string
}

export interface EventSummary {
  id: string
  title: string
  description: string
  startAt: string
  endAt: string
  location: string
  capacity: number
  attendingCount: number
  category?: EventCategory
  isRegistered?: boolean
}

export interface EventDetails extends EventSummary {
  agenda?: string
  speakers?: string[]
  organizer: EventOrganizer
  participants: EventParticipant[]
  contactEmail?: string
}

export interface EventListFilters {
  categoryId?: string
  startDate?: string
  endDate?: string
  location?: string
  search?: string
  sort?: EventSortOption
}

export interface EventListResponse {
  items: EventSummary[]
  page: number
  pageSize: number
  total: number
  hasMore: boolean
  filters?: EventListFilters
}
