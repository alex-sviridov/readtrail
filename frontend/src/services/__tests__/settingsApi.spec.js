import { describe, it, expect, vi, beforeEach } from 'vitest'
import { SettingsApi, DEFAULT_SETTINGS } from '../settingsApi'
import pb from '../pocketbase'
import { isGuestMode, requireAuth } from '../guestMode'
import { adaptPocketBaseError } from '@/utils/errors'

// Mock the pocketbase module
vi.mock('../pocketbase', () => ({
  default: {
    collection: vi.fn(),
    authStore: {
      record: { id: 'test-user-id' }
    }
  }
}))

// Mock guestMode module
vi.mock('../guestMode', () => ({
  isGuestMode: vi.fn(() => false),
  requireAuth: vi.fn()
}))

// Mock errors module
vi.mock('@/utils/errors', () => ({
  adaptPocketBaseError: vi.fn((error) => error)
}))

// Mock logger
vi.mock('@/utils/logger', () => ({
  logger: {
    warn: vi.fn(),
    debug: vi.fn()
  }
}))

describe('settingsApi', () => {
  let settingsApi

  beforeEach(() => {
    settingsApi = new SettingsApi()
    vi.clearAllMocks()
    // Reset authStore.record to default authenticated state
    pb.authStore.record = { id: 'test-user-id' }
    // Reset isGuestMode to false by default
    isGuestMode.mockReturnValue(false)
  })

  describe('DEFAULT_SETTINGS', () => {
    it('should have expected default values', () => {
      expect(DEFAULT_SETTINGS).toEqual({
        showBookInfo: true,
        allowUnfinishedReading: true,
        allowScoring: true,
        lastLibraryView: 'timeline'
      })
    })
  })

  describe('transformSettingsFromPocketBase', () => {
    it('should return defaults when user settings is null', async () => {
      const user = {
        id: 'user-1',
        settings: null
      }

      const mockCollection = {
        getOne: vi.fn().mockResolvedValue(user)
      }
      pb.collection.mockReturnValue(mockCollection)

      const result = await settingsApi.getSettings()

      expect(result).toEqual(DEFAULT_SETTINGS)
    })

    it('should return defaults when user settings is empty object', async () => {
      const user = {
        id: 'user-1',
        settings: {}
      }

      const mockCollection = {
        getOne: vi.fn().mockResolvedValue(user)
      }
      pb.collection.mockReturnValue(mockCollection)

      const result = await settingsApi.getSettings()

      expect(result).toEqual(DEFAULT_SETTINGS)
    })

    it('should merge user settings with defaults', async () => {
      const user = {
        id: 'user-1',
        settings: {
          showBookInfo: false
          // Missing other settings
        }
      }

      const mockCollection = {
        getOne: vi.fn().mockResolvedValue(user)
      }
      pb.collection.mockReturnValue(mockCollection)

      const result = await settingsApi.getSettings()

      expect(result).toEqual({
        showBookInfo: false,
        allowUnfinishedReading: true,
        allowScoring: true,
        lastLibraryView: 'timeline'
      })
    })

    it('should preserve all user settings when all present', async () => {
      const user = {
        id: 'user-1',
        settings: {
          showBookInfo: false,
          allowUnfinishedReading: false,
          allowScoring: false
        }
      }

      const mockCollection = {
        getOne: vi.fn().mockResolvedValue(user)
      }
      pb.collection.mockReturnValue(mockCollection)

      const result = await settingsApi.getSettings()

      expect(result).toEqual({
        showBookInfo: false,
        allowUnfinishedReading: false,
        allowScoring: false,
        lastLibraryView: 'timeline'
      })
    })

    it('should handle new settings being added to defaults', async () => {
      // Simulates a user with old settings, but DEFAULT_SETTINGS now has more fields
      const user = {
        id: 'user-1',
        settings: {
          showBookInfo: false
        }
      }

      const mockCollection = {
        getOne: vi.fn().mockResolvedValue(user)
      }
      pb.collection.mockReturnValue(mockCollection)

      const result = await settingsApi.getSettings()

      // Should have all default settings, with user's override for showBookInfo
      expect(result.showBookInfo).toBe(false)
      expect(result.allowUnfinishedReading).toBe(true)
      expect(result.allowScoring).toBe(true)
      expect(result.lastLibraryView).toBe('timeline')
    })
  })

  describe('getSettings', () => {
    it('should return null in guest mode', async () => {
      isGuestMode.mockReturnValue(true)

      const result = await settingsApi.getSettings()

      expect(result).toBeNull()
      expect(pb.collection).not.toHaveBeenCalled()
    })

    it('should fetch settings for authenticated user', async () => {
      const mockUser = {
        id: 'test-user-id',
        settings: {
          showBookInfo: false,
          allowUnfinishedReading: true,
          allowScoring: true
        }
      }

      const mockCollection = {
        getOne: vi.fn().mockResolvedValue(mockUser)
      }
      pb.collection.mockReturnValue(mockCollection)

      const result = await settingsApi.getSettings()

      expect(pb.collection).toHaveBeenCalledWith('users')
      expect(mockCollection.getOne).toHaveBeenCalledWith('test-user-id')
      expect(result).toEqual({
        ...mockUser.settings,
        lastLibraryView: 'timeline'
      })
    })

    it('should throw error when no authenticated user', async () => {
      pb.authStore.record = null

      try {
        await settingsApi.getSettings()
        // If we get here, the test should fail
        expect.fail('Should have thrown an error')
      } catch (error) {
        expect(error.message).toBe('No authenticated user')
      }
    })

    it('should return null on 404 error', async () => {
      const mockCollection = {
        getOne: vi.fn().mockRejectedValue({ status: 404 })
      }
      pb.collection.mockReturnValue(mockCollection)

      const result = await settingsApi.getSettings()

      expect(result).toBeNull()
    })

    it('should return null on 403 error', async () => {
      const mockCollection = {
        getOne: vi.fn().mockRejectedValue({ status: 403 })
      }
      pb.collection.mockReturnValue(mockCollection)

      const result = await settingsApi.getSettings()

      expect(result).toBeNull()
    })

    it('should return null on network error (status 0)', async () => {
      const mockCollection = {
        getOne: vi.fn().mockRejectedValue({ status: 0 })
      }
      pb.collection.mockReturnValue(mockCollection)

      const result = await settingsApi.getSettings()

      expect(result).toBeNull()
    })

    it('should throw adapted error for other errors', async () => {
      const mockError = { status: 500, message: 'Server error' }
      const mockCollection = {
        getOne: vi.fn().mockRejectedValue(mockError)
      }
      pb.collection.mockReturnValue(mockCollection)

      try {
        await settingsApi.getSettings()
        expect.fail('Should have thrown an error')
      } catch (error) {
        expect(error).toEqual(mockError)
        expect(adaptPocketBaseError).toHaveBeenCalledWith(mockError)
      }
    })
  })

  describe('updateSettings', () => {
    it('should call requireAuth before updating', async () => {
      const newSettings = {
        showBookInfo: false,
        allowUnfinishedReading: false,
        allowScoring: true
      }

      const mockCollection = {
        update: vi.fn().mockResolvedValue({
          id: 'test-user-id',
          settings: newSettings
        })
      }
      pb.collection.mockReturnValue(mockCollection)

      await settingsApi.updateSettings(newSettings)

      expect(requireAuth).toHaveBeenCalledWith('update settings')
    })

    it('should update settings for authenticated user', async () => {
      const newSettings = {
        showBookInfo: false,
        allowUnfinishedReading: false,
        allowScoring: true
      }

      const mockCollection = {
        update: vi.fn().mockResolvedValue({
          id: 'test-user-id',
          settings: newSettings
        })
      }
      pb.collection.mockReturnValue(mockCollection)

      const result = await settingsApi.updateSettings(newSettings)

      expect(pb.collection).toHaveBeenCalledWith('users')
      expect(mockCollection.update).toHaveBeenCalledWith('test-user-id', {
        settings: newSettings
      })
      expect(result).toEqual({
        ...newSettings,
        lastLibraryView: 'timeline'
      })
    })

    it('should transform settings from returned user record', async () => {
      const newSettings = {
        showBookInfo: false
      }

      const mockUser = {
        id: 'test-user-id',
        settings: {
          showBookInfo: false
          // Missing other fields
        }
      }

      const mockCollection = {
        update: vi.fn().mockResolvedValue(mockUser)
      }
      pb.collection.mockReturnValue(mockCollection)

      const result = await settingsApi.updateSettings(newSettings)

      // Should merge with defaults
      expect(result).toEqual({
        showBookInfo: false,
        allowUnfinishedReading: true,
        allowScoring: true,
        lastLibraryView: 'timeline'
      })
    })

    it('should throw error when no authenticated user', async () => {
      pb.authStore.record = null

      await expect(settingsApi.updateSettings({})).rejects.toThrow('No authenticated user')
    })

    it('should throw adapted error on update failure', async () => {
      const mockError = { status: 400, message: 'Bad request' }
      const mockCollection = {
        update: vi.fn().mockRejectedValue(mockError)
      }
      pb.collection.mockReturnValue(mockCollection)

      await expect(settingsApi.updateSettings({})).rejects.toEqual(mockError)
      expect(adaptPocketBaseError).toHaveBeenCalledWith(mockError)
    })

    it('should handle partial settings updates', async () => {
      const partialSettings = {
        allowScoring: false
      }

      const mockCollection = {
        update: vi.fn().mockResolvedValue({
          id: 'test-user-id',
          settings: partialSettings
        })
      }
      pb.collection.mockReturnValue(mockCollection)

      await settingsApi.updateSettings(partialSettings)

      expect(mockCollection.update).toHaveBeenCalledWith('test-user-id', {
        settings: partialSettings
      })
    })
  })

  describe('getSyncHandlers', () => {
    it('should return handlers object with settings_UPDATE', () => {
      const handlers = settingsApi.getSyncHandlers()

      expect(handlers).toHaveProperty('settings_UPDATE')
      expect(typeof handlers['settings_UPDATE']).toBe('function')
    })

    it('should call updateSettings from sync handler', async () => {
      const newSettings = {
        showBookInfo: false,
        allowUnfinishedReading: true,
        allowScoring: false
      }

      const mockCollection = {
        update: vi.fn().mockResolvedValue({
          id: 'test-user-id',
          settings: newSettings
        })
      }
      pb.collection.mockReturnValue(mockCollection)

      const handlers = settingsApi.getSyncHandlers()
      const operation = {
        data: newSettings
      }

      const result = await handlers['settings_UPDATE'](operation)

      expect(mockCollection.update).toHaveBeenCalledWith('test-user-id', {
        settings: newSettings
      })
      expect(result).toEqual({
        ...newSettings,
        lastLibraryView: 'timeline'
      })
    })
  })

  describe('round-trip transformation', () => {
    it('should maintain data integrity through update and retrieve', async () => {
      const originalSettings = {
        showBookInfo: false,
        allowUnfinishedReading: false,
        allowScoring: true
      }

      const mockUser = {
        id: 'test-user-id',
        settings: originalSettings
      }

      const mockCollection = {
        update: vi.fn().mockResolvedValue(mockUser),
        getOne: vi.fn().mockResolvedValue(mockUser)
      }
      pb.collection.mockReturnValue(mockCollection)

      const updated = await settingsApi.updateSettings(originalSettings)
      const retrieved = await settingsApi.getSettings()

      expect(retrieved).toEqual(updated)
      expect(retrieved).toEqual({
        ...originalSettings,
        lastLibraryView: 'timeline'
      })
    })

    it('should handle settings with defaults through round-trip', async () => {
      const partialSettings = {
        showBookInfo: false
      }

      const mockUserAfterUpdate = {
        id: 'test-user-id',
        settings: partialSettings
      }

      const mockCollection = {
        update: vi.fn().mockResolvedValue(mockUserAfterUpdate),
        getOne: vi.fn().mockResolvedValue(mockUserAfterUpdate)
      }
      pb.collection.mockReturnValue(mockCollection)

      const updated = await settingsApi.updateSettings(partialSettings)
      const retrieved = await settingsApi.getSettings()

      // Both should have defaults merged in
      expect(updated).toEqual({
        showBookInfo: false,
        allowUnfinishedReading: true,
        allowScoring: true,
        lastLibraryView: 'timeline'
      })
      expect(retrieved).toEqual(updated)
    })
  })

  describe('edge cases', () => {
    it('should handle undefined settings gracefully', async () => {
      const user = {
        id: 'test-user-id',
        settings: undefined
      }

      const mockCollection = {
        getOne: vi.fn().mockResolvedValue(user)
      }
      pb.collection.mockReturnValue(mockCollection)

      const result = await settingsApi.getSettings()

      expect(result).toEqual(DEFAULT_SETTINGS)
    })

    it('should handle settings with extra unknown properties', async () => {
      const user = {
        id: 'test-user-id',
        settings: {
          showBookInfo: false,
          allowUnfinishedReading: true,
          allowScoring: true,
          unknownProperty: 'should be preserved'
        }
      }

      const mockCollection = {
        getOne: vi.fn().mockResolvedValue(user)
      }
      pb.collection.mockReturnValue(mockCollection)

      const result = await settingsApi.getSettings()

      expect(result).toEqual({
        showBookInfo: false,
        allowUnfinishedReading: true,
        allowScoring: true,
        lastLibraryView: 'timeline',
        unknownProperty: 'should be preserved'
      })
    })

    it('should handle all boolean combinations', async () => {
      const testCases = [
        { showBookInfo: true, allowUnfinishedReading: true, allowScoring: true },
        { showBookInfo: false, allowUnfinishedReading: true, allowScoring: true },
        { showBookInfo: true, allowUnfinishedReading: false, allowScoring: true },
        { showBookInfo: true, allowUnfinishedReading: true, allowScoring: false },
        { showBookInfo: false, allowUnfinishedReading: false, allowScoring: false }
      ]

      for (const settings of testCases) {
        const mockUser = {
          id: 'test-user-id',
          settings
        }

        const mockCollection = {
          getOne: vi.fn().mockResolvedValue(mockUser)
        }
        pb.collection.mockReturnValue(mockCollection)

        const result = await settingsApi.getSettings()

        expect(result).toEqual({
          ...settings,
          lastLibraryView: 'timeline'
        })
      }
    })
  })
})
