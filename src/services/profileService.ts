import apiClient from './apiClient'
import type { ProfilePreferences, ProfileUpdatePayload, UserProfile } from '../features/profile/types'
import photoUpload from '../features/profile/services/photoUpload'

const profileService = {
  async getProfile(): Promise<UserProfile> {
    return apiClient.get<UserProfile>('/profile')
  },
  async updateProfile(update: ProfileUpdatePayload): Promise<UserProfile> {
    const { avatarUpload, ...payload } = update
    let resolvedAvatarUrl = update.avatarUrl
    if (avatarUpload) {
      const { url } = await photoUpload.upload()
      resolvedAvatarUrl = url
    }
    const body = { ...payload }
    if (resolvedAvatarUrl) {
      body.avatarUrl = resolvedAvatarUrl
    }
    const profile = await apiClient.put<UserProfile>('/profile', body)
    if (resolvedAvatarUrl && !profile.avatarUrl) {
      return { ...profile, avatarUrl: resolvedAvatarUrl }
    }
    return profile
  },
  async getPreferences(): Promise<ProfilePreferences> {
    return apiClient.get<ProfilePreferences>('/profile/preferences')
  },
}

export default profileService
