import { booksApi } from '@/services/booksApi'
import { isGuestMode } from '@/services/guestMode'
import { logger } from '@/utils/logger'
import { serializeBookForApi } from '@/utils/bookSerialization'

const MIGRATION_FLAG_KEY = 'readtrail-needs-migration'

/**
 * Check if two books match (same name, author, and date)
 */
function booksMatch(book1, book2) {
  const nameMatch = book1.name.toLowerCase() === book2.name.toLowerCase()
  const authorMatch = (book1.author || '').toLowerCase() === (book2.author || '').toLowerCase()
  const dateMatch = book1.year === book2.year && book1.month === book2.month
  return nameMatch && authorMatch && dateMatch
}

/**
 * Find matching backend book for a local book
 */
function findMatchingBackendBook(localBook, backendBooks) {
  return backendBooks.find(backendBook => booksMatch(localBook, backendBook))
}

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

    // Check what already exists in the backend to avoid duplicates
    logger.info('Checking for existing books in backend...')
    const backendBooks = await booksApi.getBooks()

    if (backendBooks.length > 0) {
      logger.info(`Found ${backendBooks.length} existing books in backend`)

      // Separate books into existing and new
      const booksToMigrate = []
      const existingIdMappings = []

      for (const localBook of books) {
        const matchingBackendBook = findMatchingBackendBook(localBook, backendBooks)
        if (matchingBackendBook) {
          // Book already exists, just map IDs
          existingIdMappings.push({
            oldId: localBook.id,
            newId: matchingBackendBook.id,
            createdAt: matchingBackendBook.createdAt,
            updatedAt: matchingBackendBook.updatedAt
          })
        } else {
          // Book doesn't exist, needs migration
          booksToMigrate.push(localBook)
        }
      }

      // Update IDs for existing books
      if (existingIdMappings.length > 0 && onMigrationComplete) {
        onMigrationComplete(existingIdMappings)
      }

      if (booksToMigrate.length === 0) {
        logger.info('All books already exist in backend, no migration needed')
        localStorage.removeItem(MIGRATION_FLAG_KEY)
        return { success: true, migratedCount: 0, skippedCount: books.length }
      }

      logger.info(`Migrating ${booksToMigrate.length} new books (${existingIdMappings.length} already exist)`)
      books = booksToMigrate
    }

    // Migrate books that don't exist in backend
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
