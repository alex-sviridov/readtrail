import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import SettingsApplication from '../SettingsApplication.vue'
import { useSettingsStore } from '@/stores/settings'

describe('SettingsApplication', () => {
  let wrapper
  let router
  let store

  beforeEach(async () => {
    setActivePinia(createPinia())
    store = useSettingsStore()

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

  describe('rendering', () => {
    it('should render display settings section', () => {
      wrapper = mount(SettingsApplication, {
        global: {
          plugins: [router, createPinia()]
        }
      })

      expect(wrapper.text()).toContain('Display Settings')
    })

    it('should render all settings items', () => {
      wrapper = mount(SettingsApplication, {
        global: {
          plugins: [router, createPinia()]
        }
      })

      expect(wrapper.text()).toContain('Show Book Information')
      expect(wrapper.text()).toContain('Display book title and author on book cards in the library')

      expect(wrapper.text()).toContain('Allow Unfinished Reading')
      expect(wrapper.text()).toContain('Enable marking books as unfinished when setting their completion date')

      expect(wrapper.text()).toContain('Allow Book Scoring')
      expect(wrapper.text()).toContain('Enable like/dislike functionality for books')
    })

    it('should render toggle switches for each setting', () => {
      wrapper = mount(SettingsApplication, {
        global: {
          plugins: [router, createPinia()]
        }
      })

      const toggleButtons = wrapper.findAll('button[role="switch"]')
      expect(toggleButtons.length).toBe(3)
    })
  })

  describe('toggle switches', () => {
    it('should display toggle switch in correct state based on store value', async () => {
      const pinia = createPinia()
      setActivePinia(pinia)
      const settingsStore = useSettingsStore()
      settingsStore.settings.showBookInfo = true

      wrapper = mount(SettingsApplication, {
        global: {
          plugins: [router, pinia]
        }
      })

      const toggles = wrapper.findAll('button[role="switch"]')
      const showBookInfoToggle = toggles[0]

      expect(showBookInfoToggle.attributes('aria-checked')).toBe('true')
      expect(showBookInfoToggle.classes()).toContain('bg-blue-600')
    })

    it('should toggle showBookInfo when clicked', async () => {
      const pinia = createPinia()
      setActivePinia(pinia)
      const settingsStore = useSettingsStore()
      settingsStore.settings.showBookInfo = true

      wrapper = mount(SettingsApplication, {
        global: {
          plugins: [router, pinia]
        }
      })

      const toggles = wrapper.findAll('button[role="switch"]')
      const showBookInfoToggle = toggles[0]

      await showBookInfoToggle.trigger('click')

      expect(settingsStore.settings.showBookInfo).toBe(false)
    })

    it('should toggle allowUnfinishedReading when clicked', async () => {
      const pinia = createPinia()
      setActivePinia(pinia)
      const settingsStore = useSettingsStore()
      settingsStore.settings.allowUnfinishedReading = true

      wrapper = mount(SettingsApplication, {
        global: {
          plugins: [router, pinia]
        }
      })

      const toggles = wrapper.findAll('button[role="switch"]')
      const allowUnfinishedToggle = toggles[1]

      await allowUnfinishedToggle.trigger('click')

      expect(settingsStore.settings.allowUnfinishedReading).toBe(false)
    })

    it('should toggle allowScoring when clicked', async () => {
      const pinia = createPinia()
      setActivePinia(pinia)
      const settingsStore = useSettingsStore()
      settingsStore.settings.allowScoring = true

      wrapper = mount(SettingsApplication, {
        global: {
          plugins: [router, pinia]
        }
      })

      const toggles = wrapper.findAll('button[role="switch"]')
      const allowScoringToggle = toggles[2]

      await allowScoringToggle.trigger('click')

      expect(settingsStore.settings.allowScoring).toBe(false)
    })

    it('should update toggle visual state when value changes', async () => {
      const pinia = createPinia()
      setActivePinia(pinia)
      const settingsStore = useSettingsStore()
      settingsStore.settings.showBookInfo = false

      wrapper = mount(SettingsApplication, {
        global: {
          plugins: [router, pinia]
        }
      })

      const toggles = wrapper.findAll('button[role="switch"]')
      const showBookInfoToggle = toggles[0]

      expect(showBookInfoToggle.classes()).toContain('bg-gray-300')

      await showBookInfoToggle.trigger('click')
      await wrapper.vm.$nextTick()

      expect(showBookInfoToggle.classes()).toContain('bg-blue-600')
    })
  })

  describe('store integration', () => {
    it('should reflect store changes in the UI', async () => {
      const pinia = createPinia()
      setActivePinia(pinia)
      const settingsStore = useSettingsStore()

      wrapper = mount(SettingsApplication, {
        global: {
          plugins: [router, pinia]
        }
      })

      settingsStore.settings.showBookInfo = true
      await wrapper.vm.$nextTick()

      const toggles = wrapper.findAll('button[role="switch"]')
      expect(toggles[0].attributes('aria-checked')).toBe('true')

      settingsStore.settings.showBookInfo = false
      await wrapper.vm.$nextTick()

      expect(toggles[0].attributes('aria-checked')).toBe('false')
    })

    it('should call updateSetting on toggle', async () => {
      const pinia = createPinia()
      setActivePinia(pinia)
      const settingsStore = useSettingsStore()
      const updateSettingSpy = vi.spyOn(settingsStore, 'updateSetting')

      wrapper = mount(SettingsApplication, {
        global: {
          plugins: [router, pinia]
        }
      })

      const toggles = wrapper.findAll('button[role="switch"]')
      await toggles[0].trigger('click')

      expect(updateSettingSpy).toHaveBeenCalled()
    })
  })

  describe('accessibility', () => {
    it('should have proper ARIA attributes on toggle switches', () => {
      wrapper = mount(SettingsApplication, {
        global: {
          plugins: [router, createPinia()]
        }
      })

      const toggles = wrapper.findAll('button[role="switch"]')

      toggles.forEach(toggle => {
        expect(toggle.attributes('role')).toBe('switch')
        expect(toggle.attributes('aria-checked')).toBeDefined()
      })
    })

    it('should have focus ring styles on toggle switches', () => {
      wrapper = mount(SettingsApplication, {
        global: {
          plugins: [router, createPinia()]
        }
      })

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
