import React, { useEffect, useMemo } from 'react'
import MessageTimeline from '../components/MessageTimeline'
import MessageComposer from '../components/MessageComposer'
import { useAppStore } from '../../../store/AppStore'
import { useAuth } from '../../../auth/AuthContext'
import type { Attachment } from '../types'
import '../../shared.css'
import { OfflinePlaceholder, ScreenState, useOnlineStatus } from '../../shared'

interface ChatScreenProps {
  conversationId?: string
}

const formatPresence = (status?: string) => {
  switch (status) {
    case 'typing':
      return 'En train d’écrire…'
    case 'online':
      return 'En ligne'
    case 'offline':
      return 'Hors ligne'
    default:
      return 'Statut inconnu'
  }
}

const ChatScreen: React.FC<ChatScreenProps> = ({ conversationId }) => {
  const { state, loadMessages, sendMessage, markConversationRead, retryMessage, setTypingState } = useAppStore()
  const { user } = useAuth()
  const isOnline = useOnlineStatus()

  const activeConversationId = conversationId ?? state.activeConversationId ?? state.conversations.data[0]?.id ?? null
  const conversation = useMemo(
    () => state.conversations.data.find((item) => item.id === activeConversationId),
    [state.conversations.data, activeConversationId],
  )
  const messages = activeConversationId ? state.messages[activeConversationId] ?? [] : []
  const pendingMessages = state.pendingMessages.filter((item) => item.conversationId === activeConversationId)

  useEffect(() => {
    if (!activeConversationId) return
    if (messages.length === 0) {
      void loadMessages(activeConversationId)
    }
    markConversationRead(activeConversationId)
  }, [activeConversationId, loadMessages, messages.length, markConversationRead])

  useEffect(() => {
    if (!activeConversationId) return
    markConversationRead(activeConversationId)
  }, [activeConversationId, state.messagingRealtime.status, markConversationRead])

  const handleSend = async (content: string, attachments?: Attachment[]) => {
    if (!activeConversationId) return
    await sendMessage(activeConversationId, content, attachments)
    setTypingState(activeConversationId, false)
  }

  const handleTyping = (typing: boolean) => {
    if (!activeConversationId) return
    setTypingState(activeConversationId, typing)
  }

  const handleRetry = (queuedMessageId: string) => {
    retryMessage(queuedMessageId)
  }

  if (!activeConversationId || !conversation) {
    return (
      <section className="conversation-panel">
        <ScreenState
          tone="info"
          title="Aucune conversation sélectionnée"
          description="Choisissez un fil de discussion pour afficher les messages."
        />
      </section>
    )
  }

  const otherParticipants = conversation.participants.filter((participant) => participant.id !== user?.id)
  const presence = otherParticipants.map((participant) => ({
    participant,
    status: state.messagingRealtime.presence[participant.id]?.status,
  }))

  return (
    <section className="conversation-panel" aria-labelledby="chat-title">
      <header className="messaging-conversations__header">
        <div>
          <h2 id="chat-title">{otherParticipants.map((participant) => participant.fullName).join(', ')}</h2>
          {presence.length > 0 && (
            <p className="messaging-conversations__meta">
              {presence.map(({ participant, status }) => `${participant.fullName} · ${formatPresence(status)}`).join(' — ')}
            </p>
          )}
        </div>
        <span className="messaging-conversations__meta">
          Session&nbsp;: {state.messagingRealtime.status}
        </span>
      </header>
      {!isOnline && (
        <OfflinePlaceholder
          description="Vous pouvez continuer à écrire vos messages, ils seront envoyés à la reconnexion."
          retryLabel="Vérifier la connexion"
          onRetry={() => loadMessages(activeConversationId)}
        />
      )}
      <MessageTimeline
        messages={messages}
        currentUserId={user?.id}
        pendingMessages={pendingMessages}
        onRetry={handleRetry}
      />
      <MessageComposer
        onSend={handleSend}
        disabled={state.messagingRealtime.status === 'disconnected'}
        pendingCount={pendingMessages.filter((item) => item.status !== 'failed').length}
        onTyping={handleTyping}
      />
    </section>
  )
}

export default ChatScreen
