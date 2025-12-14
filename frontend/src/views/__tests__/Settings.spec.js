import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import Settings from '../Settings.vue'
import { useSettingsStore } from '@/stores/settings'

describe('Settings View', () => {
  let wrapper
  let router
  let store

  beforeEach(async () => {
    // Create fresh pinia instance
    setActivePinia(createPinia())
    store = useSettingsStore()

    // Create router with memory history
    router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/settings', name: 'settings', component: Settings },
        { path: '/library', name: 'library', component: { template: '<div>Library</div>' } }
      ]
    })

    await router.push('/settings')
    await router.isReady()

    // Clear localStorage before each test
    localStorage.clear()
  })

  afterEach(() => {
    wrapper?.unmount()
    localStorage.clear()
    vi.restoreAllMocks()
  })

  describe('rendering', () => {
    it('should render the settings page with title and description', () => {
      wrapper = mount(Settings, {
        global: {
          plugins: [router, createPinia()]
        }
      })

      expect(wrapper.find('h1').text()).toBe('Settings')
      expect(wrapper.find('p').text()).toBe('Manage your application preferences')
    })

    it('should render all sections from settingsConfig', () => {
      wrapper = mount(Settings, {
        global: {
          plugins: [router, createPinia()]
        }
      })

      const sections = wrapper.findAll('h2')
      expect(sections.length).toBeGreaterThan(0)
      // First section is Account, second is Display Settings
      expect(sections[0].text()).toBe('Account')
      expect(sections[1].text()).toBe('Display Settings')
    })

    it('should render all settings items with labels and descriptions', () => {
      wrapper = mount(Settings, {
        global: {
          plugins: [router, createPinia()]
        }
      })

      // Check for "Show Book Information" setting
      expect(wrapper.text()).toContain('Show Book Information')
      expect(wrapper.text()).toContain('Display book title and author on book cards in the library')

      // Check for "Allow Unfinished Reading" setting
      expect(wrapper.text()).toContain('Allow Unfinished Reading')
      expect(wrapper.text()).toContain('Enable marking books as unfinished when setting their completion date')
    })

    it('should render toggle switches for each setting', () => {
      wrapper = mount(Settings, {
        global: {
          plugins: [router, createPinia()]
        }
      })

      const toggleButtons = wrapper.findAll('button[role="switch"]')
      expect(toggleButtons.length).toBe(3)
    })

    it('should render back to library button', () => {
      wrapper = mount(Settings, {
        global: {
          plugins: [router, createPinia()]
        }
      })

      const backButton = wrapper.find('button:not([role="switch"])')
      expect(backButton.text()).toContain('Back to Library')
    })
  })

  describe('toggle switches', () => {
    it('should display toggle switch in correct state based on store value', async () => {
      const pinia = createPinia()
      setActivePinia(pinia)
      const settingsStore = useSettingsStore()
      settingsStore.settings.showBookInfo = true

      wrapper = mount(Settings, {
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

      wrapper = mount(Settings, {
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

      wrapper = mount(Settings, {
        global: {
          plugins: [router, pinia]
        }
      })

      const toggles = wrapper.findAll('button[role="switch"]')
      const allowUnfinishedToggle = toggles[1]

      await allowUnfinishedToggle.trigger('click')

      expect(settingsStore.settings.allowUnfinishedReading).toBe(false)
    })

    it('should update toggle visual state when value changes', async () => {
      const pinia = createPinia()
      setActivePinia(pinia)
      const settingsStore = useSettingsStore()
      settingsStore.settings.showBookInfo = false

      wrapper = mount(Settings, {
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

      wrapper = mount(Settings, {
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
  })

  describe('router navigation', () => {
    it('should navigate to library when back button is clicked', async () => {
      wrapper = mount(Settings, {
        global: {
          plugins: [router, createPinia()]
        }
      })

      // Find the "Back to Library" button (not the logout button or toggle switches)
      const buttons = wrapper.findAll('button')
      const backButton = buttons.find(btn => {
        const text = btn.text()
        return text.includes('Back to Library') || text.includes('← Back to Library')
      })

      expect(backButton).toBeTruthy()

      // Trigger the click and wait for navigation
      await backButton.trigger('click')
      await wrapper.vm.$nextTick()

      // Wait for the route to actually change
      await new Promise(resolve => setTimeout(resolve, 0))
      await router.isReady()

      expect(router.currentRoute.value.path).toBe('/library')
    })
  })

  describe('accessibility', () => {
    it('should have proper ARIA attributes on toggle switches', () => {
      wrapper = mount(Settings, {
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
      wrapper = mount(Settings, {
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
