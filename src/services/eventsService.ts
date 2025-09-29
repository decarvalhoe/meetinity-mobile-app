import http from './http'
import type { EventDetails, EventListFilters, EventListResponse } from '../features/events/types'

const withToken = (token: string) => ({
  headers: {
    Authorization: `Bearer ${token}`,
  },
})

const eventsService = {
  async list(
    token: string,
    params: (EventListFilters & { page?: number; pageSize?: number }) | undefined = undefined,
  ): Promise<EventListResponse> {
    const response = await http.get<EventListResponse>('/events', {
      ...withToken(token),
      params,
    })
    return response.data
  },
  async details(token: string, eventId: string): Promise<EventDetails> {
    const response = await http.get<EventDetails>(`/events/${eventId}`, withToken(token))
    return response.data
  },
  async join(token: string, eventId: string): Promise<void> {
    await http.post(`/events/${eventId}/join`, undefined, withToken(token))
  },
  async leave(token: string, eventId: string): Promise<void> {
    await http.post(`/events/${eventId}/leave`, undefined, withToken(token))
  },
}

export default eventsService
