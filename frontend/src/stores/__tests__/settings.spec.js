// frontend/src/stores/__tests__/settings.spec.js
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { defineComponent } from 'vue'
import { mount } from '@vue/test-utils'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { useSettingsStore } from '../settings'
import { settingsApi, DEFAULT_SETTINGS } from '@/services/settingsApi'
import { isGuestMode } from '@/services/guestMode'

vi.mock('@/services/settingsApi', async () => {
  const actual = await vi.importActual('@/services/settingsApi')
  return { ...actual, settingsApi: { getSettings: vi.fn(), updateSettings: vi.fn() } }
})
vi.mock('@/services/guestMode')

describe('useSettingsStore', () => {
  let queryClient

  beforeEach(() => {
    vi.clearAllMocks()
    isGuestMode.mockReturnValue(false)
    localStorage.clear()
    setActivePinia(createPinia())
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
    })
  })

  function mountStore() {
    let store
    const TestComponent = defineComponent({
      setup() {
        store = useSettingsStore()
        return () => null
      }
    })
    mount(TestComponent, { global: { plugins: [[VueQueryPlugin, { queryClient }]] } })
    return store
  }

  it('starts with default settings before the query resolves', () => {
    settingsApi.getSettings.mockResolvedValue({ ...DEFAULT_SETTINGS })
    const store = mountStore()
    expect(store.settings).toEqual(DEFAULT_SETTINGS)
  })

  it('updateSetting updates a single field', async () => {
    settingsApi.getSettings.mockResolvedValue({ ...DEFAULT_SETTINGS })
    settingsApi.updateSettings.mockResolvedValue({ ...DEFAULT_SETTINGS, hideUnfinished: false })

    const store = mountStore()
    await vi.waitUntil(() => !store.settingsLoading)
    store.updateSetting('hideUnfinished', false)

    expect(store.settings.hideUnfinished).toBe(false)
  })

  it('ignores updateSetting before the settings query has resolved', () => {
    settingsApi.getSettings.mockResolvedValue({ ...DEFAULT_SETTINGS })

    const store = mountStore()
    store.updateSetting('hideUnfinished', false)

    expect(settingsApi.updateSettings).not.toHaveBeenCalled()
  })

  it('$reset clears local error state', () => {
    settingsApi.getSettings.mockResolvedValue({ ...DEFAULT_SETTINGS })
    const store = mountStore()

    store.$reset()

    expect(store.lastError).toBeNull()
  })
})
