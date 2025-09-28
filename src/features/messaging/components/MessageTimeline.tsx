import React from 'react'
import type { Message } from '../types'
import '../../shared.css'

interface MessageTimelineProps {
  messages: Message[]
  currentUserId?: string
}

const MessageTimeline: React.FC<MessageTimelineProps> = ({ messages, currentUserId }) => (
  <ul className="list" aria-live="polite">
    {messages.map((message) => (
      <li key={message.id} className={`message ${message.senderId === currentUserId ? 'message--outgoing' : 'message--incoming'}`}>
        <div className="message__content">
          <p>{message.content}</p>
          <span className="message__meta">{new Date(message.createdAt).toLocaleTimeString()}</span>
        </div>
      </li>
    ))}
  </ul>
)

export default MessageTimeline
