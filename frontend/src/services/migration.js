import { booksApi } from '@/services/booksApi'
import { isGuestMode } from '@/services/guestMode'
import { logger } from '@/utils/logger'
import { serializeBookForApi } from '@/utils/bookSerialization'

const MIGRATION_FLAG_KEY = 'readtrail-needs-migration'

/**
 * Migrate localStorage data to backend
 */
export async function migrateLocalDataToBackend(books, isOnline, onMigrationComplete) {
  if (!isOnline) {
    logger.debug('Offline, skipping migration')
    return { success: false, reason: 'offline' }
  }

  if (isGuestMode()) {
    logger.debug('Guest mode, skipping migration')
    return { success: false, reason: 'guest' }
  }

  try {
    logger.info('Migrating localStorage books to backend')

    if (books.length === 0) {
      logger.info('No books to migrate')
      localStorage.removeItem(MIGRATION_FLAG_KEY)
      return { success: true, migratedCount: 0 }
    }

    // All guest books have temp IDs, so we need to create them all on backend
    const booksData = books.map(serializeBookForApi)

    logger.info(`Creating ${booksData.length} books on backend...`)
    const createdBooks = await booksApi.batchCreateBooks(booksData)

    // Build ID mapping for caller to update book IDs
    const idMapping = []
    books.forEach((book, index) => {
      if (createdBooks[index]) {
        idMapping.push({
          oldId: book.id,
          newId: createdBooks[index].id,
          createdAt: createdBooks[index].createdAt,
          updatedAt: createdBooks[index].updatedAt
        })
        logger.debug(`Mapped temp ID ${book.id} to backend ID ${createdBooks[index].id}`)
      }
    })

    // Let caller know migration completed
    if (onMigrationComplete) {
      onMigrationComplete(idMapping)
    }

    localStorage.removeItem(MIGRATION_FLAG_KEY)
    logger.info(`Migration completed successfully - ${createdBooks.length} books migrated`)

    return {
      success: true,
      migratedCount: createdBooks.length,
      idMapping
    }
  } catch (error) {
    logger.error('Migration failed:', error)
    return {
      success: false,
      reason: 'error',
      error: error.message
    }
  }
}

/**
 * Check if migration is needed
 */
export function needsMigration() {
  return localStorage.getItem(MIGRATION_FLAG_KEY) === 'true'
}

/**
 * Mark data for migration
 */
export function markForMigration() {
  localStorage.setItem(MIGRATION_FLAG_KEY, 'true')
}

/**
 * Clear migration flag
 */
export function clearMigrationFlag() {
  localStorage.removeItem(MIGRATION_FLAG_KEY)
}
