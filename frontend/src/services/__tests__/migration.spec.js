import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  migrateLocalDataToBackend,
  needsMigration,
  markForMigration,
  clearMigrationFlag
} from '../migration'
import { booksApi } from '../booksApi'
import { isGuestMode } from '../guestMode'

vi.mock('../booksApi')
vi.mock('../guestMode')

describe('migration', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  afterEach(() => {
    localStorage.clear()
  })

  describe('needsMigration', () => {
    it('should return true when migration flag is set', () => {
      localStorage.setItem('readtrail-needs-migration', 'true')
      expect(needsMigration()).toBe(true)
    })

    it('should return false when migration flag is not set', () => {
      expect(needsMigration()).toBe(false)
    })

    it('should return false when migration flag has wrong value', () => {
      localStorage.setItem('readtrail-needs-migration', 'false')
      expect(needsMigration()).toBe(false)
    })
  })

  describe('markForMigration', () => {
    it('should set migration flag in localStorage', () => {
      markForMigration()
      expect(localStorage.getItem('readtrail-needs-migration')).toBe('true')
    })
  })

  describe('clearMigrationFlag', () => {
    it('should remove migration flag from localStorage', () => {
      localStorage.setItem('readtrail-needs-migration', 'true')
      clearMigrationFlag()
      expect(localStorage.getItem('readtrail-needs-migration')).toBeNull()
    })
  })

  describe('migrateLocalDataToBackend', () => {
    const mockBook1 = {
      id: 'temp-1',
      name: 'The Great Gatsby',
      author: 'F. Scott Fitzgerald',
      year: 2024,
      month: 1
    }

    const mockBook2 = {
      id: 'temp-2',
      name: '1984',
      author: 'George Orwell',
      year: 2024,
      month: 2
    }

    it('should skip migration when offline', async () => {
      isGuestMode.mockReturnValue(false)

      const result = await migrateLocalDataToBackend([mockBook1], false, null)

      expect(result.success).toBe(false)
      expect(result.reason).toBe('offline')
      expect(booksApi.getBooks).not.toHaveBeenCalled()
    })

    it('should skip migration in guest mode', async () => {
      isGuestMode.mockReturnValue(true)

      const result = await migrateLocalDataToBackend([mockBook1], true, null)

      expect(result.success).toBe(false)
      expect(result.reason).toBe('guest')
      expect(booksApi.getBooks).not.toHaveBeenCalled()
    })

    it('should successfully migrate books when no backend books exist', async () => {
      isGuestMode.mockReturnValue(false)
      booksApi.getBooks.mockResolvedValue([])
      booksApi.batchCreateBooks.mockResolvedValue([
        { id: 'backend-1', createdAt: '2024-01-01', updatedAt: '2024-01-01' },
        { id: 'backend-2', createdAt: '2024-01-02', updatedAt: '2024-01-02' }
      ])

      const mockCallback = vi.fn()
      const result = await migrateLocalDataToBackend([mockBook1, mockBook2], true, mockCallback)

      expect(result.success).toBe(true)
      expect(result.migratedCount).toBe(2)
      expect(result.idMapping).toHaveLength(2)
      expect(result.idMapping[0]).toEqual({
        oldId: 'temp-1',
        newId: 'backend-1',
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01'
      })
      expect(mockCallback).toHaveBeenCalledWith(result.idMapping)
      expect(localStorage.getItem('readtrail-needs-migration')).toBeNull()
    })

    it('should skip migration when no books to migrate', async () => {
      isGuestMode.mockReturnValue(false)
      localStorage.setItem('readtrail-needs-migration', 'true')

      const result = await migrateLocalDataToBackend([], true, null)

      expect(result.success).toBe(true)
      expect(result.migratedCount).toBe(0)
      expect(booksApi.getBooks).not.toHaveBeenCalled()
      expect(localStorage.getItem('readtrail-needs-migration')).toBeNull()
    })

    it('should detect duplicate books and only migrate new ones', async () => {
      isGuestMode.mockReturnValue(false)

      const existingBackendBook = {
        id: 'backend-1',
        name: 'The Great Gatsby',
        author: 'F. Scott Fitzgerald',
        year: 2024,
        month: 1,
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01'
      }

      booksApi.getBooks.mockResolvedValue([existingBackendBook])
      booksApi.batchCreateBooks.mockResolvedValue([
        { id: 'backend-2', createdAt: '2024-01-02', updatedAt: '2024-01-02' }
      ])

      const mockCallback = vi.fn()
      const result = await migrateLocalDataToBackend([mockBook1, mockBook2], true, mockCallback)

      expect(result.success).toBe(true)
      expect(result.migratedCount).toBe(1)

      // Should have called callback twice: once for existing mapping, once for newly created
      expect(mockCallback).toHaveBeenCalledTimes(2)

      // First call should map existing book
      expect(mockCallback).toHaveBeenNthCalledWith(1, [
        {
          oldId: 'temp-1',
          newId: 'backend-1',
          createdAt: '2024-01-01',
          updatedAt: '2024-01-01'
        }
      ])

      expect(booksApi.batchCreateBooks).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ name: '1984' })
        ])
      )
      expect(booksApi.batchCreateBooks).toHaveBeenCalledWith(
        expect.not.arrayContaining([
          expect.objectContaining({ name: 'The Great Gatsby' })
        ])
      )
    })

    it('should skip migration when all books already exist in backend', async () => {
      isGuestMode.mockReturnValue(false)

      const existingBackendBooks = [
        {
          id: 'backend-1',
          name: 'The Great Gatsby',
          author: 'F. Scott Fitzgerald',
          year: 2024,
          month: 1,
          createdAt: '2024-01-01',
          updatedAt: '2024-01-01'
        },
        {
          id: 'backend-2',
          name: '1984',
          author: 'George Orwell',
          year: 2024,
          month: 2,
          createdAt: '2024-01-02',
          updatedAt: '2024-01-02'
        }
      ]

      booksApi.getBooks.mockResolvedValue(existingBackendBooks)

      const mockCallback = vi.fn()
      const result = await migrateLocalDataToBackend([mockBook1, mockBook2], true, mockCallback)

      expect(result.success).toBe(true)
      expect(result.migratedCount).toBe(0)
      expect(result.skippedCount).toBe(2)
      expect(mockCallback).toHaveBeenCalledWith([
        {
          oldId: 'temp-1',
          newId: 'backend-1',
          createdAt: '2024-01-01',
          updatedAt: '2024-01-01'
        },
        {
          oldId: 'temp-2',
          newId: 'backend-2',
          createdAt: '2024-01-02',
          updatedAt: '2024-01-02'
        }
      ])
      expect(booksApi.batchCreateBooks).not.toHaveBeenCalled()
      expect(localStorage.getItem('readtrail-needs-migration')).toBeNull()
    })

    it('should match books case-insensitively', async () => {
      isGuestMode.mockReturnValue(false)

      const existingBackendBook = {
        id: 'backend-1',
        name: 'THE GREAT GATSBY',
        author: 'F. SCOTT FITZGERALD',
        year: 2024,
        month: 1,
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01'
      }

      booksApi.getBooks.mockResolvedValue([existingBackendBook])

      const mockCallback = vi.fn()
      const result = await migrateLocalDataToBackend([mockBook1], true, mockCallback)

      expect(result.success).toBe(true)
      expect(result.migratedCount).toBe(0)
      expect(result.skippedCount).toBe(1)
      expect(booksApi.batchCreateBooks).not.toHaveBeenCalled()
    })

    it('should handle books with missing authors', async () => {
      isGuestMode.mockReturnValue(false)

      const bookWithoutAuthor = {
        id: 'temp-1',
        name: 'Unknown Author Book',
        author: '',
        year: 2024,
        month: 1
      }

      const existingBackendBook = {
        id: 'backend-1',
        name: 'Unknown Author Book',
        author: '',
        year: 2024,
        month: 1,
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01'
      }

      booksApi.getBooks.mockResolvedValue([existingBackendBook])

      const mockCallback = vi.fn()
      const result = await migrateLocalDataToBackend([bookWithoutAuthor], true, mockCallback)

      expect(result.success).toBe(true)
      expect(result.migratedCount).toBe(0)
      expect(booksApi.batchCreateBooks).not.toHaveBeenCalled()
    })

    it('should handle null authors', async () => {
      isGuestMode.mockReturnValue(false)

      const bookWithNullAuthor = {
        id: 'temp-1',
        name: 'Null Author Book',
        author: null,
        year: 2024,
        month: 1
      }

      const existingBackendBook = {
        id: 'backend-1',
        name: 'Null Author Book',
        author: null,
        year: 2024,
        month: 1,
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01'
      }

      booksApi.getBooks.mockResolvedValue([existingBackendBook])

      const mockCallback = vi.fn()
      const result = await migrateLocalDataToBackend([bookWithNullAuthor], true, mockCallback)

      expect(result.success).toBe(true)
      expect(result.migratedCount).toBe(0)
    })

    it('should not match books with different years', async () => {
      isGuestMode.mockReturnValue(false)

      const existingBackendBook = {
        id: 'backend-1',
        name: 'The Great Gatsby',
        author: 'F. Scott Fitzgerald',
        year: 2023,
        month: 1,
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01'
      }

      booksApi.getBooks.mockResolvedValue([existingBackendBook])
      booksApi.batchCreateBooks.mockResolvedValue([
        { id: 'backend-2', createdAt: '2024-01-02', updatedAt: '2024-01-02' }
      ])

      const result = await migrateLocalDataToBackend([mockBook1], true, null)

      expect(result.success).toBe(true)
      expect(result.migratedCount).toBe(1)
      expect(booksApi.batchCreateBooks).toHaveBeenCalled()
    })

    it('should not match books with different months', async () => {
      isGuestMode.mockReturnValue(false)

      const existingBackendBook = {
        id: 'backend-1',
        name: 'The Great Gatsby',
        author: 'F. Scott Fitzgerald',
        year: 2024,
        month: 12,
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01'
      }

      booksApi.getBooks.mockResolvedValue([existingBackendBook])
      booksApi.batchCreateBooks.mockResolvedValue([
        { id: 'backend-2', createdAt: '2024-01-02', updatedAt: '2024-01-02' }
      ])

      const result = await migrateLocalDataToBackend([mockBook1], true, null)

      expect(result.success).toBe(true)
      expect(result.migratedCount).toBe(1)
      expect(booksApi.batchCreateBooks).toHaveBeenCalled()
    })

    it('should handle API errors gracefully', async () => {
      isGuestMode.mockReturnValue(false)
      booksApi.getBooks.mockRejectedValue(new Error('Network error'))

      const result = await migrateLocalDataToBackend([mockBook1], true, null)

      expect(result.success).toBe(false)
      expect(result.reason).toBe('error')
      expect(result.error).toBe('Network error')
    })

    it('should handle batch create errors', async () => {
      isGuestMode.mockReturnValue(false)
      booksApi.getBooks.mockResolvedValue([])
      booksApi.batchCreateBooks.mockRejectedValue(new Error('Batch create failed'))

      const result = await migrateLocalDataToBackend([mockBook1], true, null)

      expect(result.success).toBe(false)
      expect(result.reason).toBe('error')
      expect(result.error).toBe('Batch create failed')
    })

    it('should not call callback when none provided', async () => {
      isGuestMode.mockReturnValue(false)
      booksApi.getBooks.mockResolvedValue([])
      booksApi.batchCreateBooks.mockResolvedValue([
        { id: 'backend-1', createdAt: '2024-01-01', updatedAt: '2024-01-01' }
      ])

      const result = await migrateLocalDataToBackend([mockBook1], true, null)

      expect(result.success).toBe(true)
      expect(result.migratedCount).toBe(1)
    })

    it('should handle partial batch create results', async () => {
      isGuestMode.mockReturnValue(false)
      booksApi.getBooks.mockResolvedValue([])
      // Only one book created successfully
      booksApi.batchCreateBooks.mockResolvedValue([
        { id: 'backend-1', createdAt: '2024-01-01', updatedAt: '2024-01-01' },
        null // Second book failed
      ])

      const mockCallback = vi.fn()
      const result = await migrateLocalDataToBackend([mockBook1, mockBook2], true, mockCallback)

      expect(result.success).toBe(true)
      expect(result.migratedCount).toBe(2)
      expect(result.idMapping).toHaveLength(1) // Only one ID mapping
      expect(result.idMapping[0].oldId).toBe('temp-1')
    })

    it('should clear migration flag on successful migration', async () => {
      isGuestMode.mockReturnValue(false)
      localStorage.setItem('readtrail-needs-migration', 'true')

      booksApi.getBooks.mockResolvedValue([])
      booksApi.batchCreateBooks.mockResolvedValue([
        { id: 'backend-1', createdAt: '2024-01-01', updatedAt: '2024-01-01' }
      ])

      await migrateLocalDataToBackend([mockBook1], true, null)

      expect(localStorage.getItem('readtrail-needs-migration')).toBeNull()
    })

    it('should not clear migration flag on error', async () => {
      isGuestMode.mockReturnValue(false)
      localStorage.setItem('readtrail-needs-migration', 'true')

      booksApi.getBooks.mockRejectedValue(new Error('Network error'))

      await migrateLocalDataToBackend([mockBook1], true, null)

      expect(localStorage.getItem('readtrail-needs-migration')).toBe('true')
    })
  })
})
