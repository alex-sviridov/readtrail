/**
 * Local-only data store for guest mode (no backend account).
 * Books and settings live entirely in localStorage; there is no sync
 * queue because there is nothing to reconcile with a server.
 */
import { logger } from '@/utils/logger'
import { handleStorageError } from '@/utils/storageErrors'
import { serializeBook, deserializeBook } from '@/utils/bookSerialization'
import { DEFAULT_BOOK_ATTRIBUTES } from '@/utils/bookSchema'
import { DEFAULT_SETTINGS } from '@/constants'

const BOOKS_KEY = 'readtrail-books'
const SETTINGS_KEY = 'readtrail-settings'

let guestIdCounter = 0

function generateGuestId() {
  return `guest-${Date.now()}-${guestIdCounter++}`
}

function readBooks() {
  try {
    const stored = localStorage.getItem(BOOKS_KEY)
    if (!stored) return []
    return JSON.parse(stored).map(deserializeBook)
  } catch (error) {
    handleStorageError(error, { operation: 'load' })
    return []
  }
}

function writeBooks(books) {
  try {
    localStorage.setItem(BOOKS_KEY, JSON.stringify(books.map(serializeBook)))
  } catch (error) {
    const sizeKB = Math.round(JSON.stringify(books).length / 1024)
    handleStorageError(error, { operation: 'save', itemCount: books.length, sizeKB })
  }
}

/**
 * @returns {Array} All guest books, newest first is not guaranteed — callers sort as needed.
 */
export function getGuestBooks() {
  return readBooks()
}

/**
 * @param {Object} bookInput - Same shape as `stores/books.js#addBook` builds.
 * @returns {Object} The created book, including its generated id.
 */
export function createGuestBook(bookInput) {
  const books = readBooks()
  const book = {
    id: generateGuestId(),
    name: bookInput.name,
    author: bookInput.author ?? null,
    coverLink: bookInput.coverLink ?? null,
    coverDisplayLink: bookInput.coverDisplayLink ?? bookInput.coverLink ?? null,
    year: bookInput.year ?? null,
    month: bookInput.month ?? null,
    attributes: { ...DEFAULT_BOOK_ATTRIBUTES, ...bookInput.attributes },
    createdAt: new Date()
  }

  books.push(book)
  writeBooks(books)
  logger.debug('[GuestStore] Created book:', book.id)

  return book
}

/**
 * @param {string} id
 * @param {Object} updates - Partial book fields; `attributes` is merged, not replaced.
 * @returns {Object|null} The updated book, or null if no book matched.
 */
export function updateGuestBook(id, updates) {
  const books = readBooks()
  const book = books.find((b) => b.id === id)
  if (!book) return null

  const { attributes, ...rest } = updates
  Object.assign(book, rest)
  if (attributes) {
    book.attributes = { ...book.attributes, ...attributes }
  }
  if (updates.coverLink !== undefined && !updates.coverDisplayLink) {
    book.coverDisplayLink = updates.coverLink
  }

  writeBooks(books)
  logger.debug('[GuestStore] Updated book:', id)

  return book
}

/**
 * @param {string} id
 * @returns {boolean} True if a book was removed.
 */
export function deleteGuestBook(id) {
  const books = readBooks()
  const index = books.findIndex((b) => b.id === id)
  if (index === -1) return false

  books.splice(index, 1)
  writeBooks(books)
  logger.debug('[GuestStore] Deleted book:', id)

  return true
}

/**
 * @returns {Object} Current guest settings, merged over defaults.
 */
export function getGuestSettings() {
  try {
    const stored = localStorage.getItem(SETTINGS_KEY)
    if (!stored) return { ...DEFAULT_SETTINGS }
    return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) }
  } catch (error) {
    handleStorageError(error, { operation: 'load' })
    return { ...DEFAULT_SETTINGS }
  }
}

/**
 * @param {Object} partial - Settings fields to merge and persist.
 * @returns {Object} The full settings object after merging.
 */
export function updateGuestSettings(partial) {
  const settings = { ...getGuestSettings(), ...partial }
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
  } catch (error) {
    handleStorageError(error, { operation: 'save' })
  }
  return settings
}

/**
 * Remove all guest data (books and settings). Used after migrating to an
 * authenticated account and on logout.
 */
export function clearGuestData() {
  localStorage.removeItem(BOOKS_KEY)
  localStorage.removeItem(SETTINGS_KEY)
  logger.debug('[GuestStore] Cleared guest data')
}
