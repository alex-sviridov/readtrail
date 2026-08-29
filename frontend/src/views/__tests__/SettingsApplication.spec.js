import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import SettingsApplication from '../SettingsApplication.vue'
import { useSettingsStore } from '@/stores/settings'
import { settingsApi, DEFAULT_SETTINGS } from '@/services/settingsApi'

vi.mock('@/services/settingsApi', async () => {
  const actual = await vi.importActual('@/services/settingsApi')
  return { ...actual, settingsApi: { getSettings: vi.fn(), updateSettings: vi.fn() } }
})

describe('SettingsApplication', () => {
  let wrapper
  let router
  let queryClient

  beforeEach(async () => {
    vi.clearAllMocks()
    setActivePinia(createPinia())
    settingsApi.getSettings.mockResolvedValue({ ...DEFAULT_SETTINGS })
    settingsApi.updateSettings.mockImplementation(async (settings) => settings)

    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
    })

    router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/settings/application', name: 'settings-application', component: SettingsApplication }
      ]
    })

    await router.push('/settings/application')
    await router.isReady()

    localStorage.clear()
  })

  afterEach(() => {
    wrapper?.unmount()
    localStorage.clear()
  })

  function mountView() {
    return mount(SettingsApplication, {
      global: {
        plugins: [router, [VueQueryPlugin, { queryClient }]]
      }
    })
  }

  describe('rendering', () => {
    it('should render display settings section', () => {
      wrapper = mountView()

      expect(wrapper.text()).toContain('Display Settings')
    })

    it('should render all settings items', () => {
      wrapper = mountView()

      expect(wrapper.text()).toContain('Show Book Information')
      expect(wrapper.text()).toContain('Display book title and author on book cards in the library')

      expect(wrapper.text()).toContain('Allow Unfinished Reading')
      expect(wrapper.text()).toContain('Enable marking books as unfinished when setting their completion date')

      expect(wrapper.text()).toContain('Allow Book Scoring')
      expect(wrapper.text()).toContain('Enable like/dislike functionality for books')
    })

    it('should render toggle switches for each setting', () => {
      wrapper = mountView()

      const toggleButtons = wrapper.findAll('button[role="switch"]')
      expect(toggleButtons.length).toBe(3)
    })
  })

  describe('toggle switches', () => {
    it('should display toggle switch in correct state based on store value', async () => {
      settingsApi.getSettings.mockResolvedValue({ ...DEFAULT_SETTINGS, showBookInfo: true })

      wrapper = mountView()
      await flushPromises()

      const toggles = wrapper.findAll('button[role="switch"]')
      const showBookInfoToggle = toggles[0]

      expect(showBookInfoToggle.attributes('aria-checked')).toBe('true')
      expect(showBookInfoToggle.classes()).toContain('bg-blue-600')
    })

    it('should toggle showBookInfo when clicked', async () => {
      settingsApi.getSettings.mockResolvedValue({ ...DEFAULT_SETTINGS, showBookInfo: true })

      wrapper = mountView()
      await flushPromises()

      const toggles = wrapper.findAll('button[role="switch"]')
      const showBookInfoToggle = toggles[0]

      await showBookInfoToggle.trigger('click')
      await flushPromises()

      const settingsStore = useSettingsStore()
      expect(settingsStore.settings.showBookInfo).toBe(false)
    })

    it('should toggle allowUnfinishedReading when clicked', async () => {
      settingsApi.getSettings.mockResolvedValue({ ...DEFAULT_SETTINGS, allowUnfinishedReading: true })

      wrapper = mountView()
      await flushPromises()

      const toggles = wrapper.findAll('button[role="switch"]')
      const allowUnfinishedToggle = toggles[1]

      await allowUnfinishedToggle.trigger('click')
      await flushPromises()

      const settingsStore = useSettingsStore()
      expect(settingsStore.settings.allowUnfinishedReading).toBe(false)
    })

    it('should toggle allowScoring when clicked', async () => {
      settingsApi.getSettings.mockResolvedValue({ ...DEFAULT_SETTINGS, allowScoring: true })

      wrapper = mountView()
      await flushPromises()

      const toggles = wrapper.findAll('button[role="switch"]')
      const allowScoringToggle = toggles[2]

      await allowScoringToggle.trigger('click')
      await flushPromises()

      const settingsStore = useSettingsStore()
      expect(settingsStore.settings.allowScoring).toBe(false)
    })

    it('should update toggle visual state when value changes', async () => {
      settingsApi.getSettings.mockResolvedValue({ ...DEFAULT_SETTINGS, showBookInfo: false })

      wrapper = mountView()
      await flushPromises()

      const toggles = wrapper.findAll('button[role="switch"]')
      const showBookInfoToggle = toggles[0]

      expect(showBookInfoToggle.classes()).toContain('bg-gray-300')

      await showBookInfoToggle.trigger('click')
      await flushPromises()
      await wrapper.vm.$nextTick()

      expect(showBookInfoToggle.classes()).toContain('bg-blue-600')
    })
  })

  describe('store integration', () => {
    it('should reflect store changes in the UI', async () => {
      settingsApi.getSettings.mockResolvedValue({ ...DEFAULT_SETTINGS, showBookInfo: false })

      wrapper = mountView()
      await flushPromises()

      const settingsStore = useSettingsStore()

      const toggles = wrapper.findAll('button[role="switch"]')
      expect(toggles[0].attributes('aria-checked')).toBe('false')

      settingsStore.updateSetting('showBookInfo', true)
      await flushPromises()
      await wrapper.vm.$nextTick()

      expect(toggles[0].attributes('aria-checked')).toBe('true')

      settingsStore.updateSetting('showBookInfo', false)
      await flushPromises()
      await wrapper.vm.$nextTick()

      expect(toggles[0].attributes('aria-checked')).toBe('false')
    })

    it('should call updateSetting on toggle', async () => {
      wrapper = mountView()
      await flushPromises()

      const settingsStore = useSettingsStore()
      const updateSettingSpy = vi.spyOn(settingsStore, 'updateSetting')

      const toggles = wrapper.findAll('button[role="switch"]')
      await toggles[0].trigger('click')

      expect(updateSettingSpy).toHaveBeenCalled()
    })
  })

  describe('accessibility', () => {
    it('should have proper ARIA attributes on toggle switches', () => {
      wrapper = mountView()

      const toggles = wrapper.findAll('button[role="switch"]')

      toggles.forEach(toggle => {
        expect(toggle.attributes('role')).toBe('switch')
        expect(toggle.attributes('aria-checked')).toBeDefined()
      })
    })

    it('should have focus ring styles on toggle switches', () => {
      wrapper = mountView()

      const toggles = wrapper.findAll('button[role="switch"]')

      toggles.forEach(toggle => {
        const classes = toggle.classes().join(' ')
        expect(classes).toContain('focus:outline-none')
        expect(classes).toContain('focus:ring-2')
        expect(classes).toContain('focus:ring-blue-500')
      })
    })
  })
})
