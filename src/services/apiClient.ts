import type { Buffer } from 'buffer'
import axios, {
  type AxiosInstance,
  type AxiosRequestConfig,
  type AxiosResponse,
} from 'axios'
import {
  AUTH_REFRESH_TOKEN_STORAGE_KEY,
  AUTH_TOKEN_EXPIRY_STORAGE_KEY,
  AUTH_TOKEN_STORAGE_KEY,
} from '../auth/constants'
const DEFAULT_TIMEOUT = Number.parseInt(import.meta.env.VITE_API_TIMEOUT ?? '30000', 10)
const REFRESH_THRESHOLD = Number.parseInt(import.meta.env.VITE_TOKEN_REFRESH_THRESHOLD ?? '120000', 10)

interface RetryOptions {
  maxRetries: number
  initialDelayMs: number
  maxDelayMs: number
}

const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxRetries: 2,
  initialDelayMs: 200,
  maxDelayMs: 2000,
}

interface CachedTokenMetadata {
  expiresAt: number | null
}

interface TokenUpdate {
  accessToken: string
  refreshToken?: string | null
  expiresIn?: number | null
  expiresAt?: number | null
}

type AuthErrorListener = (error: unknown) => void

type ManagedAxiosRequestConfig<T = unknown> = AxiosRequestConfig<T> & {
  skipDedupe?: boolean
  dedupeKey?: string
  retry?: Partial<RetryOptions>
}

interface PendingRequestEntry<T = unknown> {
  key: string
  promise: Promise<AxiosResponse<T>>
  cancel: (reason?: string | Error) => void
  config: AxiosRequestConfig<T>
  subscribers: number
}

const decodeBase64 = (value: string) => {
  if (typeof globalThis.atob === 'function') {
    return globalThis.atob(value)
  }
  const bufferCtor: typeof Buffer | undefined = (globalThis as { Buffer?: typeof Buffer }).Buffer
  if (bufferCtor) {
    return bufferCtor.from(value, 'base64').toString('binary')
  }
  throw new Error('No base64 decoder available in current environment')
}

const decodeJwtExpiry = (token: string): number | null => {
  const parts = token.split('.')
  if (parts.length < 2) return null
  try {
    const normalized = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const payload = JSON.parse(decodeBase64(normalized))
    if (typeof payload.exp === 'number') {
      return payload.exp * 1000
    }
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn('Unable to decode JWT payload for expiry metadata', error)
    }
  }
  return null
}

const getLocalStorage = () => {
  if (typeof window === 'undefined' || !window.localStorage) {
    return null
  }
  return window.localStorage
}

class ApiClient {
  private readonly client: AxiosInstance

  private refreshPromise: Promise<string | null> | null = null

  private readonly authErrorListeners = new Set<AuthErrorListener>()

  private readonly cache: { token: string | null; metadata: CachedTokenMetadata }

  private readonly pendingRequests = new Map<string, PendingRequestEntry<unknown>>()

  constructor(client?: AxiosInstance) {
    this.client =
      client ??
      axios.create({
        baseURL: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080',
        timeout: DEFAULT_TIMEOUT,
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'X-Client-Version': import.meta.env.VITE_APP_VERSION ?? '1.0.0',
          'X-Client-Platform': 'web',
        },
      })
    this.cache = {
      token: this.readStoredToken(),
      metadata: {
        expiresAt: this.readStoredExpiry(),
      },
    }
    this.setupInterceptors()
  }

  private setupInterceptors() {
    this.client.interceptors.request.use(async (config) => {
      const token = this.getAccessToken()
      if (token) {
        config.headers = config.headers ?? {}
        config.headers.Authorization = `Bearer ${token}`
      }
      if (token && this.shouldRefreshSoon()) {
        try {
          const refreshed = await this.refreshAccessToken()
          if (refreshed) {
            config.headers = config.headers ?? {}
            config.headers.Authorization = `Bearer ${refreshed}`
          }
        } catch (error) {
          this.notifyAuthError(error)
        }
      }
      return config
    })

    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        const { response, config } = error
        if (response?.status === 401 && config && !config.__isRetryRequest) {
          config.__isRetryRequest = true
          try {
            const token = await this.refreshAccessToken()
            if (token) {
              config.headers = config.headers ?? {}
              config.headers.Authorization = `Bearer ${token}`
              return this.client(config)
            }
          } catch (refreshError) {
            this.notifyAuthError(refreshError)
            throw refreshError
          }
        }
        throw error
      },
    )
  }

  get axios(): AxiosInstance {
    return this.client
  }

  getPendingRequests(): Array<{ key: string; subscribers: number; config: AxiosRequestConfig }> {
    return Array.from(this.pendingRequests.values()).map(({ key, subscribers, config }) => ({
      key,
      subscribers,
      config,
    }))
  }

  hasPendingRequest(key: string): boolean {
    return this.pendingRequests.has(key)
  }

  cancelPendingRequest(key: string, reason?: string | Error): boolean {
    const entry = this.pendingRequests.get(key)
    if (!entry) {
      return false
    }
    entry.cancel(reason)
    this.pendingRequests.delete(key)
    return true
  }

  cancelAllPendingRequests(reason?: string | Error) {
    for (const [key, entry] of Array.from(this.pendingRequests.entries())) {
      entry.cancel(reason)
      this.pendingRequests.delete(key)
    }
  }

  addAuthErrorListener(listener: AuthErrorListener) {
    this.authErrorListeners.add(listener)
    return () => {
      this.authErrorListeners.delete(listener)
    }
  }

  getAccessToken(): string | null {
    if (this.cache.token) {
      return this.cache.token
    }
    const stored = this.readStoredToken()
    this.cache.token = stored
    return stored
  }

  async get<T>(url: string, config?: ManagedAxiosRequestConfig): Promise<T> {
    const response = await this.sendRequest<T>({
      ...(config ?? {}),
      method: 'get',
      url,
    })
    return response.data
  }

  async post<T>(url: string, data?: unknown, config?: ManagedAxiosRequestConfig): Promise<T> {
    const response = await this.sendRequest<T>({
      ...(config ?? {}),
      method: 'post',
      url,
      data,
    })
    return response.data
  }

  async put<T>(url: string, data?: unknown, config?: ManagedAxiosRequestConfig): Promise<T> {
    const response = await this.sendRequest<T>({
      ...(config ?? {}),
      method: 'put',
      url,
      data,
    })
    return response.data
  }

  async delete<T>(url: string, config?: ManagedAxiosRequestConfig): Promise<T> {
    const response = await this.sendRequest<T>({
      ...(config ?? {}),
      method: 'delete',
      url,
    })
    return response.data
  }

  async request<T = unknown>(config: ManagedAxiosRequestConfig<T>): Promise<AxiosResponse<T>> {
    return this.sendRequest<T>(config)
  }

  setTokens(update: TokenUpdate) {
    const storage = getLocalStorage()
    this.cache.token = update.accessToken
    const expiresAt =
      update.expiresAt ??
      (typeof update.expiresIn === 'number' ? Date.now() + update.expiresIn * 1000 : decodeJwtExpiry(update.accessToken))
    this.cache.metadata.expiresAt = expiresAt ?? null
    if (storage) {
      storage.setItem(AUTH_TOKEN_STORAGE_KEY, update.accessToken)
      if (typeof update.refreshToken === 'string') {
        storage.setItem(AUTH_REFRESH_TOKEN_STORAGE_KEY, update.refreshToken)
      }
      if (expiresAt) {
        storage.setItem(AUTH_TOKEN_EXPIRY_STORAGE_KEY, String(expiresAt))
      } else {
        storage.removeItem(AUTH_TOKEN_EXPIRY_STORAGE_KEY)
      }
    }
  }

  clearTokens() {
    const storage = getLocalStorage()
    this.cache.token = null
    this.cache.metadata.expiresAt = null
    if (storage) {
      storage.removeItem(AUTH_TOKEN_STORAGE_KEY)
      storage.removeItem(AUTH_REFRESH_TOKEN_STORAGE_KEY)
      storage.removeItem(AUTH_TOKEN_EXPIRY_STORAGE_KEY)
    }
  }

  private shouldRefreshSoon(): boolean {
    const expiresAt = this.cache.metadata.expiresAt ?? this.readStoredExpiry()
    if (!expiresAt) return false
    return Date.now() > expiresAt - REFRESH_THRESHOLD
  }

  private buildRequestKey(config: AxiosRequestConfig): string {
    const method = (config.method ?? 'get').toUpperCase()
    const url = config.url ?? ''
    const paramsKey = this.stringify(config.params)
    return `${method}:${url}?${paramsKey}`
  }

  private stringify(value: unknown): string {
    if (value === undefined) return ''
    if (value === null) return 'null'
    if (typeof value === 'string') return value
    if (typeof value === 'number' || typeof value === 'boolean') return String(value)
    if (value instanceof URLSearchParams) return value.toString()
    if (Array.isArray(value)) {
      return `[${value.map((item) => this.stringify(item)).join(',')}]`
    }
    if (value instanceof Date) {
      return value.toISOString()
    }
    if (typeof value === 'object') {
      const entries = Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entryValue]) => `${key}:${this.stringify(entryValue)}`)
      return `{${entries.join(',')}}`
    }
    try {
      return JSON.stringify(value)
    } catch (error) {
      if (import.meta.env.DEV) {
        console.warn('Unable to stringify request params', error)
      }
      return String(value)
    }
  }

  private async sendRequest<T>(config: ManagedAxiosRequestConfig<T>): Promise<AxiosResponse<T>> {
    const { skipDedupe = false, dedupeKey, retry, signal: externalSignal, ...axiosConfig } = config
    const compositeController = new AbortController()
    const key = skipDedupe ? null : dedupeKey ?? this.buildRequestKey(axiosConfig)
    const existing = key ? this.pendingRequests.get(key) : undefined
    if (existing) {
      existing.subscribers += 1
      return existing.promise as Promise<AxiosResponse<T>>
    }

    if (externalSignal) {
      if (externalSignal.aborted) {
        compositeController.abort(externalSignal.reason)
      } else {
        const forwardAbort = () => {
          compositeController.abort(externalSignal.reason)
        }
        externalSignal.addEventListener('abort', forwardAbort, { once: true })
      }
    }

    const requestConfig: AxiosRequestConfig<T> = {
      ...axiosConfig,
      signal: compositeController.signal,
    }

    const retryOptions = this.resolveRetryOptions(retry)
    const basePromise = this.performWithRetries<T>(requestConfig, compositeController, retryOptions)
    const trackedPromise = basePromise
      .then((response) => {
        if (key) {
          this.pendingRequests.delete(key)
        }
        return response
      })
      .catch((error) => {
        if (key) {
          this.pendingRequests.delete(key)
        }
        throw error
      })

    if (key) {
      this.pendingRequests.set(key, {
        key,
        promise: trackedPromise,
        config: requestConfig,
        subscribers: 1,
        cancel: (reason?: string | Error) => {
          if (!compositeController.signal.aborted) {
            compositeController.abort(reason ?? new Error('Request cancelled'))
          }
        },
      })
    }

    return trackedPromise
  }

  private resolveRetryOptions(custom?: Partial<RetryOptions>): RetryOptions {
    return {
      maxRetries: custom?.maxRetries ?? DEFAULT_RETRY_OPTIONS.maxRetries,
      initialDelayMs: custom?.initialDelayMs ?? DEFAULT_RETRY_OPTIONS.initialDelayMs,
      maxDelayMs: custom?.maxDelayMs ?? DEFAULT_RETRY_OPTIONS.maxDelayMs,
    }
  }

  private shouldRetry(error: unknown): boolean {
    if (!error || typeof error !== 'object') {
      return false
    }

    const errorWithCode = error as { code?: string }
    if (errorWithCode.code === 'ERR_CANCELED') {
      return false
    }

    if (axios.isAxiosError(error)) {
      const status = error.response?.status
      if (!error.response) {
        return true
      }
      if (status && (status >= 500 || status === 408 || status === 429)) {
        return true
      }
      if (error.code && ['ECONNABORTED', 'ECONNRESET', 'ETIMEDOUT'].includes(error.code)) {
        return true
      }
    }

    if (typeof errorWithCode.code === 'string') {
      const retriableCodes = ['ECONNRESET', 'EHOSTUNREACH', 'ENETDOWN', 'ENETUNREACH', 'ETIMEDOUT']
      return retriableCodes.includes(errorWithCode.code)
    }

    return false
  }

  private async performWithRetries<T>(
    config: AxiosRequestConfig<T>,
    controller: AbortController,
    options: RetryOptions,
  ): Promise<AxiosResponse<T>> {
    let attempt = 0
    let delayDuration = options.initialDelayMs

    while (true) {
      if (controller.signal.aborted) {
        throw controller.signal.reason ?? new Error('Request aborted')
      }

      try {
        return await this.client.request<T>(config)
      } catch (error) {
        if (!this.shouldRetry(error) || attempt >= options.maxRetries) {
          throw error
        }
        const waitTime = Math.min(delayDuration, options.maxDelayMs)
        await this.delay(waitTime, controller.signal)
        delayDuration = Math.min(delayDuration * 2, options.maxDelayMs)
        attempt += 1
      }
    }
  }

  private delay(ms: number, signal: AbortSignal): Promise<void> {
    if (signal.aborted) {
      return Promise.reject(signal.reason ?? new Error('Request aborted'))
    }
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        signal.removeEventListener('abort', onAbort)
        resolve()
      }, ms)
      const onAbort = () => {
        clearTimeout(timeout)
        signal.removeEventListener('abort', onAbort)
        reject(signal.reason ?? new Error('Request aborted'))
      }
      signal.addEventListener('abort', onAbort, { once: true })
    })
  }

  private async refreshAccessToken(): Promise<string | null> {
    if (this.refreshPromise) {
      return this.refreshPromise
    }
    const storage = getLocalStorage()
    const refreshToken = storage?.getItem(AUTH_REFRESH_TOKEN_STORAGE_KEY)
    if (!refreshToken) {
      this.clearTokens()
      return null
    }
    this.refreshPromise = axios
      .post<{ access_token: string; refresh_token?: string; expires_in?: number }>(
        `${this.client.defaults.baseURL}/auth/refresh`,
        { refresh_token: refreshToken },
      )
      .then((response) => {
        const { access_token: accessToken, refresh_token: nextRefreshToken, expires_in: expiresIn } = response.data
        this.setTokens({ accessToken, refreshToken: nextRefreshToken ?? refreshToken, expiresIn: expiresIn ?? null })
        return accessToken
      })
      .catch((error) => {
        this.clearTokens()
        throw error
      })
      .finally(() => {
        this.refreshPromise = null
      })
    return this.refreshPromise
  }

  private readStoredToken(): string | null {
    const storage = getLocalStorage()
    return storage?.getItem(AUTH_TOKEN_STORAGE_KEY) ?? null
  }

  private readStoredExpiry(): number | null {
    const storage = getLocalStorage()
    if (!storage) return null
    const raw = storage.getItem(AUTH_TOKEN_EXPIRY_STORAGE_KEY)
    if (!raw) return null
    const parsed = Number.parseInt(raw, 10)
    return Number.isNaN(parsed) ? null : parsed
  }

  private notifyAuthError(error: unknown) {
    for (const listener of this.authErrorListeners) {
      try {
        listener(error)
      } catch (listenerError) {
        if (import.meta.env.DEV) {
          console.error('Auth error listener failed', listenerError)
        }
      }
    }
  }
}

const apiClient = new ApiClient()

export default apiClient
export { ApiClient }
export type { TokenUpdate }
