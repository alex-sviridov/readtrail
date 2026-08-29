/**
 * Shared TanStack Query client and localStorage persistence.
 * Reads are cached and revalidated in the background; mutations do not
 * retry automatically (offline writes fail fast and surface a toast).
 */
import { QueryClient } from '@tanstack/vue-query'
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister'
import { persistQueryClient } from '@tanstack/query-persist-client-core'
import { logger } from '@/utils/logger'

const PERSIST_KEY = 'readtrail-query-cache'
const MAX_CACHE_AGE_MS = 1000 * 60 * 60 * 24 * 7 // 1 week

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 30_000
    },
    mutations: {
      retry: false
    }
  }
})

/**
 * Drop every cached query and the persisted copy in localStorage.
 * Used on logout and on successful login/register so the previous
 * session's (or guest's) data can't be rendered by the next one.
 */
export function clearQueryCache() {
  queryClient.clear()
  try {
    localStorage.removeItem(PERSIST_KEY)
  } catch (error) {
    logger.warn('[queryClient] Failed to remove persisted cache:', error)
  }
}

/**
 * Restore the query cache from localStorage and keep it in sync going
 * forward. Safe to call once at app startup.
 * @param {QueryClient} client
 * @returns {() => void} Unsubscribe function
 */
export function installQueryPersistence(client) {
  const persister = createSyncStoragePersister({
    storage: window.localStorage,
    key: PERSIST_KEY,
    throttleTime: 0
  })

  const [unsubscribe, persistPromise] = persistQueryClient({
    queryClient: client,
    persister,
    maxAge: MAX_CACHE_AGE_MS
  })

  // Ensure the promise is handled (restores from storage and sets up subscription)
  // We don't need to await it since it happens in the background
  persistPromise.catch((err) => {
    logger.error('Failed to restore persisted query cache:', err)
  })

  return unsubscribe
}
