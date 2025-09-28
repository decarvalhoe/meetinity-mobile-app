import React, { useEffect, useMemo } from 'react'
import ConversationList from '../components/ConversationList'
import { useAppStore } from '../../../store/AppStore'
import '../../shared.css'

interface ConversationsScreenProps {
  onSelectConversation?: (conversationId: string) => void
}

const ConversationsScreen: React.FC<ConversationsScreenProps> = ({ onSelectConversation }) => {
  const { state, refreshConversations, setActiveConversation } = useAppStore()

  const sortedConversations = useMemo(() => {
    const conversations = state.conversations.data ?? []
    return [...conversations].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
  }, [state.conversations.data])

  const activeConversationId = state.activeConversationId ?? sortedConversations[0]?.id

  useEffect(() => {
    if (state.conversations.status === 'idle') {
      refreshConversations()
    }
  }, [state.conversations.status, refreshConversations])

  const handleSelectConversation = (conversationId: string) => {
    setActiveConversation(conversationId)
    onSelectConversation?.(conversationId)
  }

  const isOffline = typeof navigator !== 'undefined' && navigator.onLine === false

  return (
    <section className="messaging-conversations" aria-labelledby="conversations-title">
      <header className="messaging-conversations__header">
        <div>
          <h2 id="conversations-title">Conversations</h2>
          {sortedConversations.length > 0 && (
            <p className="messaging-conversations__meta">
              Dernière activité&nbsp;: {new Date(sortedConversations[0].updatedAt).toLocaleString()}
            </p>
          )}
        </div>
        <button type="button" className="secondary" onClick={refreshConversations} disabled={state.conversations.status === 'loading'}>
          {state.conversations.status === 'loading' ? 'Actualisation…' : 'Actualiser'}
        </button>
      </header>
      {isOffline && (
        <p role="status" className="messaging-conversations__offline">
          Mode hors ligne activé — affichage des conversations en cache
        </p>
      )}
      {state.conversations.status === 'error' && (
        <div className="error-state" role="alert">
          Impossible de récupérer les conversations. <button onClick={refreshConversations}>Réessayer</button>
        </div>
      )}
      {state.conversations.status === 'loading' && sortedConversations.length === 0 ? (
        <p className="loading">Chargement de vos conversations…</p>
      ) : sortedConversations.length === 0 ? (
        <p className="loading">Aucune conversation pour le moment. Engagez la discussion depuis l’onglet Découverte.</p>
      ) : (
        <ConversationList
          conversations={sortedConversations}
          activeConversationId={activeConversationId}
          onSelectConversation={handleSelectConversation}
        />
      )}
    </section>
  )
}

export default ConversationsScreen
