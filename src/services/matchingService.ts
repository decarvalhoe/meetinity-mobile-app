import http from './http'
import type { MatchSuggestion } from '../features/discovery/types'

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
  async accept(token: string, matchId: string): Promise<void> {
    await http.post(`/matches/${matchId}/accept`, undefined, withToken(token))
  },
  async decline(token: string, matchId: string): Promise<void> {
    await http.post(`/matches/${matchId}/decline`, undefined, withToken(token))
  },
}

export default matchingService
