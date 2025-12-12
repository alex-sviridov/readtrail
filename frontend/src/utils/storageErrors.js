/**
 * Storage Error Handler Utility
 * Provides consistent error handling for localStorage operations
 */

import { logger } from './logger'

/**
 * Handle localStorage errors and return user-friendly error messages
 * @param {Error} error - The error thrown by localStorage
 * @param {Object} context - Additional context (e.g., { operation: 'save', itemCount: 10 })
 * @returns {string} User-friendly error message
 */
export function handleStorageError(error, context = {}) {
  const { operation = 'access', itemCount = 0, sizeKB = 0 } = context

  if (error instanceof SyntaxError) {
    const message = `Corrupted data in localStorage. Unable to ${operation} items.`
    logger.error(message, error)
    return message
  }

  if (error.name === 'SecurityError') {
    const message = `localStorage access denied. Check browser privacy settings.`
    logger.error(message, error)
    return message
  }

  if (error.name === 'QuotaExceededError') {
    const size = sizeKB || Math.round(JSON.stringify(context).length / 1024)
    const message = `Storage quota exceeded. Unable to save ${itemCount} items (~${size}KB).`
    logger.error(message, error)
    logger.warn('Consider deleting old items or clearing browser data')
    return message
  }

  // Generic error
  const message = `Failed to ${operation} localStorage`
  logger.error(message, error)
  return message
}
