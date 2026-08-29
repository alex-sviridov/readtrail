import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { useSettingsQuery, useUpdateSetting } from '@/composables/useSettingsQuery'
import { DEFAULT_SETTINGS } from '@/services/settingsApi'

export const useSettingsStore = defineStore('settings', () => {
  const settingsQuery = useSettingsQuery()
  const updateSettingMutation = useUpdateSetting()

  const settings = computed(() => settingsQuery.data.value ?? DEFAULT_SETTINGS)
  const settingsLoading = computed(() => settingsQuery.isLoading.value)
  const lastError = ref(null)

  /** Re-trigger the settings query (kept for API compatibility with main.js). */
  function loadSettings() {
    return settingsQuery.refetch()
  }

  function updateSetting(key, value) {
    if (!(key in DEFAULT_SETTINGS)) {
      return
    }

    updateSettingMutation.mutate(
      { key, value },
      { onError: () => { lastError.value = 'Failed to update settings' } }
    )
  }

  function $reset() {
    lastError.value = null
  }

  return {
    settings,
    settingsLoading,
    lastError,
    loadSettings,
    updateSetting,
    $reset
  }
})
