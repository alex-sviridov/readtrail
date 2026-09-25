import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import UserMenu from '../UserMenu.vue'
import { authManager } from '@/services/auth'
import pb from '@/services/pocketbase'

vi.mock('@/services/auth', () => ({
  authManager: {
    logout: vi.fn()
  }
}))

vi.mock('@/services/remoteUserMode', () => ({
  isRemoteUserModeActive: vi.fn(() => false)
}))

vi.mock('@/services/pocketbase', () => ({
  default: {
    authStore: {
      isValid: false,
      record: null,
      onChange: vi.fn(() => () => {})
    }
  }
}))

async function createTestRouter() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { template: '<div />' } },
      { path: '/login', component: { template: '<div />' } },
      { path: '/settings', component: { template: '<div />' } }
    ]
  })
  router.push('/')
  await router.isReady()
  return router
}

describe('UserMenu', () => {
  let wrapper

  beforeEach(() => {
    pb.authStore.isValid = false
    pb.authStore.record = null
    vi.clearAllMocks()
  })

  afterEach(() => {
    wrapper?.unmount()
  })

  async function mountMenu() {
    const router = await createTestRouter()
    return mount(UserMenu, {
      global: { plugins: [router] }
    })
  }

  describe('guest (not authenticated)', () => {
    it('renders only a Login link -- no email, no Settings, no Logout', async () => {
      wrapper = await mountMenu()

      expect(wrapper.find('a[href="/login"]').exists()).toBe(true)
      expect(wrapper.find('a[href="/settings"]').exists()).toBe(false)
      expect(wrapper.find('button').exists()).toBe(false)
    })
  })

  describe('authenticated', () => {
    beforeEach(() => {
      pb.authStore.isValid = true
      pb.authStore.record = { name: 'Jane Doe', email: 'jane@example.com' }
    })

    it('shows the email, a Settings link, and a Logout button as plain items -- not behind any trigger', async () => {
      wrapper = await mountMenu()

      expect(wrapper.find('a[href="/login"]').exists()).toBe(false)
      // No dropdown/popover trigger of any kind
      expect(wrapper.find('[popover]').exists()).toBe(false)
      expect(wrapper.find('[aria-haspopup]').exists()).toBe(false)

      expect(wrapper.text()).toContain('jane@example.com')

      const settingsLink = wrapper.find('a[href="/settings"]')
      expect(settingsLink.exists()).toBe(true)

      const logoutButton = wrapper.findAll('button').find((b) => b.text().includes('Logout'))
      expect(logoutButton).toBeTruthy()
    })

    it('calls authManager.logout when the Logout button is clicked', async () => {
      wrapper = await mountMenu()

      const originalLocation = window.location
      delete window.location
      window.location = { ...originalLocation, href: '' }

      const logoutButton = wrapper.findAll('button').find((b) => b.text().includes('Logout'))
      await logoutButton.trigger('click')

      expect(authManager.logout).toHaveBeenCalled()

      window.location = originalLocation
    })

    it('does not show Logout in remote-user mode', async () => {
      const { isRemoteUserModeActive } = await import('@/services/remoteUserMode')
      isRemoteUserModeActive.mockReturnValue(true)

      wrapper = await mountMenu()

      const logoutButton = wrapper.findAll('button').find((b) => b.text().includes('Logout'))
      expect(logoutButton).toBeFalsy()
    })
  })
})
