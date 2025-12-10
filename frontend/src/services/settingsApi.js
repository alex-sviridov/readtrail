/**
 * Settings API service
 * Handles all settings-related API operations
 */

import { apiClient } from './api'

/**
 * Default settings values
 */
const DEFAULT_SETTINGS = {
  showBookInfo: true,
  allowUnfinishedReading: true,
  allowScoring: true
}

/**
 * Settings API client
 */
class SettingsApi {
  /**
   * Fetch user settings
   * @returns {Promise<Object>} Settings object
   */
  async getSettings() {
    try {
      const response = await apiClient.get('/settings')
      return {
        showBookInfo: response.settings.showBookInfo ?? DEFAULT_SETTINGS.showBookInfo,
        allowUnfinishedReading: response.settings.allowUnfinishedReading ?? DEFAULT_SETTINGS.allowUnfinishedReading,
        allowScoring: response.settings.allowScoring ?? DEFAULT_SETTINGS.allowScoring,
        updatedAt: response.settings.updatedAt ? new Date(response.settings.updatedAt) : null
      }
    } catch (error) {
      // If 404, return default settings
      if (error.isNotFound && error.isNotFound()) {
        return {
          ...DEFAULT_SETTINGS,
          updatedAt: null
        }
      }
      throw error
    }
  }

  /**
   * Update user settings (partial updates supported)
   * @param {Object} settings - Settings to update
   * @returns {Promise<Object>} Updated settings object
   */
  async updateSettings(settings) {
    const response = await apiClient.put('/settings', settings)
    return {
      showBookInfo: response.settings.showBookInfo,
      allowUnfinishedReading: response.settings.allowUnfinishedReading,
      allowScoring: response.settings.allowScoring,
      updatedAt: response.settings.updatedAt ? new Date(response.settings.updatedAt) : null
    }
  }
}

// Create and export singleton instance
export const settingsApi = new SettingsApi()

// Export class for testing
export { SettingsApi, DEFAULT_SETTINGS }
