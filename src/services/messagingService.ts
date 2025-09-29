import apiClient from './apiClient'
import type { Attachment, Conversation, Message } from '../features/messaging/types'

const messagingService = {
  async listConversations(): Promise<Conversation[]> {
    return apiClient.get<Conversation[]>('/conversations')
  },
  async listMessages(conversationId: string): Promise<Message[]> {
    return apiClient.get<Message[]>(`/conversations/${conversationId}/messages`)
  },
  async sendMessage(
    conversationId: string,
    content: string,
    attachments?: Attachment[],
  ): Promise<Message> {
    const payload: Record<string, unknown> = { content }
    if (attachments && attachments.length > 0) {
      payload.attachments = attachments.map((attachment) => ({
        id: attachment.id,
        name: attachment.name,
        size: attachment.size,
        mimeType: attachment.mimeType,
        url: attachment.url ?? attachment.previewUrl,
      }))
    }
    return apiClient.post<Message>(`/conversations/${conversationId}/messages`, payload)
  },
  async markConversationRead(conversationId: string): Promise<void> {
    await apiClient.post(`/conversations/${conversationId}/read`)
  },
}

export default messagingService
