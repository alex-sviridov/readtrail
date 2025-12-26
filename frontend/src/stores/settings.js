import { defineStore } from 'pinia'
import { ref } from 'vue'
import { settingsApi, DEFAULT_SETTINGS } from '@/services/settingsApi'
import { syncQueue, OPERATION_TYPES } from '@/services/syncQueue'
import { useOnlineStatus, setApiAvailability } from '@/composables/useOnlineStatus'
import { isGuestMode } from '@/services/guestMode'
import { logger } from '@/utils/logger'

const STORAGE_KEY = 'readtrail-settings'
const MIGRATION_FLAG_KEY = 'readtrail-settings-migration'

// Old localStorage keys (for migration)
const OLD_KEYS = {
  showBookInfo: 'readtrail-settings-showBookInfo',
  allowUnfinishedReading: 'readtrail-settings-allowUnfinishedReading',
  allowScoring: 'readtrail-settings-allowScoring'
}

/**
 * Settings store with PocketBase sync and localStorage fallback
 * Follows the same pattern as books.js
 */
export const useSettingsStore = defineStore('settings', () => {
  // State - single reactive object for all settings
  const settings = ref({
    showBookInfo: true,
    allowUnfinishedReading: true,
    allowScoring: true,
    lastLibraryView: 'timeline'
  })

  const settingsLoading = ref(false)
  const syncStatus = ref('idle') // 'idle' | 'syncing' | 'error'
  const lastError = ref(null)
  const { isOnline } = useOnlineStatus(handleOnlineStatusChange)

  /**
   * Handle online status changes
   */
  async function handleOnlineStatusChange(online) {
    if (online && syncQueue.getPendingCount() > 0) {
      logger.info('[SettingsStore] Connection restored, processing settings sync queue')
      await syncWithBackend()
    }
  }

  /**
   * Apply settings object
   * @param {Object} newSettings - Settings object
   */
  function applySettings(newSettings) {
    settings.value = {
      showBookInfo: newSettings.showBookInfo ?? true,
      allowUnfinishedReading: newSettings.allowUnfinishedReading ?? true,
      allowScoring: newSettings.allowScoring ?? true,
      lastLibraryView: newSettings.lastLibraryView ?? 'timeline'
    }
  }

  /**
   * Load settings from backend or localStorage
   */
  async function loadSettings() {
    settingsLoading.value = true

    try {
      // Try loading from backend if online
      if (isOnline.value) {
        try {
          const backendSettings = await settingsApi.getSettings()

          if (backendSettings) {
            // Backend has data, use it (OVERWRITES local)
            applySettings(backendSettings)
            saveToLocalStorage()
            setApiAvailability(true)
            logger.info('[SettingsStore] Loaded settings from backend')
          } else {
            // Backend returned null (guest or no data), check localStorage
            const hasLocalData = loadFromLocalStorage()

            if (hasLocalData) {
              // Mark for migration if authenticated
              if (!isGuestMode()) {
                localStorage.setItem(MIGRATION_FLAG_KEY, 'true')
                logger.info('[SettingsStore] Loaded settings from localStorage, marked for migration')
              }
            } else {
              // No data anywhere, check for old format
              const migratedFromOld = migrateOldLocalStorageKeys()

              if (!migratedFromOld) {
                // Use defaults
                applySettings(DEFAULT_SETTINGS)
                saveToLocalStorage()
                logger.info('[SettingsStore] No settings found, using defaults')
              }
            }
          }

          lastError.value = null
        } catch (error) {
          // Backend error, mark API as unavailable
          setApiAvailability(false)
          logger.warn('[SettingsStore] Failed to load from backend, using localStorage:', error)
          loadFromLocalStorage() || migrateOldLocalStorageKeys() || applySettings(DEFAULT_SETTINGS)
        }
      } else {
        // Offline, load from localStorage
        logger.info('[SettingsStore] Offline, loading from localStorage')
        loadFromLocalStorage() || migrateOldLocalStorageKeys() || applySettings(DEFAULT_SETTINGS)
      }

      // Check if we need to migrate to backend
      if (localStorage.getItem(MIGRATION_FLAG_KEY) === 'true') {
        await migrateLocalDataToBackend()
      }
    } catch (error) {
      logger.error('[SettingsStore] Failed to load settings:', error)
      lastError.value = 'Failed to load settings'
    } finally {
      settingsLoading.value = false
    }
  }

  /**
   * Load settings from new unified localStorage key
   * @returns {boolean} True if data was loaded
   */
  function loadFromLocalStorage() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        applySettings(parsed)
        logger.info('[SettingsStore] Loaded settings from localStorage')
        return true
      }
      return false
    } catch (error) {
      logger.error('[SettingsStore] Failed to load settings from localStorage:', error)
      lastError.value = 'Failed to load settings from local storage'
      return false
    }
  }

  /**
   * Migrate old localStorage keys to new format
   * @returns {boolean} True if migration occurred
   */
  function migrateOldLocalStorageKeys() {
    try {
      const oldShowBookInfo = localStorage.getItem(OLD_KEYS.showBookInfo)
      const oldAllowUnfinished = localStorage.getItem(OLD_KEYS.allowUnfinishedReading)
      const oldAllowScoring = localStorage.getItem(OLD_KEYS.allowScoring)

      // Only migrate if at least one old key exists
      if (oldShowBookInfo || oldAllowUnfinished || oldAllowScoring) {
        const migratedSettings = {
          showBookInfo: oldShowBookInfo ? JSON.parse(oldShowBookInfo) : true,
          allowUnfinishedReading: oldAllowUnfinished ? JSON.parse(oldAllowUnfinished) : true,
          allowScoring: oldAllowScoring ? JSON.parse(oldAllowScoring) : true
        }

        applySettings(migratedSettings)
        saveToLocalStorage()

        // Remove old keys
        Object.values(OLD_KEYS).forEach(key => localStorage.removeItem(key))

        logger.info('[SettingsStore] Migrated settings from old localStorage format')
        return true
      }

      return false
    } catch (error) {
      logger.error('[SettingsStore] Failed to migrate old localStorage keys:', error)
      return false
    }
  }

  /**
   * Save settings to new unified localStorage key
   */
  function saveToLocalStorage() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings.value))
      lastError.value = null
    } catch (error) {
      logger.error('[SettingsStore] Failed to save settings to localStorage:', error)
      lastError.value = 'Failed to save settings to local storage'
    }
  }

  /**
   * Migrate localStorage settings to backend
   */
  async function migrateLocalDataToBackend() {
    if (!isOnline.value) {
      logger.debug('[SettingsStore] Offline, skipping settings migration')
      return
    }

    if (isGuestMode()) {
      logger.debug('[SettingsStore] Guest mode, skipping settings migration')
      return
    }

    try {
      logger.info('[SettingsStore] Migrating localStorage settings to backend')
      syncStatus.value = 'syncing'

      await settingsApi.updateSettings(settings.value)

      localStorage.removeItem(MIGRATION_FLAG_KEY)
      syncStatus.value = 'idle'
      logger.info('[SettingsStore] Settings migration completed successfully')
    } catch (error) {
      logger.error('[SettingsStore] Settings migration failed:', error)
      syncStatus.value = 'error'
      lastError.value = 'Failed to migrate settings to backend'
    }
  }

  /**
   * Update a single setting
   * @param {string} key - Setting key
   * @param {any} value - Setting value
   */
  function updateSetting(key, value) {
    // Update setting directly
    if (!(key in settings.value)) {
      logger.warn(`[SettingsStore] Unknown setting key: ${key}`)
      return
    }

    settings.value[key] = value

    // Save to localStorage
    saveToLocalStorage()

    // Queue for sync if online and authenticated
    if (isOnline.value && !isGuestMode()) {
      syncQueue.enqueue(OPERATION_TYPES.UPDATE, 'settings', settings.value)
      syncWithBackend()
    }
  }

  /**
   * Sync settings with backend
   */
  async function syncWithBackend() {
    if (!isOnline.value) {
      logger.debug('[SettingsStore] Offline, skipping settings sync')
      return
    }

    if (isGuestMode()) {
      logger.debug('[SettingsStore] Guest mode, skipping settings sync')
      return
    }

    if (syncQueue.isQueueProcessing()) {
      logger.debug('[SettingsStore] Sync already in progress')
      return
    }

    try {
      syncStatus.value = 'syncing'

      // Get API handlers
      const apiHandlers = settingsApi.getSyncHandlers()

      // Process queue
      const results = await syncQueue.processQueue(apiHandlers, (operationId, status, result) => {
        logger.debug(`[SettingsStore] Operation ${operationId}: ${status}`, result)
      })

      setApiAvailability(true)
      syncStatus.value = 'idle'

      logger.info(`[SettingsStore] Sync completed: ${results.successful.length} successful, ${results.failed.length} failed`)

      if (results.failed.length > 0) {
        lastError.value = `Settings sync completed with ${results.failed.length} errors`
      }
    } catch (error) {
      setApiAvailability(false)
      logger.error('[SettingsStore] Settings sync failed:', error)
      syncStatus.value = 'error'
      lastError.value = 'Settings sync failed'
    }
  }

  /**
   * Reset settings to defaults
   */
  function $reset() {
    applySettings(DEFAULT_SETTINGS)
    saveToLocalStorage()
    lastError.value = null
    settingsLoading.value = false
    syncStatus.value = 'idle'
  }

  return {
    // State
    settings,
    settingsLoading,
    syncStatus,
    lastError,
    isOnline,

    // Actions
    loadSettings,
    updateSetting,
    syncWithBackend,
    migrateLocalDataToBackend,
    $reset
  }
})
