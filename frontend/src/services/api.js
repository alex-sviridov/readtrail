/**
 * Base API service for making HTTP requests to the backend
 * Provides centralized configuration, error handling, and request interception
 */

import { TIMINGS } from '@/constants'

// API Configuration from environment variables
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api'
const API_TIMEOUT = import.meta.env.VITE_API_TIMEOUT || TIMINGS.API_TIMEOUT

/**
 * Creates a fetch request with timeout support
 * @param {string} url - The URL to fetch
 * @param {object} options - Fetch options
 * @param {number} timeout - Timeout in milliseconds
 * @returns {Promise<Response>} Fetch promise with timeout
 */
function fetchWithTimeout(url, options = {}, timeout = API_TIMEOUT) {
  return Promise.race([
    fetch(url, options),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Request timeout')), timeout)
    )
  ])
}

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
 * Base API client class
 */
class ApiClient {
  constructor() {
    this.baseURL = API_BASE_URL
    this.timeout = API_TIMEOUT
    this.authHeaderProvider = null
  }

  /**
   * Set the auth header provider function
   * @param {Function} provider - Function that returns auth headers object
   */
  setAuthHeaderProvider(provider) {
    this.authHeaderProvider = provider
  }

  /**
   * Get default headers for requests
   * @returns {Object} Headers object
   */
  getDefaultHeaders() {
    const headers = {
      'Content-Type': 'application/json'
    }

    // Add authentication headers if provider is set
    if (this.authHeaderProvider) {
      const authHeaders = this.authHeaderProvider()
      Object.assign(headers, authHeaders)
    }

    return headers
  }

  /**
   * Make an HTTP request
   * @param {string} endpoint - API endpoint (e.g., '/books')
   * @param {object} options - Fetch options
   * @returns {Promise<any>} Response data
   */
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`
    const headers = {
      ...this.getDefaultHeaders(),
      ...options.headers
    }

    const config = {
      ...options,
      headers
    }

    try {
      const response = await fetchWithTimeout(url, config, this.timeout)

      // Handle non-JSON responses (like 204 No Content)
      if (response.status === 204) {
        return null
      }

      // Parse JSON response
      const data = await response.json()

      // Check if response is ok
      if (!response.ok) {
        throw new ApiError(
          data.message || `Request failed with status ${response.status}`,
          response.status,
          data
        )
      }

      return data
    } catch (error) {
      // Handle network errors
      if (error.message === 'Request timeout') {
        throw new ApiError('Request timed out. Please check your connection.', 0)
      }

      if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
        throw new ApiError('Network error. Please check your internet connection.', 0)
      }

      // Re-throw ApiError
      if (error instanceof ApiError) {
        throw error
      }

      // Handle AbortError
      if (error.name === 'AbortError') {
        throw new ApiError('Request cancelled', 0)
      }

      // Generic error
      throw new ApiError(error.message || 'An unexpected error occurred', 0)
    }
  }

  /**
   * Make a GET request
   * @param {string} endpoint - API endpoint
   * @param {object} options - Fetch options
   * @returns {Promise<any>} Response data
   */
  async get(endpoint, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'GET'
    })
  }

  /**
   * Make a POST request
   * @param {string} endpoint - API endpoint
   * @param {any} data - Request body data
   * @param {object} options - Fetch options
   * @returns {Promise<any>} Response data
   */
  async post(endpoint, data, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'POST',
      body: JSON.stringify(data)
    })
  }

  /**
   * Make a PUT request
   * @param {string} endpoint - API endpoint
   * @param {any} data - Request body data
   * @param {object} options - Fetch options
   * @returns {Promise<any>} Response data
   */
  async put(endpoint, data, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(data)
    })
  }

  /**
   * Make a DELETE request
   * @param {string} endpoint - API endpoint
   * @param {object} options - Fetch options
   * @returns {Promise<any>} Response data
   */
  async delete(endpoint, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'DELETE'
    })
  }

  /**
   * Check if the API is available
   * @returns {Promise<boolean>} True if API is available
   */
  async checkHealth() {
    try {
      await this.get('/health')
      return true
    } catch {
      return false
    }
  }
}

// Create and export singleton instance
export const apiClient = new ApiClient()

// Export ApiClient class for testing
export { ApiClient }
