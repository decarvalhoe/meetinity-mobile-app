import React, { useState } from 'react'
import '../../shared.css'

interface MessageComposerProps {
  onSend: (message: string) => Promise<void>
  disabled?: boolean
}

const MessageComposer: React.FC<MessageComposerProps> = ({ onSend, disabled }) => {
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!message.trim()) return
    setBusy(true)
    setError(null)
    try {
      await onSend(message)
      setMessage('')
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="composer" onSubmit={handleSubmit}>
      <textarea
        rows={2}
        value={message}
        onChange={(event) => setMessage(event.target.value)}
        placeholder="Écrire un message"
        disabled={disabled || busy}
      />
      <button type="submit" className="primary" disabled={disabled || busy}>
        {busy ? 'Envoi…' : 'Envoyer'}
      </button>
      {error && <p role="alert" className="error-text">{error}</p>}
    </form>
  )
}

export default MessageComposer
