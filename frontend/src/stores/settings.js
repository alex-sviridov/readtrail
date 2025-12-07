import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

const STORAGE_KEY = 'flexlib-settings'

export const useSettingsStore = defineStore('settings', () => {
  // State
  const showBookInfo = ref(true)
  const allowUnfinishedReading = ref(true)

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
          value: showBookInfo,
          toggle: toggleShowBookInfo
        },
        {
          key: 'allowUnfinishedReading',
          label: 'Allow Unfinished Reading',
          description: 'Enable marking books as unfinished when setting their completion date',
          type: 'toggle',
          value: allowUnfinishedReading,
          toggle: toggleAllowUnfinishedReading
        }
      ]
    }
  ])

  // Load settings from localStorage
  function loadSettings() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        showBookInfo.value = parsed.showBookInfo ?? true
        allowUnfinishedReading.value = parsed.allowUnfinishedReading ?? true
        console.info('Loaded settings from localStorage')
      }
    } catch (error) {
      console.error('Failed to load settings from localStorage', error)
      showBookInfo.value = true
      allowUnfinishedReading.value = true
    }
  }

  // Save settings to localStorage
  function saveToLocalStorage() {
    try {
      const settings = {
        showBookInfo: showBookInfo.value,
        allowUnfinishedReading: allowUnfinishedReading.value
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
    } catch (error) {
      console.error('Failed to save settings to localStorage', error)
    }
  }

  // Toggle show book info
  function toggleShowBookInfo() {
    showBookInfo.value = !showBookInfo.value
    saveToLocalStorage()
  }

  // Set show book info
  function setShowBookInfo(value) {
    showBookInfo.value = value
    saveToLocalStorage()
  }

  // Toggle allow unfinished reading
  function toggleAllowUnfinishedReading() {
    allowUnfinishedReading.value = !allowUnfinishedReading.value
    saveToLocalStorage()
  }

  // Set allow unfinished reading
  function setAllowUnfinishedReading(value) {
    allowUnfinishedReading.value = value
    saveToLocalStorage()
  }

  // Return public API
  return {
    // State
    showBookInfo,
    allowUnfinishedReading,
    // Configuration
    settingsConfig,
    // Actions
    loadSettings,
    toggleShowBookInfo,
    setShowBookInfo,
    toggleAllowUnfinishedReading,
    setAllowUnfinishedReading
  }
})
