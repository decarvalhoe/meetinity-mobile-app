import CacheLayer from './CacheLayer'
export type { CacheEntry, CachePolicy, CacheReadResult, CacheStatus } from './types'

const appCache = new CacheLayer('meetinity-app')

export { CacheLayer, appCache }
