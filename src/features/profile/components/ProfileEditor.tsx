import React, { useState } from 'react'
import type { ProfileUpdatePayload, UserProfile } from '../types'
import '../../shared.css'

interface ProfileEditorProps {
  profile: UserProfile
  onSave: (update: ProfileUpdatePayload) => Promise<void>
  onCancel: () => void
  busy?: boolean
  error?: string | null
}

const ProfileEditor: React.FC<ProfileEditorProps> = ({ profile, onSave, onCancel, busy, error }) => {
  const [form, setForm] = useState<ProfileUpdatePayload>({
    fullName: profile.fullName,
    headline: profile.headline,
    bio: profile.bio,
    interests: profile.interests,
    location: profile.location,
    availability: profile.availability,
  })

  const updateField = (key: keyof ProfileUpdatePayload, value: string | string[]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    await onSave(form)
  }

  return (
    <form className="card" onSubmit={submit}>
      <div className="card__header">
        <h2>Modifier mon profil</h2>
      </div>
      <div className="form-group">
        <label htmlFor="fullName">Nom complet</label>
        <input
          id="fullName"
          value={form.fullName ?? ''}
          onChange={(event) => updateField('fullName', event.target.value)}
        />
      </div>
      <div className="form-group">
        <label htmlFor="headline">Titre</label>
        <input
          id="headline"
          value={form.headline ?? ''}
          onChange={(event) => updateField('headline', event.target.value)}
        />
      </div>
      <div className="form-group">
        <label htmlFor="bio">Bio</label>
        <textarea
          id="bio"
          rows={3}
          value={form.bio ?? ''}
          onChange={(event) => updateField('bio', event.target.value)}
        />
      </div>
      <div className="form-group">
        <label htmlFor="interests">Intérêts (séparés par des virgules)</label>
        <input
          id="interests"
          value={form.interests?.join(', ') ?? ''}
          onChange={(event) => updateField('interests', event.target.value.split(',').map((item) => item.trim()))}
        />
      </div>
      <div className="form-grid">
        <div className="form-group">
          <label htmlFor="location">Localisation</label>
          <input
            id="location"
            value={form.location ?? ''}
            onChange={(event) => updateField('location', event.target.value)}
          />
        </div>
        <div className="form-group">
          <label htmlFor="availability">Disponibilités</label>
          <input
            id="availability"
            value={form.availability ?? ''}
            onChange={(event) => updateField('availability', event.target.value)}
          />
        </div>
      </div>
      {error && <p role="alert" className="error-text">{error}</p>}
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
