/**
 * Book Sorting Utility
 * Pure function for sorting books by status and date
 */

import { BOOK_STATUS } from '@/constants'

/**
 * Sort books: to-read first, then in-progress, then by year and month (descending)
 * @param {Array} books - Array of book objects
 * @returns {Array} Sorted array of books (new array, does not mutate input)
 */
export function sortBooks(books) {
  return [...books].sort((a, b) => {
    // Check for "To Read" status (year 2100)
    const aToRead = BOOK_STATUS.isToRead(a.year)
    const bToRead = BOOK_STATUS.isToRead(b.year)

    // To Read books come first
    if (aToRead && !bToRead) return -1
    if (!aToRead && bToRead) return 1

    // Both To Read - sort by createdAt (newest first)
    if (aToRead && bToRead) {
      return new Date(b.createdAt) - new Date(a.createdAt)
    }

    // Check for in-progress books (no year OR no month)
    const aInProgress = a.year === null || a.month === null
    const bInProgress = b.year === null || b.month === null

    // In-progress books come before other completed books
    if (aInProgress && !bInProgress) return -1
    if (!aInProgress && bInProgress) return 1

    // Both in-progress - sort by createdAt (newest first)
    if (aInProgress && bInProgress) {
      return new Date(b.createdAt) - new Date(a.createdAt)
    }

    // Both regular completed books - sort by year and month (newest first)
    if (a.year !== b.year) {
      return b.year - a.year
    }
    return b.month - a.month
  })
}
