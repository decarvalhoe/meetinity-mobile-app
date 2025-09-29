import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ProfileEditor from '../components/ProfileEditor'
import useProfileDraft from '../hooks/useProfileDraft'
import { useAppStore } from '../../../store/AppStore'
import type { ProfileUpdatePayload } from '../types'
import '../../shared.css'
import {
  LoadingState,
  OfflinePlaceholder,
  SkeletonBlock,
  useOnlineStatus,
} from '../../shared'

const ProfileCreateScreen: React.FC = () => {
  const { state, refreshProfile, saveProfile } = useAppStore()
  const isOnline = useOnlineStatus()
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
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
  } = useProfileDraft(null, null)

  useEffect(() => {
    if (state.profile.status === 'idle') {
      refreshProfile()
    }
  }, [state.profile.status, refreshProfile])

  useEffect(() => {
    if (state.profile.data) {
      navigate('/app/profile', { replace: true })
    }
  }, [state.profile.data, navigate])

  if (!isOnline && !state.profile.data) {
    return (
      <OfflinePlaceholder
        description="Le profil est accessible uniquement en ligne."
        onRetry={refreshProfile}
      />
    )
  }

  if (state.profile.status === 'loading' && !state.profile.data && !state.profile.error) {
    return (
      <LoadingState
        title="Initialisation du profil"
        description="Nous vérifions si un profil existe déjà pour vous."
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

  const handleSave = async (payload: ProfileUpdatePayload) => {
    setError(null)
    try {
      await saveProfile(payload)
      clearDraft()
      refreshAvatar()
    } catch (err) {
      setError((err as Error).message)
      refreshAvatar()
    }
  }

  const busy = state.profile.status === 'loading'

  return (
    <section aria-labelledby="profile-create-title">
      <h1 id="profile-create-title">Créer mon profil</h1>
      {state.profile.status === 'error' && !state.profile.data && state.profile.error && (
        <p className="error-text" role="status">
          Impossible de récupérer un profil existant : {state.profile.error}
        </p>
      )}
      <ProfileEditor
        profile={state.profile.data}
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
          clearDraft()
          resetAvatar()
        }}
        busy={busy}
        error={error}
      />
      <p className="help-text" role="note">
        Vous pourrez revenir modifier ces informations à tout moment.
      </p>
    </section>
  )
}

export default ProfileCreateScreen
