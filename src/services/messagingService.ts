import http from './http'
import type { Attachment, Conversation, Message } from '../features/messaging/types'

const withToken = (token: string) => ({
  headers: {
    Authorization: `Bearer ${token}`,
  },
})

const messagingService = {
  async listConversations(token: string): Promise<Conversation[]> {
    const response = await http.get<Conversation[]>('/conversations', withToken(token))
    return response.data
  },
  async listMessages(token: string, conversationId: string): Promise<Message[]> {
    const response = await http.get<Message[]>(`/conversations/${conversationId}/messages`, withToken(token))
    return response.data
  },
  async sendMessage(
    token: string,
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
    const response = await http.post<Message>(`/conversations/${conversationId}/messages`, payload, withToken(token))
    return response.data
  },
  async markConversationRead(token: string, conversationId: string): Promise<void> {
    await http.post(`/conversations/${conversationId}/read`, undefined, withToken(token))
  },
}

export default messagingService
