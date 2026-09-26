import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createWebHistory } from 'vue-router'
import AppHeader from '../AppHeader.vue'
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

async function mountWithRouter() {
  const router = createRouter({
    history: createWebHistory(),
    routes: [
      { path: '/', component: { template: '<div />' } },
      { path: '/library', component: { template: '<div />' } },
      { path: '/statistics', component: { template: '<div />' } },
      { path: '/settings', component: { template: '<div />' } },
      { path: '/login', component: { template: '<div />' } }
    ]
  })
  router.push('/library')
  await router.isReady()
  return mount(AppHeader, {
    global: {
      plugins: [router],
      stubs: { SyncStatusIndicator: true }
    }
  })
}

describe('AppHeader mobile menu', () => {
  let wrapper

  beforeEach(() => {
    pb.authStore.isValid = false
    pb.authStore.record = null
    vi.clearAllMocks()
  })

  afterEach(() => {
    wrapper?.unmount()
  })

  it('overlays page content instead of pushing it down when opened', async () => {
    wrapper = await mountWithRouter()

    await wrapper.get('button[aria-label="Toggle menu"]').trigger('click')

    const panel = wrapper.findAll('div').find(div => div.classes().includes('md:hidden') && div.classes().includes('border-t'))
    expect(panel.classes()).toContain('absolute')
  })

  describe('authenticated', () => {
    beforeEach(() => {
      pb.authStore.isValid = true
      pb.authStore.record = { name: 'Jane Doe', email: 'jane@example.com' }
    })

    it('styles mobile Settings and Logout the same as the other mobile nav items', async () => {
      wrapper = await mountWithRouter()
      await wrapper.get('button[aria-label="Toggle menu"]').trigger('click')
      const panel = wrapper.findAll('div').find(div => div.classes().includes('md:hidden') && div.classes().includes('border-t'))

      const libraryLink = panel.get('a[href="/library"]')
      const navClasses = libraryLink.classes().filter(c =>
        ['text-base', 'font-medium', 'py-2', 'px-3', 'rounded-md', 'transition-colors'].includes(c)
      )

      const settingsLink = panel.get('a[href="/settings"]')
      navClasses.forEach(c => expect(settingsLink.classes()).toContain(c))
      expect(settingsLink.classes()).not.toContain('text-sm')

      const logoutButton = panel.findAll('button').find(b => b.text().includes('Logout'))
      expect(logoutButton).toBeTruthy()
      navClasses.forEach(c => expect(logoutButton.classes()).toContain(c))
      expect(logoutButton.classes()).not.toContain('text-red-600')
    })

    it('calls authManager.logout when the mobile Logout button is clicked', async () => {
      wrapper = await mountWithRouter()
      await wrapper.get('button[aria-label="Toggle menu"]').trigger('click')
      const panel = wrapper.findAll('div').find(div => div.classes().includes('md:hidden') && div.classes().includes('border-t'))

      const originalLocation = window.location
      delete window.location
      window.location = { ...originalLocation, href: '' }

      const logoutButton = panel.findAll('button').find(b => b.text().includes('Logout'))
      await logoutButton.trigger('click')

      expect(authManager.logout).toHaveBeenCalled()

      window.location = originalLocation
    })
  })

  describe('guest (not authenticated)', () => {
    it('shows a mobile Login link styled like the other nav items instead of Settings/Logout', async () => {
      wrapper = await mountWithRouter()
      await wrapper.get('button[aria-label="Toggle menu"]').trigger('click')
      const panel = wrapper.findAll('div').find(div => div.classes().includes('md:hidden') && div.classes().includes('border-t'))

      expect(panel.find('a[href="/settings"]').exists()).toBe(false)
      expect(panel.findAll('button').find(b => b.text().includes('Logout'))).toBeFalsy()

      const loginLink = panel.get('a[href="/login"]')
      expect(loginLink.classes()).toContain('py-2')
      expect(loginLink.classes()).toContain('px-3')
      expect(loginLink.classes()).toContain('rounded-md')
    })
  })
})
