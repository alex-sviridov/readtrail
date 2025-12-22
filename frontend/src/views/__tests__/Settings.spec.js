import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import Settings from '../Settings.vue'
import SettingsAccount from '../SettingsAccount.vue'
import SettingsApplication from '../SettingsApplication.vue'
import { useSettingsStore } from '@/stores/settings'

// Mock authManager
vi.mock('@/services/auth', () => ({
  authManager: {
    isGuestUser: vi.fn(() => false),
    getCurrentUser: vi.fn(() => ({ id: 'user123', email: 'test@example.com' })),
    logout: vi.fn(),
    changePassword: vi.fn()
  }
}))

// Mock vue-toastification
vi.mock('vue-toastification', () => ({
  useToast: () => ({
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn()
  }),
  POSITION: { TOP_RIGHT: 'top-right' }
}))

describe('Settings View', () => {
  let wrapper
  let router
  let store

  beforeEach(async () => {
    // Create fresh pinia instance
    setActivePinia(createPinia())
    store = useSettingsStore()

    // Create router with memory history matching the actual route structure
    router = createRouter({
      history: createMemoryHistory(),
      routes: [
        {
          path: '/settings',
          component: Settings,
          redirect: '/settings/account',
          children: [
            { path: 'account', name: 'settings-account', component: SettingsAccount },
            { path: 'application', name: 'settings-application', component: SettingsApplication }
          ]
        },
        { path: '/library', name: 'library', component: { template: '<div>Library</div>' } }
      ]
    })

    await router.push('/settings/account')
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

    it('should render tab navigation', () => {
      wrapper = mount(Settings, {
        global: {
          plugins: [router, createPinia()]
        }
      })

      const nav = wrapper.find('nav[aria-label="Tabs"]')
      const tabs = nav.findAllComponents({ name: 'RouterLink' })
      expect(tabs.length).toBe(2)
      expect(tabs[0].text()).toBe('Account')
      expect(tabs[1].text()).toBe('Application')
    })

    it('should highlight active tab', async () => {
      wrapper = mount(Settings, {
        global: {
          plugins: [router, createPinia()]
        }
      })

      const nav = wrapper.find('nav[aria-label="Tabs"]')
      const accountTab = nav.findAllComponents({ name: 'RouterLink' })[0]
      expect(accountTab.classes()).toContain('border-blue-600')
      expect(accountTab.classes()).toContain('text-blue-600')
    })

    it('should render child route content', () => {
      wrapper = mount(Settings, {
        global: {
          plugins: [router, createPinia()]
        }
      })

      // Since we're on /settings/account, should show account content
      expect(wrapper.text()).toContain('Email')
    })
  })

  describe('tab navigation', () => {
    it('should navigate to application settings tab', async () => {
      wrapper = mount(Settings, {
        global: {
          plugins: [router, createPinia()]
        }
      })

      const applicationTab = wrapper.findAll('nav[aria-label="Tabs"] > a')[1]
      await router.push('/settings/application')
      await router.isReady()
      await wrapper.vm.$nextTick()

      expect(router.currentRoute.value.path).toBe('/settings/application')
    })

    it('should highlight correct tab based on route', async () => {
      await router.push('/settings/application')
      await router.isReady()

      wrapper = mount(Settings, {
        global: {
          plugins: [router, createPinia()]
        }
      })

      const applicationTab = wrapper.findAll('nav[aria-label="Tabs"] > a')[1]
      expect(applicationTab.classes()).toContain('border-blue-600')
      expect(applicationTab.classes()).toContain('text-blue-600')
    })

    it('should redirect /settings to /settings/account', async () => {
      await router.push('/settings')
      await router.isReady()

      expect(router.currentRoute.value.path).toBe('/settings/account')
    })
  })

  describe('accessibility', () => {
    it('should have proper navigation labels', () => {
      wrapper = mount(Settings, {
        global: {
          plugins: [router, createPinia()]
        }
      })

      const nav = wrapper.find('nav')
      expect(nav.attributes('aria-label')).toBe('Tabs')
    })

    it('should have proper tab structure', () => {
      wrapper = mount(Settings, {
        global: {
          plugins: [router, createPinia()]
        }
      })

      const nav = wrapper.find('nav[aria-label="Tabs"]')
      const tabs = nav.findAllComponents({ name: 'RouterLink' })
      expect(tabs.length).toBe(2)

      tabs.forEach(tab => {
        expect(tab.element.tagName).toBe('A')
      })
    })
  })
})
