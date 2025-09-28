export interface Participant {
  id: string
  fullName: string
  avatarUrl?: string
  headline?: string
}

export interface Attachment {
  id: string
  name: string
  size?: number
  mimeType?: string
  url?: string
  previewUrl?: string
  file?: File
  temporary?: boolean
}

export interface Message {
  id: string
  conversationId: string
  senderId: string
  content: string
  createdAt: string
  status: 'sent' | 'delivered' | 'read'
  attachments?: Attachment[]
  clientGeneratedId?: string
}

export interface Conversation {
  id: string
  participants: Participant[]
  lastMessage?: Message
  unreadCount: number
  updatedAt: string
}

export type PresenceStatus = 'online' | 'offline' | 'typing'

export interface PresenceUpdate {
  participantId: string
  status: PresenceStatus
  at: string
  conversationId?: string
}

export interface QueuedMessage {
  id: string
  conversationId: string
  clientGeneratedId: string
  content: string
  attachments: Attachment[]
  createdAt: string
  attempts: number
  status: 'queued' | 'sending' | 'failed'
  error?: string
}
