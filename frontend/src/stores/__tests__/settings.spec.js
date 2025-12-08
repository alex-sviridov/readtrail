import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useSettingsStore } from '../settings'

describe('useSettingsStore', () => {
  let store

  beforeEach(() => {
    // Create a fresh pinia instance for each test
    setActivePinia(createPinia())
    store = useSettingsStore()

    // Clear localStorage before each test
    localStorage.clear()
  })

  afterEach(() => {
    // Clean up
    localStorage.clear()
    vi.restoreAllMocks()
  })

  describe('initial state', () => {
    it('should initialize with default showBookInfo value (true)', () => {
      expect(store.showBookInfo).toBe(true)
    })

    it('should initialize with default allowUnfinishedReading value (true)', () => {
      expect(store.allowUnfinishedReading).toBe(true)
    })

    it('should have settingsConfig computed property', () => {
      expect(store.settingsConfig).toBeDefined()
      expect(Array.isArray(store.settingsConfig)).toBe(true)
    })
  })

  describe('loadSettings', () => {
    it('should load settings from localStorage successfully', () => {
      const testSettings = {
        showBookInfo: false,
        allowUnfinishedReading: false
      }
      localStorage.setItem('flexlib-settings', JSON.stringify(testSettings))

      store.loadSettings()

      expect(store.showBookInfo).toBe(false)
      expect(store.allowUnfinishedReading).toBe(false)
    })

    it('should handle partial settings objects (missing showBookInfo)', () => {
      const partialSettings = {
        allowUnfinishedReading: false
      }
      localStorage.setItem('flexlib-settings', JSON.stringify(partialSettings))

      store.loadSettings()

      expect(store.showBookInfo).toBe(true) // default value
      expect(store.allowUnfinishedReading).toBe(false)
    })

    it('should handle partial settings objects (missing allowUnfinishedReading)', () => {
      const partialSettings = {
        showBookInfo: false
      }
      localStorage.setItem('flexlib-settings', JSON.stringify(partialSettings))

      store.loadSettings()

      expect(store.showBookInfo).toBe(false)
      expect(store.allowUnfinishedReading).toBe(true) // default value
    })

    it('should handle empty localStorage gracefully', () => {
      store.loadSettings()

      expect(store.showBookInfo).toBe(true)
      expect(store.allowUnfinishedReading).toBe(true)
    })

    it('should handle corrupted JSON in localStorage', () => {
      localStorage.setItem('flexlib-settings', 'invalid json{')
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      store.loadSettings()

      // Should fall back to defaults
      expect(store.showBookInfo).toBe(true)
      expect(store.allowUnfinishedReading).toBe(true)
      expect(consoleSpy).toHaveBeenCalled()

      consoleSpy.mockRestore()
    })

    it('should handle localStorage SecurityError (private browsing)', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new DOMException('SecurityError')
      })

      store.loadSettings()

      expect(store.showBookInfo).toBe(true)
      expect(store.allowUnfinishedReading).toBe(true)
      expect(consoleSpy).toHaveBeenCalled()

      consoleSpy.mockRestore()
    })

    it('should log info message when settings loaded successfully', () => {
      const testSettings = {
        showBookInfo: false,
        allowUnfinishedReading: true
      }
      localStorage.setItem('flexlib-settings', JSON.stringify(testSettings))
      const consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => {})

      store.loadSettings()

      expect(consoleInfoSpy).toHaveBeenCalledWith('Loaded settings from localStorage')

      consoleInfoSpy.mockRestore()
    })
  })

  describe('toggleShowBookInfo', () => {
    it('should toggle showBookInfo from true to false', () => {
      expect(store.showBookInfo).toBe(true)

      store.toggleShowBookInfo()

      expect(store.showBookInfo).toBe(false)
    })

    it('should toggle showBookInfo from false to true', () => {
      store.showBookInfo = false

      store.toggleShowBookInfo()

      expect(store.showBookInfo).toBe(true)
    })

    it('should save to localStorage after toggling', () => {
      store.toggleShowBookInfo()

      const stored = JSON.parse(localStorage.getItem('flexlib-settings'))
      expect(stored.showBookInfo).toBe(false)
    })

    it('should toggle multiple times correctly', () => {
      expect(store.showBookInfo).toBe(true)

      store.toggleShowBookInfo()
      expect(store.showBookInfo).toBe(false)

      store.toggleShowBookInfo()
      expect(store.showBookInfo).toBe(true)

      store.toggleShowBookInfo()
      expect(store.showBookInfo).toBe(false)
    })
  })

  describe('setShowBookInfo', () => {
    it('should set showBookInfo to true', () => {
      store.showBookInfo = false

      store.setShowBookInfo(true)

      expect(store.showBookInfo).toBe(true)
    })

    it('should set showBookInfo to false', () => {
      store.setShowBookInfo(false)

      expect(store.showBookInfo).toBe(false)
    })

    it('should save to localStorage after setting', () => {
      store.setShowBookInfo(false)

      const stored = JSON.parse(localStorage.getItem('flexlib-settings'))
      expect(stored.showBookInfo).toBe(false)
    })
  })

  describe('toggleAllowUnfinishedReading', () => {
    it('should toggle allowUnfinishedReading from true to false', () => {
      expect(store.allowUnfinishedReading).toBe(true)

      store.toggleAllowUnfinishedReading()

      expect(store.allowUnfinishedReading).toBe(false)
    })

    it('should toggle allowUnfinishedReading from false to true', () => {
      store.allowUnfinishedReading = false

      store.toggleAllowUnfinishedReading()

      expect(store.allowUnfinishedReading).toBe(true)
    })

    it('should save to localStorage after toggling', () => {
      store.toggleAllowUnfinishedReading()

      const stored = JSON.parse(localStorage.getItem('flexlib-settings'))
      expect(stored.allowUnfinishedReading).toBe(false)
    })
  })

  describe('setAllowUnfinishedReading', () => {
    it('should set allowUnfinishedReading to true', () => {
      store.allowUnfinishedReading = false

      store.setAllowUnfinishedReading(true)

      expect(store.allowUnfinishedReading).toBe(true)
    })

    it('should set allowUnfinishedReading to false', () => {
      store.setAllowUnfinishedReading(false)

      expect(store.allowUnfinishedReading).toBe(false)
    })

    it('should save to localStorage after setting', () => {
      store.setAllowUnfinishedReading(false)

      const stored = JSON.parse(localStorage.getItem('flexlib-settings'))
      expect(stored.allowUnfinishedReading).toBe(false)
    })
  })

  describe('settingsConfig computed property', () => {
    it('should return array with one section', () => {
      expect(store.settingsConfig).toHaveLength(1)
    })

    it('should have Display Settings section', () => {
      expect(store.settingsConfig[0].section).toBe('Display Settings')
    })

    it('should have two settings in Display Settings section', () => {
      expect(store.settingsConfig[0].settings).toHaveLength(2)
    })

    it('should have showBookInfo setting with correct structure', () => {
      const showBookInfoSetting = store.settingsConfig[0].settings.find(
        s => s.key === 'showBookInfo'
      )

      expect(showBookInfoSetting).toBeDefined()
      expect(showBookInfoSetting.label).toBe('Show Book Information')
      expect(showBookInfoSetting.description).toBe('Display book title and author on book cards in the library')
      expect(showBookInfoSetting.type).toBe('toggle')
      expect(showBookInfoSetting.value).toBe(store.showBookInfo)
      expect(typeof showBookInfoSetting.toggle).toBe('function')
    })

    it('should have allowUnfinishedReading setting with correct structure', () => {
      const allowUnfinishedSetting = store.settingsConfig[0].settings.find(
        s => s.key === 'allowUnfinishedReading'
      )

      expect(allowUnfinishedSetting).toBeDefined()
      expect(allowUnfinishedSetting.label).toBe('Allow Unfinished Reading')
      expect(allowUnfinishedSetting.description).toBe('Enable marking books as unfinished when setting their completion date')
      expect(allowUnfinishedSetting.type).toBe('toggle')
      expect(allowUnfinishedSetting.value).toBe(store.allowUnfinishedReading)
      expect(typeof allowUnfinishedSetting.toggle).toBe('function')
    })

    it('should reflect current state values in settingsConfig', () => {
      store.setShowBookInfo(false)
      store.setAllowUnfinishedReading(false)

      const showBookInfoSetting = store.settingsConfig[0].settings.find(
        s => s.key === 'showBookInfo'
      )
      const allowUnfinishedSetting = store.settingsConfig[0].settings.find(
        s => s.key === 'allowUnfinishedReading'
      )

      expect(showBookInfoSetting.value).toBe(false)
      expect(allowUnfinishedSetting.value).toBe(false)
    })
  })

  describe('localStorage persistence', () => {
    it('should persist both settings together', () => {
      store.setShowBookInfo(false)
      store.setAllowUnfinishedReading(true)

      const stored = JSON.parse(localStorage.getItem('flexlib-settings'))
      expect(stored.showBookInfo).toBe(false)
      expect(stored.allowUnfinishedReading).toBe(true)
    })

    it('should handle localStorage quota exceeded error', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new DOMException('QuotaExceededError')
      })

      expect(() => {
        store.toggleShowBookInfo()
      }).not.toThrow()

      expect(consoleSpy).toHaveBeenCalled()

      consoleSpy.mockRestore()
    })

    it('should serialize settings as JSON object', () => {
      store.setShowBookInfo(false)

      const stored = localStorage.getItem('flexlib-settings')
      expect(() => JSON.parse(stored)).not.toThrow()

      const parsed = JSON.parse(stored)
      expect(typeof parsed).toBe('object')
      expect(parsed).toHaveProperty('showBookInfo')
      expect(parsed).toHaveProperty('allowUnfinishedReading')
    })
  })

  describe('multiple store instances', () => {
    it('should maintain isolated state between Pinia instances', () => {
      const store1 = useSettingsStore()
      store1.setShowBookInfo(false)

      // Create new Pinia instance
      setActivePinia(createPinia())
      const store2 = useSettingsStore()

      // Store2 should have default values (not affected by store1)
      expect(store2.showBookInfo).toBe(true)
      expect(store1.showBookInfo).toBe(false)
    })
  })

  describe('edge cases', () => {
    it('should handle null values in localStorage', () => {
      localStorage.setItem('flexlib-settings', JSON.stringify({
        showBookInfo: null,
        allowUnfinishedReading: null
      }))

      store.loadSettings()

      // Should use default values for null
      expect(store.showBookInfo).toBe(true)
      expect(store.allowUnfinishedReading).toBe(true)
    })

    it('should handle undefined values in localStorage', () => {
      localStorage.setItem('flexlib-settings', JSON.stringify({
        showBookInfo: undefined,
        allowUnfinishedReading: undefined
      }))

      store.loadSettings()

      // Should use default values for undefined
      expect(store.showBookInfo).toBe(true)
      expect(store.allowUnfinishedReading).toBe(true)
    })

    it('should handle extra properties in localStorage', () => {
      localStorage.setItem('flexlib-settings', JSON.stringify({
        showBookInfo: false,
        allowUnfinishedReading: false,
        extraProperty: 'should be ignored'
      }))

      store.loadSettings()

      expect(store.showBookInfo).toBe(false)
      expect(store.allowUnfinishedReading).toBe(false)
    })
  })
})
