import { beforeEach, describe, expect, it, vi } from 'vitest'
import apiClient from '../apiClient'
import profileService from '../profileService'
import matchingService from '../matchingService'
import eventsService from '../eventsService'
import messagingService from '../messagingService'

vi.mock('../apiClient', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
  },
}))

type ApiClientMock = {
  get: ReturnType<typeof vi.fn>
  post: ReturnType<typeof vi.fn>
  put: ReturnType<typeof vi.fn>
}

const mockedClient = apiClient as unknown as ApiClientMock

describe('API clients', () => {
  beforeEach(() => {
    mockedClient.get.mockReset()
    mockedClient.post.mockReset()
    mockedClient.put.mockReset()
  })

  it('fetches profile with authorization header', async () => {
    const profile = { id: 'user-1' }
    mockedClient.get.mockResolvedValue(profile)

    const result = await profileService.getProfile()

    expect(mockedClient.get).toHaveBeenCalledWith('/profile')
    expect(result).toEqual(profile)
  })

  it('updates profile using PUT', async () => {
    const updated = { id: 'user-1', fullName: 'Jane' }
    mockedClient.put.mockResolvedValue(updated)

    const result = await profileService.updateProfile({ fullName: 'Jane' })

    expect(mockedClient.put).toHaveBeenCalledWith('/profile', { fullName: 'Jane' })
    expect(result).toEqual(updated)
  })

  it('requests match suggestions', async () => {
    mockedClient.get.mockResolvedValue([])

    await matchingService.getSuggestions()

    expect(mockedClient.get).toHaveBeenCalledWith('/matches')
  })

  it('accepts a match via POST', async () => {
    mockedClient.post.mockResolvedValue(undefined)

    await matchingService.accept('match-1')

    expect(mockedClient.post).toHaveBeenCalledWith('/matches/match-1/accept')
  })

  it('lists events', async () => {
    mockedClient.get.mockResolvedValue({ items: [], page: 1, pageSize: 20, total: 0, hasMore: false })

    await eventsService.list()

    expect(mockedClient.get).toHaveBeenCalledWith('/events', { params: undefined })
  })

  it('joins an event', async () => {
    mockedClient.post.mockResolvedValue(undefined)

    await eventsService.join('event-1')

    expect(mockedClient.post).toHaveBeenCalledWith('/events/event-1/join')
  })

  it('lists conversations and messages', async () => {
    mockedClient.get.mockResolvedValueOnce([])
    mockedClient.get.mockResolvedValueOnce([])

    await messagingService.listConversations()
    await messagingService.listMessages('conv-1')

    expect(mockedClient.get).toHaveBeenNthCalledWith(1, '/conversations')
    expect(mockedClient.get).toHaveBeenNthCalledWith(2, '/conversations/conv-1/messages')
  })

  it('sends a message', async () => {
    const message = { id: 'msg-1' }
    mockedClient.post.mockResolvedValue(message)

    const result = await messagingService.sendMessage('conv-1', 'Hello')

    expect(mockedClient.post).toHaveBeenCalledWith('/conversations/conv-1/messages', { content: 'Hello' })
    expect(result).toEqual(message)
  })
})
