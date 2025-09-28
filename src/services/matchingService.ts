import http from './http'
import type {
  MatchFeedResponse,
  MatchStatusSnapshot,
  MatchSuggestion,
  SyncLikesPayload,
  SyncLikesResult,
} from '../features/discovery/types'

const withToken = (token: string) => ({
  headers: {
    Authorization: `Bearer ${token}`,
  },
})

const matchingService = {
  async getSuggestions(token: string): Promise<MatchSuggestion[]> {
    const response = await http.get<MatchSuggestion[]>('/matches', withToken(token))
    return response.data
  },
  async getFeed(token: string, options?: { cursor?: string }): Promise<MatchFeedResponse> {
    const response = await http.get<MatchFeedResponse>('/matches/feed', {
      ...withToken(token),
      params: options?.cursor ? { cursor: options.cursor } : undefined,
    })
    return response.data
  },
  async getStatus(token: string): Promise<MatchStatusSnapshot> {
    const response = await http.get<MatchStatusSnapshot>('/matches/status', withToken(token))
    return response.data
  },
  async accept(token: string, matchId: string): Promise<void> {
    await http.post(`/matches/${matchId}/accept`, undefined, withToken(token))
  },
  async decline(token: string, matchId: string): Promise<void> {
    await http.post(`/matches/${matchId}/decline`, undefined, withToken(token))
  },
  async syncLikes(token: string, payload: SyncLikesPayload): Promise<SyncLikesResult> {
    const response = await http.post<SyncLikesResult>('/matches/likes/sync', payload, withToken(token))
    return {
      processed: response.data.processed ?? [],
      failed: response.data.failed ?? [],
      feed: response.data.feed,
      status: response.data.status,
    }
  },
}

export default matchingService
