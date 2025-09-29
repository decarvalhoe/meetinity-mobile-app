import React, { useEffect, useMemo, useState } from 'react'
import type {
  AvatarCropSettings,
  ProfileDraft,
  ProfilePreferences,
  ProfileUpdatePayload,
  ProfileExperience,
  ProfileLink,
  UserProfile,
} from '../types'
import type { PhotoUploadState } from '../services/photoUpload'
import { BIO_MAX_LENGTH, validateProfileDraft } from '../validation'
import '../../shared.css'

type ProfileFormFieldKey = Exclude<keyof ProfileUpdatePayload, 'preferences' | 'avatarUpload' | 'avatarUrl'>

interface ProfileEditorProps {
  profile: UserProfile | null
  draft: ProfileDraft
  avatarState: PhotoUploadState
  onFieldChange: <Key extends ProfileFormFieldKey>(key: Key, value: ProfileUpdatePayload[Key]) => void
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
  const [showErrors, setShowErrors] = useState(false)
  const validation = useMemo(() => validateProfileDraft(draft), [draft])
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

  useEffect(() => {
    if (showErrors && validation.isValid) {
      setShowErrors(false)
    }
  }, [showErrors, validation.isValid])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!validation.isValid) {
      setShowErrors(true)
      return
    }
    setShowErrors(false)
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
    if (payload.company !== undefined) {
      payload.company = payload.company?.trim() ?? ''
    }
    if (payload.position !== undefined) {
      payload.position = payload.position?.trim() ?? ''
    }
    payload.experiences = sanitizeExperiencesForSubmit(payload.experiences)
    payload.links = sanitizeLinksForSubmit(payload.links)
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

  const showCurrentAvatar = avatarState.previewUrl ?? profile?.avatarUrl
  const experiences = draft.profile.experiences ?? []
  const links = draft.profile.links ?? []
  const hasInterestsError = showErrors && Boolean(validation.errors.interests)
  const headlineError = showErrors ? validation.errors.headline : undefined
  const fullNameError = showErrors ? validation.errors.fullName : undefined
  const bioLength = draft.profile.bio?.length ?? 0
  const showBioError = Boolean(validation.errors.bio) && (showErrors || bioLength > BIO_MAX_LENGTH)
  const bioError = showBioError ? validation.errors.bio : undefined
  const radiusHasValue = draft.preferences.discoveryRadiusKm != null
  const showRadiusError = Boolean(validation.errors.discoveryRadiusKm) && (showErrors || radiusHasValue)
  const radiusError = showRadiusError ? validation.errors.discoveryRadiusKm : undefined
  const linkErrors = validation.errors.links ?? []

  const handleCancel = () => {
    setShowErrors(false)
    onCancel()
  }

  const sanitizeExperiencePatch = (patch: Partial<ProfileExperience>): Partial<ProfileExperience> => {
    const normalized: Partial<ProfileExperience> = { ...patch }
    if ('startDate' in normalized && typeof normalized.startDate === 'string') {
      normalized.startDate = normalized.startDate.trim() || undefined
    }
    if ('endDate' in normalized) {
      const value = normalized.endDate
      normalized.endDate = typeof value === 'string' ? (value.trim() || undefined) : value
    }
    if ('description' in normalized && typeof normalized.description === 'string') {
      normalized.description = normalized.description.trim() || undefined
    }
    if ('title' in normalized && typeof normalized.title === 'string') {
      normalized.title = normalized.title
    }
    if ('company' in normalized && typeof normalized.company === 'string') {
      normalized.company = normalized.company
    }
    return normalized
  }

  const handleExperienceChange = (index: number, patch: Partial<ProfileExperience>) => {
    const next = experiences.map((experience, idx) =>
      idx === index ? { ...experience, ...sanitizeExperiencePatch(patch) } : experience,
    )
    onFieldChange('experiences', next)
  }

  const handleExperienceAdd = () => {
    const next: ProfileExperience[] = [
      ...experiences,
      { title: '', company: '', startDate: undefined, endDate: undefined, description: undefined },
    ]
    onFieldChange('experiences', next)
  }

  const handleExperienceRemove = (index: number) => {
    const next = experiences.filter((_, idx) => idx !== index)
    onFieldChange('experiences', next)
  }

  const handleLinkChange = (index: number, patch: Partial<ProfileLink>) => {
    const next = links.map((link, idx) => (idx === index ? { ...link, ...patch } : link))
    onFieldChange('links', next)
  }

  const handleLinkAdd = () => {
    const next: ProfileLink[] = [...links, { label: '', url: '' }]
    onFieldChange('links', next)
  }

  const handleLinkRemove = (index: number) => {
    const next = links.filter((_, idx) => idx !== index)
    onFieldChange('links', next)
  }

  const sanitizeExperiencesForSubmit = (
    items: ProfileExperience[] | undefined,
  ): ProfileExperience[] | undefined => {
    if (items === undefined) return undefined
    const cleaned = items
      .map((experience) => {
        const title = (experience.title ?? '').trim()
        const company = (experience.company ?? '').trim()
        const startDate = experience.startDate?.trim()
        const endDateRaw =
          typeof experience.endDate === 'string' ? experience.endDate.trim() : experience.endDate ?? undefined
        const description = experience.description?.trim()
        const normalized: ProfileExperience = {
          ...experience,
          title,
          company,
          startDate: startDate || undefined,
          endDate: endDateRaw === '' ? undefined : endDateRaw,
          description: description || undefined,
        }
        if (!experience.id) {
          delete normalized.id
        }
        return normalized
      })
      .filter(
        (experience) =>
          experience.title.length > 0 ||
          experience.company.length > 0 ||
          Boolean(experience.description) ||
          Boolean(experience.startDate) ||
          experience.endDate !== undefined,
      )
    return cleaned.length > 0 ? cleaned : []
  }

  const sanitizeLinksForSubmit = (items: ProfileLink[] | undefined): ProfileLink[] | undefined => {
    if (items === undefined) return undefined
    const cleaned = items
      .map((link) => ({
        label: (link.label ?? '').trim(),
        url: (link.url ?? '').trim(),
      }))
      .filter((link) => link.label.length > 0 && link.url.length > 0)
    return cleaned.length > 0 ? cleaned : []
  }

  return (
    <form className="card" onSubmit={handleSubmit} aria-label="Édition du profil">
      <div className="card__header">
        <h2>Modifier mon profil</h2>
      </div>
      <div className="form-group">
        <label htmlFor="avatar">Photo de profil</label>
        {showCurrentAvatar ? (
          <img
            src={showCurrentAvatar}
            alt={draft.profile.fullName || profile?.fullName || 'Avatar utilisateur'}
            className="card__avatar"
          />
        ) : (
          <div className="card__avatar card__avatar--placeholder">
            {(draft.profile.fullName || profile?.fullName || '?').charAt(0)}
          </div>
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
          aria-invalid={fullNameError ? true : undefined}
          aria-describedby={fullNameError ? 'fullName-error' : undefined}
        />
        {fullNameError && (
          <p className="error-text" id="fullName-error">
            {fullNameError}
          </p>
        )}
      </div>
      <div className="form-group">
        <label htmlFor="headline">Titre</label>
        <input
          id="headline"
          value={draft.profile.headline ?? ''}
          onChange={(event) => onFieldChange('headline', event.target.value)}
          aria-invalid={headlineError ? true : undefined}
          aria-describedby={headlineError ? 'headline-error' : undefined}
        />
        {headlineError && (
          <p className="error-text" id="headline-error">
            {headlineError}
          </p>
        )}
      </div>
      <div className="form-group">
        <label htmlFor="bio">Bio</label>
        <textarea
          id="bio"
          rows={3}
          value={draft.profile.bio ?? ''}
          onChange={(event) => onFieldChange('bio', event.target.value)}
          aria-invalid={bioError ? true : undefined}
          aria-describedby={bioError ? 'bio-error' : undefined}
        />
        {bioError && (
          <p className="error-text" id="bio-error">
            {bioError}
          </p>
        )}
      </div>
      <div className="form-group">
        <label htmlFor="interests">Intérêts (séparés par des virgules)</label>
        <input
          id="interests"
          value={(draft.profile.interests ?? []).join(', ')}
          onChange={(event) => handleProfileInterests(event.target.value)}
          aria-invalid={hasInterestsError ? true : undefined}
          aria-describedby={hasInterestsError ? 'interests-error' : undefined}
        />
        {hasInterestsError && (
          <p className="error-text" id="interests-error">
            {validation.errors.interests}
          </p>
        )}
      </div>
      <div className="form-grid">
        <div className="form-group">
          <label htmlFor="company">Société</label>
          <input
            id="company"
            value={draft.profile.company ?? ''}
            onChange={(event) => onFieldChange('company', event.target.value)}
          />
        </div>
        <div className="form-group">
          <label htmlFor="position">Poste</label>
          <input
            id="position"
            value={draft.profile.position ?? ''}
            onChange={(event) => onFieldChange('position', event.target.value)}
          />
        </div>
      </div>
      <div className="form-group">
        <label htmlFor="skills">Compétences (séparées par des virgules)</label>
        <input
          id="skills"
          value={(draft.profile.skills ?? []).join(', ')}
          onChange={(event) => onFieldChange('skills', parseList(event.target.value))}
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
              aria-invalid={radiusError ? true : undefined}
              aria-describedby={radiusError ? 'radius-error' : undefined}
            />
          </label>
          {radiusError && (
            <p className="error-text" id="radius-error">
              {radiusError}
            </p>
          )}
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
      <fieldset className="form-group">
        <legend>Expériences professionnelles</legend>
        {experiences.length === 0 && <p className="help-text">Ajoutez vos expériences marquantes.</p>}
        {experiences.map((experience, index) => (
          <div key={`experience-${index}`} className="form-group">
            <div className="form-grid">
              <label className="form-group">
                <span>Intitulé</span>
                <input
                  value={experience.title ?? ''}
                  onChange={(event) => handleExperienceChange(index, { title: event.target.value })}
                  disabled={busy}
                />
              </label>
              <label className="form-group">
                <span>Société</span>
                <input
                  value={experience.company ?? ''}
                  onChange={(event) => handleExperienceChange(index, { company: event.target.value })}
                  disabled={busy}
                />
              </label>
            </div>
            <div className="form-grid">
              <label className="form-group">
                <span>Début</span>
                <input
                  type="date"
                  value={experience.startDate ?? ''}
                  onChange={(event) => handleExperienceChange(index, { startDate: event.target.value })}
                  disabled={busy}
                />
              </label>
              <label className="form-group">
                <span>Fin</span>
                <input
                  type="date"
                  value={experience.endDate ?? ''}
                  onChange={(event) => handleExperienceChange(index, { endDate: event.target.value || undefined })}
                  disabled={busy}
                />
              </label>
            </div>
            <label className="form-group">
              <span>Description</span>
              <textarea
                rows={2}
                value={experience.description ?? ''}
                onChange={(event) => handleExperienceChange(index, { description: event.target.value })}
                disabled={busy}
              />
            </label>
            <div className="card__footer card__footer--actions">
              <button
                type="button"
                className="link"
                onClick={() => handleExperienceRemove(index)}
                disabled={busy}
              >
                Supprimer cette expérience
              </button>
            </div>
          </div>
        ))}
        <button type="button" className="secondary" onClick={handleExperienceAdd} disabled={busy}>
          Ajouter une expérience
        </button>
      </fieldset>
      <fieldset className="form-group">
        <legend>Liens publics</legend>
        {links.length === 0 && <p className="help-text">Partagez vos profils sociaux ou portfolio.</p>}
        {links.map((link, index) => {
          const linkError = linkErrors[index]
          const trimmedLabel = link.label?.trim() ?? ''
          const trimmedUrl = link.url?.trim() ?? ''
          const linkHasContent = trimmedLabel.length > 0 || trimmedUrl.length > 0
          const displayErrors = linkError && (showErrors || linkHasContent)
          const showLabelError = Boolean(displayErrors && linkError?.label)
          const showUrlError = Boolean(displayErrors && linkError?.url)
          const labelErrorId = showLabelError ? `link-${index}-label-error` : undefined
          const urlErrorId = showUrlError ? `link-${index}-url-error` : undefined
          return (
            <div key={`link-${index}`} className="form-grid">
              <label className="form-group">
                <span>Libellé</span>
                <input
                  value={link.label ?? ''}
                  onChange={(event) => handleLinkChange(index, { label: event.target.value })}
                  disabled={busy}
                  aria-invalid={showLabelError ? true : undefined}
                  aria-describedby={labelErrorId}
                />
                {showLabelError && (
                  <p className="error-text" id={labelErrorId}>
                    {linkError?.label}
                  </p>
                )}
              </label>
              <label className="form-group">
                <span>URL</span>
                <input
                  value={link.url ?? ''}
                  onChange={(event) => handleLinkChange(index, { url: event.target.value })}
                  disabled={busy}
                  aria-invalid={showUrlError ? true : undefined}
                  aria-describedby={urlErrorId}
                />
                {showUrlError && (
                  <p className="error-text" id={urlErrorId}>
                    {linkError?.url}
                  </p>
                )}
              </label>
            <div className="card__footer card__footer--actions">
              <button
                type="button"
                className="link"
                onClick={() => handleLinkRemove(index)}
                disabled={busy}
              >
                Supprimer ce lien
              </button>
            </div>
            </div>
          )
        })}
        <button type="button" className="secondary" onClick={handleLinkAdd} disabled={busy}>
          Ajouter un lien
        </button>
      </fieldset>
      {error && (
        <p role="alert" className="error-text">
          {error}
        </p>
      )}
      <div className="card__footer card__footer--actions">
        <button type="button" className="secondary" onClick={handleCancel} disabled={busy}>
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
