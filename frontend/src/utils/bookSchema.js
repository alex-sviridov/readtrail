/**
 * Book Schema Utility
 * Defines default book attributes and normalization functions
 */

/**
 * Default book attributes
 * Single source of truth for book attribute structure
 */
export const DEFAULT_BOOK_ATTRIBUTES = {
  isUnfinished: false,
  customCover: false,
  score: null
}

/**
 * Normalize book attributes to ensure all required fields exist
 * Handles migration from old format with top-level isUnfinished property
 * @param {Object} book - Book object (may have attributes or old-style properties)
 * @returns {Object} Normalized attributes object
 */
export function normalizeBookAttributes(book) {
  const attributes = { ...DEFAULT_BOOK_ATTRIBUTES }

  // Merge existing attributes
  if (book.attributes) {
    Object.assign(attributes, book.attributes)
  }

  // Handle migration from old format (isUnfinished at top level)
  if (book.isUnfinished !== undefined && book.attributes?.isUnfinished === undefined) {
    attributes.isUnfinished = book.isUnfinished
  }

  return attributes
}
