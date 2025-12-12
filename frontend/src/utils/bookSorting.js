/**
 * Book Sorting Utility
 * Pure function for sorting books by status and date
 */

/**
 * Sort books: in-progress first, then by year and month (descending)
 * @param {Array} books - Array of book objects
 * @returns {Array} Sorted array of books (new array, does not mutate input)
 */
export function sortBooks(books) {
  return [...books].sort((a, b) => {
    // In-progress books (no year/month) come first
    const aCompleted = a.year !== null && a.month !== null
    const bCompleted = b.year !== null && b.month !== null

    if (!aCompleted && bCompleted) return -1
    if (aCompleted && !bCompleted) return 1

    // Both in-progress - sort by createdAt (newest first)
    if (!aCompleted && !bCompleted) {
      return new Date(b.createdAt) - new Date(a.createdAt)
    }

    // Both completed - sort by year and month (newest first)
    if (a.year !== b.year) {
      return b.year - a.year
    }
    return b.month - a.month
  })
}
