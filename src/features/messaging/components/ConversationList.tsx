import React from 'react'
import type { Conversation } from '../types'
import '../../shared.css'

interface ConversationListProps {
  conversations: Conversation[]
  activeConversationId?: string
  onSelectConversation?: (conversationId: string) => void
}

const ConversationListComponent: React.FC<ConversationListProps> = ({
  conversations,
  activeConversationId,
  onSelectConversation,
}) => (
  <ul className="list">
    {conversations.map((conversation) => {
      const lastMessage = conversation.lastMessage
      const lastUpdate = new Date(conversation.updatedAt)
      return (
        <li key={conversation.id}>
          <button
            type="button"
            className={`list__item ${conversation.id === activeConversationId ? 'list__item--active' : ''}`}
            onClick={() => onSelectConversation?.(conversation.id)}
          >
            <div className="list__item-header">
              <strong>{conversation.participants.map((participant) => participant.fullName).join(', ')}</strong>
              {conversation.unreadCount > 0 && <span className="badge">{conversation.unreadCount}</span>}
            </div>
            {lastMessage && <p className="list__item-subtitle">{lastMessage.content}</p>}
            <p className="list__item-subtitle" aria-label={`Mis à jour le ${lastUpdate.toLocaleString()}`}>
              {lastUpdate.toLocaleTimeString()} · {conversation.unreadCount} non lus
            </p>
          </button>
        </li>
      )
    })}
  </ul>
)

const ConversationList = React.memo(
  ConversationListComponent,
  (prev, next) => {
    if (prev.activeConversationId !== next.activeConversationId) return false
    if (prev.onSelectConversation !== next.onSelectConversation) return false
    if (prev.conversations.length !== next.conversations.length) return false
    for (let index = 0; index < prev.conversations.length; index += 1) {
      if (prev.conversations[index] !== next.conversations[index]) {
        return false
      }
    }
    return true
  },
)

export default ConversationList
