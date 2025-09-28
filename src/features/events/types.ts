export interface EventCategory {
  id: string
  name: string
  color?: string
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
}

export interface EventDetails extends EventSummary {
  agenda?: string
  speakers?: string[]
  isRegistered: boolean
}
