import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '../../../auth/AuthContext'
import { useAppStore } from '../../../store/AppStore'
import ProfileForm from '../components/ProfileForm'
import ProfilePhotoField from '../components/ProfilePhotoField'
import type { ProfileFormErrors } from '../components/ProfileForm'
import { useProfileDraft } from '../hooks/useProfileDraft'
import { validateProfileDraft } from '../validation'

const ProfileEditScreen: React.FC = () => {
  const { token } = useAuth()
  const { state, refreshProfile, saveProfile } = useAppStore()
  const profile = state.profile.data
  const {
    draft,
    updateDraft,
    resetDraft,
    applyProfile,
    toUpdatePayload,
    hydration,
  } = useProfileDraft(profile, { waitForProfile: true })
  const [validationErrors, setValidationErrors] = useState<ProfileFormErrors>({})
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const saveTaskRef = useRef<ReturnType<typeof saveProfile> | null>(null)

  useEffect(() => {
    if (state.profile.status === 'idle') {
      void refreshProfile()
    }
  }, [state.profile.status, refreshProfile])

  useEffect(() => {
    return () => {
      saveTaskRef.current?.cancel()
    }
  }, [])

  const photoField = useMemo(
    () => (
      <ProfilePhotoField
        token={token}
        value={draft.photo}
        onChange={(photo) => updateDraft({ photo })}
        disabled={busy}
      />
    ),
    [token, draft.photo, updateDraft, busy],
  )

  const handleSubmit = () => {
    setError(null)
    const validation = validateProfileDraft(draft)
    setValidationErrors(validation.errors)
    if (!validation.isValid) {
      return
    }

    setValidationErrors({})
    setBusy(true)
    const payload = toUpdatePayload()
    const task = saveProfile(payload, {
      mode: 'update',
      avatarCacheKey: draft.photo?.avatarCacheKey,
      avatarPreviewUrl: draft.photo?.localUri,
    })
    saveTaskRef.current = task
    task.promise
      .then(() => {
        setBusy(false)
        saveTaskRef.current = null
      })
      .catch((reason) => {
        setBusy(false)
        saveTaskRef.current = null
        setError((reason as Error).message)
      })
  }

  const handleCancel = () => {
    saveTaskRef.current?.cancel()
    saveTaskRef.current = null
    if (profile) {
      void applyProfile(profile)
    }
    void resetDraft()
  }

  if (state.profile.status === 'loading' && !state.profile.data) {
    return <div style={{ padding: 32 }}>Chargement du profil…</div>
  }

  if (state.profile.status === 'error') {
    return (
      <div style={{ padding: 32 }} role="alert">
        Impossible de charger le profil.{' '}
        <button type="button" onClick={refreshProfile}>
          Réessayer
        </button>
      </div>
    )
  }

  if (!state.profile.data) {
    return <div style={{ padding: 32 }}>Profil introuvable</div>
  }

  if (!hydration.isHydrated) {
    return <div style={{ padding: 32 }}>Chargement du brouillon…</div>
  }

  return (
    <div style={{ padding: '40px 24px', background: '#f9fafb', minHeight: '100vh' }}>
      <ProfileForm
        mode="edit"
        draft={draft}
        onChange={updateDraft}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        busy={busy || state.profile.status === 'loading'}
        error={error}
        validationErrors={validationErrors}
        photoField={photoField}
      />
    </div>
  )
}

export default ProfileEditScreen
