/**
 * Authentication service
 * Handles authentication configuration and header management
 */

// Auth configuration from environment variables
const AUTH_ENABLED = import.meta.env.VITE_AUTH_ENABLED === 'true'
const AUTH_HEADER_NAME = import.meta.env.VITE_AUTH_REMOTE_HEADER_NAME || 'X-Auth-User'
const GUEST_USER_ENABLED = import.meta.env.VITE_GUEST_USER_ENABLED === 'true'

// LocalStorage key for storing auth header value
const AUTH_STORAGE_KEY = 'flexlib-auth-user'

/**
 * Authentication manager class
 */
class AuthManager {
  constructor() {
    this.authEnabled = AUTH_ENABLED
    this.authHeaderName = AUTH_HEADER_NAME
    this.guestUserEnabled = GUEST_USER_ENABLED
    this.currentUser = null
    this.isGuest = true

    // Load auth state from localStorage
    this.loadAuthState()
  }

  /**
   * Load authentication state from localStorage
   */
  loadAuthState() {
    try {
      const stored = localStorage.getItem(AUTH_STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        this.currentUser = parsed.user
        this.isGuest = parsed.isGuest ?? true
      }
    } catch (error) {
      console.error('Failed to load auth state:', error)
    }
  }

  /**
   * Save authentication state to localStorage
   */
  saveAuthState() {
    try {
      const state = {
        user: this.currentUser,
        isGuest: this.isGuest
      }
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(state))
    } catch (error) {
      console.error('Failed to save auth state:', error)
    }
  }

  /**
   * Set the current authenticated user
   * @param {string} user - User identifier (email, username, etc.)
   */
  setUser(user) {
    this.currentUser = user
    this.isGuest = false
    this.saveAuthState()
  }

  /**
   * Clear authentication (logout)
   */
  clearAuth() {
    this.currentUser = null
    this.isGuest = true
    try {
      localStorage.removeItem(AUTH_STORAGE_KEY)
    } catch (error) {
      console.error('Failed to clear auth state:', error)
    }
  }

  /**
   * Check if user is authenticated
   * @returns {boolean} True if user is authenticated
   */
  isAuthenticated() {
    // If auth is disabled, always return true
    if (!this.authEnabled) {
      return true
    }

    // If guest user is enabled and we're a guest, return true
    if (this.guestUserEnabled && this.isGuest) {
      return true
    }

    // Otherwise, check if we have a user
    return this.currentUser !== null
  }

  /**
   * Get authentication headers for API requests
   * @returns {Object} Headers object with auth header if needed
   */
  getAuthHeaders() {
    // If auth is disabled, return empty headers
    if (!this.authEnabled) {
      return {}
    }

    // If guest user mode and we're a guest, return empty headers
    if (this.guestUserEnabled && this.isGuest) {
      return {}
    }

    // If we have a user, return the auth header
    if (this.currentUser) {
      return {
        [this.authHeaderName]: this.currentUser
      }
    }

    // No auth header
    return {}
  }

  /**
   * Get current user identifier
   * @returns {string|null} Current user identifier or null
   */
  getCurrentUser() {
    return this.currentUser
  }

  /**
   * Check if current user is a guest
   * @returns {boolean} True if user is a guest
   */
  isGuestUser() {
    return this.isGuest
  }

  /**
   * Check if authentication is enabled
   * @returns {boolean} True if authentication is enabled
   */
  isAuthEnabled() {
    return this.authEnabled
  }

  /**
   * Check if guest user mode is enabled
   * @returns {boolean} True if guest user mode is enabled
   */
  isGuestUserEnabled() {
    return this.guestUserEnabled
  }

  /**
   * Get auth header name
   * @returns {string} Auth header name
   */
  getAuthHeaderName() {
    return this.authHeaderName
  }
}

// Create and export singleton instance
export const authManager = new AuthManager()

// Export class for testing
export { AuthManager }
