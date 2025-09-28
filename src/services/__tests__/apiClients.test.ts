import { beforeEach, describe, expect, it, vi } from 'vitest'
import http from '../http'
import profileService from '../profileService'
import matchingService from '../matchingService'
import eventsService from '../eventsService'
import messagingService from '../messagingService'

vi.mock('../http', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
  },
}))

type HttpMock = {
  get: ReturnType<typeof vi.fn>
  post: ReturnType<typeof vi.fn>
  put: ReturnType<typeof vi.fn>
}

const mockedHttp = http as unknown as HttpMock

const token = 'test-token'

describe('API clients', () => {
  beforeEach(() => {
    mockedHttp.get.mockReset()
    mockedHttp.post.mockReset()
    mockedHttp.put.mockReset()
  })

  it('fetches profile with authorization header', async () => {
    const profile = { id: 'user-1' }
    mockedHttp.get.mockResolvedValue({ data: profile })

    const result = await profileService.getProfile(token)

    expect(mockedHttp.get).toHaveBeenCalledWith('/profile', expect.objectContaining({
      headers: expect.objectContaining({ Authorization: `Bearer ${token}` }),
    }))
    expect(result).toEqual(profile)
  })

  it('updates profile using PUT', async () => {
    const updated = { id: 'user-1', fullName: 'Jane' }
    mockedHttp.put.mockResolvedValue({ data: updated })

    const result = await profileService.updateProfile(token, { fullName: 'Jane' })

    expect(mockedHttp.put).toHaveBeenCalledWith('/profile', { fullName: 'Jane' }, expect.anything())
    expect(result).toEqual(updated)
  })

  it('requests match suggestions', async () => {
    mockedHttp.get.mockResolvedValue({ data: [] })

    await matchingService.getSuggestions(token)

    expect(mockedHttp.get).toHaveBeenCalledWith('/matches', expect.anything())
  })

  it('accepts a match via POST', async () => {
    mockedHttp.post.mockResolvedValue({})

    await matchingService.accept(token, 'match-1')

    expect(mockedHttp.post).toHaveBeenCalledWith('/matches/match-1/accept', undefined, expect.anything())
  })

  it('lists events', async () => {
    mockedHttp.get.mockResolvedValue({ data: [] })

    await eventsService.list(token)

    expect(mockedHttp.get).toHaveBeenCalledWith('/events', expect.anything())
  })

  it('joins an event', async () => {
    mockedHttp.post.mockResolvedValue({})

    await eventsService.join(token, 'event-1')

    expect(mockedHttp.post).toHaveBeenCalledWith('/events/event-1/join', undefined, expect.anything())
  })

  it('lists conversations and messages', async () => {
    mockedHttp.get.mockResolvedValueOnce({ data: [] })
    mockedHttp.get.mockResolvedValueOnce({ data: [] })

    await messagingService.listConversations(token)
    await messagingService.listMessages(token, 'conv-1')

    expect(mockedHttp.get).toHaveBeenNthCalledWith(1, '/conversations', expect.anything())
    expect(mockedHttp.get).toHaveBeenNthCalledWith(2, '/conversations/conv-1/messages', expect.anything())
  })

  it('sends a message', async () => {
    const message = { id: 'msg-1' }
    mockedHttp.post.mockResolvedValue({ data: message })

    const result = await messagingService.sendMessage(token, 'conv-1', 'Hello')

    expect(mockedHttp.post).toHaveBeenCalledWith(
      '/conversations/conv-1/messages',
      { content: 'Hello' },
      expect.anything(),
    )
    expect(result).toEqual(message)
  })
})
