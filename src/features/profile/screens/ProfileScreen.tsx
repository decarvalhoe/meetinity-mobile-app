import React, { useEffect, useState } from 'react'
import ProfileCard from '../components/ProfileCard'
import ProfileEditor from '../components/ProfileEditor'
import { useAppStore } from '../../../store/AppStore'
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

  useEffect(() => {
    if (state.profile.status === 'idle') {
      refreshProfile()
    }
  }, [state.profile.status, refreshProfile])

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

  if (state.profile.status === 'error') {
    return (
      <ErrorState
        description={state.profile.error ?? 'Impossible de charger le profil.'}
        onRetry={refreshProfile}
      />
    )
  }

  if (!state.profile.data) {
    return (
      <ErrorState
        title="Profil introuvable"
        description="Nous n'avons pas réussi à retrouver vos informations."
        onRetry={refreshProfile}
      />
    )
  }

  const handleSave = async (payload: Parameters<typeof saveProfile>[0]) => {
    setError(null)
    try {
      await saveProfile(payload)
      setEditing(false)
    } catch (err) {
      setError((err as Error).message)
    }
  }

  return (
    <section aria-labelledby="profile-title">
      <h1 id="profile-title">Mon profil</h1>
      {editing ? (
        <ProfileEditor
          profile={state.profile.data}
          onSave={handleSave}
          onCancel={() => setEditing(false)}
          busy={state.profile.status === 'loading'}
          error={error}
        />
      ) : (
        <ProfileCard profile={state.profile.data} onEdit={() => setEditing(true)} />
      )}
    </section>
  )
}

export default ProfileScreen
