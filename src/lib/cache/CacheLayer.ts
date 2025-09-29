import defaultStorageAdapter, { StorageAdapter } from './storage'
import type { CacheEntry, CachePolicy, CacheReadResult, CacheStatus } from './types'

const clampPolicy = (policy?: CachePolicy): CachePolicy => ({
  maxAge: policy?.maxAge ?? undefined,
  staleWhileRevalidate: policy?.staleWhileRevalidate ?? undefined,
})

const computeStatus = (entry: CacheEntry<unknown>, age: number): CacheStatus => {
  const { maxAge, staleWhileRevalidate } = entry
  if (maxAge == null && staleWhileRevalidate == null) {
    return 'fresh'
  }
  const freshThreshold = maxAge ?? 0
  const staleThreshold = freshThreshold + (staleWhileRevalidate ?? 0)
  if (age <= freshThreshold) {
    return 'fresh'
  }
  if (age <= staleThreshold) {
    return 'stale'
  }
  return 'expired'
}

class CacheLayer {
  private readonly storage: StorageAdapter

  private readonly namespace: string

  constructor(namespace: string, storage: StorageAdapter = defaultStorageAdapter) {
    this.namespace = namespace
    this.storage = storage
  }

  private toKey(key: string) {
    return `${this.namespace}:${key}`
  }

  read<T>(key: string): CacheReadResult<T> {
    const storageKey = this.toKey(key)
    const raw = this.storage.get(storageKey)
    if (!raw) {
      return { value: null, entry: null, status: 'miss', age: 0, shouldRevalidate: true }
    }
    try {
      const entry = JSON.parse(raw) as CacheEntry<T>
      const age = Date.now() - entry.timestamp
      const status = computeStatus(entry, age)
      return {
        value: entry.value,
        entry,
        status,
        age,
        shouldRevalidate: status === 'stale' || status === 'expired',
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        console.warn(`Invalid cache entry for key ${storageKey}, purging`, error)
      }
      this.storage.remove(storageKey)
      return { value: null, entry: null, status: 'miss', age: 0, shouldRevalidate: true }
    }
  }

  write<T>(key: string, value: T, policy?: CachePolicy): CacheEntry<T> {
    const entry: CacheEntry<T> = {
      value,
      timestamp: Date.now(),
      ...clampPolicy(policy),
    }
    this.storage.set(this.toKey(key), JSON.stringify(entry))
    return entry
  }

  mutate<T>(key: string, mutator: (previous: CacheEntry<T> | null) => CacheEntry<T> | null): CacheEntry<T> | null {
    const existing = this.read<T>(key).entry
    const next = mutator(existing)
    if (!next) {
      this.invalidate(key)
      return null
    }
    this.storage.set(this.toKey(key), JSON.stringify(next))
    return next
  }

  invalidate(key: string) {
    this.storage.remove(this.toKey(key))
  }

  clear() {
    const prefix = `${this.namespace}:`
    for (const key of this.storage.keys(prefix)) {
      this.storage.remove(key)
    }
  }
}

export default CacheLayer
