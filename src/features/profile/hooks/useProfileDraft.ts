import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import localforage from 'localforage'
import type {
  ProfileCreatePayload,
  ProfileDraft,
  ProfileDraftHydration,
  ProfilePreferencesUpdatePayload,
  ProfileUpdatePayload,
  UserProfile,
} from '../types'

const STORAGE_KEY = 'meetinity/profile-draft'

const createEmptyDraft = (): ProfileDraft => ({
  fullName: '',
  headline: '',
  bio: '',
  interests: [],
  location: '',
  availability: '',
  preferences: {
    discoveryRadiusKm: 25,
    industries: [],
    interests: [],
    eventTypes: [],
    notifications: { matches: true, events: true, messages: true },
    availabilityVisibility: 'connections',
  },
  updatedAt: new Date(0).toISOString(),
})

const profileToDraft = (profile: UserProfile): ProfileDraft => ({
  fullName: profile.fullName,
  headline: profile.headline,
  bio: profile.bio ?? '',
  interests: [...profile.interests],
  location: profile.location ?? '',
  availability: profile.availability ?? '',
  preferences: {
    discoveryRadiusKm: profile.preferences.discoveryRadiusKm,
    industries: [...profile.preferences.industries],
    interests: [...profile.preferences.interests],
    eventTypes: [...profile.preferences.eventTypes],
    notifications: { ...profile.preferences.notifications },
    availabilityVisibility: profile.preferences.availabilityVisibility,
  },
  photo: profile.avatarUrl
    ? {
        avatarUrl: profile.avatarUrl,
        avatarCacheKey: profile.avatarCacheKey,
      }
    : undefined,
  updatedAt: profile.updatedAt,
})

const normalizePreferences = (
  preferences: ProfileDraft['preferences'],
): ProfilePreferencesUpdatePayload => ({
  discoveryRadiusKm: preferences.discoveryRadiusKm,
  industries: preferences.industries,
  interests: preferences.interests,
  eventTypes: preferences.eventTypes,
  notifications: preferences.notifications,
  availabilityVisibility: preferences.availabilityVisibility,
})

const isEqual = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)

interface UseProfileDraftOptions {
  waitForProfile?: boolean
}

export const useProfileDraft = (profile?: UserProfile | null, options: UseProfileDraftOptions = {}) => {
  const waitForProfile = options.waitForProfile ?? false
  const [draft, setDraft] = useState<ProfileDraft>(() => (profile ? profileToDraft(profile) : createEmptyDraft()))
  const [hydration, setHydration] = useState<ProfileDraftHydration>({ isHydrated: false })
  const hydrationRef = useRef(false)

  useEffect(() => {
    let cancelled = false
    const hydrate = async () => {
      try {
        const stored = await localforage.getItem<ProfileDraft>(STORAGE_KEY)
        if (cancelled) return
        if (stored) {
          setDraft(stored)
          hydrationRef.current = true
          setHydration({ isHydrated: true })
          return
        }

        if (profile) {
          setDraft(profileToDraft(profile))
          hydrationRef.current = true
          setHydration({ isHydrated: true })
          return
        }

        if (!waitForProfile) {
          hydrationRef.current = true
          setHydration({ isHydrated: true })
        }
      } catch (error) {
        console.error('Unable to hydrate profile draft', error)
        hydrationRef.current = true
        setHydration({ isHydrated: true, error: (error as Error).message })
      }
    }
    void hydrate()
    return () => {
      cancelled = true
    }
  }, [profile?.id, waitForProfile])

  useEffect(() => {
    if (!hydrationRef.current) return
    void localforage.setItem(STORAGE_KEY, draft)
  }, [draft])

  useEffect(() => {
    if (!hydration.isHydrated || !profile) return

    setDraft((current) => {
      const profileUpdatedAt = Date.parse(profile.updatedAt ?? '')
      const currentUpdatedAt = Date.parse(current.updatedAt ?? '')

      if (
        !Number.isNaN(profileUpdatedAt) &&
        !Number.isNaN(currentUpdatedAt) &&
        currentUpdatedAt >= profileUpdatedAt
      ) {
        return current
      }

      return profileToDraft(profile)
    })
  }, [profile?.id, profile?.updatedAt, hydration.isHydrated, profile])

  const updateDraft = useCallback((patch: Partial<ProfileDraft>) => {
    setDraft((current) => ({
      ...current,
      ...patch,
      updatedAt: new Date().toISOString(),
    }))
  }, [])

  const resetDraft = useCallback(async () => {
    const base = profile ? profileToDraft(profile) : createEmptyDraft()
    setDraft(base)
    await localforage.removeItem(STORAGE_KEY)
  }, [profile])

  const applyProfile = useCallback(async (nextProfile: UserProfile) => {
    const nextDraft = profileToDraft(nextProfile)
    setDraft(nextDraft)
    await localforage.setItem(STORAGE_KEY, nextDraft)
  }, [])

  const toUpdatePayload = useCallback((): ProfileUpdatePayload => {
    const preferences = normalizePreferences(draft.preferences)
    return {
      fullName: draft.fullName || undefined,
      headline: draft.headline || undefined,
      bio: draft.bio || undefined,
      interests: draft.interests.length ? draft.interests : undefined,
      location: draft.location || undefined,
      availability: draft.availability || undefined,
      preferences,
      photoUploadId: draft.photo?.uploadId,
      avatarCacheKey: draft.photo?.avatarCacheKey,
    }
  }, [draft])

  const toCreatePayload = useCallback((): ProfileCreatePayload => {
    const preferences = normalizePreferences(draft.preferences)
    return {
      fullName: draft.fullName.trim(),
      headline: draft.headline.trim(),
      bio: draft.bio ? draft.bio.trim() : undefined,
      interests: draft.interests,
      location: draft.location || undefined,
      availability: draft.availability || undefined,
      preferences,
      photoUploadId: draft.photo?.uploadId,
      avatarCacheKey: draft.photo?.avatarCacheKey,
    }
  }, [draft])

  const isDirty = useMemo(() => {
    if (!profile) return true
    const reference = profileToDraft(profile)
    return !isEqual(reference, draft)
  }, [draft, profile])

  return {
    draft,
    updateDraft,
    resetDraft,
    applyProfile,
    toUpdatePayload,
    toCreatePayload,
    hydration,
    isDirty,
  }
}
