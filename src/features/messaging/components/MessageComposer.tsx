import React, { useMemo, useRef, useState } from 'react'
import type { Attachment } from '../types'
import '../../shared.css'

interface MessageComposerProps {
  onSend: (message: string, attachments?: Attachment[]) => Promise<void>
  disabled?: boolean
  pendingCount?: number
  onTyping?: (typing: boolean) => void
}

const createAttachmentId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `att-${Math.random().toString(36).slice(2)}`
}

const MessageComposer: React.FC<MessageComposerProps> = ({ onSend, disabled, pendingCount, onTyping }) => {
  const [message, setMessage] = useState('')
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)

  const hasContent = message.trim().length > 0 || attachments.length > 0

  const handleFiles = (files: FileList | null) => {
    if (!files) return
    const next: Attachment[] = Array.from(files).map((file) => ({
      id: createAttachmentId(),
      name: file.name,
      size: file.size,
      mimeType: file.type,
      file,
      temporary: true,
    }))
    setAttachments((current) => [...current, ...next])
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!hasContent) return
    setBusy(true)
    setError(null)
    try {
      await onSend(message, attachments)
      setMessage('')
      setAttachments((current) => {
        current.forEach((attachment) => {
          if (attachment.previewUrl && typeof URL !== 'undefined') {
            URL.revokeObjectURL(attachment.previewUrl)
          }
        })
        return []
      })
      if (inputRef.current) {
        inputRef.current.value = ''
      }
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
      onTyping?.(false)
    }
  }

  const handleChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(event.target.value)
    onTyping?.(event.target.value.trim().length > 0)
  }

  const handleFileInput = (event: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(event.target.files)
    event.target.value = ''
  }

  const handleRemoveAttachment = (id: string) => {
    setAttachments((current) => current.filter((attachment) => attachment.id !== id))
  }

  const disableSubmission = disabled || busy

  const attachmentSummary = useMemo(() => {
    if (attachments.length === 0) return null
    const totalSize = attachments.reduce((total, attachment) => total + (attachment.size ?? 0), 0)
    return `${attachments.length} pièce${attachments.length > 1 ? 's' : ''} jointe${
      attachments.length > 1 ? 's' : ''
    } · ${(totalSize / 1024).toFixed(1)} Ko`
  }, [attachments])

  return (
    <form className="composer" onSubmit={handleSubmit}>
      <textarea
        rows={2}
        value={message}
        onChange={handleChange}
        placeholder="Écrire un message"
        disabled={disableSubmission}
      />
      <div className="composer__actions">
        <label className="secondary" aria-label="Ajouter des pièces jointes">
          <input
            ref={inputRef}
            type="file"
            multiple
            onChange={handleFileInput}
            disabled={disableSubmission}
            style={{ display: 'none' }}
          />
          Joindre
        </label>
        <button type="submit" className="primary" disabled={disableSubmission || !hasContent}>
          {busy ? 'Envoi…' : 'Envoyer'}
        </button>
      </div>
      {pendingCount && pendingCount > 0 && (
        <p className="composer__hint">{pendingCount} message(s) en attente d&apos;envoi</p>
      )}
      {attachments.length > 0 && (
        <ul className="composer__attachments">
          {attachments.map((attachment) => (
            <li key={attachment.id}>
              <span>{attachment.name}</span>
              <button
                type="button"
                className="link"
                onClick={() => handleRemoveAttachment(attachment.id)}
                aria-label={`Retirer ${attachment.name}`}
              >
                Retirer
              </button>
            </li>
          ))}
        </ul>
      )}
      {attachmentSummary && <p className="composer__hint">{attachmentSummary}</p>}
      {error && <p role="alert" className="error-text">{error}</p>}
    </form>
  )
}

export default MessageComposer
