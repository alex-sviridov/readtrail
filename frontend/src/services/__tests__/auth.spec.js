import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { AuthManager, authManager } from '../auth'
import pb from '../pocketbase'

// Mock PocketBase
vi.mock('../pocketbase', () => ({
  default: {
    collection: vi.fn(),
    authStore: {
      isValid: false,
      record: null,
      token: null,
      clear: vi.fn(),
      onChange: vi.fn()
    }
  }
}))

// Mock logger
vi.mock('@/utils/logger', () => ({
  logger: {
    debug: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn()
  }
}))

// Mock error adapter
vi.mock('@/utils/errors', () => ({
  adaptPocketBaseError: (error) => error
}))

describe('AuthManager', () => {
  let mockCollection
  let authManagerInstance

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks()
    localStorage.clear()

    // Setup mock collection
    mockCollection = {
      authWithPassword: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      authRefresh: vi.fn()
    }

    pb.collection.mockReturnValue(mockCollection)

    // Reset authStore state
    pb.authStore.isValid = false
    pb.authStore.record = null
    pb.authStore.token = null

    // Create a fresh instance for testing
    authManagerInstance = new AuthManager()
  })

  afterEach(() => {
    localStorage.clear()
  })

  describe('login', () => {
    it('should login with email and password', async () => {
      const mockAuthData = {
        record: {
          id: 'user123',
          email: 'test@example.com'
        },
        token: 'mock-token'
      }

      mockCollection.authWithPassword.mockResolvedValue(mockAuthData)

      const result = await authManagerInstance.login('test@example.com', 'password123')

      expect(mockCollection.authWithPassword).toHaveBeenCalledWith('test@example.com', 'password123')
      expect(result).toEqual(mockAuthData.record)
    })

    it('should throw error on invalid credentials', async () => {
      const mockError = new Error('Invalid credentials')
      mockCollection.authWithPassword.mockRejectedValue(mockError)

      await expect(
        authManagerInstance.login('test@example.com', 'wrongpassword')
      ).rejects.toThrow('Invalid credentials')
    })
  })

  describe('register', () => {
    it('should register a new user and auto-login', async () => {
      const mockRecord = {
        id: 'user123',
        email: 'newuser@example.com'
      }

      const mockAuthData = {
        record: mockRecord,
        token: 'mock-token'
      }

      mockCollection.create.mockResolvedValue(mockRecord)
      mockCollection.authWithPassword.mockResolvedValue(mockAuthData)

      const result = await authManagerInstance.register(
        'newuser@example.com',
        'password123',
        'password123'
      )

      expect(mockCollection.create).toHaveBeenCalledWith({
        email: 'newuser@example.com',
        password: 'password123',
        passwordConfirm: 'password123'
      })
      expect(mockCollection.authWithPassword).toHaveBeenCalledWith(
        'newuser@example.com',
        'password123'
      )
      expect(result).toEqual(mockRecord)
    })

    it('should include additional data when provided', async () => {
      const mockRecord = { id: 'user123', email: 'newuser@example.com' }
      const mockAuthData = { record: mockRecord, token: 'mock-token' }

      mockCollection.create.mockResolvedValue(mockRecord)
      mockCollection.authWithPassword.mockResolvedValue(mockAuthData)

      await authManagerInstance.register(
        'newuser@example.com',
        'password123',
        'password123',
        { name: 'Test User' }
      )

      expect(mockCollection.create).toHaveBeenCalledWith({
        email: 'newuser@example.com',
        password: 'password123',
        passwordConfirm: 'password123',
        name: 'Test User'
      })
    })

    it('should throw error on registration failure', async () => {
      const mockError = new Error('Email already exists')
      mockCollection.create.mockRejectedValue(mockError)

      await expect(
        authManagerInstance.register('existing@example.com', 'password123', 'password123')
      ).rejects.toThrow('Email already exists')
    })
  })

  describe('logout', () => {
    it('should clear auth and all localStorage data', () => {
      // Setup some data
      localStorage.setItem('readtrail-settings', 'some-data')
      localStorage.setItem('readtrail-books', 'some-books')
      localStorage.setItem('other-app-data', 'should-remain')

      authManagerInstance.logout()

      expect(pb.authStore.clear).toHaveBeenCalled()
      expect(localStorage.getItem('readtrail-settings')).toBeNull()
      expect(localStorage.getItem('readtrail-books')).toBeNull()
      expect(localStorage.getItem('other-app-data')).toBe('should-remain')
    })

    it('should only clear readtrail-prefixed keys', () => {
      localStorage.setItem('readtrail-key1', 'value1')
      localStorage.setItem('readtrail-key2', 'value2')
      localStorage.setItem('unrelated-key', 'value3')

      authManagerInstance.logout()

      expect(localStorage.getItem('readtrail-key1')).toBeNull()
      expect(localStorage.getItem('readtrail-key2')).toBeNull()
      expect(localStorage.getItem('unrelated-key')).toBe('value3')
    })
  })

  describe('isAuthenticated', () => {
    it('should return true when authStore is valid', () => {
      pb.authStore.isValid = true

      expect(authManagerInstance.isAuthenticated()).toBe(true)
    })

    it('should return false when authStore is invalid', () => {
      pb.authStore.isValid = false

      expect(authManagerInstance.isAuthenticated()).toBe(false)
    })
  })

  describe('getCurrentUser', () => {
    it('should return current user record', () => {
      const mockUser = {
        id: 'user123',
        email: 'test@example.com'
      }

      pb.authStore.record = mockUser

      expect(authManagerInstance.getCurrentUser()).toEqual(mockUser)
    })

    it('should return null when no user is authenticated', () => {
      pb.authStore.record = null

      expect(authManagerInstance.getCurrentUser()).toBeNull()
    })
  })

  describe('isGuestUser', () => {
    it('should return true when not authenticated', () => {
      pb.authStore.isValid = false

      expect(authManagerInstance.isGuestUser()).toBe(true)
    })

    it('should return false when authenticated', () => {
      pb.authStore.isValid = true

      expect(authManagerInstance.isGuestUser()).toBe(false)
    })
  })

  describe('refreshAuth', () => {
    it('should refresh authentication token successfully', async () => {
      mockCollection.authRefresh.mockResolvedValue({ token: 'new-token' })

      const result = await authManagerInstance.refreshAuth()

      expect(mockCollection.authRefresh).toHaveBeenCalled()
      expect(result).toBe(true)
    })

    it('should return false on refresh failure', async () => {
      mockCollection.authRefresh.mockRejectedValue(new Error('Token expired'))

      const result = await authManagerInstance.refreshAuth()

      expect(result).toBe(false)
    })
  })

  describe('changePassword', () => {
    it('should change password for authenticated user', async () => {
      const mockUser = {
        id: 'user123',
        email: 'test@example.com'
      }

      pb.authStore.isValid = true
      pb.authStore.record = mockUser

      const updatedUser = {
        ...mockUser,
        updated: new Date().toISOString()
      }

      mockCollection.update.mockResolvedValue(updatedUser)

      const result = await authManagerInstance.changePassword(
        'oldPassword123',
        'newPassword123',
        'newPassword123'
      )

      expect(mockCollection.update).toHaveBeenCalledWith('user123', {
        oldPassword: 'oldPassword123',
        password: 'newPassword123',
        passwordConfirm: 'newPassword123'
      })
      expect(result).toEqual(updatedUser)
    })

    it('should throw error when no user is authenticated', async () => {
      pb.authStore.record = null

      await expect(
        authManagerInstance.changePassword('old', 'new', 'new')
      ).rejects.toThrow('No authenticated user')
    })

    it('should throw error on incorrect old password', async () => {
      const mockUser = {
        id: 'user123',
        email: 'test@example.com'
      }

      pb.authStore.isValid = true
      pb.authStore.record = mockUser

      const mockError = new Error('Invalid old password')
      mockCollection.update.mockRejectedValue(mockError)

      await expect(
        authManagerInstance.changePassword('wrongOld', 'newPassword123', 'newPassword123')
      ).rejects.toThrow('Invalid old password')
    })

    it('should handle password confirmation mismatch error from backend', async () => {
      const mockUser = {
        id: 'user123',
        email: 'test@example.com'
      }

      pb.authStore.isValid = true
      pb.authStore.record = mockUser

      const mockError = new Error('Passwords do not match')
      mockCollection.update.mockRejectedValue(mockError)

      await expect(
        authManagerInstance.changePassword('oldPassword', 'newPassword', 'differentPassword')
      ).rejects.toThrow('Passwords do not match')
    })

    it('should adapt PocketBase errors', async () => {
      const mockUser = {
        id: 'user123',
        email: 'test@example.com'
      }

      pb.authStore.isValid = true
      pb.authStore.record = mockUser

      const pbError = {
        status: 400,
        data: {
          oldPassword: { code: 'invalid', message: 'Invalid password' }
        }
      }

      mockCollection.update.mockRejectedValue(pbError)

      await expect(
        authManagerInstance.changePassword('wrong', 'new123', 'new123')
      ).rejects.toThrow()
    })
  })

  describe('singleton instance', () => {
    it('should export a singleton instance', () => {
      expect(authManager).toBeInstanceOf(AuthManager)
    })

    it('should have guest user enabled based on environment', () => {
      expect(typeof authManager.isGuestUserEnabled()).toBe('boolean')
    })
  })
})
