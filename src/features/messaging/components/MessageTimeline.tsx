import React from 'react'
import type { Message, QueuedMessage } from '../types'
import '../../shared.css'

interface MessageTimelineProps {
  messages: Message[]
  currentUserId?: string
  pendingMessages?: QueuedMessage[]
  onRetry?: (queuedMessageId: string) => void
}

const resolveStatusLabel = (
  message: Message,
  pendingMessage?: QueuedMessage,
  isOutgoing?: boolean,
) => {
  if (!isOutgoing) {
    if (message.status === 'read') return 'Lu'
    if (message.status === 'delivered') return 'Reçu'
    return undefined
  }
  if (pendingMessage) {
    if (pendingMessage.status === 'failed') {
      return 'Échec de l’envoi'
    }
    if (pendingMessage.status === 'queued') {
      return 'En attente'
    }
    if (pendingMessage.status === 'sending') {
      return 'Envoi…'
    }
  }
  if (message.status === 'read') return 'Lu'
  if (message.status === 'delivered') return 'Livré'
  return 'Envoyé'
}

const MessageTimeline: React.FC<MessageTimelineProps> = ({ messages, currentUserId, pendingMessages, onRetry }) => (
  <ul className="list" aria-live="polite">
    {messages.map((message) => {
      const isOutgoing = message.senderId === currentUserId
      const pendingMessage = pendingMessages?.find(
        (pending) => pending.clientGeneratedId === message.clientGeneratedId,
      )
      const statusLabel = resolveStatusLabel(message, pendingMessage, isOutgoing)
      return (
        <li
          key={message.id}
          className={`message ${isOutgoing ? 'message--outgoing' : 'message--incoming'}`}
          aria-live={pendingMessage ? 'polite' : undefined}
        >
          <div className="message__content">
            <p>{message.content}</p>
            {message.attachments && message.attachments.length > 0 && (
              <ul className="message__attachments">
                {message.attachments.map((attachment) => (
                  <li key={attachment.id}>
                    {attachment.url || attachment.previewUrl ? (
                      <a href={attachment.url ?? attachment.previewUrl} target="_blank" rel="noreferrer">
                        {attachment.name}
                      </a>
                    ) : (
                      <span>{attachment.name}</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
            <span className="message__meta">
              {new Date(message.createdAt).toLocaleTimeString()} {statusLabel && `· ${statusLabel}`}
            </span>
            {pendingMessage?.status === 'failed' && onRetry && (
              <button type="button" className="link" onClick={() => onRetry(pendingMessage.id)}>
                Réessayer
              </button>
            )}
          </div>
        </li>
      )
    })}
  </ul>
)

export default MessageTimeline
