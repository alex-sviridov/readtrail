import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useSettingsStore } from '../settings'

describe('useSettingsStore', () => {
  let store

  beforeEach(() => {
    // Create a fresh pinia instance for each test
    setActivePinia(createPinia())

    // Clear localStorage before each test
    localStorage.clear()

    store = useSettingsStore()
  })

  afterEach(() => {
    // Clean up
    localStorage.clear()
  })

  describe('initial state with defaults', () => {
    it('should initialize with default showBookInfo value (true)', () => {
      expect(store.showBookInfo).toBe(true)
    })

    it('should initialize with default allowUnfinishedReading value (true)', () => {
      expect(store.allowUnfinishedReading).toBe(true)
    })

    it('should initialize with default allowScoring value (true)', () => {
      expect(store.allowScoring).toBe(true)
    })
  })

  describe('direct mutation (VueUse automatic persistence)', () => {
    it('should persist showBookInfo when changed', () => {
      // Change value
      store.showBookInfo = false

      // VueUse automatically persists to localStorage
      expect(store.showBookInfo).toBe(false)

      // Verify localStorage was updated
      const stored = localStorage.getItem('flexlib-settings-showBookInfo')
      expect(stored).toBe('false')
    })

    it('should persist allowUnfinishedReading when changed', () => {
      store.allowUnfinishedReading = false

      expect(store.allowUnfinishedReading).toBe(false)

      const stored = localStorage.getItem('flexlib-settings-allowUnfinishedReading')
      expect(stored).toBe('false')
    })

    it('should persist allowScoring when changed', () => {
      store.allowScoring = false

      expect(store.allowScoring).toBe(false)

      const stored = localStorage.getItem('flexlib-settings-allowScoring')
      expect(stored).toBe('false')
    })

    it('should handle toggling values', () => {
      // Toggle from true to false
      store.showBookInfo = !store.showBookInfo
      expect(store.showBookInfo).toBe(false)

      // Toggle back to true
      store.showBookInfo = !store.showBookInfo
      expect(store.showBookInfo).toBe(true)
    })
  })

  describe('persistence across store instances', () => {
    it('should load persisted showBookInfo in new store instance', () => {
      // Set value in first store instance
      store.showBookInfo = false

      // Create new pinia and store instance
      setActivePinia(createPinia())
      const newStore = useSettingsStore()

      // Value should be loaded from localStorage
      expect(newStore.showBookInfo).toBe(false)
    })

    it('should load persisted allowUnfinishedReading in new store instance', () => {
      store.allowUnfinishedReading = false

      setActivePinia(createPinia())
      const newStore = useSettingsStore()

      expect(newStore.allowUnfinishedReading).toBe(false)
    })

    it('should load all settings correctly', () => {
      // Set all to false
      store.showBookInfo = false
      store.allowUnfinishedReading = false
      store.allowScoring = false

      // New store instance
      setActivePinia(createPinia())
      const newStore = useSettingsStore()

      expect(newStore.showBookInfo).toBe(false)
      expect(newStore.allowUnfinishedReading).toBe(false)
      expect(newStore.allowScoring).toBe(false)
    })
  })

  describe('edge cases', () => {
    it('should handle empty localStorage gracefully', () => {
      // localStorage is already cleared in beforeEach
      expect(store.showBookInfo).toBe(true)
      expect(store.allowUnfinishedReading).toBe(true)
      expect(store.allowScoring).toBe(true)
    })

    it('should maintain isolated state between different settings', () => {
      store.showBookInfo = false

      // Other settings should remain unchanged
      expect(store.allowUnfinishedReading).toBe(true)
      expect(store.allowScoring).toBe(true)
    })
  })
})
