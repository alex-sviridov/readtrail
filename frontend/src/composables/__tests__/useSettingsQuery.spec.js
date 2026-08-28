import { describe, it, expect, vi, beforeEach } from 'vitest'
import { defineComponent } from 'vue'
import { mount } from '@vue/test-utils'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { settingsApi, DEFAULT_SETTINGS } from '@/services/settingsApi'
import { useSettingsQuery, useUpdateSetting, SETTINGS_QUERY_KEY } from '../useSettingsQuery'

vi.mock('@/services/settingsApi', async () => {
  const actual = await vi.importActual('@/services/settingsApi')
  return { ...actual, settingsApi: { getSettings: vi.fn(), updateSettings: vi.fn() } }
})

function mountWithQuery(setup) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
  })

  let result
  const TestComponent = defineComponent({
    setup() {
      result = setup()
      return () => null
    }
  })

  mount(TestComponent, {
    global: { plugins: [[VueQueryPlugin, { queryClient }]] }
  })

  return { queryClient, get result() { return result } }
}

describe('useSettingsQuery', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  it('fetches settings via settingsApi.getSettings', async () => {
    settingsApi.getSettings.mockResolvedValue({ ...DEFAULT_SETTINGS, hideUnfinished: false })

    const { result } = mountWithQuery(() => useSettingsQuery())
    await vi.waitUntil(() => !result.isLoading.value)

    expect(result.data.value.hideUnfinished).toBe(false)
  })

  describe('useUpdateSetting', () => {
    it('optimistically applies the change and mirrors it to the legacy localStorage key', async () => {
      settingsApi.updateSettings.mockResolvedValue({ ...DEFAULT_SETTINGS, hideUnfinished: false })

      const { queryClient, result } = mountWithQuery(() => useUpdateSetting())
      queryClient.setQueryData(SETTINGS_QUERY_KEY, { ...DEFAULT_SETTINGS })

      await result.mutateAsync({ key: 'hideUnfinished', value: false })

      expect(queryClient.getQueryData(SETTINGS_QUERY_KEY).hideUnfinished).toBe(false)
      expect(JSON.parse(localStorage.getItem('readtrail-settings')).hideUnfinished).toBe(false)
    })

    it('rolls back on failure', async () => {
      settingsApi.updateSettings.mockRejectedValue(new Error('network error'))

      const { queryClient, result } = mountWithQuery(() => useUpdateSetting())
      queryClient.setQueryData(SETTINGS_QUERY_KEY, { ...DEFAULT_SETTINGS })

      await expect(result.mutateAsync({ key: 'hideUnfinished', value: false })).rejects.toThrow()

      expect(queryClient.getQueryData(SETTINGS_QUERY_KEY).hideUnfinished).toBe(true)
    })
  })
})
