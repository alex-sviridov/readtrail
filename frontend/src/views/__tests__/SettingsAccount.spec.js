import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import SettingsAccount from '../SettingsAccount.vue'
import ChangePasswordModal from '@/components/settings/ChangePasswordModal.vue'
import { authManager } from '@/services/auth'

// Mock vue-toastification
const mockToast = {
  success: vi.fn(),
  error: vi.fn(),
  warning: vi.fn(),
  info: vi.fn()
}

vi.mock('vue-toastification', () => ({
  useToast: () => mockToast,
  POSITION: { TOP_RIGHT: 'top-right' }
}))

// Mock authManager
vi.mock('@/services/auth', () => ({
  authManager: {
    isGuestUser: vi.fn(),
    getCurrentUser: vi.fn(),
    logout: vi.fn(),
    changePassword: vi.fn(),
    deleteAccount: vi.fn()
  }
}))

// Mock Heroicons
vi.mock('@heroicons/vue/24/outline', () => ({
  ArrowDownTrayIcon: { name: 'ArrowDownTrayIcon', template: '<div />' },
  ArrowUpTrayIcon: { name: 'ArrowUpTrayIcon', template: '<div />' },
  ExclamationTriangleIcon: { name: 'ExclamationTriangleIcon', template: '<div />' },
  XMarkIcon: { name: 'XMarkIcon', template: '<div />' }
}))

// Mock the PocketBase client (used for the custom books export/import routes)
vi.mock('@/services/pocketbase', () => ({
  default: {
    send: vi.fn()
  }
}))

// Mock stores
vi.mock('@/stores/books', () => ({
  useBooksStore: () => ({
    books: []
  })
}))

describe('SettingsAccount', () => {
  let wrapper
  let router
  let queryClient

  const mountSettingsAccount = () =>
    mount(SettingsAccount, {
      global: {
        plugins: [router, [VueQueryPlugin, { queryClient }]]
      }
    })

  beforeEach(async () => {
    vi.clearAllMocks()

    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
    })

    // Create router with memory history
    router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/settings/account', name: 'settings-account', component: SettingsAccount },
        { path: '/login', name: 'login', component: { template: '<div>Login</div>' } }
      ]
    })

    await router.push('/settings/account')
    await router.isReady()
  })

  afterEach(() => {
    wrapper?.unmount()
  })

  describe('guest mode', () => {
    beforeEach(() => {
      authManager.isGuestUser.mockReturnValue(true)
      authManager.getCurrentUser.mockReturnValue(null)
    })

    it('should display guest mode message', () => {
      wrapper = mountSettingsAccount()

      expect(wrapper.text()).toContain("You're using guest mode")
      expect(wrapper.text()).toContain('Your data is stored locally on this device only')
    })

    it('should show sign in and create account buttons', () => {
      wrapper = mountSettingsAccount()

      const links = wrapper.findAllComponents({ name: 'RouterLink' })
      expect(links.length).toBeGreaterThanOrEqual(2)

      const signInButton = wrapper.find('a:first-of-type')
      const createAccountButton = wrapper.find('a:last-of-type')

      expect(signInButton.text()).toBe('Sign In')
      expect(createAccountButton.text()).toBe('Create Account')
    })

    it('should not display password change form in guest mode', () => {
      wrapper = mountSettingsAccount()

      // The change-password affordance lives in a native <dialog>-based modal that
      // is always present in the DOM but stays closed/inert until opened, so we
      // assert on the trigger button and the dialog's open state rather than
      // absence from the DOM.
      const buttonsOutsideDialogs = wrapper
        .findAll('button')
        .filter((btn) => !btn.element.closest('dialog'))
      expect(buttonsOutsideDialogs.some((btn) => btn.text().includes('Change Password'))).toBe(
        false
      )
      expect(wrapper.getComponent(ChangePasswordModal).get('dialog').element.open).toBe(false)
    })

    it('should not display sign out button in guest mode', () => {
      wrapper = mountSettingsAccount()

      expect(wrapper.text()).not.toContain('Sign Out')
    })
  })

  describe('authenticated mode', () => {
    beforeEach(() => {
      authManager.isGuestUser.mockReturnValue(false)
      authManager.getCurrentUser.mockReturnValue({
        id: 'user123',
        email: 'test@example.com'
      })
    })

    it('should display user email', () => {
      wrapper = mountSettingsAccount()

      expect(wrapper.text()).toContain('Email')
      expect(wrapper.text()).toContain('test@example.com')
    })

    it('should display account status', () => {
      wrapper = mountSettingsAccount()

      expect(wrapper.text()).toContain('Account Status')
      expect(wrapper.text()).toContain('Signed in and syncing')
    })

    it('should display password change button', () => {
      wrapper = mountSettingsAccount()

      expect(wrapper.text()).toContain('Change Password')
      const changePasswordButton = wrapper.find('button:contains("Change Password")')
      expect(changePasswordButton.exists() || wrapper.html().includes('Change Password')).toBe(true)
    })

    it('should not have inline password input fields (uses modal instead)', () => {
      wrapper = mountSettingsAccount()

      // The password inputs live inside ChangePasswordModal's native <dialog>,
      // which is always present in the DOM but closed/inert by default -- they
      // are not "inline" fields on the page itself.
      const passwordModal = wrapper.getComponent(ChangePasswordModal)
      expect(passwordModal.get('dialog').element.open).toBe(false)
      const inputsOutsideDialogs = wrapper
        .findAll('input[type="password"]')
        .filter((input) => !input.element.closest('dialog'))
      expect(inputsOutsideDialogs.length).toBe(0)
    })

    it('should display sign out button', () => {
      wrapper = mountSettingsAccount()

      const buttons = wrapper.findAll('button')
      const signOutButton = buttons.find(btn => btn.text() === 'Sign Out')
      expect(signOutButton).toBeTruthy()
      expect(signOutButton.text()).toBe('Sign Out')
    })
  })

  describe('row layout consistency', () => {
    beforeEach(() => {
      authManager.isGuestUser.mockReturnValue(false)
      authManager.getCurrentUser.mockReturnValue({
        id: 'user123',
        email: 'test@example.com'
      })
    })

    it('keeps each action button on the same line as its title, not its description', () => {
      wrapper = mountSettingsAccount()

      const labels = ['View Policy', 'Change Password']
      const buttons = wrapper
        .findAll('button, a')
        .filter((el) => !el.element.closest('dialog'))
        .filter((el) => labels.some((label) => el.text().includes(label)))

      expect(buttons.length).toBe(2)
      buttons.forEach((button) => {
        const row = button.element.parentElement
        expect(row.querySelector('h3, h4')).not.toBeNull()
        expect(row.querySelector('p')).toBeNull()
      })
    })

    it('gives every action button the same padding and prevents its label from wrapping', () => {
      wrapper = mountSettingsAccount()

      const labels = ['View Policy', 'Change Password']
      const buttons = wrapper
        .findAll('button, a')
        .filter((el) => !el.element.closest('dialog'))
        .filter((el) => labels.some((label) => el.text().includes(label)))

      expect(buttons.length).toBe(2)
      buttons.forEach((button) => {
        expect(button.classes()).toEqual(expect.arrayContaining(['px-4', 'py-2', 'whitespace-nowrap', 'shrink-0']))
      })
    })
  })

  describe.skip('password change functionality (modal-based)', () => {
    // These tests are skipped because the component now uses a modal (ChangePasswordModal)
    // instead of an inline form. The modal component should be tested separately.
    // The SettingsAccount component only needs to test that the modal can be opened/closed.
  })

  describe('sign out functionality', () => {
    beforeEach(() => {
      authManager.isGuestUser.mockReturnValue(false)
      authManager.getCurrentUser.mockReturnValue({
        id: 'user123',
        email: 'test@example.com'
      })

      // Mock window.location.href
      delete window.location
      window.location = { href: '' }
    })

    it('should call logout and redirect on sign out', async () => {
      vi.useFakeTimers()

      wrapper = mountSettingsAccount()

      const signOutButton = wrapper.findAll('button').find(btn => btn.text() === 'Sign Out')
      await signOutButton.trigger('click')

      expect(authManager.logout).toHaveBeenCalled()
      expect(mockToast.success).toHaveBeenCalledWith('Signed out successfully')

      // Fast-forward time to after the timeout
      vi.advanceTimersByTime(500)

      expect(window.location.href).toBe('/login')

      vi.useRealTimers()
    })
  })

  describe.skip('accessibility', () => {
    // These tests are skipped because they test an inline password form that no longer exists.
    // The component now uses a modal (ChangePasswordModal) for password changes.
  })
})
