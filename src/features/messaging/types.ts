export interface Participant {
  id: string
  fullName: string
  avatarUrl?: string
  headline?: string
}

export interface Message {
  id: string
  conversationId: string
  senderId: string
  content: string
  createdAt: string
  status: 'sent' | 'delivered' | 'read'
}

export interface Conversation {
  id: string
  participants: Participant[]
  lastMessage?: Message
  unreadCount: number
  updatedAt: string
}
