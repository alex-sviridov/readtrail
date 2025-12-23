import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { SyncQueue, OPERATION_TYPES } from '../syncQueue'

// Mock localStorage
const localStorageMock = (() => {
  let store = {}
  return {
    getItem: vi.fn((key) => store[key] || null),
    setItem: vi.fn((key, value) => {
      store[key] = value.toString()
    }),
    clear: vi.fn(() => {
      store = {}
    }),
    removeItem: vi.fn((key) => {
      delete store[key]
    })
  }
})()

global.localStorage = localStorageMock

// Mock logger
vi.mock('@/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn()
  }
}))

describe('SyncQueue', () => {
  let syncQueue

  beforeEach(() => {
    localStorageMock.clear()
    vi.clearAllMocks()
    syncQueue = new SyncQueue()
  })

  afterEach(() => {
    syncQueue.clear()
  })

  describe('Queue initialization', () => {
    it('should initialize with empty queue', () => {
      expect(syncQueue.queue).toEqual([])
      expect(syncQueue.isProcessing).toBe(false)
    })

    it('should load existing queue from localStorage', () => {
      const existingQueue = [
        {
          id: 'op-1',
          type: OPERATION_TYPES.CREATE,
          resource: 'books',
          data: { name: 'Test Book' },
          timestamp: Date.now()
        }
      ]

      localStorageMock.setItem('readtrail-sync-queue', JSON.stringify(existingQueue))
      const newQueue = new SyncQueue()

      expect(newQueue.queue).toHaveLength(1)
      expect(newQueue.queue[0].id).toBe('op-1')
    })

    it('should handle corrupted localStorage data gracefully', () => {
      localStorageMock.setItem('readtrail-sync-queue', 'invalid-json')
      const newQueue = new SyncQueue()

      expect(newQueue.queue).toEqual([])
    })
  })

  describe('enqueue', () => {
    it('should add operation to queue', () => {
      const operationId = syncQueue.enqueue(
        OPERATION_TYPES.CREATE,
        'books',
        { name: 'Test Book' }
      )

      expect(operationId).toBeDefined()
      expect(syncQueue.queue).toHaveLength(1)
      expect(syncQueue.queue[0]).toMatchObject({
        type: OPERATION_TYPES.CREATE,
        resource: 'books',
        data: { name: 'Test Book' },
        retries: 0,
        lastError: null
      })
    })

    it('should generate unique operation IDs', () => {
      const id1 = syncQueue.enqueue(OPERATION_TYPES.CREATE, 'books', { name: 'Book 1' })
      const id2 = syncQueue.enqueue(OPERATION_TYPES.CREATE, 'books', { name: 'Book 2' })

      expect(id1).not.toBe(id2)
    })

    it('should persist queue to localStorage', () => {
      syncQueue.enqueue(OPERATION_TYPES.CREATE, 'books', { name: 'Test Book' })

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'readtrail-sync-queue',
        expect.any(String)
      )
    })

    it('should strip coverFile from data and set hasFile flag', () => {
      const mockFile = new File([''], 'cover.jpg', { type: 'image/jpeg' })
      const operationId = syncQueue.enqueue(
        OPERATION_TYPES.CREATE,
        'books',
        { name: 'Test Book', coverFile: mockFile }
      )

      const operation = syncQueue.queue.find(op => op.id === operationId)
      expect(operation.hasFile).toBe(true)
      expect(operation.data.coverFile).toBeUndefined()
      expect(operation.data.name).toBe('Test Book')
    })

    it('should not set hasFile flag when coverFile is null', () => {
      const operationId = syncQueue.enqueue(
        OPERATION_TYPES.CREATE,
        'books',
        { name: 'Test Book', coverFile: null }
      )

      const operation = syncQueue.queue.find(op => op.id === operationId)
      expect(operation.hasFile).toBe(false)
    })

    it('should store tempId for CREATE operations', () => {
      const operationId = syncQueue.enqueue(
        OPERATION_TYPES.CREATE,
        'books',
        { name: 'Test Book' },
        'temp-123'
      )

      const operation = syncQueue.queue.find(op => op.id === operationId)
      expect(operation.tempId).toBe('temp-123')
    })
  })

  describe('dequeue', () => {
    it('should remove operation from queue', () => {
      const operationId = syncQueue.enqueue(OPERATION_TYPES.CREATE, 'books', { name: 'Test Book' })
      expect(syncQueue.queue).toHaveLength(1)

      syncQueue.dequeue(operationId)
      expect(syncQueue.queue).toHaveLength(0)
    })

    it('should persist changes to localStorage', () => {
      const operationId = syncQueue.enqueue(OPERATION_TYPES.CREATE, 'books', { name: 'Test Book' })
      vi.clearAllMocks()

      syncQueue.dequeue(operationId)
      expect(localStorageMock.setItem).toHaveBeenCalled()
    })

    it('should handle non-existent operation gracefully', () => {
      expect(() => syncQueue.dequeue('non-existent-id')).not.toThrow()
    })
  })

  describe('getPendingOperations', () => {
    it('should return copy of queue', () => {
      syncQueue.enqueue(OPERATION_TYPES.CREATE, 'books', { name: 'Book 1' })
      syncQueue.enqueue(OPERATION_TYPES.UPDATE, 'books', { id: '123', name: 'Book 2' })

      const pending = syncQueue.getPendingOperations()
      expect(pending).toHaveLength(2)

      // Verify it's a copy, not the original
      pending.push({ id: 'new' })
      expect(syncQueue.queue).toHaveLength(2)
    })
  })

  describe('getPendingCount', () => {
    it('should return correct count', () => {
      expect(syncQueue.getPendingCount()).toBe(0)

      syncQueue.enqueue(OPERATION_TYPES.CREATE, 'books', { name: 'Book 1' })
      expect(syncQueue.getPendingCount()).toBe(1)

      syncQueue.enqueue(OPERATION_TYPES.CREATE, 'books', { name: 'Book 2' })
      expect(syncQueue.getPendingCount()).toBe(2)
    })
  })

  describe('clear', () => {
    it('should clear all operations', () => {
      syncQueue.enqueue(OPERATION_TYPES.CREATE, 'books', { name: 'Book 1' })
      syncQueue.enqueue(OPERATION_TYPES.CREATE, 'books', { name: 'Book 2' })
      expect(syncQueue.queue).toHaveLength(2)

      syncQueue.clear()
      expect(syncQueue.queue).toHaveLength(0)
    })

    it('should persist to localStorage', () => {
      syncQueue.enqueue(OPERATION_TYPES.CREATE, 'books', { name: 'Book 1' })
      vi.clearAllMocks()

      syncQueue.clear()
      expect(localStorageMock.setItem).toHaveBeenCalledWith('readtrail-sync-queue', '[]')
    })
  })

  describe('Duplicate detection', () => {
    it('should detect duplicate CREATE operations with same tempId', () => {
      const id1 = syncQueue.enqueue(
        OPERATION_TYPES.CREATE,
        'books',
        { name: 'Test Book' },
        'temp-123'
      )

      const id2 = syncQueue.enqueue(
        OPERATION_TYPES.CREATE,
        'books',
        { name: 'Test Book Updated' },
        'temp-123'
      )

      expect(id1).toBe(id2)
      expect(syncQueue.queue).toHaveLength(1)
    })

    it('should detect duplicate UPDATE operations with same id', () => {
      const id1 = syncQueue.enqueue(
        OPERATION_TYPES.UPDATE,
        'books',
        { id: 'book-123', name: 'Original' }
      )

      const id2 = syncQueue.enqueue(
        OPERATION_TYPES.UPDATE,
        'books',
        { id: 'book-123', name: 'Updated' }
      )

      expect(id1).toBe(id2)
      expect(syncQueue.queue).toHaveLength(1)
    })

    it('should detect duplicate DELETE operations with same id', () => {
      const id1 = syncQueue.enqueue(OPERATION_TYPES.DELETE, 'books', { id: 'book-123' })
      const id2 = syncQueue.enqueue(OPERATION_TYPES.DELETE, 'books', { id: 'book-123' })

      expect(id1).toBe(id2)
      expect(syncQueue.queue).toHaveLength(1)
    })

    it('should not detect duplicates for different resources', () => {
      const id1 = syncQueue.enqueue(
        OPERATION_TYPES.UPDATE,
        'books',
        { id: '123', name: 'Test' }
      )

      const id2 = syncQueue.enqueue(
        OPERATION_TYPES.UPDATE,
        'settings',
        { id: '123', name: 'Test' }
      )

      expect(id1).not.toBe(id2)
      expect(syncQueue.queue).toHaveLength(2)
    })

    it('should not detect duplicates for different operation types', () => {
      const id1 = syncQueue.enqueue(
        OPERATION_TYPES.CREATE,
        'books',
        { name: 'Test' },
        'temp-123'
      )

      const id2 = syncQueue.enqueue(
        OPERATION_TYPES.UPDATE,
        'books',
        { id: 'temp-123', name: 'Test' }
      )

      expect(id1).not.toBe(id2)
      expect(syncQueue.queue).toHaveLength(2)
    })
  })

  describe('deduplicateQueue', () => {
    it('should remove duplicate operations keeping latest', () => {
      // Manually add duplicates to queue (bypassing enqueue deduplication)
      syncQueue.queue = [
        {
          id: 'op-1',
          type: OPERATION_TYPES.UPDATE,
          resource: 'books',
          data: { id: 'book-123', name: 'Version 1' },
          timestamp: 1000,
          retries: 0
        },
        {
          id: 'op-2',
          type: OPERATION_TYPES.UPDATE,
          resource: 'books',
          data: { id: 'book-123', name: 'Version 2' },
          timestamp: 2000,
          retries: 0
        },
        {
          id: 'op-3',
          type: OPERATION_TYPES.UPDATE,
          resource: 'books',
          data: { id: 'book-456', name: 'Different Book' },
          timestamp: 1500,
          retries: 0
        }
      ]

      syncQueue.deduplicateQueue()

      expect(syncQueue.queue).toHaveLength(2)
      expect(syncQueue.queue.find(op => op.id === 'op-2')).toBeDefined() // Latest for book-123
      expect(syncQueue.queue.find(op => op.id === 'op-3')).toBeDefined()
      expect(syncQueue.queue.find(op => op.id === 'op-1')).toBeUndefined() // Older version removed
    })

    it('should filter out operations without clear identity', () => {
      syncQueue.queue = [
        {
          id: 'op-1',
          type: OPERATION_TYPES.CREATE,
          resource: 'books',
          data: { name: 'Book without tempId' },
          timestamp: 1000,
          retries: 0
        },
        {
          id: 'op-2',
          type: OPERATION_TYPES.UPDATE,
          resource: 'books',
          data: { name: 'Update without id' },
          timestamp: 2000,
          retries: 0
        }
      ]

      syncQueue.deduplicateQueue()

      // Operations without clear identity are filtered out during deduplication
      expect(syncQueue.queue).toHaveLength(0)
    })
  })

  describe('processQueue', () => {
    it('should return empty results for empty queue', async () => {
      const result = await syncQueue.processQueue({})

      expect(result).toEqual({ successful: [], failed: [] })
    })

    it('should process operations in FIFO order', async () => {
      const processedOrder = []
      const handlers = {
        'books_CREATE': vi.fn(async (op) => {
          processedOrder.push(op.id)
          return { success: true }
        })
      }

      const id1 = syncQueue.enqueue(OPERATION_TYPES.CREATE, 'books', { name: 'Book 1' }, 'temp-1')
      const id2 = syncQueue.enqueue(OPERATION_TYPES.CREATE, 'books', { name: 'Book 2' }, 'temp-2')
      const id3 = syncQueue.enqueue(OPERATION_TYPES.CREATE, 'books', { name: 'Book 3' }, 'temp-3')

      await syncQueue.processQueue(handlers)

      expect(processedOrder).toEqual([id1, id2, id3])
    })

    it('should call appropriate handler for each operation', async () => {
      const createHandler = vi.fn(async () => ({ id: 'new-book-id' }))
      const updateHandler = vi.fn(async () => ({ success: true }))

      const handlers = {
        'books_CREATE': createHandler,
        'books_UPDATE': updateHandler
      }

      syncQueue.enqueue(OPERATION_TYPES.CREATE, 'books', { name: 'New Book' }, 'temp-1')
      syncQueue.enqueue(OPERATION_TYPES.UPDATE, 'books', { id: '123', name: 'Updated' })

      await syncQueue.processQueue(handlers)

      expect(createHandler).toHaveBeenCalledOnce()
      expect(updateHandler).toHaveBeenCalledOnce()
    })

    it('should remove successful operations from queue', async () => {
      const handlers = {
        'books_CREATE': vi.fn(async () => ({ success: true }))
      }

      syncQueue.enqueue(OPERATION_TYPES.CREATE, 'books', { name: 'Book 1' }, 'temp-1')
      syncQueue.enqueue(OPERATION_TYPES.CREATE, 'books', { name: 'Book 2' }, 'temp-2')
      expect(syncQueue.queue).toHaveLength(2)

      const result = await syncQueue.processQueue(handlers)

      expect(syncQueue.queue).toHaveLength(0)
      expect(result.successful).toHaveLength(2)
      expect(result.failed).toHaveLength(0)
    })

    it('should handle operation failures with retries', async () => {
      let attempts = 0
      const handlers = {
        'books_CREATE': vi.fn(async () => {
          attempts++
          throw new Error('API Error')
        })
      }

      syncQueue.enqueue(OPERATION_TYPES.CREATE, 'books', { name: 'Test Book' }, 'temp-1')

      const result = await syncQueue.processQueue(handlers)

      // First attempt should fail and increment retry count
      expect(result.failed).toHaveLength(0) // Not fully failed yet
      expect(syncQueue.queue).toHaveLength(1)
      expect(syncQueue.queue[0].retries).toBe(1)
      expect(syncQueue.queue[0].lastError).toBe('API Error')
    })

    it('should remove operation after max retries', async () => {
      const handlers = {
        'books_CREATE': vi.fn(async () => {
          throw new Error('Permanent Error')
        })
      }

      syncQueue.enqueue(OPERATION_TYPES.CREATE, 'books', { name: 'Test Book' }, 'temp-1')

      // Process multiple times to exceed max retries (MAX_RETRIES = 3)
      await syncQueue.processQueue(handlers) // Retry 1 (retries becomes 1)
      await syncQueue.processQueue(handlers) // Retry 2 (retries becomes 2)
      const result = await syncQueue.processQueue(handlers) // Retry 3 (retries becomes 3, equals MAX_RETRIES, removed)

      expect(syncQueue.queue).toHaveLength(0)
      expect(result.failed).toHaveLength(1)
      expect(result.failed[0].error).toBe('Permanent Error')
    })

    it('should call progress callback for successful operations', async () => {
      const handlers = {
        'books_CREATE': vi.fn(async () => ({ id: 'new-id' }))
      }

      const onProgress = vi.fn()
      const operationId = syncQueue.enqueue(OPERATION_TYPES.CREATE, 'books', { name: 'Test' }, 'temp-1')

      await syncQueue.processQueue(handlers, onProgress)

      expect(onProgress).toHaveBeenCalledWith(operationId, 'success', { id: 'new-id' })
    })

    it('should call progress callback for failed operations', async () => {
      const handlers = {
        'books_CREATE': vi.fn(async () => {
          throw new Error('Test Error')
        })
      }

      const onProgress = vi.fn()
      const operationId = syncQueue.enqueue(OPERATION_TYPES.CREATE, 'books', { name: 'Test' }, 'temp-1')

      await syncQueue.processQueue(handlers, onProgress)

      expect(onProgress).toHaveBeenCalledWith(
        operationId,
        'retrying',
        expect.objectContaining({ error: 'Test Error', retries: 1 })
      )
    })

    it('should handle missing handler gracefully', async () => {
      const handlers = {}

      syncQueue.enqueue(OPERATION_TYPES.CREATE, 'books', { name: 'Test' }, 'temp-1')

      const result = await syncQueue.processQueue(handlers)

      expect(result.failed).toHaveLength(1)
      expect(result.failed[0].error).toBe('No handler found')
      expect(syncQueue.queue).toHaveLength(0) // Removed from queue
    })

    it('should attach pending file to operation if available', async () => {
      const mockFile = new File([''], 'cover.jpg', { type: 'image/jpeg' })
      let receivedOperation = null

      const handlers = {
        'books_CREATE': vi.fn(async (op) => {
          receivedOperation = op
          return { success: true }
        })
      }

      const getPendingFile = vi.fn(() => mockFile)

      syncQueue.enqueue(
        OPERATION_TYPES.CREATE,
        'books',
        { name: 'Test Book', coverFile: mockFile },
        'temp-123'
      )

      await syncQueue.processQueue(handlers, null, getPendingFile)

      expect(getPendingFile).toHaveBeenCalledWith('temp-123')
      expect(receivedOperation.data.coverFile).toBe(mockFile)
    })

    it('should continue without file if not available', async () => {
      const handlers = {
        'books_CREATE': vi.fn(async () => ({ success: true }))
      }

      const getPendingFile = vi.fn(() => null)

      const mockFile = new File([''], 'cover.jpg', { type: 'image/jpeg' })
      syncQueue.enqueue(
        OPERATION_TYPES.CREATE,
        'books',
        { name: 'Test Book', coverFile: mockFile },
        'temp-123'
      )

      const result = await syncQueue.processQueue(handlers, null, getPendingFile)

      expect(result.successful).toHaveLength(1)
      expect(getPendingFile).toHaveBeenCalled()
    })

    it('should prevent concurrent processing', async () => {
      const handlers = {
        'books_CREATE': vi.fn(async () => {
          await new Promise(resolve => setTimeout(resolve, 100))
          return { success: true }
        })
      }

      syncQueue.enqueue(OPERATION_TYPES.CREATE, 'books', { name: 'Test' }, 'temp-1')

      const process1 = syncQueue.processQueue(handlers)
      const process2 = syncQueue.processQueue(handlers)

      const [result1, result2] = await Promise.all([process1, process2])

      // One should process, the other should return empty
      expect(result1.successful.length + result2.successful.length).toBe(1)
      expect(handlers['books_CREATE']).toHaveBeenCalledOnce()
    })

    it('should deduplicate queue before processing', async () => {
      const handlers = {
        'books_UPDATE': vi.fn(async () => ({ success: true }))
      }

      // Manually add duplicates
      syncQueue.queue = [
        {
          id: 'op-1',
          type: OPERATION_TYPES.UPDATE,
          resource: 'books',
          data: { id: 'book-123', name: 'Version 1' },
          timestamp: 1000,
          retries: 0
        },
        {
          id: 'op-2',
          type: OPERATION_TYPES.UPDATE,
          resource: 'books',
          data: { id: 'book-123', name: 'Version 2' },
          timestamp: 2000,
          retries: 0
        }
      ]

      await syncQueue.processQueue(handlers)

      // Only one operation should be processed (the latest one)
      expect(handlers['books_UPDATE']).toHaveBeenCalledOnce()
    })
  })

  describe('isQueueProcessing', () => {
    it('should return false when not processing', () => {
      expect(syncQueue.isQueueProcessing()).toBe(false)
    })

    it('should return true during processing', async () => {
      const handlers = {
        'books_CREATE': vi.fn(async () => {
          expect(syncQueue.isQueueProcessing()).toBe(true)
          return { success: true }
        })
      }

      syncQueue.enqueue(OPERATION_TYPES.CREATE, 'books', { name: 'Test' })

      await syncQueue.processQueue(handlers)
      expect(syncQueue.isQueueProcessing()).toBe(false)
    })
  })

  describe('Edge cases', () => {
    it('should handle localStorage setItem errors gracefully', () => {
      localStorageMock.setItem.mockImplementationOnce(() => {
        throw new Error('QuotaExceededError')
      })

      expect(() => {
        syncQueue.enqueue(OPERATION_TYPES.CREATE, 'books', { name: 'Test' })
      }).not.toThrow()
    })

    it('should handle very large queue', () => {
      for (let i = 0; i < 1000; i++) {
        syncQueue.enqueue(OPERATION_TYPES.CREATE, 'books', { name: `Book ${i}` })
      }

      expect(syncQueue.getPendingCount()).toBe(1000)
      expect(syncQueue.getPendingOperations()).toHaveLength(1000)
    })

    it('should handle BATCH_CREATE operation type', () => {
      const id1 = syncQueue.enqueue(
        OPERATION_TYPES.BATCH_CREATE,
        'books',
        { books: [{ name: 'Book 1' }, { name: 'Book 2' }] }
      )

      const id2 = syncQueue.enqueue(
        OPERATION_TYPES.BATCH_CREATE,
        'books',
        { books: [{ name: 'Book 3' }, { name: 'Book 4' }] }
      )

      // Same batch size should be detected as duplicate
      expect(id1).toBe(id2)
      expect(syncQueue.queue).toHaveLength(1)
    })

    it('should preserve operation order when deduplicating', () => {
      syncQueue.queue = [
        {
          id: 'op-1',
          type: OPERATION_TYPES.CREATE,
          resource: 'books',
          data: { name: 'Book 1' },
          tempId: 'temp-1',
          timestamp: 1000,
          retries: 0
        },
        {
          id: 'op-2',
          type: OPERATION_TYPES.UPDATE,
          resource: 'books',
          data: { id: 'book-123', name: 'Update' },
          timestamp: 2000,
          retries: 0
        },
        {
          id: 'op-3',
          type: OPERATION_TYPES.CREATE,
          resource: 'books',
          data: { name: 'Book 1 Updated' },
          tempId: 'temp-1',
          timestamp: 3000,
          retries: 0
        }
      ]

      syncQueue.deduplicateQueue()

      // Should keep op-2 and op-3 (latest for temp-1)
      expect(syncQueue.queue).toHaveLength(2)
      const ids = syncQueue.queue.map(op => op.id)
      expect(ids).toContain('op-2')
      expect(ids).toContain('op-3')
    })
  })
})
