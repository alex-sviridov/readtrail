/**
 * Data Export Service
 * Handles exporting user data in GDPR-compliant formats
 */

import { authManager } from './auth'
import { logger } from '@/utils/logger'

/**
 * Export user data as JSON
 * Includes user profile, settings, and complete books library
 * @param {Array} books - Books array from store
 * @param {Object} settings - Settings object from store
 * @returns {Object} Complete user data export
 */
export function generateUserDataJSON(books, settings) {
  const user = authManager.getCurrentUser()

  const exportData = {
    exportDate: new Date().toISOString(),
    exportVersion: '1.0',
    user: {
      id: user.id,
      email: user.email,
      created: user.created,
      updated: user.updated
    },
    settings: settings || {},
    books: books.map(book => ({
      id: book.id,
      name: book.name,
      author: book.author,
      coverLink: book.coverLink,
      year: book.year,
      month: book.month,
      attributes: book.attributes,
      createdAt: book.createdAt,
      updatedAt: book.updatedAt
    }))
  }

  logger.info(`[DataExport] Generated JSON export with ${books.length} books`)
  return exportData
}

/**
 * Export books as CSV
 * Simple tabular format for books list
 * @param {Array} books - Books array from store
 * @returns {string} CSV content
 */
export function generateBooksCSV(books) {
  const headers = ['Title', 'Author', 'Read Date', 'Status', 'Score']
  const rows = [headers.join(',')]

  books.forEach(book => {
    const readDate = book.year && book.month
      ? `${book.year}-${String(book.month).padStart(2, '0')}`
      : ''

    const status = book.year && book.month
      ? (book.attributes?.isUnfinished ? 'Unfinished' : 'Completed')
      : 'In Progress'

    const score = book.attributes?.score || ''

    // Escape CSV values (handle commas and quotes)
    const escape = (val) => {
      const str = String(val || '')
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`
      }
      return str
    }

    rows.push([
      escape(book.name),
      escape(book.author),
      readDate,
      status,
      score
    ].join(','))
  })

  logger.info(`[DataExport] Generated CSV export with ${books.length} books`)
  return rows.join('\n')
}

/**
 * Trigger browser download for data
 * @param {string} content - File content
 * @param {string} filename - Desired filename
 * @param {string} mimeType - MIME type
 */
export function downloadFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.style.display = 'none'

  document.body.appendChild(link)
  link.click()

  // Cleanup
  setTimeout(() => {
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }, 100)

  logger.debug(`[DataExport] Downloaded file: ${filename}`)
}

/**
 * Export user data as JSON file
 */
export function exportUserDataAsJSON(books, settings) {
  const data = generateUserDataJSON(books, settings)
  const jsonContent = JSON.stringify(data, null, 2)

  const timestamp = new Date().toISOString().split('T')[0]
  const filename = `readtrail-data-${timestamp}.json`

  downloadFile(jsonContent, filename, 'application/json')
}

/**
 * Export books as CSV file
 */
export function exportBooksAsCSV(books) {
  const csvContent = generateBooksCSV(books)

  const timestamp = new Date().toISOString().split('T')[0]
  const filename = `readtrail-books-${timestamp}.csv`

  downloadFile(csvContent, filename, 'text/csv')
}
