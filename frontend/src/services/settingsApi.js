/**
 * Settings API service
 * Handles settings-related API operations with PocketBase
 */

import pb from './pocketbase'
import { adaptPocketBaseError } from '@/utils/errors'
import { isGuestMode, requireAuth } from './guestMode'
import { logger } from '@/utils/logger'

/**
 * Default settings structure
 */
export const DEFAULT_SETTINGS = {
  showBookInfo: true,
  allowUnfinishedReading: true,
  allowScoring: true
}

/**
 * Transform settings from PocketBase user record
 * Merges user settings with defaults to handle new settings being added
 * @param {Object} user - User record from PocketBase
 * @returns {Object} Settings object
 */
function transformSettingsFromPocketBase(user) {
  // If user.settings is null/empty, return defaults
  if (!user.settings || Object.keys(user.settings).length === 0) {
    return { ...DEFAULT_SETTINGS }
  }

  // Merge user settings with defaults (in case new settings are added)
  return {
    ...DEFAULT_SETTINGS,
    ...user.settings
  }
}

/**
 * Settings API client using PocketBase SDK
 */
class SettingsApi {
  /**
   * Fetch settings for the current user
   * @returns {Promise<Object|null>} Settings object, or null if guest mode
   */
  async getSettings() {
    // If guest mode, return null (will use localStorage)
    if (isGuestMode()) {
      return null
    }

    try {
      const userId = pb.authStore.record?.id
      if (!userId) {
        throw new Error('No authenticated user')
      }

      const user = await pb.collection('users').getOne(userId)
      return transformSettingsFromPocketBase(user)
    } catch (error) {
      // If 404 or no auth, return null to fall back to localStorage
      if (error.status === 404 || error.status === 403 || error.status === 0) {
        return null
      }
      throw adaptPocketBaseError(error)
    }
  }

  /**
   * Update settings for the current user
   * @param {Object} settings - Settings object to save
   * @returns {Promise<Object>} Updated settings object
   */
  async updateSettings(settings) {
    requireAuth('update settings')

    try {
      const userId = pb.authStore.record?.id
      if (!userId) {
        throw new Error('No authenticated user')
      }

      // Update user record with new settings
      const user = await pb.collection('users').update(userId, {
        settings
      })

      return transformSettingsFromPocketBase(user)
    } catch (error) {
      throw adaptPocketBaseError(error)
    }
  }

  /**
   * Get sync handlers for the sync queue
   * Provides API operation handlers for different operation types
   * @returns {Object} Handler functions keyed by 'resource_OPERATION' pattern
   */
  getSyncHandlers() {
    return {
      'settings_UPDATE': async (operation) => {
        return await this.updateSettings(operation.data)
      }
    }
  }
}

// Create and export singleton instance
export const settingsApi = new SettingsApi()

// Export class for testing
export { SettingsApi }
