import React from 'react'
import type { Conversation } from '../types'
import '../../shared.css'

interface ConversationListProps {
  conversations: Conversation[]
  activeConversationId?: string
  onSelectConversation?: (conversationId: string) => void
}

const ConversationList: React.FC<ConversationListProps> = ({ conversations, activeConversationId, onSelectConversation }) => (
  <ul className="list">
    {conversations.map((conversation) => {
      const lastMessage = conversation.lastMessage
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
          </button>
        </li>
      )
    })}
  </ul>
)

export default ConversationList
