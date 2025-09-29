import type { Buffer } from 'buffer'
import axios, { type AxiosInstance, type AxiosRequestConfig, type AxiosResponse } from 'axios'
import {
  AUTH_REFRESH_TOKEN_STORAGE_KEY,
  AUTH_TOKEN_EXPIRY_STORAGE_KEY,
  AUTH_TOKEN_STORAGE_KEY,
} from '../auth/constants'
const DEFAULT_TIMEOUT = Number.parseInt(import.meta.env.VITE_API_TIMEOUT ?? '30000', 10)
const REFRESH_THRESHOLD = Number.parseInt(import.meta.env.VITE_TOKEN_REFRESH_THRESHOLD ?? '120000', 10)

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

  constructor() {
    this.client = axios.create({
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

  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.get<T>(url, config)
    return response.data
  }

  async post<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.post<T>(url, data, config)
    return response.data
  }

  async put<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.put<T>(url, data, config)
    return response.data
  }

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.delete<T>(url, config)
    return response.data
  }

  async request<T = unknown>(config: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.client.request<T>(config)
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
export type { TokenUpdate }
