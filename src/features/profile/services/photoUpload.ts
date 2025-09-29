import apiClient from '../../../services/apiClient'
import { appCache } from '../../../lib/cache'
import type { AvatarCropSettings, AvatarUploadDraft } from '../types'

const AVATAR_UPLOAD_CACHE_KEY = 'profile:avatar-upload'

type StoredDraft = AvatarUploadDraft

export type PhotoUploadStatus = 'idle' | StoredDraft['status'] | 'complete'

export interface PhotoUploadState {
  status: PhotoUploadStatus
  draft: StoredDraft | null
  previewUrl?: string
  resumable?: boolean
  finalUrl?: string
  error?: string
}

const createId = (): string => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `avatar-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

const toBase64 = (buffer: ArrayBuffer): string =>
  typeof Buffer !== 'undefined'
    ? Buffer.from(buffer).toString('base64')
    : btoa(String.fromCharCode(...new Uint8Array(buffer)))

const readFileAsDataUrl = async (file: File): Promise<string> => {
  if (typeof FileReader !== 'undefined') {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result))
      reader.onerror = () => reject(reader.error ?? new Error('Impossible de lire le fichier sélectionné'))
      reader.readAsDataURL(file)
    })
  }

  try {
    const buffer = await file.arrayBuffer()
    const base64 = toBase64(buffer)
    const mime = file.type || 'application/octet-stream'
    return `data:${mime};base64,${base64}`
  } catch (error) {
    throw error instanceof Error
      ? error
      : new Error("Impossible de lire le fichier sélectionné")
  }
}

const writeDraft = (draft: StoredDraft): StoredDraft => {
  appCache.write(AVATAR_UPLOAD_CACHE_KEY, draft)
  return draft
}

const getDraft = (): StoredDraft | null => {
  const cached = appCache.read<StoredDraft>(AVATAR_UPLOAD_CACHE_KEY)
  return cached.value ?? null
}

const toState = (draft: StoredDraft | null, overrides: Partial<PhotoUploadState> = {}): PhotoUploadState => {
  if (!draft) {
    return { status: 'idle', draft: null, ...overrides }
  }
  return {
    status: draft.status,
    draft,
    previewUrl: draft.dataUrl,
    resumable: draft.status !== 'cropping',
    error: draft.error,
    ...overrides,
  }
}

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  return "Une erreur inattendue est survenue lors de l'upload de la photo"
}

const markUpdated = (draft: StoredDraft, patch: Partial<StoredDraft> = {}): StoredDraft => ({
  ...draft,
  ...patch,
  updatedAt: new Date().toISOString(),
})

const photoUpload = {
  getState(): PhotoUploadState {
    return toState(getDraft())
  },
  async select(file: File): Promise<PhotoUploadState> {
    const dataUrl = await readFileAsDataUrl(file)
    const draft: StoredDraft = {
      id: createId(),
      dataUrl,
      fileName: file.name,
      mimeType: file.type,
      size: file.size,
      crop: { x: 0, y: 0, width: 1, height: 1 },
      status: 'cropping',
      updatedAt: new Date().toISOString(),
    }
    writeDraft(draft)
    return toState(draft)
  },
  updateCrop(crop: AvatarCropSettings): PhotoUploadState {
    const draft = getDraft()
    if (!draft) {
      throw new Error('Aucune sélection de photo à recadrer')
    }
    const next = writeDraft(markUpdated(draft, { crop, status: 'cropping', error: undefined }))
    return toState(next)
  },
  confirmCrop(crop?: AvatarCropSettings): PhotoUploadState {
    const draft = getDraft()
    if (!draft) {
      throw new Error('Aucune sélection de photo à confirmer')
    }
    const next = writeDraft(
      markUpdated(draft, {
        crop: crop ?? draft.crop,
        status: 'ready',
        error: undefined,
      }),
    )
    return toState(next)
  },
  resume(): PhotoUploadState {
    const draft = getDraft()
    if (!draft) {
      return { status: 'idle', draft: null }
    }
    return toState(markUpdated(draft, {}))
  },
  reset(): PhotoUploadState {
    appCache.invalidate(AVATAR_UPLOAD_CACHE_KEY)
    return { status: 'idle', draft: null }
  },
  async upload(): Promise<{ url: string; state: PhotoUploadState }> {
    const draft = getDraft()
    if (!draft) {
      throw new Error('Aucun avatar prêt à être importé')
    }
    if (!draft.dataUrl) {
      throw new Error("La sélection d'avatar est invalide")
    }
    const pending = writeDraft(markUpdated(draft, { status: 'uploading', error: undefined }))
    try {
      const response = await apiClient.post<{ url: string }>('/profile/avatar', {
        image: pending.dataUrl,
        crop: pending.crop,
        fileName: pending.fileName,
        mimeType: pending.mimeType,
        size: pending.size,
      })
      appCache.invalidate(AVATAR_UPLOAD_CACHE_KEY)
      return {
        url: response.url,
        state: {
          status: 'complete',
          draft: markUpdated(pending, { status: 'ready' }),
          previewUrl: pending.dataUrl,
          finalUrl: response.url,
        },
      }
    } catch (error) {
      const message = getErrorMessage(error)
      const next = writeDraft(markUpdated(pending, { status: 'ready', error: message }))
      throw Object.assign(new Error(message), { cause: error, state: toState(next) })
    }
  },
}

export default photoUpload
