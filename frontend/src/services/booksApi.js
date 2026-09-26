/**
 * Books API service
 * Handles all book-related API operations with PocketBase
 */

import pb from './pocketbase'
import { adaptPocketBaseError } from '@/utils/errors'
import { isGuestMode, requireAuth } from './guestMode'
import { logger } from '@/utils/logger'
import { getGuestBooks, createGuestBook, updateGuestBook, deleteGuestBook } from './guestStore'

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

  // Determine cover display link: prefer the shared, deduped cover_image
  // file over the plain cover_url hotlink.
  let coverDisplayLink = null
  const expandedCoverImage = pbBook.expand?.cover_image
  if (expandedCoverImage) {
    coverDisplayLink = pb.files.getURL(expandedCoverImage, expandedCoverImage.file, { thumb: '200x300' })
  } else if (pbBook.cover_url) {
    coverDisplayLink = pbBook.cover_url
  }

  return {
    id: pbBook.id,
    name: pbBook.name,
    author: pbBook.author || null,
    coverLink: pbBook.cover_url || null,
    coverDisplayLink,
    hasCachedCover: Boolean(pbBook.cover_image),
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
 * Transform book from store format to PocketBase format
 * @param {Object} storeBook - Book object from store
 * @returns {Object} Book object in PocketBase format
 */
function transformBookToPocketBase(storeBook) {
  // storeBook may be a full book (create) or a partial update -- omit a
  // field entirely (rather than defaulting it) when the caller didn't
  // include it, so a partial update doesn't wipe fields it wasn't touching.
  const data = {
    owner: pb.authStore.record?.id
  }

  if (storeBook.name !== undefined) {
    data.name = storeBook.name
  }

  if (storeBook.author !== undefined) {
    data.author = storeBook.author || ''
  }

  if (storeBook.coverLink !== undefined) {
    data.cover_url = storeBook.coverLink || ''
  }

  if (storeBook.year !== undefined) {
    data.read_date = (storeBook.year && storeBook.month)
      ? `${storeBook.year}-${String(storeBook.month).padStart(2, '0')}-01`
      : null
  }

  if (storeBook.attributes !== undefined) {
    data.attributes = {
      isUnfinished: storeBook.attributes?.isUnfinished ?? false,
      customCover: storeBook.attributes?.customCover ?? false,
      score: storeBook.attributes?.score ?? null
    }
  }

  return data
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
    if (isGuestMode()) {
      return getGuestBooks()
    }

    try {
      // Fetch all books for the authenticated user
      // PocketBase automatically filters by owner based on auth token
      const result = await pb.collection('books').getList(1, 500, {
        sort: '-created',
        expand: 'cover_image'
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
      const record = await pb.collection('books').getOne(id, { expand: 'cover_image' })
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
    if (isGuestMode()) {
      return createGuestBook(book)
    }

    try {
      const pbData = transformBookToPocketBase(book)
      const record = await pb.collection('books').create(pbData, { expand: 'cover_image' })
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
    if (isGuestMode()) {
      const updated = updateGuestBook(id, book)
      if (!updated) throw new Error(`Guest book not found: ${id}`)
      return updated
    }

    try {
      const { coverFile, ...bookWithoutFile } = book
      const pbData = transformBookToPocketBase(bookWithoutFile)
      const record = await pb.collection('books').update(id, pbData, { expand: 'cover_image' })
      let result = transformBookFromPocketBase(record)

      if (coverFile) {
        try {
          result = await this.uploadBookCover(id, coverFile)
        } catch (uploadError) {
          logger.warn('[BooksApi] Cover upload failed, keeping the live URL:', uploadError)
        }
      }

      return result
    } catch (error) {
      throw adaptPocketBaseError(error)
    }
  }

  /**
   * Upload a custom cover image for a book (fetch fallback endpoint)
   * @param {string} id - Book ID
   * @param {File|Blob} file - Cover image file
   * @returns {Promise<Object>} Updated book object
   */
  async uploadBookCover(id, file) {
    const formData = new FormData()
    formData.append('file', file)
    const record = await pb.send(`/api/books/${id}/cover`, { method: 'POST', body: formData })
    return transformBookFromPocketBase(record)
  }

  /**
   * Delete a book
   * @param {string} id - Book ID
   * @returns {Promise<void>}
   */
  async deleteBook(id) {
    if (isGuestMode()) {
      deleteGuestBook(id)
      return
    }

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
}

// Create and export singleton instance
export const booksApi = new BooksApi()

// Export class for testing
export { BooksApi }
