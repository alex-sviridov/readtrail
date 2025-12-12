/**
 * Authentication service
 * Handles PocketBase authentication with JWT tokens
 */

import pb from './pocketbase'
import { adaptPocketBaseError } from '@/utils/errors'
import { logger } from '@/utils/logger'

// Auth configuration from environment variables
const GUEST_USER_ENABLED = import.meta.env.VITE_GUEST_USER_ENABLED === 'true'

/**
 * Authentication manager class
 * Facade over PocketBase authStore for consistent API
 */
class AuthManager {
  constructor() {
    this.guestUserEnabled = GUEST_USER_ENABLED

    // Set up auth state change listener
    pb.authStore.onChange((token, model) => {
      logger.debug('[AuthManager] Auth state changed:', {
        isValid: pb.authStore.isValid,
        userId: model?.id || null,
        email: model?.email || null
      })
    })
  }

  /**
   * Login with email and password
   * @param {string} email - User email
   * @param {string} password - User password
   * @returns {Promise<Object>} User record
   */
  async login(email, password) {
    try {
      const authData = await pb.collection('users').authWithPassword(email, password)
      return authData.record
    } catch (error) {
      throw adaptPocketBaseError(error)
    }
  }

  /**
   * Register a new user
   * @param {string} email - User email
   * @param {string} password - User password
   * @param {string} passwordConfirm - Password confirmation
   * @param {Object} additionalData - Additional user data
   * @returns {Promise<Object>} Created user record
   */
  async register(email, password, passwordConfirm, additionalData = {}) {
    try {
      const data = {
        email,
        password,
        passwordConfirm,
        ...additionalData
      }
      const record = await pb.collection('users').create(data)

      // Auto-login after registration
      await this.login(email, password)

      return record
    } catch (error) {
      throw adaptPocketBaseError(error)
    }
  }

  /**
   * Logout (clear authentication and all user data)
   * Clears auth and all data to start fresh as guest
   */
  logout() {
    logger.debug('[AuthManager] Logging out and clearing all data')

    // Clear PocketBase auth
    pb.authStore.clear()

    // Clear ALL application data - user starts fresh as guest after logout
    const keysToRemove = [
      'flexlib-books',
      'flexlib-sync-queue',
      'flexlib-needs-migration',
      'flexlib-settings-showBookInfo',
      'flexlib-settings-allowUnfinishedReading',
      'flexlib-settings-allowScoring'
    ]

    keysToRemove.forEach(key => localStorage.removeItem(key))

    logger.debug('[AuthManager] Cleared authentication and all data')
  }

  /**
   * Check if user is authenticated
   * @returns {boolean} True if user is authenticated
   */
  isAuthenticated() {
    return pb.authStore.isValid
  }

  /**
   * Get current authenticated user
   * @returns {Object|null} User record or null
   */
  getCurrentUser() {
    return pb.authStore.record
  }

  /**
   * Check if current user is a guest (not authenticated)
   * @returns {boolean} True if user is a guest
   */
  isGuestUser() {
    return !pb.authStore.isValid
  }

  /**
   * Check if guest user mode is enabled
   * @returns {boolean} True if guest user mode is enabled
   */
  isGuestUserEnabled() {
    return this.guestUserEnabled
  }

  /**
   * Get authentication token
   * @returns {string|null} JWT token or null
   */
  getToken() {
    return pb.authStore.token
  }

  /**
   * Refresh authentication token
   * @returns {Promise<boolean>} True if refresh succeeded
   */
  async refreshAuth() {
    try {
      await pb.collection('users').authRefresh()
      return true
    } catch (error) {
      logger.error('Failed to refresh auth:', error)
      return false
    }
  }

  /**
   * Check if auth token is valid and not expired
   * @returns {boolean} True if token is valid
   */
  isTokenValid() {
    return pb.authStore.isValid
  }

  /**
   * Get user ID
   * @returns {string|null} User ID or null
   */
  getUserId() {
    return pb.authStore.record?.id || null
  }

  /**
   * Get user email
   * @returns {string|null} User email or null
   */
  getUserEmail() {
    return pb.authStore.record?.email || null
  }

  /**
   * Set user (for backward compatibility)
   * Note: With PocketBase, this is handled automatically via authStore
   * @deprecated Use login() instead
   * @param {string} user - User identifier
   */
  setUser(user) {
    logger.warn('[AuthManager] setUser() is deprecated with PocketBase. Use login() instead.')
  }

  /**
   * Clear authentication
   * Alias for logout() for backward compatibility
   */
  clearAuth() {
    this.logout()
  }

  /**
   * Get authentication headers for API requests
   * @deprecated PocketBase handles auth headers automatically
   * @returns {Object} Empty object (PocketBase handles headers)
   */
  getAuthHeaders() {
    // PocketBase SDK handles authentication headers automatically
    // Keeping this method for backward compatibility but it's not needed
    return {}
  }

  /**
   * Check if authentication is enabled
   * @deprecated Always returns true with PocketBase
   * @returns {boolean} True
   */
  isAuthEnabled() {
    return true
  }

  /**
   * Get auth header name
   * @deprecated Not used with PocketBase (uses Authorization header automatically)
   * @returns {string} Auth header name
   */
  getAuthHeaderName() {
    return 'Authorization'
  }
}

// Create and export singleton instance
export const authManager = new AuthManager()

// Export class for testing
export { AuthManager }
