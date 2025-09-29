export type CacheStatus = 'miss' | 'fresh' | 'stale' | 'expired'

export interface CachePolicy {
  /** Duration (ms) during which the entry is considered fresh */
  maxAge?: number
  /** Additional duration (ms) during which stale data can be served while a revalidation occurs */
  staleWhileRevalidate?: number
}

export interface CacheEntry<T> {
  value: T
  timestamp: number
  maxAge?: number
  staleWhileRevalidate?: number
}

export interface CacheReadResult<T> {
  value: T | null
  entry: CacheEntry<T> | null
  status: CacheStatus
  age: number
  shouldRevalidate: boolean
}
