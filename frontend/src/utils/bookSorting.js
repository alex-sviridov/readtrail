/**
 * Book Sorting Utility
 * Pure function for sorting books by status and date
 */

import { BOOK_STATUS } from '@/constants'

/**
 * @returns {number} 0 = To Read, 1 = in-progress (no year or no month), 2 = completed
 */
export function bookPriority(book) {
  if (BOOK_STATUS.isToRead(book.year)) return 0
  if (book.year === null || book.month === null) return 1
  return 2
}

/**
 * Compare two books for the app-wide default ordering: To Read first, then
 * in-progress, then completed books by year and month (all descending,
 * newest/most-recently-added first). Single source of truth shared by
 * sortBooks() (grid/timeline views) and BooksTable's default column sort.
 * @returns {number} Comparator result (negative if a sorts before b)
 */
export function compareBooksByStatusAndDate(a, b) {
  const priorityA = bookPriority(a)
  const priorityB = bookPriority(b)

  if (priorityA !== priorityB) return priorityA - priorityB

  // To Read and in-progress books (same priority) sort by createdAt (newest first)
  if (priorityA < 2) {
    return new Date(b.createdAt) - new Date(a.createdAt)
  }

  // Completed books sort by year and month (newest first)
  if (a.year !== b.year) {
    return b.year - a.year
  }
  return b.month - a.month
}

/**
 * Sort books: to-read first, then in-progress, then by year and month (descending)
 * @param {Array} books - Array of book objects
 * @returns {Array} Sorted array of books (new array, does not mutate input)
 */
export function sortBooks(books) {
  return [...books].sort(compareBooksByStatusAndDate)
}
