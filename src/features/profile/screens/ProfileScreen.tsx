import React, { useEffect, useState } from 'react'
import ProfileCard from '../components/ProfileCard'
import ProfileEditor from '../components/ProfileEditor'
import { useAppStore } from '../../../store/AppStore'
import '../../shared.css'

const ProfileScreen: React.FC = () => {
  const { state, refreshProfile, saveProfile } = useAppStore()
  const [editing, setEditing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (state.profile.status === 'idle') {
      refreshProfile()
    }
  }, [state.profile.status, refreshProfile])

  if (state.profile.status === 'loading' && !state.profile.data) {
    return <div className="loading">Chargement du profil…</div>
  }

  if (state.profile.status === 'error') {
    return (
      <div className="error-state" role="alert">
        Impossible de charger le profil. <button onClick={refreshProfile}>Réessayer</button>
      </div>
    )
  }

  if (!state.profile.data) {
    return <div className="loading">Profil introuvable</div>
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
