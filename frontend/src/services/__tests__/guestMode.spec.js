import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  isGuestMode,
  isGuestModeEnabled,
  shouldSyncWithBackend,
  requireAuth
} from '../guestMode'
import { authManager } from '../auth'

vi.mock('../auth', () => ({
  authManager: {
    isGuestUser: vi.fn(),
    isGuestUserEnabled: vi.fn()
  }
}))

describe('guestMode', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('isGuestMode', () => {
    it('should return true when user is a guest', () => {
      authManager.isGuestUser.mockReturnValue(true)

      expect(isGuestMode()).toBe(true)
      expect(authManager.isGuestUser).toHaveBeenCalled()
    })

    it('should return false when user is authenticated', () => {
      authManager.isGuestUser.mockReturnValue(false)

      expect(isGuestMode()).toBe(false)
      expect(authManager.isGuestUser).toHaveBeenCalled()
    })
  })

  describe('isGuestModeEnabled', () => {
    it('should return true when guest mode is enabled', () => {
      authManager.isGuestUserEnabled.mockReturnValue(true)

      expect(isGuestModeEnabled()).toBe(true)
      expect(authManager.isGuestUserEnabled).toHaveBeenCalled()
    })

    it('should return false when guest mode is disabled', () => {
      authManager.isGuestUserEnabled.mockReturnValue(false)

      expect(isGuestModeEnabled()).toBe(false)
      expect(authManager.isGuestUserEnabled).toHaveBeenCalled()
    })
  })

  describe('shouldSyncWithBackend', () => {
    it('should return false when user is in guest mode', () => {
      authManager.isGuestUser.mockReturnValue(true)

      expect(shouldSyncWithBackend()).toBe(false)
    })

    it('should return true when user is authenticated', () => {
      authManager.isGuestUser.mockReturnValue(false)

      expect(shouldSyncWithBackend()).toBe(true)
    })
  })

  describe('requireAuth', () => {
    it('should throw error when user is in guest mode', () => {
      authManager.isGuestUser.mockReturnValue(true)

      expect(() => requireAuth('sync data')).toThrow('Cannot sync data in guest mode')
    })

    it('should not throw when user is authenticated', () => {
      authManager.isGuestUser.mockReturnValue(false)

      expect(() => requireAuth('sync data')).not.toThrow()
    })

    it('should include operation name in error message', () => {
      authManager.isGuestUser.mockReturnValue(true)

      expect(() => requireAuth('delete account')).toThrow(
        'Cannot delete account in guest mode'
      )
    })

    it('should work with various operation descriptions', () => {
      authManager.isGuestUser.mockReturnValue(true)

      expect(() => requireAuth('upload file')).toThrow('Cannot upload file in guest mode')
      expect(() => requireAuth('share book')).toThrow('Cannot share book in guest mode')
      expect(() => requireAuth('export data')).toThrow('Cannot export data in guest mode')
    })
  })
})
