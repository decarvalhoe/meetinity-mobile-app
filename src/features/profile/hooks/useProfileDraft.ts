import { useCallback, useEffect, useMemo, useState } from 'react'
import { appCache } from '../../../lib/cache'
import type {
  AvatarCropSettings,
  ProfileDraft,
  ProfilePreferences,
  ProfileUpdatePayload,
  UserProfile,
} from '../types'
import photoUpload, { type PhotoUploadState } from '../services/photoUpload'

const PROFILE_DRAFT_CACHE_KEY = 'profile:draft'

type ProfileFieldKey = Exclude<keyof ProfileUpdatePayload, 'preferences' | 'avatarUpload' | 'avatarUrl'>

const cloneArray = <T,>(value: T[] | undefined): T[] => (value ? [...value] : [])

const createDraftFromProfile = (
  profile: UserProfile | null,
  preferences: ProfilePreferences | null,
): ProfileDraft => ({
  profile: {
    fullName: profile?.fullName ?? '',
    headline: profile?.headline ?? '',
    bio: profile?.bio ?? '',
    interests: cloneArray(profile?.interests ?? preferences?.interests ?? []),
    location: profile?.location ?? '',
    availability: profile?.availability ?? '',
    avatarUrl: profile?.avatarUrl,
  },
  preferences: {
    discoveryRadiusKm:
      preferences?.discoveryRadiusKm ?? profile?.preferences?.discoveryRadiusKm ?? undefined,
    industries: cloneArray(preferences?.industries ?? profile?.preferences?.industries ?? []),
    interests: cloneArray(preferences?.interests ?? profile?.preferences?.interests ?? []),
    eventTypes: cloneArray(preferences?.eventTypes ?? profile?.preferences?.eventTypes ?? []),
  },
  updatedAt: new Date().toISOString(),
})

const readCachedDraft = (): ProfileDraft | null => {
  const cached = appCache.read<ProfileDraft>(PROFILE_DRAFT_CACHE_KEY)
  return cached.value ?? null
}

const persistDraft = (draft: ProfileDraft) => {
  appCache.write(PROFILE_DRAFT_CACHE_KEY, draft)
}

const clearDraftCache = () => {
  appCache.invalidate(PROFILE_DRAFT_CACHE_KEY)
}

const useProfileDraft = (profile: UserProfile | null, preferences: ProfilePreferences | null) => {
  const baseline = useMemo(
    () => createDraftFromProfile(profile, preferences ?? profile?.preferences ?? null),
    [profile, preferences],
  )
  const cachedDraft = useMemo(() => readCachedDraft(), [])
  const initialAvatar = useMemo(() => photoUpload.resume(), [])
  const [draft, setDraft] = useState<ProfileDraft>(cachedDraft ?? baseline)
  const [dirty, setDirty] = useState<boolean>(Boolean(cachedDraft) || initialAvatar.status !== 'idle')
  const [avatarState, setAvatarState] = useState<PhotoUploadState>(initialAvatar)

  useEffect(() => {
    if (!dirty) {
      setDraft(createDraftFromProfile(profile, preferences ?? profile?.preferences ?? null))
    }
  }, [profile, preferences, dirty])

  useEffect(() => {
    if (dirty) {
      persistDraft({ ...draft, updatedAt: new Date().toISOString() })
    }
  }, [draft, dirty])

  const updateField = useCallback(
    <Key extends ProfileFieldKey>(key: Key, value: NonNullable<ProfileUpdatePayload[Key]>) => {
      setDirty(true)
      setDraft((previous) => ({
        ...previous,
        updatedAt: new Date().toISOString(),
        profile: { ...previous.profile, [key]: value },
      }))
    },
    [],
  )

  const updatePreferences = useCallback(
    <Key extends keyof ProfilePreferences>(key: Key, value: ProfilePreferences[Key]) => {
      setDirty(true)
      setDraft((previous) => ({
        ...previous,
        updatedAt: new Date().toISOString(),
        preferences: { ...previous.preferences, [key]: value },
      }))
    },
    [],
  )

  const replaceDraft = useCallback((next: ProfileDraft, options?: { markDirty?: boolean }) => {
    setDraft(next)
    if (options?.markDirty) {
      setDirty(true)
    } else {
      setDirty(false)
      clearDraftCache()
    }
  }, [])

  const clearDraftState = useCallback(() => {
    const next = createDraftFromProfile(profile, preferences ?? profile?.preferences ?? null)
    replaceDraft(next)
    setAvatarState(photoUpload.reset())
  }, [profile, preferences, replaceDraft])

  const selectAvatar = useCallback(async (file: File) => {
    const state = await photoUpload.select(file)
    setDirty(true)
    setAvatarState(state)
  }, [])

  const updateAvatarCrop = useCallback((crop: AvatarCropSettings) => {
    const state = photoUpload.updateCrop(crop)
    setDirty(true)
    setAvatarState(state)
  }, [])

  const confirmAvatar = useCallback((crop?: AvatarCropSettings) => {
    const state = photoUpload.confirmCrop(crop)
    setDirty(true)
    setAvatarState(state)
  }, [])

  const resetAvatar = useCallback(() => {
    const state = photoUpload.reset()
    setAvatarState(state)
  }, [])

  const refreshAvatar = useCallback(() => {
    setAvatarState(photoUpload.getState())
  }, [])

  return {
    draft,
    dirty,
    updateField,
    updatePreferences,
    replaceDraft,
    clearDraft: clearDraftState,
    avatarState,
    selectAvatar,
    updateAvatarCrop,
    confirmAvatar,
    resetAvatar,
    refreshAvatar,
  }
}

export type UseProfileDraftReturn = ReturnType<typeof useProfileDraft>

export default useProfileDraft
