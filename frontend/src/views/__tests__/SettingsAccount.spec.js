import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import SettingsAccount from '../SettingsAccount.vue'
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
    changePassword: vi.fn()
  }
}))

describe('SettingsAccount', () => {
  let wrapper
  let router

  beforeEach(async () => {
    vi.clearAllMocks()

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
      wrapper = mount(SettingsAccount, {
        global: {
          plugins: [router]
        }
      })

      expect(wrapper.text()).toContain("You're using guest mode")
      expect(wrapper.text()).toContain('Your data is stored locally on this device only')
    })

    it('should show sign in and create account buttons', () => {
      wrapper = mount(SettingsAccount, {
        global: {
          plugins: [router]
        }
      })

      const links = wrapper.findAllComponents({ name: 'RouterLink' })
      expect(links.length).toBeGreaterThanOrEqual(2)

      const signInButton = wrapper.find('a:first-of-type')
      const createAccountButton = wrapper.find('a:last-of-type')

      expect(signInButton.text()).toBe('Sign In')
      expect(createAccountButton.text()).toBe('Create Account')
    })

    it('should not display password change form in guest mode', () => {
      wrapper = mount(SettingsAccount, {
        global: {
          plugins: [router]
        }
      })

      expect(wrapper.text()).not.toContain('Change Password')
      expect(wrapper.find('form').exists()).toBe(false)
    })

    it('should not display sign out button in guest mode', () => {
      wrapper = mount(SettingsAccount, {
        global: {
          plugins: [router]
        }
      })

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
      wrapper = mount(SettingsAccount, {
        global: {
          plugins: [router]
        }
      })

      expect(wrapper.text()).toContain('Email')
      expect(wrapper.text()).toContain('test@example.com')
    })

    it('should display account status', () => {
      wrapper = mount(SettingsAccount, {
        global: {
          plugins: [router]
        }
      })

      expect(wrapper.text()).toContain('Account Status')
      expect(wrapper.text()).toContain('Signed in and syncing')
    })

    it('should display password change form', () => {
      wrapper = mount(SettingsAccount, {
        global: {
          plugins: [router]
        }
      })

      expect(wrapper.text()).toContain('Change Password')
      expect(wrapper.find('form').exists()).toBe(true)
    })

    it('should have all password input fields', () => {
      wrapper = mount(SettingsAccount, {
        global: {
          plugins: [router]
        }
      })

      const inputs = wrapper.findAll('input[type="password"]')
      expect(inputs.length).toBe(3)

      expect(wrapper.find('#current-password').exists()).toBe(true)
      expect(wrapper.find('#new-password').exists()).toBe(true)
      expect(wrapper.find('#confirm-password').exists()).toBe(true)
    })

    it('should display sign out button', () => {
      wrapper = mount(SettingsAccount, {
        global: {
          plugins: [router]
        }
      })

      const buttons = wrapper.findAll('button')
      const signOutButton = buttons.find(btn => btn.text() === 'Sign Out')
      expect(signOutButton).toBeTruthy()
      expect(signOutButton.text()).toBe('Sign Out')
    })
  })

  describe('password change functionality', () => {
    beforeEach(() => {
      authManager.isGuestUser.mockReturnValue(false)
      authManager.getCurrentUser.mockReturnValue({
        id: 'user123',
        email: 'test@example.com'
      })
    })

    it('should submit password change with valid data', async () => {
      authManager.changePassword.mockResolvedValue({
        id: 'user123',
        email: 'test@example.com',
        updated: new Date().toISOString()
      })

      wrapper = mount(SettingsAccount, {
        global: {
          plugins: [router]
        }
      })

      // Fill in the form
      await wrapper.find('#current-password').setValue('oldPassword123')
      await wrapper.find('#new-password').setValue('newPassword123')
      await wrapper.find('#confirm-password').setValue('newPassword123')

      // Submit the form
      await wrapper.find('form').trigger('submit.prevent')
      await wrapper.vm.$nextTick()

      expect(authManager.changePassword).toHaveBeenCalledWith(
        'oldPassword123',
        'newPassword123',
        'newPassword123'
      )

      expect(mockToast.success).toHaveBeenCalledWith('Password changed successfully')
    })

    it('should clear form after successful password change', async () => {
      authManager.changePassword.mockResolvedValue({
        id: 'user123',
        email: 'test@example.com'
      })

      wrapper = mount(SettingsAccount, {
        global: {
          plugins: [router]
        }
      })

      await wrapper.find('#current-password').setValue('oldPassword123')
      await wrapper.find('#new-password').setValue('newPassword123')
      await wrapper.find('#confirm-password').setValue('newPassword123')

      await wrapper.find('form').trigger('submit.prevent')
      await wrapper.vm.$nextTick()

      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 0))

      expect(wrapper.find('#current-password').element.value).toBe('')
      expect(wrapper.find('#new-password').element.value).toBe('')
      expect(wrapper.find('#confirm-password').element.value).toBe('')
    })

    it('should show error when passwords do not match', async () => {
      wrapper = mount(SettingsAccount, {
        global: {
          plugins: [router]
        }
      })

      await wrapper.find('#current-password').setValue('oldPassword123')
      await wrapper.find('#new-password').setValue('newPassword123')
      await wrapper.find('#confirm-password').setValue('differentPassword')

      await wrapper.find('form').trigger('submit.prevent')
      await wrapper.vm.$nextTick()

      expect(wrapper.text()).toContain('New passwords do not match')
      expect(authManager.changePassword).not.toHaveBeenCalled()
    })

    it('should show error when password is too short', async () => {
      wrapper = mount(SettingsAccount, {
        global: {
          plugins: [router]
        }
      })

      await wrapper.find('#current-password').setValue('oldPassword123')
      await wrapper.find('#new-password').setValue('short')
      await wrapper.find('#confirm-password').setValue('short')

      await wrapper.find('form').trigger('submit.prevent')
      await wrapper.vm.$nextTick()

      expect(wrapper.text()).toContain('Password must be at least 8 characters long')
      expect(authManager.changePassword).not.toHaveBeenCalled()
    })

    it('should show error when new password is same as old password', async () => {
      wrapper = mount(SettingsAccount, {
        global: {
          plugins: [router]
        }
      })

      await wrapper.find('#current-password').setValue('password123')
      await wrapper.find('#new-password').setValue('password123')
      await wrapper.find('#confirm-password').setValue('password123')

      await wrapper.find('form').trigger('submit.prevent')
      await wrapper.vm.$nextTick()

      expect(wrapper.text()).toContain('New password must be different from current password')
      expect(authManager.changePassword).not.toHaveBeenCalled()
    })

    it('should display error from backend', async () => {
      authManager.changePassword.mockRejectedValue(new Error('Invalid old password'))

      wrapper = mount(SettingsAccount, {
        global: {
          plugins: [router]
        }
      })

      await wrapper.find('#current-password').setValue('wrongPassword')
      await wrapper.find('#new-password').setValue('newPassword123')
      await wrapper.find('#confirm-password').setValue('newPassword123')

      await wrapper.find('form').trigger('submit.prevent')
      await wrapper.vm.$nextTick()

      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 0))

      expect(wrapper.text()).toContain('Invalid old password')
    })

    it('should disable form during password change', async () => {
      // Make changePassword hang
      authManager.changePassword.mockImplementation(
        () => new Promise(() => {}) // Never resolves
      )

      wrapper = mount(SettingsAccount, {
        global: {
          plugins: [router]
        }
      })

      await wrapper.find('#current-password').setValue('oldPassword123')
      await wrapper.find('#new-password').setValue('newPassword123')
      await wrapper.find('#confirm-password').setValue('newPassword123')

      await wrapper.find('form').trigger('submit.prevent')
      await wrapper.vm.$nextTick()

      const inputs = wrapper.findAll('input[type="password"]')
      inputs.forEach(input => {
        expect(input.attributes('disabled')).toBeDefined()
      })

      const submitButton = wrapper.find('button[type="submit"]')
      expect(submitButton.attributes('disabled')).toBeDefined()
      expect(submitButton.text()).toBe('Changing Password...')
    })

    it('should show cancel button when form has data', async () => {
      wrapper = mount(SettingsAccount, {
        global: {
          plugins: [router]
        }
      })

      // Initially no cancel button
      let cancelButtons = wrapper.findAll('button').filter(btn => btn.text() === 'Cancel')
      expect(cancelButtons.length).toBe(0)

      // Fill in one field
      await wrapper.find('#current-password').setValue('password')
      await wrapper.vm.$nextTick()

      // Now cancel button should appear
      cancelButtons = wrapper.findAll('button').filter(btn => btn.text() === 'Cancel')
      expect(cancelButtons.length).toBe(1)
    })

    it('should clear form when cancel is clicked', async () => {
      wrapper = mount(SettingsAccount, {
        global: {
          plugins: [router]
        }
      })

      await wrapper.find('#current-password').setValue('oldPassword123')
      await wrapper.find('#new-password').setValue('newPassword123')
      await wrapper.find('#confirm-password').setValue('newPassword123')

      const cancelButton = wrapper.findAll('button').find(btn => btn.text() === 'Cancel')
      await cancelButton.trigger('click')
      await wrapper.vm.$nextTick()

      expect(wrapper.find('#current-password').element.value).toBe('')
      expect(wrapper.find('#new-password').element.value).toBe('')
      expect(wrapper.find('#confirm-password').element.value).toBe('')
    })

    it('should clear error message when cancel is clicked', async () => {
      wrapper = mount(SettingsAccount, {
        global: {
          plugins: [router]
        }
      })

      // Trigger a validation error
      await wrapper.find('#current-password').setValue('oldPassword123')
      await wrapper.find('#new-password').setValue('short')
      await wrapper.find('#confirm-password').setValue('short')
      await wrapper.find('form').trigger('submit.prevent')
      await wrapper.vm.$nextTick()

      expect(wrapper.text()).toContain('Password must be at least 8 characters long')

      // Click cancel
      const cancelButton = wrapper.findAll('button').find(btn => btn.text() === 'Cancel')
      await cancelButton.trigger('click')
      await wrapper.vm.$nextTick()

      expect(wrapper.text()).not.toContain('Password must be at least 8 characters long')
    })
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

      wrapper = mount(SettingsAccount, {
        global: {
          plugins: [router]
        }
      })

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

  describe('accessibility', () => {
    beforeEach(() => {
      authManager.isGuestUser.mockReturnValue(false)
      authManager.getCurrentUser.mockReturnValue({
        id: 'user123',
        email: 'test@example.com'
      })
    })

    it('should have proper labels for all inputs', () => {
      wrapper = mount(SettingsAccount, {
        global: {
          plugins: [router]
        }
      })

      expect(wrapper.find('label[for="current-password"]').text()).toBe('Current Password')
      expect(wrapper.find('label[for="new-password"]').text()).toBe('New Password')
      expect(wrapper.find('label[for="confirm-password"]').text()).toBe('Confirm New Password')
    })

    it('should have required attributes on password inputs', () => {
      wrapper = mount(SettingsAccount, {
        global: {
          plugins: [router]
        }
      })

      const inputs = wrapper.findAll('input[type="password"]')
      inputs.forEach(input => {
        expect(input.attributes('required')).toBeDefined()
      })
    })

    it('should have minlength attribute on new password inputs', () => {
      wrapper = mount(SettingsAccount, {
        global: {
          plugins: [router]
        }
      })

      expect(wrapper.find('#new-password').attributes('minlength')).toBe('8')
      expect(wrapper.find('#confirm-password').attributes('minlength')).toBe('8')
    })
  })
})
