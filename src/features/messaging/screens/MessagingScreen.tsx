import React, { useEffect } from 'react'
import ConversationList from '../components/ConversationList'
import MessageComposer from '../components/MessageComposer'
import MessageTimeline from '../components/MessageTimeline'
import { useAppStore } from '../../../store/AppStore'
import { useAuth } from '../../../auth/AuthContext'
import '../../shared.css'

const MessagingScreen: React.FC = () => {
  const { state, refreshConversations, loadMessages, sendMessage, setActiveConversation } = useAppStore()
  const { user } = useAuth()
  const activeConversationId = state.activeConversationId ?? state.conversations.data[0]?.id ?? null
  const messages = activeConversationId ? state.messages[activeConversationId] ?? [] : []

  useEffect(() => {
    if (state.conversations.status === 'idle') {
      refreshConversations()
    }
  }, [state.conversations.status, refreshConversations])

  useEffect(() => {
    if (activeConversationId && messages.length === 0) {
      loadMessages(activeConversationId)
    }
  }, [activeConversationId, messages.length, loadMessages])

  if (state.conversations.status === 'loading' && state.conversations.data.length === 0) {
    return <div className="loading">Chargement des conversations…</div>
  }

  if (state.conversations.status === 'error') {
    return (
      <div className="error-state" role="alert">
        Impossible de récupérer les conversations. <button onClick={refreshConversations}>Réessayer</button>
      </div>
    )
  }

  return (
    <section aria-labelledby="messaging-title">
      <h1 id="messaging-title">Messagerie</h1>
      {state.conversations.data.length === 0 ? (
        <p className="loading">Aucune conversation pour le moment. Découvrez des profils pour démarrer un échange.</p>
      ) : (
        <div className="messaging-grid">
          <ConversationList
            conversations={state.conversations.data}
            activeConversationId={activeConversationId ?? undefined}
            onSelectConversation={(id) => {
              setActiveConversation(id)
              loadMessages(id)
            }}
          />
          {activeConversationId && (
            <div className="conversation-panel">
              <MessageTimeline messages={messages} currentUserId={user?.id} />
              <MessageComposer onSend={(content) => sendMessage(activeConversationId, content)} />
            </div>
          )}
        </div>
      )}
    </section>
  )
}

export default MessagingScreen
