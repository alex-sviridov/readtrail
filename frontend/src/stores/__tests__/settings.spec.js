import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useSettingsStore } from '../settings'
import { settingsApi } from '@/services/settingsApi'
import * as guestMode from '@/services/guestMode'
import { syncQueue } from '@/services/syncQueue'

// Mock dependencies
vi.mock('@/services/settingsApi')
vi.mock('@/services/guestMode')
vi.mock('@/services/syncQueue')
vi.mock('@/composables/useOnlineStatus', () => ({
  useOnlineStatus: () => ({ isOnline: { value: true } }),
  setApiAvailability: vi.fn()
}))

describe('useSettingsStore', () => {
  let store

  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
    vi.clearAllMocks()

    // Default mocks
    vi.spyOn(guestMode, 'isGuestMode').mockReturnValue(false)
    syncQueue.getPendingCount = vi.fn().mockReturnValue(0)
    syncQueue.enqueue = vi.fn()
    syncQueue.processQueue = vi.fn().mockResolvedValue({ successful: [], failed: [] })
    syncQueue.isQueueProcessing = vi.fn().mockReturnValue(false)

    store = useSettingsStore()
  })

  afterEach(() => {
    localStorage.clear()
  })

  describe('initial state with defaults', () => {
    it('should initialize with default values before loadSettings is called', () => {
      expect(store.settings.showBookInfo).toBe(true)
      expect(store.settings.allowUnfinishedReading).toBe(true)
      expect(store.settings.allowScoring).toBe(true)
      expect(store.settings.lastLibraryView).toBe('timeline')
      expect(store.settings.hideUnfinished).toBe(true)
      expect(store.settings.hideToRead).toBe(true)
    })

    it('should have initial loading and sync states', () => {
      expect(store.settingsLoading).toBe(false)
      expect(store.syncStatus).toBe('idle')
      expect(store.lastError).toBe(null)
    })
  })

  describe('loadSettings - backend priority', () => {
    it('should load settings from backend and overwrite localStorage', async () => {
      // Set different values in localStorage
      localStorage.setItem('readtrail-settings', JSON.stringify({
        showBookInfo: false,
        allowUnfinishedReading: false,
        allowScoring: false
      }))

      // Backend returns different values
      settingsApi.getSettings = vi.fn().mockResolvedValue({
        showBookInfo: true,
        allowUnfinishedReading: true,
        allowScoring: false
      })

      await store.loadSettings()

      // Backend values should win
      expect(store.settings.showBookInfo).toBe(true)
      expect(store.settings.allowUnfinishedReading).toBe(true)
      expect(store.settings.allowScoring).toBe(false)
    })

    it('should use localStorage when backend returns null (guest mode)', async () => {
      vi.spyOn(guestMode, 'isGuestMode').mockReturnValue(true)

      localStorage.setItem('readtrail-settings', JSON.stringify({
        showBookInfo: false,
        allowUnfinishedReading: true,
        allowScoring: false
      }))

      settingsApi.getSettings = vi.fn().mockResolvedValue(null)

      await store.loadSettings()

      expect(store.settings.showBookInfo).toBe(false)
      expect(store.settings.allowUnfinishedReading).toBe(true)
      expect(store.settings.allowScoring).toBe(false)
    })

    it('should use defaults when no backend and no localStorage', async () => {
      settingsApi.getSettings = vi.fn().mockResolvedValue(null)

      await store.loadSettings()

      expect(store.settings.showBookInfo).toBe(true)
      expect(store.settings.allowUnfinishedReading).toBe(true)
      expect(store.settings.allowScoring).toBe(true)
      expect(store.settings.lastLibraryView).toBe('timeline')
      expect(store.settings.hideUnfinished).toBe(true)
      expect(store.settings.hideToRead).toBe(true)
    })

    it('should fall back to localStorage on backend error', async () => {
      localStorage.setItem('readtrail-settings', JSON.stringify({
        showBookInfo: false,
        allowUnfinishedReading: false,
        allowScoring: true
      }))

      settingsApi.getSettings = vi.fn().mockRejectedValue(new Error('Network error'))

      await store.loadSettings()

      // Should use localStorage values
      expect(store.settings.showBookInfo).toBe(false)
      expect(store.settings.allowUnfinishedReading).toBe(false)
      expect(store.settings.allowScoring).toBe(true)
    })
  })

  describe('migration from old localStorage keys', () => {
    it('should migrate old separate keys to new unified key', async () => {
      // Set old format
      localStorage.setItem('readtrail-settings-showBookInfo', 'false')
      localStorage.setItem('readtrail-settings-allowUnfinishedReading', 'false')
      localStorage.setItem('readtrail-settings-allowScoring', 'true')

      settingsApi.getSettings = vi.fn().mockResolvedValue(null)

      await store.loadSettings()

      // Values should be migrated
      expect(store.settings.showBookInfo).toBe(false)
      expect(store.settings.allowUnfinishedReading).toBe(false)
      expect(store.settings.allowScoring).toBe(true)

      // New key should exist
      const newKey = localStorage.getItem('readtrail-settings')
      expect(newKey).toBeTruthy()
      expect(JSON.parse(newKey)).toEqual({
        showBookInfo: false,
        allowUnfinishedReading: false,
        allowScoring: true,
        lastLibraryView: 'timeline',
        hideUnfinished: true,
        hideToRead: true
      })

      // Old keys should be removed
      expect(localStorage.getItem('readtrail-settings-showBookInfo')).toBeNull()
      expect(localStorage.getItem('readtrail-settings-allowUnfinishedReading')).toBeNull()
      expect(localStorage.getItem('readtrail-settings-allowScoring')).toBeNull()
    })

    it('should handle partial old keys with defaults', async () => {
      // Only set one old key
      localStorage.setItem('readtrail-settings-showBookInfo', 'false')

      settingsApi.getSettings = vi.fn().mockResolvedValue(null)

      await store.loadSettings()

      expect(store.settings.showBookInfo).toBe(false)
      expect(store.settings.allowUnfinishedReading).toBe(true) // default
      expect(store.settings.allowScoring).toBe(true) // default
    })
  })

  describe('migration to backend on auth', () => {
    it('should set migration flag when authenticated user has local data but no backend data', async () => {
      localStorage.setItem('readtrail-settings', JSON.stringify({
        showBookInfo: false,
        allowUnfinishedReading: false,
        allowScoring: true
      }))

      settingsApi.getSettings = vi.fn().mockResolvedValue(null)
      // Mock updateSettings to prevent automatic migration during load
      let migrationAttempted = false
      settingsApi.updateSettings = vi.fn().mockImplementation(async () => {
        migrationAttempted = true
        // Keep the promise hanging to prevent migration from completing
        await new Promise(() => {})
      })

      // Don't await - let it run in background so migration doesn't complete
      store.loadSettings()

      // Wait a bit for the migration flag to be set
      await new Promise(resolve => setTimeout(resolve, 10))

      // Migration flag should be set before migration completes
      expect(localStorage.getItem('readtrail-settings-migration')).toBe('true')
      expect(migrationAttempted).toBe(true)
    })

    it('should not set migration flag for guest users', async () => {
      vi.spyOn(guestMode, 'isGuestMode').mockReturnValue(true)

      localStorage.setItem('readtrail-settings', JSON.stringify({
        showBookInfo: false,
        allowUnfinishedReading: false,
        allowScoring: true
      }))

      settingsApi.getSettings = vi.fn().mockResolvedValue(null)

      await store.loadSettings()

      expect(localStorage.getItem('readtrail-settings-migration')).toBeNull()
    })

    it('should migrate local data to backend when migration flag is set', async () => {
      localStorage.setItem('readtrail-settings', JSON.stringify({
        showBookInfo: false,
        allowUnfinishedReading: true,
        allowScoring: false,
        lastLibraryView: 'grid'
      }))
      localStorage.setItem('readtrail-settings-migration', 'true')

      settingsApi.getSettings = vi.fn().mockResolvedValue(null)
      settingsApi.updateSettings = vi.fn().mockResolvedValue({
        showBookInfo: false,
        allowUnfinishedReading: true,
        allowScoring: false,
        lastLibraryView: 'grid'
      })

      await store.loadSettings()

      // Should call updateSettings with local data
      expect(settingsApi.updateSettings).toHaveBeenCalledWith({
        showBookInfo: false,
        allowUnfinishedReading: true,
        allowScoring: false,
        lastLibraryView: 'grid',
        hideUnfinished: true,
        hideToRead: true
      })

      // Migration flag should be removed
      expect(localStorage.getItem('readtrail-settings-migration')).toBeNull()
    })
  })

  describe('updateSetting with sync', () => {
    beforeEach(async () => {
      settingsApi.getSettings = vi.fn().mockResolvedValue(null)
      await store.loadSettings()
    })

    it('should update setting locally and save to localStorage', () => {
      store.updateSetting('showBookInfo', false)

      expect(store.settings.showBookInfo).toBe(false)

      const stored = localStorage.getItem('readtrail-settings')
      expect(JSON.parse(stored).showBookInfo).toBe(false)
    })

    it('should queue for sync when authenticated and online', () => {
      store.updateSetting('showBookInfo', false)

      expect(syncQueue.enqueue).toHaveBeenCalledWith(
        'UPDATE',
        'settings',
        {
          showBookInfo: false,
          allowUnfinishedReading: true,
          allowScoring: true,
          lastLibraryView: 'timeline',
          hideUnfinished: true,
          hideToRead: true
        }
      )
    })

    it('should not sync for guest users', () => {
      vi.spyOn(guestMode, 'isGuestMode').mockReturnValue(true)

      store.updateSetting('showBookInfo', false)

      // Should update locally
      expect(store.settings.showBookInfo).toBe(false)

      // But not queue for sync
      expect(syncQueue.enqueue).not.toHaveBeenCalled()
    })

    it('should handle unknown setting key gracefully', () => {
      store.updateSetting('unknownKey', false)

      // Should not throw, just log warning
      expect(store.lastError).toBe(null)
    })
  })

  describe('syncWithBackend', () => {
    beforeEach(async () => {
      settingsApi.getSettings = vi.fn().mockResolvedValue(null)
      await store.loadSettings()
    })

    it('should process sync queue with settings handlers', async () => {
      settingsApi.getSyncHandlers = vi.fn().mockReturnValue({
        'settings_UPDATE': vi.fn()
      })

      await store.syncWithBackend()

      expect(syncQueue.processQueue).toHaveBeenCalled()
      expect(store.syncStatus).toBe('idle')
    })

    it('should skip sync in guest mode', async () => {
      vi.spyOn(guestMode, 'isGuestMode').mockReturnValue(true)

      await store.syncWithBackend()

      expect(syncQueue.processQueue).not.toHaveBeenCalled()
    })

    it('should handle sync errors', async () => {
      syncQueue.processQueue = vi.fn().mockRejectedValue(new Error('Sync failed'))

      await store.syncWithBackend()

      expect(store.syncStatus).toBe('error')
      expect(store.lastError).toBe('Settings sync failed')
    })
  })

  describe('$reset', () => {
    it('should reset all settings to defaults', async () => {
      settingsApi.getSettings = vi.fn().mockResolvedValue(null)
      await store.loadSettings()

      store.updateSetting('showBookInfo', false)
      store.updateSetting('allowUnfinishedReading', false)
      store.updateSetting('allowScoring', false)
      store.updateSetting('lastLibraryView', 'grid')

      store.$reset()

      expect(store.settings.showBookInfo).toBe(true)
      expect(store.settings.allowUnfinishedReading).toBe(true)
      expect(store.settings.allowScoring).toBe(true)
      expect(store.settings.lastLibraryView).toBe('timeline')
      expect(store.settings.hideUnfinished).toBe(true)
      expect(store.settings.hideToRead).toBe(true)
      expect(store.lastError).toBe(null)
      expect(store.syncStatus).toBe('idle')
    })
  })

  describe('persistence across store instances', () => {
    it('should persist settings across store instances', async () => {
      settingsApi.getSettings = vi.fn().mockResolvedValue(null)
      await store.loadSettings()

      store.updateSetting('showBookInfo', false)
      store.updateSetting('allowScoring', false)

      // Create new pinia and store instance
      setActivePinia(createPinia())
      const newStore = useSettingsStore()

      settingsApi.getSettings = vi.fn().mockResolvedValue(null)
      await newStore.loadSettings()

      // Values should be loaded from localStorage
      expect(newStore.settings.showBookInfo).toBe(false)
      expect(newStore.settings.allowUnfinishedReading).toBe(true)
      expect(newStore.settings.allowScoring).toBe(false)
    })
  })
})
