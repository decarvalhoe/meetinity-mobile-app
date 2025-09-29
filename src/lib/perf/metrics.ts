const METRICS_STORAGE_KEY = 'meetinity.metrics'
const MAX_METRICS = 50

type Metadata = Record<string, unknown>

export interface MetricRecord {
  name: string
  value: number
  timestamp: number
  metadata?: Metadata
}

const getStorage = (): Storage | null => {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn('Metrics storage unavailable', error)
    }
    return null
  }
}

export const readMetrics = (): MetricRecord[] => {
  const storage = getStorage()
  if (!storage) return []
  try {
    const raw = storage.getItem(METRICS_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as MetricRecord[]
    if (!Array.isArray(parsed)) {
      return []
    }
    return parsed
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn('Unable to read metrics from storage', error)
    }
    return []
  }
}

export const recordMetric = (name: string, value: number, metadata?: Metadata) => {
  const storage = getStorage()
  const record: MetricRecord = { name, value, metadata, timestamp: Date.now() }
  if (!storage) {
    if (import.meta.env.DEV) {
      console.info('[perf]', record)
    }
    return
  }
  const existing = readMetrics()
  existing.push(record)
  const trimmed = existing.slice(-MAX_METRICS)
  try {
    storage.setItem(METRICS_STORAGE_KEY, JSON.stringify(trimmed))
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn('Unable to persist metric record', error)
    }
  }
}

export const clearMetrics = () => {
  const storage = getStorage()
  storage?.removeItem(METRICS_STORAGE_KEY)
}
