import apiClient from './apiClient'
import type { ProfilePreferences, ProfileUpdatePayload, UserProfile } from '../features/profile/types'
import photoUpload from '../features/profile/services/photoUpload'

const profileService = {
  async getProfile(): Promise<UserProfile> {
    return apiClient.get<UserProfile>('/profile')
  },
  async createProfile(update: ProfileUpdatePayload): Promise<UserProfile> {
    const payload = await prepareProfileMutation(update)
    return apiClient.post<UserProfile>('/profile', payload)
  },
  async updateProfile(update: ProfileUpdatePayload): Promise<UserProfile> {
    const payload = await prepareProfileMutation(update)
    const profile = await apiClient.put<UserProfile>('/profile', payload)
    if (payload.avatarUrl && !profile.avatarUrl) {
      return { ...profile, avatarUrl: payload.avatarUrl }
    }
    return profile
  },
  async getPreferences(): Promise<ProfilePreferences> {
    return apiClient.get<ProfilePreferences>('/profile/preferences')
  },
}

export default profileService

const prepareProfileMutation = async (update: ProfileUpdatePayload) => {
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
  return body
}
