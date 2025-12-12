/**
 * Guest Mode Service
 * Centralized guest mode logic and configuration
 */

import { authManager } from './auth'

/**
 * Check if the current user is in guest mode (not authenticated)
 * @returns {boolean} True if user is a guest (not authenticated)
 */
export function isGuestMode() {
  return authManager.isGuestUser()
}

/**
 * Check if guest mode feature is enabled in the application
 * @returns {boolean} True if guest mode is enabled
 */
export function isGuestModeEnabled() {
  return authManager.isGuestUserEnabled()
}

/**
 * Check if user should sync with backend
 * @returns {boolean} True if user is authenticated and should sync
 */
export function shouldSyncWithBackend() {
  return !isGuestMode()
}

/**
 * Guard function to check if operation requires authentication
 * @param {string} operation - Description of the operation
 * @throws {Error} If user is in guest mode
 */
export function requireAuth(operation) {
  if (isGuestMode()) {
    throw new Error(`Cannot ${operation} in guest mode`)
  }
}
