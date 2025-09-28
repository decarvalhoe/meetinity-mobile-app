import http from './http'
import type { Conversation, Message } from '../features/messaging/types'

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
  async sendMessage(token: string, conversationId: string, content: string): Promise<Message> {
    const response = await http.post<Message>(`/conversations/${conversationId}/messages`, { content }, withToken(token))
    return response.data
  },
}

export default messagingService
