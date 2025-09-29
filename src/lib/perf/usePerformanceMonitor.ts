import { useEffect } from 'react'
import { recordMetric } from './metrics'

interface PerformanceMonitorOptions {
  enabled?: boolean
  sampleInterval?: number
}

const DEFAULT_INTERVAL = 1000

const resolveEnabled = (explicit?: boolean): boolean => {
  if (typeof explicit === 'boolean') {
    return explicit
  }
  const flag = import.meta.env.VITE_ENABLE_ANALYTICS
  if (flag === undefined) {
    return true
  }
  return flag !== 'false'
}

export const usePerformanceMonitor = (options?: PerformanceMonitorOptions) => {
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (typeof window.requestAnimationFrame !== 'function') return
    if (!resolveEnabled(options?.enabled)) return

    let frameCount = 0
    let rafId: number
    let mounted = true
    let lastSample = performance.now()
    const interval = options?.sampleInterval ?? DEFAULT_INTERVAL

    const loop = (timestamp: number) => {
      frameCount += 1
      if (timestamp - lastSample >= interval) {
        const duration = timestamp - lastSample
        const fps = Math.round((frameCount * 1000) / duration)
        recordMetric('fps', fps, { frames: frameCount, duration })
        frameCount = 0
        lastSample = timestamp
      }
      if (mounted) {
        rafId = window.requestAnimationFrame(loop)
      }
    }

    rafId = window.requestAnimationFrame(loop)

    return () => {
      mounted = false
      if (rafId) {
        window.cancelAnimationFrame(rafId)
      }
    }
  }, [options?.enabled, options?.sampleInterval])
}

export default usePerformanceMonitor
