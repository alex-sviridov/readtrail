/**
 * Book Serialization Utility
 * Handles conversion between runtime and storage formats
 */

import { normalizeBookAttributes } from './bookSchema'

/**
 * Serialize a book for storage (localStorage or API sync)
 * Converts Date objects to ISO strings and normalizes structure
 * @param {Object} book - Book object in runtime format
 * @returns {Object} Book object ready for JSON serialization
 */
export function serializeBook(book) {
  return {
    id: book.id,
    name: book.name,
    author: book.author,
    coverLink: book.coverLink,
    year: book.year,
    month: book.month,
    attributes: book.attributes,
    createdAt: book.createdAt instanceof Date ? book.createdAt.toISOString() : book.createdAt,
    updatedAt: book.updatedAt instanceof Date ? book.updatedAt.toISOString() : book.updatedAt
  }
}

/**
 * Deserialize a book from storage format to runtime format
 * Converts ISO strings to Date objects and normalizes attributes
 * @param {Object} storedBook - Book object from localStorage/API
 * @returns {Object} Book object in runtime format
 */
export function deserializeBook(storedBook) {
  return {
    ...storedBook,
    attributes: normalizeBookAttributes(storedBook),
    createdAt: new Date(storedBook.createdAt),
    updatedAt: storedBook.updatedAt ? new Date(storedBook.updatedAt) : undefined
  }
}

/**
 * Serialize book data for API operations (minimal format without IDs/dates)
 * Used for CREATE and migration operations
 * @param {Object} book - Book object in runtime format
 * @returns {Object} Minimal book data for API
 */
export function serializeBookForApi(book) {
  return {
    name: book.name,
    author: book.author,
    coverLink: book.coverLink,
    year: book.year,
    month: book.month,
    attributes: book.attributes
  }
}
