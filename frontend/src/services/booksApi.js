/**
 * Books API service
 * Handles all book-related API operations
 */

import { apiClient } from './api'

/**
 * Transform book from backend format to store format
 * @param {Object} backendBook - Book object from backend
 * @returns {Object} Book object in store format
 */
function transformBookFromBackend(backendBook) {
  return {
    id: backendBook.id,
    name: backendBook.name,
    author: backendBook.author,
    coverLink: backendBook.coverLink,
    year: backendBook.year,
    month: backendBook.month,
    attributes: {
      isUnfinished: backendBook.attributes?.isUnfinished ?? false,
      customCover: backendBook.attributes?.customCover ?? false,
      score: backendBook.attributes?.score ?? null
    },
    createdAt: new Date(backendBook.createdAt),
    updatedAt: backendBook.updatedAt ? new Date(backendBook.updatedAt) : new Date(backendBook.createdAt)
  }
}

/**
 * Transform book from store format to backend format
 * @param {Object} storeBook - Book object from store
 * @returns {Object} Book object in backend format
 */
function transformBookToBackend(storeBook) {
  return {
    name: storeBook.name,
    author: storeBook.author,
    coverLink: storeBook.coverLink,
    year: storeBook.year,
    month: storeBook.month,
    attributes: {
      isUnfinished: storeBook.attributes?.isUnfinished ?? false,
      customCover: storeBook.attributes?.customCover ?? false,
      score: storeBook.attributes?.score ?? null
    }
  }
}

/**
 * Books API client
 */
class BooksApi {
  /**
   * Fetch all books for the current user
   * @returns {Promise<Array>} Array of book objects
   */
  async getBooks() {
    try {
      const response = await apiClient.get('/books')
      return response.books.map(transformBookFromBackend)
    } catch (error) {
      // If 404, return empty array (no books yet)
      if (error.isNotFound && error.isNotFound()) {
        return []
      }
      throw error
    }
  }

  /**
   * Fetch a single book by ID
   * @param {string} id - Book ID
   * @returns {Promise<Object>} Book object
   */
  async getBook(id) {
    const response = await apiClient.get(`/books/${id}`)
    return transformBookFromBackend(response.book)
  }

  /**
   * Create a new book
   * @param {Object} book - Book data
   * @returns {Promise<Object>} Created book object with ID
   */
  async createBook(book) {
    const backendBook = transformBookToBackend(book)
    const response = await apiClient.post('/books', backendBook)
    return transformBookFromBackend(response.book)
  }

  /**
   * Update an existing book
   * @param {string} id - Book ID
   * @param {Object} book - Book data (partial updates supported)
   * @returns {Promise<Object>} Updated book object
   */
  async updateBook(id, book) {
    const backendBook = transformBookToBackend(book)
    const response = await apiClient.put(`/books/${id}`, backendBook)
    return transformBookFromBackend(response.book)
  }

  /**
   * Delete a book
   * @param {string} id - Book ID
   * @returns {Promise<void>}
   */
  async deleteBook(id) {
    await apiClient.delete(`/books/${id}`)
  }

  /**
   * Batch create books (for migration)
   * @param {Array} books - Array of book objects
   * @returns {Promise<Array>} Array of created books with IDs
   */
  async batchCreateBooks(books) {
    const backendBooks = books.map(transformBookToBackend)
    const response = await apiClient.post('/books/batch', { books: backendBooks })
    return response.books.map(transformBookFromBackend)
  }
}

// Create and export singleton instance
export const booksApi = new BooksApi()

// Export class for testing
export { BooksApi }
