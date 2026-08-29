import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { useToast } from 'vue-toastification'
import { useSettingsQuery, useUpdateSetting } from '@/composables/useSettingsQuery'
import { DEFAULT_SETTINGS } from '@/services/settingsApi'
import { logger } from '@/utils/logger'

export const useSettingsStore = defineStore('settings', () => {
  const toast = useToast()
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

    // The mutation sends the WHOLE settings object, so firing it before the
    // query has resolved would send defaults and wipe the account's real
    // settings. Drop the change instead — the user can toggle again once
    // the page has loaded (well under a second).
    if (settingsQuery.data.value === undefined) {
      logger.warn('[SettingsStore] Ignoring updateSetting before settings finished loading:', key)
      return
    }

    updateSettingMutation.mutate(
      { key, value },
      {
        onSuccess: () => { lastError.value = null },
        onError: () => {
          lastError.value = 'Failed to update settings'
          toast.error('Failed to update settings. Please try again.')
        }
      }
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
