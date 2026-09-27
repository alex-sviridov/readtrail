import { booksApi } from '@/services/booksApi'
import { isGuestMode } from '@/services/guestMode'
import { logger } from '@/utils/logger'
import { serializeBookForApi } from '@/utils/bookSerialization'

/**
 * Migrate localStorage data to backend. Only ever called right after
 * registering a brand-new account, so there is nothing on the backend yet
 * to de-duplicate against — this is a plain upload.
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
      return { success: true, migratedCount: 0 }
    }

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
