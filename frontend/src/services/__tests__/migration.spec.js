import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { migrateLocalDataToBackend } from '../migration'
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
      expect(booksApi.batchCreateBooks).not.toHaveBeenCalled()
    })

    it('should skip migration in guest mode', async () => {
      isGuestMode.mockReturnValue(true)

      const result = await migrateLocalDataToBackend([mockBook1], true, null)

      expect(result.success).toBe(false)
      expect(result.reason).toBe('guest')
      expect(booksApi.batchCreateBooks).not.toHaveBeenCalled()
    })

    it('should skip migration when no books to migrate', async () => {
      isGuestMode.mockReturnValue(false)

      const result = await migrateLocalDataToBackend([], true, null)

      expect(result.success).toBe(true)
      expect(result.migratedCount).toBe(0)
      expect(booksApi.batchCreateBooks).not.toHaveBeenCalled()
    })

    it('should batch-create all guest books directly, with no existing-books check', async () => {
      isGuestMode.mockReturnValue(false)
      booksApi.batchCreateBooks.mockResolvedValue([
        { id: 'backend-1', createdAt: '2024-01-01', updatedAt: '2024-01-01' },
        { id: 'backend-2', createdAt: '2024-01-02', updatedAt: '2024-01-02' }
      ])

      const mockCallback = vi.fn()
      const result = await migrateLocalDataToBackend([mockBook1, mockBook2], true, mockCallback)

      expect(booksApi.getBooks).not.toHaveBeenCalled()
      expect(booksApi.batchCreateBooks).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ name: 'The Great Gatsby' }),
          expect.objectContaining({ name: '1984' })
        ])
      )
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
    })

    it('should handle batch create errors', async () => {
      isGuestMode.mockReturnValue(false)
      booksApi.batchCreateBooks.mockRejectedValue(new Error('Batch create failed'))

      const result = await migrateLocalDataToBackend([mockBook1], true, null)

      expect(result.success).toBe(false)
      expect(result.reason).toBe('error')
      expect(result.error).toBe('Batch create failed')
    })

    it('should not call callback when none provided', async () => {
      isGuestMode.mockReturnValue(false)
      booksApi.batchCreateBooks.mockResolvedValue([
        { id: 'backend-1', createdAt: '2024-01-01', updatedAt: '2024-01-01' }
      ])

      const result = await migrateLocalDataToBackend([mockBook1], true, null)

      expect(result.success).toBe(true)
      expect(result.migratedCount).toBe(1)
    })

    it('should handle partial batch create results', async () => {
      isGuestMode.mockReturnValue(false)
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
  })
})
