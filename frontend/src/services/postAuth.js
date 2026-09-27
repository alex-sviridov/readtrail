import { clearQueryCache } from '@/services/queryClient'
import { clearGuestData } from '@/services/guestStore'
import { logger } from '@/utils/logger'

function finishAuthFlow() {
  clearQueryCache()
  window.location.href = '/library'
}

/**
 * Tail end of a successful registration: migrate any guest-mode books to
 * the new (necessarily empty) backend account, drop the cached guest-mode
 * queries so the reload doesn't briefly render them, then hard-reload into
 * the library for a clean state fetched fresh from the backend.
 */
export async function completeRegisterAndRedirect(booksStore) {
  if (booksStore.books.length > 0) {
    logger.info('[Register] Migrating guest data to backend...')
    await booksStore.performMigration()
  }

  finishAuthFlow()
}

/**
 * Tail end of a successful login: any local guest-mode data belongs to a
 * different, unrelated identity than the account just logged into, so it is
 * discarded rather than merged in. Then clear cached queries and hard-reload
 * into the library for a clean state fetched fresh from the backend.
 */
export async function completeLoginAndRedirect(booksStore) {
  if (booksStore.books.length > 0) {
    logger.info('[Login] Discarding local guest data for existing account login')
    clearGuestData()
  }

  finishAuthFlow()
}
