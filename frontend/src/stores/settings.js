import { defineStore } from 'pinia'
import { useStorage } from '@vueuse/core'

/**
 * Settings store with automatic localStorage persistence
 * Uses VueUse's useStorage for automatic sync - no manual save/load needed
 */
export const useSettingsStore = defineStore('settings', () => {
  // Automatic localStorage persistence with VueUse
  const showBookInfo = useStorage('flexlib-settings-showBookInfo', true)
  const allowUnfinishedReading = useStorage('flexlib-settings-allowUnfinishedReading', true)
  const allowScoring = useStorage('flexlib-settings-allowScoring', true)

  function $reset() {
    showBookInfo.value = true
    allowUnfinishedReading.value = true
    allowScoring.value = true
  }

  return {
    showBookInfo,
    allowUnfinishedReading,
    allowScoring,
    $reset
  }
})
