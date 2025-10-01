import type { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiClient } from '../apiClient'

type RequestMock = ReturnType<typeof vi.fn>

const createMockAxiosInstance = (requestMock: RequestMock): AxiosInstance => {
  return {
    defaults: {
      baseURL: 'http://test.local',
      headers: {},
    },
    interceptors: {
      request: {
        use: vi.fn(),
        eject: vi.fn(),
      },
      response: {
        use: vi.fn(),
        eject: vi.fn(),
      },
    },
    request: requestMock,
  } as unknown as AxiosInstance
}

const createAxiosResponse = <T>(data: T, config: AxiosRequestConfig): AxiosResponse<T> => ({
  data,
  status: 200,
  statusText: 'OK',
  headers: {},
  config,
})

const createAxiosError = (overrides: Partial<{ code: string; status: number }>): Error & {
  isAxiosError: true
  code?: string
  response?: { status: number }
} => {
  const error = new Error('axios error') as Error & {
    isAxiosError: true
    code?: string
    response?: { status: number }
  }
  error.isAxiosError = true
  if (overrides.code) {
    error.code = overrides.code
  }
  if (overrides.status) {
    error.response = { status: overrides.status }
  }
  return error
}

describe('ApiClient request manager', () => {
  let requestMock: RequestMock
  let client: AxiosInstance

  beforeEach(() => {
    requestMock = vi.fn()
    client = createMockAxiosInstance(requestMock)
  })

  afterEach(() => {
    vi.clearAllMocks()
    vi.useRealTimers()
  })

  it('deduplicates identical pending requests and exposes inspection helpers', async () => {
    let capturedConfig: AxiosRequestConfig | undefined
    let resolveRequest: (value: AxiosResponse<{ ok: boolean }>) => void = () => {
      throw new Error('resolveRequest not set')
    }

    requestMock.mockImplementation((config) => {
      capturedConfig = config
      return new Promise<AxiosResponse<{ ok: boolean }>>((resolve) => {
        resolveRequest = resolve
      })
    })

    const api = new ApiClient(client)
    const first = api.get<{ ok: boolean }>('/resource', { params: { q: '1' } })
    const second = api.get<{ ok: boolean }>('/resource', { params: { q: '1' } })

    expect(requestMock).toHaveBeenCalledTimes(1)

    const pending = api.getPendingRequests()
    expect(pending).toHaveLength(1)
    const [{ key, subscribers, config: pendingConfig }] = pending
    expect(subscribers).toBe(2)
    expect(key).toBe('GET:/resource?{q:1}')
    expect(pendingConfig.url).toBe('/resource')

    resolveRequest(createAxiosResponse({ ok: true }, capturedConfig!))

    await expect(first).resolves.toEqual({ ok: true })
    await expect(second).resolves.toEqual({ ok: true })
    expect(api.getPendingRequests()).toHaveLength(0)
  })

  it('allows cancelling a pending request by key', async () => {
    requestMock.mockImplementation((config) => {
      return new Promise<AxiosResponse<unknown>>((_, reject) => {
        const signal = config.signal
        if (signal?.aborted) {
          reject(signal.reason ?? new Error('aborted'))
          return
        }
        const onAbort = () => {
          signal?.removeEventListener('abort', onAbort)
          reject(signal?.reason ?? new Error('aborted'))
        }
        signal?.addEventListener('abort', onAbort)
      })
    })

    const api = new ApiClient(client)
    const promise = api.get('/resource', { params: { q: '1' } })
    const [{ key }] = api.getPendingRequests()

    expect(api.hasPendingRequest(key)).toBe(true)
    const reason = new Error('Cancelled by test')
    expect(api.cancelPendingRequest(key, reason)).toBe(true)
    await expect(promise).rejects.toBe(reason)
    expect(api.getPendingRequests()).toHaveLength(0)
  })

  it('retries transient errors with exponential backoff before succeeding', async () => {
    vi.useFakeTimers()

    requestMock
      .mockImplementationOnce((config) =>
        Promise.reject(createAxiosError({ code: 'ECONNRESET' })),
      )
      .mockImplementationOnce((config) =>
        Promise.reject(createAxiosError({ status: 503 })),
      )
      .mockImplementationOnce((config) => Promise.resolve(createAxiosResponse({ ok: true }, config)))

    const api = new ApiClient(client)
    const resultPromise = api.get<{ ok: boolean }>('/resource')

    expect(requestMock).toHaveBeenCalledTimes(1)

    await vi.advanceTimersByTimeAsync(200)
    await Promise.resolve()
    expect(requestMock).toHaveBeenCalledTimes(2)

    await vi.advanceTimersByTimeAsync(400)
    await Promise.resolve()
    expect(requestMock).toHaveBeenCalledTimes(3)

    await expect(resultPromise).resolves.toEqual({ ok: true })
    expect(api.getPendingRequests()).toHaveLength(0)
  })
})
