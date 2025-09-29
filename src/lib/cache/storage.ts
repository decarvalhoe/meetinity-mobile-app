class StorageAdapter {
  private fallback = new Map<string, string>()

  private get storage(): Storage | null {
    if (typeof window === 'undefined') return null
    try {
      return window.localStorage
    } catch (error) {
      if (import.meta.env.DEV) {
        console.warn('LocalStorage unavailable, falling back to memory cache', error)
      }
      return null
    }
  }

  get(key: string): string | null {
    const storage = this.storage
    if (storage) {
      try {
        return storage.getItem(key)
      } catch (error) {
        if (import.meta.env.DEV) {
          console.warn('Unable to read cache entry from storage', error)
        }
      }
    }
    return this.fallback.get(key) ?? null
  }

  set(key: string, value: string): void {
    const storage = this.storage
    if (storage) {
      try {
        storage.setItem(key, value)
        this.fallback.delete(key)
        return
      } catch (error) {
        if (import.meta.env.DEV) {
          console.warn('Unable to persist cache entry, storing in memory', error)
        }
      }
    }
    this.fallback.set(key, value)
  }

  remove(key: string): void {
    const storage = this.storage
    if (storage) {
      try {
        storage.removeItem(key)
      } catch (error) {
        if (import.meta.env.DEV) {
          console.warn('Unable to remove cache entry from storage', error)
        }
      }
    }
    this.fallback.delete(key)
  }

  keys(prefix: string): string[] {
    const storage = this.storage
    const keys = new Set<string>()
    if (storage) {
      for (let index = 0; index < storage.length; index += 1) {
        const key = storage.key(index)
        if (key && key.startsWith(prefix)) {
          keys.add(key)
        }
      }
    }
    for (const key of this.fallback.keys()) {
      if (key.startsWith(prefix)) {
        keys.add(key)
      }
    }
    return Array.from(keys)
  }
}

const defaultStorageAdapter = new StorageAdapter()

export default defaultStorageAdapter
export { StorageAdapter }
