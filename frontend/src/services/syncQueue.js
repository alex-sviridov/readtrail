/**
 * Sync Queue System
 * Manages offline operations and syncs them when connection is restored
 */

import { logger } from '@/utils/logger'

const SYNC_QUEUE_KEY = 'readtrail-sync-queue'
const MAX_RETRIES = 3
const INITIAL_RETRY_DELAY = 1000 // 1 second
const MAX_RETRY_DELAY = 30000 // 30 seconds

/**
 * Sync operation types
 */
export const OPERATION_TYPES = {
  CREATE: 'CREATE',
  UPDATE: 'UPDATE',
  DELETE: 'DELETE',
  BATCH_CREATE: 'BATCH_CREATE'
}

/**
 * Sync queue manager
 */
class SyncQueue {
  constructor() {
    this.queue = []
    this.isProcessing = false
    this.loadQueue()
  }

  /**
   * Load queue from localStorage
   */
  loadQueue() {
    try {
      const stored = localStorage.getItem(SYNC_QUEUE_KEY)
      if (stored) {
        this.queue = JSON.parse(stored)
        logger.info(`Loaded ${this.queue.length} operations from sync queue`)
      }
    } catch (error) {
      logger.error('Failed to load sync queue:', error)
      this.queue = []
    }
  }

  /**
   * Save queue to localStorage
   */
  saveQueue() {
    try {
      localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(this.queue))
    } catch (error) {
      logger.error('Failed to save sync queue:', error)
    }
  }

  /**
   * Add operation to queue
   * @param {string} type - Operation type (CREATE, UPDATE, DELETE)
   * @param {string} resource - Resource type ('books' or 'settings')
   * @param {Object} data - Operation data
   * @param {string} tempId - Temporary ID for CREATE operations (optional)
   * @returns {string} Operation ID
   */
  enqueue(type, resource, data, tempId = null) {
    const operation = {
      id: `op-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      resource,
      data,
      tempId,
      timestamp: Date.now(),
      retries: 0,
      lastError: null
    }

    this.queue.push(operation)
    this.saveQueue()

    logger.debug('Enqueued operation:', operation)
    return operation.id
  }

  /**
   * Remove operation from queue
   * @param {string} operationId - Operation ID
   */
  dequeue(operationId) {
    const index = this.queue.findIndex(op => op.id === operationId)
    if (index !== -1) {
      this.queue.splice(index, 1)
      this.saveQueue()
    }
  }

  /**
   * Get all pending operations
   * @returns {Array} Array of operations
   */
  getPendingOperations() {
    return [...this.queue]
  }

  /**
   * Get pending operations count
   * @returns {number} Number of pending operations
   */
  getPendingCount() {
    return this.queue.length
  }

  /**
   * Clear all operations from queue
   */
  clear() {
    this.queue = []
    this.saveQueue()
  }

  /**
   * Process all queued operations
   * @param {Object} apiHandlers - Object with API handler functions
   * @param {Function} onProgress - Progress callback (operationId, status, result)
   * @returns {Promise<Object>} Results object with successful and failed operations
   */
  async processQueue(apiHandlers, onProgress = null) {
    if (this.isProcessing) {
      logger.warn('Queue is already being processed')
      return { successful: [], failed: [] }
    }

    if (this.queue.length === 0) {
      logger.debug('Queue is empty, nothing to process')
      return { successful: [], failed: [] }
    }

    this.isProcessing = true
    logger.info(`Processing ${this.queue.length} queued operations`)

    const successful = []
    const failed = []

    // Process operations in order (FIFO)
    const operations = [...this.queue]

    for (const operation of operations) {
      try {
        // Check if we should retry this operation
        if (operation.retries >= MAX_RETRIES) {
          logger.error(`Operation ${operation.id} exceeded max retries, removing from queue`)
          this.dequeue(operation.id)
          failed.push({ operation, error: 'Max retries exceeded' })

          if (onProgress) {
            onProgress(operation.id, 'failed', { error: 'Max retries exceeded' })
          }
          continue
        }

        // Call appropriate API handler based on operation type and resource
        const handlerKey = `${operation.resource}_${operation.type}`
        const handler = apiHandlers[handlerKey]

        if (!handler) {
          logger.error(`No handler found for ${handlerKey}`)
          this.dequeue(operation.id)
          failed.push({ operation, error: 'No handler found' })

          if (onProgress) {
            onProgress(operation.id, 'failed', { error: 'No handler found' })
          }
          continue
        }

        // Execute the operation
        logger.debug(`Processing operation ${operation.id} (${operation.type} ${operation.resource})`)
        const result = await handler(operation)

        // Operation successful, remove from queue
        this.dequeue(operation.id)
        successful.push({ operation, result })

        if (onProgress) {
          onProgress(operation.id, 'success', result)
        }

        logger.debug(`Operation ${operation.id} completed successfully`)
      } catch (error) {
        logger.error(`Operation ${operation.id} failed:`, error)

        // Update retry count and error
        operation.retries++
        operation.lastError = error.message

        // Calculate exponential backoff delay
        const delay = Math.min(
          INITIAL_RETRY_DELAY * Math.pow(2, operation.retries - 1),
          MAX_RETRY_DELAY
        )

        logger.debug(`Operation ${operation.id} will retry after ${delay}ms (attempt ${operation.retries}/${MAX_RETRIES})`)

        // Save updated operation
        this.saveQueue()

        // If not max retries yet, keep in queue
        if (operation.retries < MAX_RETRIES) {
          if (onProgress) {
            onProgress(operation.id, 'retrying', { error: error.message, retries: operation.retries })
          }
        } else {
          // Max retries reached, remove from queue
          this.dequeue(operation.id)
          failed.push({ operation, error: error.message })

          if (onProgress) {
            onProgress(operation.id, 'failed', { error: error.message })
          }
        }
      }
    }

    this.isProcessing = false
    logger.info(`Queue processing complete: ${successful.length} successful, ${failed.length} failed`)

    return { successful, failed }
  }

  /**
   * Check if queue is currently being processed
   * @returns {boolean} True if processing
   */
  isQueueProcessing() {
    return this.isProcessing
  }
}

// Create and export singleton instance
export const syncQueue = new SyncQueue()

// Export class for testing
export { SyncQueue }
