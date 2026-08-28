/**
 * TanStack Query composables for the singular settings object.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import { settingsApi, DEFAULT_SETTINGS } from '@/services/settingsApi'
import { logger } from '@/utils/logger'

export const SETTINGS_QUERY_KEY = ['settings']
const LEGACY_SETTINGS_KEY = 'readtrail-settings'

export function useSettingsQuery() {
  return useQuery({
    queryKey: SETTINGS_QUERY_KEY,
    queryFn: async () => (await settingsApi.getSettings()) ?? { ...DEFAULT_SETTINGS }
  })
}

/**
 * Mirror settings to the plain `readtrail-settings` localStorage key so
 * `router/index.js` can read `lastLibraryView` synchronously before the
 * app (and Query's persister) exists.
 */
function mirrorToLegacyKey(settings) {
  try {
    localStorage.setItem(LEGACY_SETTINGS_KEY, JSON.stringify(settings))
  } catch (error) {
    logger.warn('[useSettingsQuery] Failed to mirror settings to legacy key:', error)
  }
}

export function useUpdateSetting() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ key, value }) => {
      const current = queryClient.getQueryData(SETTINGS_QUERY_KEY) ?? { ...DEFAULT_SETTINGS }
      return settingsApi.updateSettings({ ...current, [key]: value })
    },
    onMutate: async ({ key, value }) => {
      const previousSettings = queryClient.getQueryData(SETTINGS_QUERY_KEY) ?? { ...DEFAULT_SETTINGS }
      const optimisticSettings = { ...previousSettings, [key]: value }

      queryClient.setQueryData(SETTINGS_QUERY_KEY, optimisticSettings)
      mirrorToLegacyKey(optimisticSettings)

      await queryClient.cancelQueries({ queryKey: SETTINGS_QUERY_KEY })

      return { previousSettings }
    },
    onError: (error, _variables, context) => {
      logger.error('[useUpdateSetting] Update failed:', error)
      if (context?.previousSettings) {
        queryClient.setQueryData(SETTINGS_QUERY_KEY, context.previousSettings)
        mirrorToLegacyKey(context.previousSettings)
      }
    },
    onSuccess: (updatedSettings) => {
      queryClient.setQueryData(SETTINGS_QUERY_KEY, updatedSettings)
      mirrorToLegacyKey(updatedSettings)
    }
  })
}
