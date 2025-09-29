import React, { useEffect, useMemo } from 'react'
import ConversationList from '../components/ConversationList'
import { useAppStore } from '../../../store/AppStore'
import '../../shared.css'
import {
  ErrorState,
  LoadingState,
  OfflinePlaceholder,
  ScreenState,
  SkeletonBlock,
  useOnlineStatus,
} from '../../shared'

interface ConversationsScreenProps {
  onSelectConversation?: (conversationId: string) => void
}

const ConversationsScreen: React.FC<ConversationsScreenProps> = ({ onSelectConversation }) => {
  const { state, refreshConversations, setActiveConversation } = useAppStore()
  const isOnline = useOnlineStatus()

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
      {!isOnline && (
        <OfflinePlaceholder
          description="Les conversations existantes restent accessibles hors connexion."
          onRetry={refreshConversations}
        />
      )}
      {state.conversations.status === 'error' && (
        <ErrorState
          description={state.conversations.error ?? 'Impossible de récupérer les conversations.'}
          onRetry={refreshConversations}
        />
      )}
      {state.conversations.status === 'loading' && sortedConversations.length === 0 ? (
        <LoadingState
          title="Chargement de vos conversations"
          skeleton={
            <div className="skeleton-group">
              {[...Array(3)].map((_, index) => (
                <div key={index} className="skeleton-card">
                  <div className="skeleton-card__header">
                    <SkeletonBlock width={48} height={48} shape="circle" />
                    <div className="skeleton-group">
                      <SkeletonBlock height={14} width="65%" />
                      <SkeletonBlock height={12} width="35%" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          }
        />
      ) : sortedConversations.length === 0 ? (
        <ScreenState
          tone="info"
          title="Aucune conversation"
          description="Engagez la discussion depuis l’onglet Découverte pour voir apparaître vos correspondances ici."
        />
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
