import type { ProfileDraft, ProfileLink } from './types'

export const BIO_MAX_LENGTH = 280

export interface ProfileLinkValidationErrors {
  label?: string
  url?: string
}

export interface ProfileValidationErrors {
  fullName?: string
  headline?: string
  bio?: string
  interests?: string
  discoveryRadiusKm?: string
  links?: Array<ProfileLinkValidationErrors | undefined>
}

export interface ProfileValidationResult {
  isValid: boolean
  errors: ProfileValidationErrors
}

const isNonEmpty = (value: string | undefined | null): boolean => {
  if (value == null) return false
  return value.trim().length > 0
}

const hasLinkContent = (link: ProfileLink): boolean => {
  const label = link.label ?? ''
  const url = link.url ?? ''
  return label.trim().length > 0 || url.trim().length > 0
}

const isValidHttpUrl = (value: string): boolean => {
  try {
    const parsed = new URL(value)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

export const validateProfileDraft = (draft: ProfileDraft): ProfileValidationResult => {
  const errors: ProfileValidationErrors = {}

  if (!isNonEmpty(draft.profile.fullName)) {
    errors.fullName = 'Le nom complet est requis.'
  }

  if (!isNonEmpty(draft.profile.headline)) {
    errors.headline = 'Le titre est requis.'
  }

  const interests = draft.profile.interests ?? []
  const hasInterests = interests.some((interest) => interest.trim().length > 0)
  if (!hasInterests) {
    errors.interests = 'Ajoutez au moins un intérêt.'
  }

  const bioLength = draft.profile.bio?.length ?? 0
  if (bioLength > BIO_MAX_LENGTH) {
    errors.bio = `La bio ne doit pas dépasser ${BIO_MAX_LENGTH} caractères.`
  }

  const radius = draft.preferences.discoveryRadiusKm
  if (radius != null) {
    if (!Number.isFinite(radius) || radius <= 0) {
      errors.discoveryRadiusKm = 'Indiquez un rayon valide (en kilomètres).'
    }
  }

  const links = draft.profile.links ?? []
  const linkErrors = links.map<ProfileLinkValidationErrors | undefined>((link) => {
    if (!hasLinkContent(link)) {
      return undefined
    }

    const trimmedLabel = link.label?.trim() ?? ''
    const trimmedUrl = link.url?.trim() ?? ''
    const entryErrors: ProfileLinkValidationErrors = {}

    if (trimmedLabel.length === 0) {
      entryErrors.label = 'Ajoutez un libellé.'
    }

    if (trimmedUrl.length === 0) {
      entryErrors.url = 'Ajoutez une URL.'
    } else if (!isValidHttpUrl(trimmedUrl)) {
      entryErrors.url = "L'URL doit être valide."
    }

    return Object.keys(entryErrors).length > 0 ? entryErrors : undefined
  })

  if (linkErrors.some((error) => error !== undefined)) {
    errors.links = linkErrors
  }

  return {
    errors,
    isValid: Object.keys(errors).length === 0,
  }
}
