import React, { useMemo } from 'react'
import type {
  AvatarCropSettings,
  ProfileDraft,
  ProfilePreferences,
  ProfileUpdatePayload,
  UserProfile,
} from '../types'
import type { PhotoUploadState } from '../services/photoUpload'
import '../../shared.css'

type ProfileFormFieldKey = 'fullName' | 'headline' | 'bio' | 'interests' | 'location' | 'availability'

interface ProfileEditorProps {
  profile: UserProfile
  draft: ProfileDraft
  avatarState: PhotoUploadState
  onFieldChange: (key: ProfileFormFieldKey, value: string | string[]) => void
  onPreferenceChange: <Key extends keyof ProfilePreferences>(key: Key, value: ProfilePreferences[Key]) => void
  onAvatarSelect: (file: File) => Promise<void>
  onAvatarCrop: (crop: AvatarCropSettings) => void
  onAvatarConfirm: (crop?: AvatarCropSettings) => void
  onAvatarReset: () => void
  onSave: (update: ProfileUpdatePayload) => Promise<void>
  onCancel: () => void
  busy?: boolean
  error?: string | null
}

const parseList = (value: string): string[] =>
  value
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0)

const ProfileEditor: React.FC<ProfileEditorProps> = ({
  profile,
  draft,
  avatarState,
  onFieldChange,
  onPreferenceChange,
  onAvatarSelect,
  onAvatarCrop,
  onAvatarConfirm,
  onAvatarReset,
  onSave,
  onCancel,
  busy,
  error,
}) => {
  const crop = useMemo<AvatarCropSettings>(
    () => ({
      x: avatarState.draft?.crop?.x ?? 0,
      y: avatarState.draft?.crop?.y ?? 0,
      width: avatarState.draft?.crop?.width ?? 1,
      height: avatarState.draft?.crop?.height ?? 1,
      scale: avatarState.draft?.crop?.scale ?? 1,
      rotation: avatarState.draft?.crop?.rotation ?? 0,
    }),
    [avatarState.draft?.crop?.height, avatarState.draft?.crop?.rotation, avatarState.draft?.crop?.scale, avatarState.draft?.crop?.width, avatarState.draft?.crop?.x, avatarState.draft?.crop?.y],
  )

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    const preferencesPayload: ProfileUpdatePayload['preferences'] = {
      discoveryRadiusKm: draft.preferences.discoveryRadiusKm,
      industries: draft.preferences.industries ?? [],
      interests: draft.preferences.interests ?? [],
      eventTypes: draft.preferences.eventTypes ?? [],
    }
    const payload: ProfileUpdatePayload = {
      ...draft.profile,
      preferences: preferencesPayload,
    }
    if (avatarState.draft) {
      payload.avatarUpload = avatarState.draft
    }
    await onSave(payload)
  }

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0) return
    await onAvatarSelect(event.target.files[0])
    event.target.value = ''
  }

  const handleProfileInterests = (value: string) => {
    onFieldChange('interests', parseList(value))
  }

  const handlePreferenceInterests = (value: string) => {
    onPreferenceChange('interests', parseList(value))
  }

  const handleIndustries = (value: string) => {
    onPreferenceChange('industries', parseList(value))
  }

  const handleRadius = (value: string) => {
    const parsed = value.trim() === '' ? undefined : Number.parseInt(value, 10)
    onPreferenceChange('discoveryRadiusKm', Number.isNaN(parsed) ? undefined : parsed)
  }

  const updateCropField = (patch: Partial<AvatarCropSettings>) => {
    onAvatarCrop({ ...crop, ...patch })
  }

  const showCurrentAvatar = avatarState.previewUrl ?? profile.avatarUrl

  return (
    <form className="card" onSubmit={handleSubmit} aria-label="Édition du profil">
      <div className="card__header">
        <h2>Modifier mon profil</h2>
      </div>
      <div className="form-group">
        <label htmlFor="avatar">Photo de profil</label>
        {showCurrentAvatar ? (
          <img src={showCurrentAvatar} alt={draft.profile.fullName || profile.fullName} className="card__avatar" />
        ) : (
          <div className="card__avatar card__avatar--placeholder">{(draft.profile.fullName || profile.fullName).charAt(0)}</div>
        )}
        <input id="avatar" type="file" accept="image/*" onChange={handleFileChange} disabled={busy} />
        {avatarState.draft && (
          <div className="avatar-editor">
            <p className="help-text">
              {avatarState.draft.status === 'ready'
                ? 'Recadrage confirmé. Vous pouvez enregistrer pour lancer la mise à jour.'
                : "Ajustez votre photo puis confirmez le recadrage."}
            </p>
            <div className="form-grid">
              <label className="form-group">
                <span>Zoom</span>
                <input
                  type="range"
                  min={1}
                  max={3}
                  step={0.1}
                  value={crop.scale ?? 1}
                  onChange={(event) => updateCropField({ scale: Number(event.target.value) })}
                  disabled={busy}
                />
              </label>
              <label className="form-group">
                <span>Décalage horizontal</span>
                <input
                  type="range"
                  min={-1}
                  max={1}
                  step={0.05}
                  value={crop.x}
                  onChange={(event) => updateCropField({ x: Number(event.target.value) })}
                  disabled={busy}
                />
              </label>
              <label className="form-group">
                <span>Décalage vertical</span>
                <input
                  type="range"
                  min={-1}
                  max={1}
                  step={0.05}
                  value={crop.y}
                  onChange={(event) => updateCropField({ y: Number(event.target.value) })}
                  disabled={busy}
                />
              </label>
            </div>
            <div className="card__footer card__footer--actions">
              <button
                type="button"
                className="secondary"
                onClick={() => onAvatarConfirm(crop)}
                disabled={busy || avatarState.draft.status === 'ready'}
              >
                Confirmer le recadrage
              </button>
              <button type="button" className="link" onClick={onAvatarReset} disabled={busy}>
                Réinitialiser
              </button>
            </div>
            {avatarState.draft.error && <p className="error-text">{avatarState.draft.error}</p>}
          </div>
        )}
      </div>
      <div className="form-group">
        <label htmlFor="fullName">Nom complet</label>
        <input
          id="fullName"
          value={draft.profile.fullName ?? ''}
          onChange={(event) => onFieldChange('fullName', event.target.value)}
        />
      </div>
      <div className="form-group">
        <label htmlFor="headline">Titre</label>
        <input
          id="headline"
          value={draft.profile.headline ?? ''}
          onChange={(event) => onFieldChange('headline', event.target.value)}
        />
      </div>
      <div className="form-group">
        <label htmlFor="bio">Bio</label>
        <textarea
          id="bio"
          rows={3}
          value={draft.profile.bio ?? ''}
          onChange={(event) => onFieldChange('bio', event.target.value)}
        />
      </div>
      <div className="form-group">
        <label htmlFor="interests">Intérêts (séparés par des virgules)</label>
        <input
          id="interests"
          value={(draft.profile.interests ?? []).join(', ')}
          onChange={(event) => handleProfileInterests(event.target.value)}
        />
      </div>
      <div className="form-grid">
        <div className="form-group">
          <label htmlFor="location">Localisation</label>
          <input
            id="location"
            value={draft.profile.location ?? ''}
            onChange={(event) => onFieldChange('location', event.target.value)}
          />
        </div>
        <div className="form-group">
          <label htmlFor="availability">Disponibilités</label>
          <input
            id="availability"
            value={draft.profile.availability ?? ''}
            onChange={(event) => onFieldChange('availability', event.target.value)}
          />
        </div>
      </div>
      <fieldset className="form-group">
        <legend>Préférences de mise en relation</legend>
        <div className="form-grid">
          <label className="form-group" htmlFor="radius">
            Rayon de découverte (km)
            <input
              id="radius"
              type="number"
              min={1}
              value={draft.preferences.discoveryRadiusKm ?? ''}
              onChange={(event) => handleRadius(event.target.value)}
            />
          </label>
          <label className="form-group" htmlFor="pref-industries">
            Industries ciblées
            <input
              id="pref-industries"
              value={(draft.preferences.industries ?? []).join(', ')}
              onChange={(event) => handleIndustries(event.target.value)}
            />
          </label>
        </div>
        <label className="form-group" htmlFor="pref-interests">
          Intérêts à mettre en avant
          <input
            id="pref-interests"
            value={(draft.preferences.interests ?? []).join(', ')}
            onChange={(event) => handlePreferenceInterests(event.target.value)}
          />
        </label>
      </fieldset>
      {error && (
        <p role="alert" className="error-text">
          {error}
        </p>
      )}
      <div className="card__footer card__footer--actions">
        <button type="button" className="secondary" onClick={onCancel} disabled={busy}>
          Annuler
        </button>
        <button type="submit" className="primary" disabled={busy}>
          {busy ? 'Enregistrement…' : 'Sauvegarder'}
        </button>
      </div>
    </form>
  )
}

export default ProfileEditor
