import apiClient from './apiClient'
import type {
  MatchFeedResponse,
  MatchStatusSnapshot,
  MatchSuggestion,
  SyncLikesPayload,
  SyncLikesResult,
} from '../features/discovery/types'

const matchingService = {
  async getSuggestions(): Promise<MatchSuggestion[]> {
    return apiClient.get<MatchSuggestion[]>('/matches')
  },
  async getFeed(options?: { cursor?: string }): Promise<MatchFeedResponse> {
    return apiClient.get<MatchFeedResponse>('/matches/feed', {
      params: options?.cursor ? { cursor: options.cursor } : undefined,
    })
  },
  async getStatus(): Promise<MatchStatusSnapshot> {
    return apiClient.get<MatchStatusSnapshot>('/matches/status')
  },
  async accept(matchId: string): Promise<void> {
    await apiClient.post(`/matches/${matchId}/accept`)
  },
  async decline(matchId: string): Promise<void> {
    await apiClient.post(`/matches/${matchId}/decline`)
  },
  async syncLikes(payload: SyncLikesPayload): Promise<SyncLikesResult> {
    const response = await apiClient.post<SyncLikesResult>('/matches/likes/sync', payload)
    return {
      processed: response.processed ?? [],
      failed: response.failed ?? [],
      feed: response.feed,
      status: response.status,
    }
  },
}

export default matchingService
