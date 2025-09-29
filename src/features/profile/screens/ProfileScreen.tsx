import React, { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import ProfileCard from '../components/ProfileCard'
import ProfileEditor from '../components/ProfileEditor'
import { useAppStore } from '../../../store/AppStore'
import useProfileDraft from '../hooks/useProfileDraft'
import profileService from '../../../services/profileService'
import type { ProfilePreferences, ProfileUpdatePayload } from '../types'
import '../../shared.css'
import {
  ErrorState,
  LoadingState,
  OfflinePlaceholder,
  SkeletonBlock,
  useOnlineStatus,
} from '../../shared'

const ProfileScreen: React.FC = () => {
  const { state, refreshProfile, saveProfile } = useAppStore()
  const isOnline = useOnlineStatus()
  const [editing, setEditing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [preferences, setPreferences] = useState<ProfilePreferences | null>(null)
  const [preferencesError, setPreferencesError] = useState<string | null>(null)
  const [loadingPreferences, setLoadingPreferences] = useState(false)

  useEffect(() => {
    if (state.profile.status === 'idle') {
      refreshProfile()
    }
  }, [state.profile.status, refreshProfile])

  useEffect(() => {
    let cancelled = false
    if (!isOnline || loadingPreferences || preferences) {
      return () => {
        cancelled = true
      }
    }
    setLoadingPreferences(true)
    setPreferencesError(null)
    profileService
      .getPreferences()
      .then((result) => {
        if (!cancelled) {
          setPreferences(result)
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setPreferencesError((err as Error).message)
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingPreferences(false)
        }
      })
    return () => {
      cancelled = true
    }
  }, [isOnline, loadingPreferences, preferences])

  const profile = state.profile.data
  const {
    draft,
    updateField,
    updatePreferences,
    clearDraft,
    avatarState,
    selectAvatar,
    updateAvatarCrop,
    confirmAvatar,
    resetAvatar,
    refreshAvatar,
  } = useProfileDraft(profile, preferences)

  if (!isOnline && !state.profile.data) {
    return (
      <OfflinePlaceholder
        description="Certaines informations ne sont disponibles qu'en ligne."
        onRetry={refreshProfile}
      />
    )
  }

  if (state.profile.status === 'loading' && !state.profile.data) {
    return (
      <LoadingState
        title="Chargement du profil"
        description="Nous préparons vos informations personnelles."
        skeleton={
          <div className="skeleton-card">
            <div className="skeleton-card__header">
              <SkeletonBlock width={64} height={64} shape="circle" />
              <div className="skeleton-group">
                <SkeletonBlock height={16} width="70%" />
                <SkeletonBlock height={14} width="40%" />
              </div>
            </div>
            <div className="skeleton-card__body">
              <SkeletonBlock height={12} />
              <SkeletonBlock height={12} width="90%" />
            </div>
          </div>
        }
      />
    )
  }

  if (!profile && state.profile.status === 'success') {
    return <Navigate to="/app/profile/create" replace />
  }

  if (state.profile.status === 'error') {
    return (
      <ErrorState
        description={state.profile.error ?? 'Impossible de charger le profil.'}
        onRetry={refreshProfile}
      />
    )
  }

  if (!profile) {
    return (
      <ErrorState
        title="Profil introuvable"
        description="Nous n'avons pas réussi à retrouver vos informations."
        onRetry={refreshProfile}
      />
    )
  }

  const handleSave = async (payload: ProfileUpdatePayload) => {
    setError(null)
    try {
      await saveProfile(payload)
      if (payload.preferences) {
        setPreferences((prev) => ({
          discoveryRadiusKm: payload.preferences?.discoveryRadiusKm ?? prev?.discoveryRadiusKm ?? 0,
          industries: payload.preferences?.industries ?? prev?.industries ?? [],
          interests: payload.preferences?.interests ?? prev?.interests ?? [],
          eventTypes: payload.preferences?.eventTypes ?? prev?.eventTypes ?? [],
        }))
      }
      clearDraft()
      refreshAvatar()
      setEditing(false)
    } catch (err) {
      setError((err as Error).message)
      refreshAvatar()
    }
  }

  useEffect(() => {
    if (editing) {
      refreshAvatar()
    }
  }, [editing, refreshAvatar])

  const busy = state.profile.status === 'loading'

  return (
    <section aria-labelledby="profile-title">
      <h1 id="profile-title">Mon profil</h1>
      {editing ? (
        <ProfileEditor
          profile={profile}
          draft={draft}
          avatarState={avatarState}
          onFieldChange={updateField}
          onPreferenceChange={updatePreferences}
          onAvatarSelect={selectAvatar}
          onAvatarCrop={updateAvatarCrop}
          onAvatarConfirm={confirmAvatar}
          onAvatarReset={resetAvatar}
          onSave={handleSave}
          onCancel={() => {
            setEditing(false)
            setError(null)
          }}
          busy={busy}
          error={error}
        />
      ) : (
        <>
          {preferencesError && (
            <p className="error-text" role="status">
              Préférences indisponibles : {preferencesError}
            </p>
          )}
          <ProfileCard
            profile={profile}
            preferences={preferences}
            onEdit={() => setEditing(true)}
          />
        </>
      )}
      {editing && loadingPreferences && (
        <p className="help-text" role="status">
          Chargement des préférences…
        </p>
      )}
    </section>
  )
}

export default ProfileScreen
