import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { settingsApi } from '@/services/settingsApi'
import { syncQueue, OPERATION_TYPES } from '@/services/syncQueue'
import { useOnlineStatus, setApiAvailability } from '@/composables/useOnlineStatus'
import { apiClient } from '@/services/api'
import { authManager } from '@/services/auth'

const STORAGE_KEY = 'flexlib-settings'

export const useSettingsStore = defineStore('settings', () => {
  // State
  const showBookInfo = ref(true)
  const allowUnfinishedReading = ref(true)
  const allowScoring = ref(true)
  const syncStatus = ref('idle') // 'idle' | 'syncing' | 'error'
  const lastSyncTime = ref(null)
  const { isOnline } = useOnlineStatus(handleOnlineStatusChange)

  /**
   * Handle online status changes
   */
  async function handleOnlineStatusChange(online) {
    if (online && syncQueue.getPendingCount() > 0) {
      console.info('Connection restored, syncing settings')
      await syncWithBackend()
    }
  }

  /**
   * Load settings from backend or localStorage
   */
  async function loadSettings() {
    // Set up auth header provider for API client
    apiClient.setAuthHeaderProvider(() => authManager.getAuthHeaders())

    try {
      // Try loading from backend if online
      if (isOnline.value) {
        try {
          const backendSettings = await settingsApi.getSettings()

          // API is available
          setApiAvailability(true)

          showBookInfo.value = backendSettings.showBookInfo
          allowUnfinishedReading.value = backendSettings.allowUnfinishedReading
          allowScoring.value = backendSettings.allowScoring
          lastSyncTime.value = backendSettings.updatedAt

          // Save to localStorage as cache
          saveToLocalStorage()

          console.info('Loaded settings from backend')
        } catch (error) {
          // Backend error, mark API as unavailable
          setApiAvailability(false)
          console.warn('Failed to load from backend, using localStorage:', error)
          loadFromLocalStorage()
        }
      } else {
        // Offline, load from localStorage
        loadFromLocalStorage()
      }
    } catch (error) {
      console.error('Failed to load settings:', error)
      // Use defaults
      showBookInfo.value = true
      allowUnfinishedReading.value = true
      allowScoring.value = true
    }
  }

  /**
   * Load settings from localStorage
   */
  function loadFromLocalStorage() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        showBookInfo.value = parsed.showBookInfo ?? true
        allowUnfinishedReading.value = parsed.allowUnfinishedReading ?? true
        allowScoring.value = parsed.allowScoring ?? true
        console.info('Loaded settings from localStorage')
      }
    } catch (error) {
      console.error('Failed to load settings from localStorage', error)
      showBookInfo.value = true
      allowUnfinishedReading.value = true
      allowScoring.value = true
    }
  }

  /**
   * Save settings to localStorage (cache)
   */
  function saveToLocalStorage() {
    try {
      const settings = {
        showBookInfo: showBookInfo.value,
        allowUnfinishedReading: allowUnfinishedReading.value,
        allowScoring: allowScoring.value
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
    } catch (error) {
      console.error('Failed to save settings to localStorage', error)
    }
  }

  /**
   * Sync settings with backend
   */
  async function syncWithBackend() {
    if (!isOnline.value) {
      console.debug('Offline, skipping settings sync')
      return
    }

    if (syncQueue.isQueueProcessing()) {
      console.debug('Sync already in progress')
      return
    }

    try {
      syncStatus.value = 'syncing'

      // Define API handlers for sync queue
      const apiHandlers = {
        'settings_UPDATE': async (operation) => {
          return await settingsApi.updateSettings(operation.data)
        }
      }

      // Process queue
      const results = await syncQueue.processQueue(apiHandlers, (operationId, status, result) => {
        console.debug(`Settings operation ${operationId}: ${status}`, result)
      })

      // Sync succeeded, mark API as available
      setApiAvailability(true)

      syncStatus.value = 'idle'
      lastSyncTime.value = new Date()

      console.info(`Settings sync completed: ${results.successful.length} successful, ${results.failed.length} failed`)
    } catch (error) {
      // Sync failed, mark API as unavailable
      setApiAvailability(false)
      console.error('Settings sync failed:', error)
      syncStatus.value = 'error'
    }
  }

  /**
   * Queue settings update for sync
   */
  function queueSettingsUpdate() {
    saveToLocalStorage()

    if (isOnline.value) {
      syncQueue.enqueue(OPERATION_TYPES.UPDATE, 'settings', {
        showBookInfo: showBookInfo.value,
        allowUnfinishedReading: allowUnfinishedReading.value,
        allowScoring: allowScoring.value
      })

      syncWithBackend()
    }
  }

  // Set show book info
  function setShowBookInfo(value) {
    showBookInfo.value = value
    queueSettingsUpdate()
  }

  // Set allow unfinished reading
  function setAllowUnfinishedReading(value) {
    allowUnfinishedReading.value = value
    queueSettingsUpdate()
  }

  // Set allow scoring
  function setAllowScoring(value) {
    allowScoring.value = value
    queueSettingsUpdate()
  }

  // Settings configuration metadata
  const settingsConfig = computed(() => [
    {
      section: 'Display Settings',
      settings: [
        {
          key: 'showBookInfo',
          label: 'Show Book Information',
          description: 'Display book title and author on book cards in the library',
          type: 'toggle',
          value: showBookInfo.value,
          toggle: () => setShowBookInfo(!showBookInfo.value)
        },
        {
          key: 'allowUnfinishedReading',
          label: 'Allow Unfinished Reading',
          description: 'Enable marking books as unfinished when setting their completion date',
          type: 'toggle',
          value: allowUnfinishedReading.value,
          toggle: () => setAllowUnfinishedReading(!allowUnfinishedReading.value)
        },
        {
          key: 'allowScoring',
          label: 'Allow Book Scoring',
          description: 'Enable like/dislike functionality for books',
          type: 'toggle',
          value: allowScoring.value,
          toggle: () => setAllowScoring(!allowScoring.value)
        }
      ]
    }
  ])

  // Return public API
  return {
    // State
    showBookInfo,
    allowUnfinishedReading,
    allowScoring,
    syncStatus,
    lastSyncTime,
    isOnline,
    // Configuration
    settingsConfig,
    // Actions
    loadSettings,
    setShowBookInfo,
    setAllowUnfinishedReading,
    setAllowScoring,
    syncWithBackend
  }
})
