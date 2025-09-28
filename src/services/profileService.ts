import http from './http'
import type { ProfilePreferences, ProfileUpdatePayload, UserProfile } from '../features/profile/types'

const withToken = (token: string) => ({
  headers: {
    Authorization: `Bearer ${token}`,
  },
})

const profileService = {
  async getProfile(token: string): Promise<UserProfile> {
    const response = await http.get<UserProfile>('/profile', withToken(token))
    return response.data
  },
  async updateProfile(token: string, update: ProfileUpdatePayload): Promise<UserProfile> {
    const response = await http.put<UserProfile>('/profile', update, withToken(token))
    return response.data
  },
  async getPreferences(token: string): Promise<ProfilePreferences> {
    const response = await http.get<ProfilePreferences>('/profile/preferences', withToken(token))
    return response.data
  },
}

export default profileService
