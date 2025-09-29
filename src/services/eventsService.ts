import apiClient from './apiClient'
import type { EventDetails, EventListFilters, EventListResponse, EventSummary } from '../features/events/types'

const eventsService = {
  async list(
    params: (EventListFilters & { page?: number; pageSize?: number }) | undefined = undefined,
  ): Promise<EventListResponse> {
    return apiClient.get<EventListResponse>('/events', { params })
  },
  async details(eventId: string): Promise<EventDetails> {
    return apiClient.get<EventDetails>(`/events/${eventId}`)
  },
  async join(eventId: string): Promise<void> {
    await apiClient.post(`/events/${eventId}/join`)
  },
  async leave(eventId: string): Promise<void> {
    await apiClient.post(`/events/${eventId}/leave`)
  },
}

export default eventsService
