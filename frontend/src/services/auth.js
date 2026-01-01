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
  async logout() {
    logger.debug('[AuthManager] Logging out and clearing all data')

    // Clear PocketBase auth
    pb.authStore.clear()

    // Clear ALL application data - user starts fresh as guest after logout
    // Use prefix-based clearing for resilience to new keys
    Object.keys(localStorage)
      .filter(key => key.startsWith('readtrail-'))
      .forEach(key => localStorage.removeItem(key))

    // Reset Pinia stores to clear in-memory state
    const { useBooksStore } = await import('@/stores/books')
    const { useSettingsStore } = await import('@/stores/settings')

    const booksStore = useBooksStore()
    const settingsStore = useSettingsStore()

    booksStore.$reset()
    settingsStore.$reset()

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
   * Change password for the current user
   * @param {string} oldPassword - Current password
   * @param {string} newPassword - New password
   * @param {string} passwordConfirm - New password confirmation
   * @returns {Promise<Object>} Updated user record
   */
  async changePassword(oldPassword, newPassword, passwordConfirm) {
    try {
      const user = this.getCurrentUser()
      if (!user) {
        throw new Error('No authenticated user')
      }

      const data = {
        oldPassword,
        password: newPassword,
        passwordConfirm
      }

      const record = await pb.collection('users').update(user.id, data)
      return record
    } catch (error) {
      throw adaptPocketBaseError(error)
    }
  }

  /**
   * Delete the current user account
   * This will cascade delete all user data including books
   * @returns {Promise<void>}
   * @throws {ApiError} If deletion fails
   */
  async deleteAccount() {
    try {
      const user = this.getCurrentUser()
      if (!user) {
        throw new Error('No authenticated user')
      }

      logger.debug('[AuthManager] Deleting user account:', user.id)

      // Delete the user record (PocketBase will cascade delete books)
      await pb.collection('users').delete(user.id)

      // Clear local auth state and all data
      this.logout()

      logger.debug('[AuthManager] Account deleted successfully')
    } catch (error) {
      throw adaptPocketBaseError(error)
    }
  }
}

// Create and export singleton instance
export const authManager = new AuthManager()

// Export class for testing
export { AuthManager }
