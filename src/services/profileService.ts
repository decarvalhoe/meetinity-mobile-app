import apiClient from './apiClient'
import type { ProfilePreferences, ProfileUpdatePayload, UserProfile } from '../features/profile/types'

const profileService = {
  async getProfile(): Promise<UserProfile> {
    return apiClient.get<UserProfile>('/profile')
  },
  async updateProfile(update: ProfileUpdatePayload): Promise<UserProfile> {
    return apiClient.put<UserProfile>('/profile', update)
  },
  async getPreferences(): Promise<ProfilePreferences> {
    return apiClient.get<ProfilePreferences>('/profile/preferences')
  },
}

export default profileService
