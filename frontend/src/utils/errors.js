/**
 * Error handling utilities
 * Provides structured error classes for the application
 */

/**
 * API Error class for structured error handling
 */
export class ApiError extends Error {
  constructor(message, status, data = null) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.data = data
  }

  isNetworkError() {
    return this.status === 0
  }

  isUnauthorized() {
    return this.status === 401
  }

  isNotFound() {
    return this.status === 404
  }

  isConflict() {
    return this.status === 409
  }

  isServerError() {
    return this.status >= 500
  }
}

/**
 * Adapts PocketBase ClientResponseError to ApiError
 * Maintains backward compatibility with existing error handling
 * @param {Error} error - PocketBase ClientResponseError or generic Error
 * @returns {ApiError} Adapted ApiError instance
 */
export function adaptPocketBaseError(error) {
  // If already an ApiError, return as-is
  if (error instanceof ApiError) {
    return error
  }

  // Handle PocketBase ClientResponseError
  if (error.name === 'ClientResponseError') {
    const status = error.status || 0
    const message = error.message || `Request failed with status ${status}`
    const data = error.response || error.data || null

    return new ApiError(message, status, data)
  }

  // Handle network errors
  if (error.message?.includes('Failed to fetch') ||
      error.message?.includes('NetworkError') ||
      error.message?.includes('Network request failed')) {
    return new ApiError('Network error. Please check your internet connection.', 0)
  }

  // Handle timeout errors
  if (error.message?.includes('timeout') || error.name === 'TimeoutError') {
    return new ApiError('Request timed out. Please check your connection.', 0)
  }

  // Handle abort errors
  if (error.name === 'AbortError') {
    return new ApiError('Request cancelled', 0)
  }

  // Generic error fallback
  return new ApiError(error.message || 'An unexpected error occurred', 0)
}
