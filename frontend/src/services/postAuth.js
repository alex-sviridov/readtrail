import { clearQueryCache } from '@/services/queryClient'
import { logger } from '@/utils/logger'

/**
 * Shared tail end of a successful login/register: migrate any guest-mode
 * books to the backend, drop the previous (guest) session's cached
 * queries so the reload doesn't briefly render them, then hard-reload
 * into the library for a clean state fetched fresh from the backend.
 */
export async function completeAuthAndRedirect(booksStore, logLabel) {
  const hasGuestData = booksStore.books.length > 0

  if (hasGuestData) {
    logger.info(`[${logLabel}] Migrating guest data to backend...`)
    await booksStore.performMigration()

    localStorage.removeItem('readtrail-books')
    localStorage.removeItem('readtrail-needs-migration')
  }

  clearQueryCache()
  window.location.href = '/library'
}
