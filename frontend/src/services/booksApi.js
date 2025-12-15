/**
 * Books API service
 * Handles all book-related API operations with PocketBase
 */

import pb from './pocketbase'
import { adaptPocketBaseError } from '@/utils/errors'
import { isGuestMode, requireAuth } from './guestMode'
import { logger } from '@/utils/logger'

/**
 * Transform book from PocketBase format to store format
 * @param {Object} pbBook - Book object from PocketBase
 * @returns {Object} Book object in store format
 */
function transformBookFromPocketBase(pbBook) {
  // Convert read_date (ISO string "2024-03-01") to {year, month}
  let year = null
  let month = null

  if (pbBook.read_date) {
    try {
      const date = new Date(pbBook.read_date)
      year = date.getFullYear()
      month = date.getMonth() + 1 // Convert 0-indexed to 1-indexed
    } catch (error) {
      logger.warn('[BooksApi] Invalid read_date format:', pbBook.read_date, error)
    }
  }

  // Determine cover display link: prioritize cover_file over cover_url
  let coverDisplayLink = null
  if (pbBook.cover_file) {
    // Generate PocketBase file URL
    coverDisplayLink = pb.files.getURL(pbBook, pbBook.cover_file, {'thumb': '200x300'})
  } else if (pbBook.cover_url) {
    coverDisplayLink = pbBook.cover_url
  }

  return {
    id: pbBook.id,
    name: pbBook.name,
    author: pbBook.author || null,
    coverLink: pbBook.cover_url || null,
    coverDisplayLink,
    year,
    month,
    attributes: {
      isUnfinished: pbBook.attributes?.isUnfinished ?? false,
      customCover: pbBook.attributes?.customCover ?? false,
      score: pbBook.attributes?.score ?? null
    },
    createdAt: new Date(pbBook.created),
    updatedAt: new Date(pbBook.updated)
  }
}

/**
 * Create FormData from data object
 * @private
 */
function createFormData(data, file) {
  const formData = new FormData()

  // Add scalar fields
  Object.entries(data).forEach(([key, value]) => {
    if (value === null || value === undefined) return

    const serializedValue = typeof value === 'object'
      ? JSON.stringify(value)
      : String(value)

    formData.append(key, serializedValue)
  })

  // Add file
  if (file) {
    formData.append('cover_file', file)

    logger.debug('[BooksApi] FormData created:', {
      fileName: file.name,
      fileSize: `${(file.size / 1024).toFixed(1)}KB`
    })
  }

  return formData
}

/**
 * Transform book from store format to PocketBase format
 * @param {Object} storeBook - Book object from store
 * @returns {Object|FormData} Book object in PocketBase format or FormData if file included
 */
function transformBookToPocketBase(storeBook) {
  // Convert {year, month} to read_date
  let read_date = null
  if (storeBook.year && storeBook.month) {
    const month = String(storeBook.month).padStart(2, '0')
    read_date = `${storeBook.year}-${month}-01`
  }

  const data = {
    name: storeBook.name,
    author: storeBook.author || '',
    cover_url: storeBook.coverLink || '',
    read_date,
    attributes: {
      isUnfinished: storeBook.attributes?.isUnfinished ?? false,
      customCover: storeBook.attributes?.customCover ?? false,
      score: storeBook.attributes?.score ?? null
    },
    owner: pb.authStore.record?.id
  }

  // Return FormData if file present, otherwise plain object
  return storeBook.coverFile
    ? createFormData(data, storeBook.coverFile)
    : data
}

/**
 * Books API client using PocketBase SDK
 */
class BooksApi {
  /**
   * Fetch all books for the current user
   * @returns {Promise<Array>} Array of book objects
   */
  async getBooks() {
    // If guest mode, return empty array (no backend sync)
    if (isGuestMode()) {
      return []
    }

    try {
      // Fetch all books for the authenticated user
      // PocketBase automatically filters by owner based on auth token
      const result = await pb.collection('books').getList(1, 500, {
        sort: '-created'
      })

      return result.items.map(transformBookFromPocketBase)
    } catch (error) {
      // If 404 or no records, return empty array
      if (error.status === 404 || error.status === 0) {
        return []
      }
      throw adaptPocketBaseError(error)
    }
  }

  /**
   * Fetch a single book by ID
   * @param {string} id - Book ID
   * @returns {Promise<Object>} Book object
   */
  async getBook(id) {
    requireAuth('fetch individual books')

    try {
      const record = await pb.collection('books').getOne(id)
      return transformBookFromPocketBase(record)
    } catch (error) {
      throw adaptPocketBaseError(error)
    }
  }

  /**
   * Create a new book
   * @param {Object} book - Book data
   * @returns {Promise<Object>} Created book object with ID
   */
  async createBook(book) {
    requireAuth('create books')

    try {
      const pbData = transformBookToPocketBase(book)
      const record = await pb.collection('books').create(pbData)
      return transformBookFromPocketBase(record)
    } catch (error) {
      throw adaptPocketBaseError(error)
    }
  }

  /**
   * Update an existing book
   * @param {string} id - Book ID
   * @param {Object} book - Book data (partial updates supported)
   * @returns {Promise<Object>} Updated book object
   */
  async updateBook(id, book) {
    requireAuth('update books')

    try {
      const pbData = transformBookToPocketBase(book)
      const record = await pb.collection('books').update(id, pbData)
      return transformBookFromPocketBase(record)
    } catch (error) {
      throw adaptPocketBaseError(error)
    }
  }

  /**
   * Delete a book
   * @param {string} id - Book ID
   * @returns {Promise<void>}
   */
  async deleteBook(id) {
    requireAuth('delete books')

    try {
      await pb.collection('books').delete(id)
    } catch (error) {
      throw adaptPocketBaseError(error)
    }
  }

  /**
   * Batch create books (for migration)
   * PocketBase doesn't have a batch endpoint, so we iterate
   * @param {Array} books - Array of book objects
   * @returns {Promise<Array>} Array of created books with IDs
   */
  async batchCreateBooks(books) {
    requireAuth('batch create books')

    try {
      const results = []
      for (const book of books) {
        const pbData = transformBookToPocketBase(book)
        const record = await pb.collection('books').create(pbData)
        results.push(transformBookFromPocketBase(record))

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 50))
      }
      return results
    } catch (error) {
      throw adaptPocketBaseError(error)
    }
  }

  /**
   * Get sync handlers for the sync queue
   * Provides API operation handlers for different operation types
   * @param {Function} replaceTempId - Callback to replace temp IDs with backend IDs
   * @returns {Object} Handler functions keyed by 'resource_OPERATION' pattern
   */
  getSyncHandlers(replaceTempId) {
    return {
      'books_CREATE': async (operation) => {
        const createdBook = await this.createBook(operation.data)
        if (replaceTempId && operation.tempId) {
          replaceTempId(operation.tempId, createdBook.id)
        }
        return createdBook
      },
      'books_UPDATE': async (operation) => {
        return await this.updateBook(operation.data.id, operation.data)
      },
      'books_DELETE': async (operation) => {
        return await this.deleteBook(operation.data.id)
      },
      'books_BATCH_CREATE': async (operation) => {
        return await this.batchCreateBooks(operation.data.books)
      }
    }
  }
}

// Create and export singleton instance
export const booksApi = new BooksApi()

// Export class for testing
export { BooksApi }
