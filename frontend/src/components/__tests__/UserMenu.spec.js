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
  let wrappers = []

  beforeEach(() => {
    pb.authStore.isValid = false
    pb.authStore.record = null
    vi.clearAllMocks()
  })

  afterEach(() => {
    wrapper?.unmount()
    wrappers.forEach((w) => w.unmount())
    wrappers = []
    document.body.innerHTML = ''
  })

  async function mountMenu() {
    const router = await createTestRouter()
    return mount(UserMenu, {
      attachTo: document.body,
      global: { plugins: [router] }
    })
  }

  describe('authentication state', () => {
    it('renders the Login link when not authenticated', async () => {
      pb.authStore.isValid = false
      wrapper = await mountMenu()

      expect(wrapper.find('a[href="/login"]').exists()).toBe(true)
      expect(wrapper.find('button').exists()).toBe(false)
    })

    it('renders the avatar button when authenticated', async () => {
      pb.authStore.isValid = true
      pb.authStore.record = { name: 'Jane Doe', email: 'jane@example.com' }
      wrapper = await mountMenu()

      expect(wrapper.find('a[href="/login"]').exists()).toBe(false)
      expect(wrapper.find('button[aria-haspopup="true"]').exists()).toBe(true)
    })
  })

  describe('opening the menu', () => {
    beforeEach(() => {
      pb.authStore.isValid = true
      pb.authStore.record = { name: 'Jane Doe', email: 'jane@example.com' }
    })

    it('opens the menu when the avatar button is clicked', async () => {
      wrapper = await mountMenu()
      const button = wrapper.get('button[aria-haspopup="true"]')
      const menu = wrapper.get('.user-menu-popover')

      expect(menu.classes()).toContain('hidden')
      expect(button.attributes('aria-expanded')).toBe('false')

      await button.trigger('click')
      // jsdom does not implement the Popover API, so clicking popovertarget won't
      // actually open the popover or fire a real ToggleEvent. Drive the same code
      // path the browser would by dispatching a plain Event with a newState
      // property attached, matching handleToggle's usage.
      const toggleEvent = new Event('toggle')
      toggleEvent.newState = 'open'
      menu.element.dispatchEvent(toggleEvent)
      await wrapper.vm.$nextTick()

      expect(menu.classes()).not.toContain('hidden')
      expect(button.attributes('aria-expanded')).toBe('true')
    })
  })

  describe('duplicate mounts (regression for duplicate popover ids)', () => {
    beforeEach(() => {
      pb.authStore.isValid = true
      pb.authStore.record = { name: 'Jane Doe', email: 'jane@example.com' }
    })

    it('gives two simultaneously mounted instances different ids, and only opens the clicked instance', async () => {
      // useId() is scoped per Vue *app* instance, so this must mount both UserMenu
      // instances under a single app -- exactly how AppHeader.vue mounts one
      // desktop and one mobile instance side by side -- for the id collision this
      // fix addresses to be reproducible at all.
      const router = await createTestRouter()
      const Both = {
        components: { UserMenu },
        template: '<div><UserMenu ref="a" /><UserMenu ref="b" /></div>'
      }
      const both = mount(Both, { attachTo: document.body, global: { plugins: [router] } })
      wrappers.push(both)

      const menuA = both.findAllComponents(UserMenu)[0].get('.user-menu-popover')
      const menuB = both.findAllComponents(UserMenu)[1].get('.user-menu-popover')
      const buttonA = both.findAllComponents(UserMenu)[0].get('button[aria-haspopup="true"]')

      expect(menuA.attributes('id')).toBeTruthy()
      expect(menuB.attributes('id')).toBeTruthy()
      expect(menuA.attributes('id')).not.toBe(menuB.attributes('id'))
      expect(buttonA.attributes('popovertarget')).toBe(menuA.attributes('id'))

      // Simulate instance A's popover opening (browser toggle event) and confirm
      // instance B is unaffected.
      const toggleEvent = new Event('toggle')
      toggleEvent.newState = 'open'
      menuA.element.dispatchEvent(toggleEvent)
      await both.vm.$nextTick()

      expect(menuA.classes()).not.toContain('hidden')
      expect(menuB.classes()).toContain('hidden')
    })
  })

  describe('authenticated menu content', () => {
    beforeEach(() => {
      pb.authStore.isValid = true
      pb.authStore.record = { name: 'Jane Doe', email: 'jane@example.com' }
    })

    it('shows the Settings link and Logout button, and logout calls authManager.logout', async () => {
      wrapper = await mountMenu()

      const settingsLink = wrapper.find('a[href="/settings"]')
      expect(settingsLink.exists()).toBe(true)

      const buttons = wrapper.findAll('button')
      const logoutButton = buttons.find((b) => b.text().includes('Logout'))
      expect(logoutButton).toBeTruthy()

      // handleLogout navigates via window.location.href, which jsdom doesn't
      // implement -- stub it out so the assertion focuses on authManager.logout.
      const originalLocation = window.location
      delete window.location
      window.location = { ...originalLocation, href: '' }

      await logoutButton.trigger('click')
      expect(authManager.logout).toHaveBeenCalled()

      window.location = originalLocation
    })
  })
})
