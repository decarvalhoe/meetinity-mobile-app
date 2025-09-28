import React, { useEffect } from 'react'
import ConversationsScreen from './ConversationsScreen'
import ChatScreen from './ChatScreen'
import { useAppStore } from '../../../store/AppStore'
import '../../shared.css'

const MessagingScreen: React.FC = () => {
  const { state, refreshConversations } = useAppStore()

  useEffect(() => {
    if (state.conversations.status === 'idle') {
      refreshConversations()
    }
  }, [state.conversations.status, refreshConversations])

  return (
    <section aria-labelledby="messaging-title">
      <h1 id="messaging-title">Messagerie</h1>
      <div className="messaging-grid">
        <ConversationsScreen />
        <ChatScreen />
      </div>
    </section>
  )
}

export default MessagingScreen
