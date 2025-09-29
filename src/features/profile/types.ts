export interface AvatarCropSettings {
  x: number
  y: number
  width: number
  height: number
  scale?: number
  rotation?: number
}

export type AvatarUploadStatus = 'cropping' | 'ready' | 'uploading'

export interface AvatarUploadDraft {
  id: string
  dataUrl: string
  fileName: string
  mimeType: string
  size: number
  crop?: AvatarCropSettings
  status: AvatarUploadStatus
  updatedAt: string
  error?: string
}

export interface ProfilePreferences {
  discoveryRadiusKm: number
  industries: string[]
  interests: string[]
  eventTypes: string[]
}

export interface ProfileUpdatePayload {
  fullName?: string
  headline?: string
  bio?: string
  interests?: string[]
  location?: string
  availability?: string
  preferences?: Partial<ProfilePreferences>
  avatarUpload?: AvatarUploadDraft | null
  avatarUrl?: string
}

export interface ProfileDraft {
  profile: ProfileUpdatePayload
  preferences: Partial<ProfilePreferences>
  updatedAt: string
}

export interface UserProfile {
  id: string
  fullName: string
  headline: string
  avatarUrl?: string
  bio?: string
  interests: string[]
  location?: string
  availability?: string
  preferences?: ProfilePreferences
}
