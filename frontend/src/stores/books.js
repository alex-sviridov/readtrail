import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import mockBooksData from '@/data/mockBooks.json'
import { booksApi } from '@/services/booksApi'
import { syncQueue, OPERATION_TYPES } from '@/services/syncQueue'
import { useOnlineStatus, setApiAvailability } from '@/composables/useOnlineStatus'
import { isGuestMode } from '@/services/guestMode'
import { logger } from '@/utils/logger'
import { handleStorageError } from '@/utils/storageErrors'
import { DEFAULT_BOOK_ATTRIBUTES } from '@/utils/bookSchema'
import { sortBooks } from '@/utils/bookSorting'
import { serializeBook, deserializeBook } from '@/utils/bookSerialization'
import { migrateLocalDataToBackend, needsMigration, markForMigration } from '@/services/migration'

const STORAGE_KEY = 'readtrail-books'

let idCounter = 0

export const useBooksStore = defineStore('books', () => {
  // State
  const books = ref([])
  const lastError = ref(null)
  const booksLoading = ref(false) // Loading state for UI
  const syncStatus = ref('idle') // 'idle' | 'syncing' | 'error'
  const lastSyncTime = ref(null)
  const pendingIdMap = ref({}) // Map temp IDs to backend IDs
  const pendingFiles = ref({}) // Map book IDs to File objects (in-memory, not serialized)
  const { isOnline } = useOnlineStatus(handleOnlineStatusChange)

  // File management helpers
  const fileOps = {
    set: (id, file) => {
      if (file) pendingFiles.value[id] = file
    },

    get: (id) => pendingFiles.value[id] || null,

    move: (fromId, toId) => {
      const file = fileOps.get(fromId)
      if (file) {
        fileOps.set(toId, file)
        fileOps.delete(fromId)
      }
    },

    delete: (id) => {
      delete pendingFiles.value[id]
    }
  }

  // Getters (computed)
  const sortedBooks = computed(() => sortBooks(books.value))

  const inProgressBooks = computed(() =>
    books.value.filter(book => !book.year && !book.month)
  )

  const completedBooks = computed(() =>
    books.value.filter(book => book.year && book.month)
  )

  // Actions (functions)

  /**
   * Generate temporary ID for optimistic updates
   */
  function generateTempId() {
    return `temp-${Date.now()}-${idCounter++}`
  }

  /**
   * Check if ID is temporary
   */
  function isTempId(id) {
    return typeof id === 'string' && id.startsWith('temp-')
  }

  /**
   * Replace temporary ID with backend ID
   */
  function replaceTempId(tempId, backendId) {
    const book = books.value.find(b => b.id === tempId)
    if (!book) return

    book.id = backendId
    pendingIdMap.value[tempId] = backendId
    fileOps.move(tempId, backendId)
    saveToLocalStorage()
  }

  /**
   * Handle online status changes
   */
  async function handleOnlineStatusChange(online) {
    if (online && syncQueue.getPendingCount() > 0) {
      logger.info('Connection restored, processing sync queue')
      await syncWithBackend()
    }
  }

  /**
   * Load books from backend or localStorage
   */
  async function loadBooks() {
    booksLoading.value = true

    try {
      // Try loading from backend if online
      if (isOnline.value) {
        try {
          const backendBooks = await booksApi.getBooks()

          // API is available
          setApiAvailability(true)

          if (backendBooks.length > 0) {
            // Backend has data, use it
            books.value = backendBooks
            saveToLocalStorage()
            lastSyncTime.value = new Date()
            logger.info(`Loaded ${books.value.length} books from backend`)
          } else {
            // Backend has no data, check localStorage for migration
            const hasLocalData = await loadFromLocalStorage()

            if (hasLocalData) {
              // Mark for migration
              markForMigration()
              logger.info('Loaded books from localStorage, marked for migration')
            } else {
              // No data anywhere, load defaults
              loadDefaultBooks()
            }
          }

          lastError.value = null
        } catch (error) {
          // Backend error, mark API as unavailable
          setApiAvailability(false)
          logger.warn('Failed to load from backend, using localStorage:', error)
          await loadFromLocalStorage() || loadDefaultBooks()
        }
      } else {
        // Offline, load from localStorage
        await loadFromLocalStorage() || loadDefaultBooks()
      }

      // Check if we need to migrate
      if (needsMigration()) {
        await performMigration()
      }
    } catch (error) {
      logger.error('Failed to load books:', error)
      lastError.value = 'Failed to load books'
    } finally {
      booksLoading.value = false
    }
  }

  /**
   * Load books from localStorage
   * @returns {boolean} True if data was loaded
   */
  function loadFromLocalStorage() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        books.value = parsed.map(deserializeBook)
        logger.info(`Loaded ${books.value.length} books from localStorage`)
        return true
      }
      return false
    } catch (error) {
      const errorMessage = handleStorageError(error, { operation: 'load' })
      lastError.value = errorMessage
      books.value = []
      return false
    }
  }

  // Load default mock books
  function loadDefaultBooks() {
    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth() + 1

    const mockBooks = mockBooksData.map((bookTemplate, index) => {
      if (bookTemplate.inProgress) {
        return {
          id: generateTempId(),
          name: bookTemplate.name,
          author: bookTemplate.author || null,
          coverLink: bookTemplate.coverLink || null,
          coverDisplayLink: bookTemplate.coverLink || null,
          year: null,
          month: null,
          attributes: { ...DEFAULT_BOOK_ATTRIBUTES },
          createdAt: new Date(currentYear, currentMonth - 1 - index, 1)
        }
      }

      const year = currentYear + (bookTemplate.yearOffset || 0)
      const month = bookTemplate.month || (currentMonth + (bookTemplate.monthOffset || 0))

      return {
        id: generateTempId(),
        name: bookTemplate.name,
        author: bookTemplate.author || null,
        coverLink: bookTemplate.coverLink || null,
        coverDisplayLink: bookTemplate.coverLink || null,
        year,
        month,
        attributes: { ...DEFAULT_BOOK_ATTRIBUTES },
        createdAt: new Date(year, month - 1, 15 - index * 5)
      }
    })

    books.value = mockBooks
    saveToLocalStorage()
  }

  // Save books to localStorage
  function saveToLocalStorage() {
    try {
      const serialized = books.value.map(serializeBook)
      const data = JSON.stringify(serialized)
      localStorage.setItem(STORAGE_KEY, data)
      lastError.value = null
    } catch (error) {
      const sizeKB = Math.round(JSON.stringify(books.value).length / 1024)
      const errorMessage = handleStorageError(error, {
        operation: 'save',
        itemCount: books.value.length,
        sizeKB
      })
      lastError.value = errorMessage
    }
  }

  /**
   * Migrate localStorage data to backend using migration service
   */
  async function performMigration() {
    syncStatus.value = 'syncing'

    const result = await migrateLocalDataToBackend(
      books.value,
      isOnline.value,
      (idMapping) => {
        // Update book IDs based on migration result
        idMapping.forEach(({ oldId, newId, createdAt, updatedAt }) => {
          const book = books.value.find(b => b.id === oldId)
          if (book) {
            book.id = newId
            book.createdAt = createdAt
            book.updatedAt = updatedAt
            pendingIdMap.value[oldId] = newId
          }
        })
        // Save updated books to localStorage
        saveToLocalStorage()
      }
    )

    if (result.success) {
      syncStatus.value = 'idle'
      lastSyncTime.value = new Date()
      // Emit success event for toast notification
      if (result.migratedCount > 0) {
        window.dispatchEvent(new CustomEvent('migration-success', {
          detail: { count: result.migratedCount }
        }))
      }
    } else {
      syncStatus.value = 'error'
      if (result.reason === 'error') {
        lastError.value = 'Failed to migrate data to backend'
        // Emit error event for toast notification
        window.dispatchEvent(new CustomEvent('migration-error', {
          detail: { error: result.error }
        }))
      }
    }
  }

  /**
   * Sync with backend
   */
  async function syncWithBackend() {
    if (!isOnline.value || isGuestMode() || syncQueue.isQueueProcessing()) {
      return
    }

    try {
      syncStatus.value = 'syncing'

      const results = await syncQueue.processQueue(
        booksApi.getSyncHandlers(replaceTempId),
        handleSyncProgress,
        fileOps.get // Pass getter directly
      )

      setApiAvailability(true)
      syncStatus.value = 'idle'
      lastSyncTime.value = new Date()

      logger.info(`Sync: ${results.successful.length} ok, ${results.failed.length} failed`)

      if (results.failed.length > 0) {
        lastError.value = `Sync completed with ${results.failed.length} errors`
      }
    } catch (error) {
      setApiAvailability(false)
      logger.error('Sync failed:', error)
      syncStatus.value = 'error'
      lastError.value = 'Sync failed'
    }
  }

  function handleSyncProgress(operationId, status, result) {
    logger.debug(`Operation ${operationId}: ${status}`, result)

    if (status === 'success' && result?.id) {
      fileOps.delete(result.id)
    }
  }

  // Add a new book
  function addBook(name, year = null, month = null, author = null, coverLink = null, coverFile = null, isUnfinished = false, score = null) {
    const tempId = generateTempId()
    const book = {
      id: tempId,
      name,
      author,
      coverLink,
      coverDisplayLink: coverLink,
      year,
      month,
      attributes: {
        isUnfinished,
        score: score ?? null
      },
      createdAt: new Date()
    }

    fileOps.set(tempId, coverFile)

    books.value.push(book)
    saveToLocalStorage()

    if (isOnline.value && !isGuestMode()) {
      syncQueue.enqueue(OPERATION_TYPES.CREATE, 'books', {
        name,
        author,
        coverLink,
        coverFile,
        year,
        month,
        attributes: {
          isUnfinished,
          score: score ?? null
        }
      }, tempId)

      syncWithBackend()
    }

    return book
  }

  /**
   * Generic field updater - consolidates all update operations
   * Public API for flexible book updates
   */
  function updateBookFields(id, updates) {
    const book = books.value.find(b => b.id === id)
    if (!book) return false

    // Handle file separately
    const { coverFile, ...bookUpdates } = updates
    fileOps.set(id, coverFile)

    // Apply updates
    Object.assign(book, bookUpdates)

    // Merge attributes
    if (updates.attributes) {
      book.attributes = { ...book.attributes, ...updates.attributes }
    }

    // Sync coverDisplayLink with coverLink
    if (updates.coverLink !== undefined && !updates.coverDisplayLink) {
      book.coverDisplayLink = updates.coverLink
    }

    saveToLocalStorage()

    // Queue sync
    if (!isTempId(id) && isOnline.value && !isGuestMode()) {
      syncQueue.enqueue(OPERATION_TYPES.UPDATE, 'books', {
        id,
        name: book.name,
        author: book.author,
        coverLink: book.coverLink,
        coverFile: fileOps.get(id),
        year: book.year,
        month: book.month,
        attributes: book.attributes
      })
      syncWithBackend()
    }

    return true
  }

  // Update an existing book (full update)
  function updateBook(id, name, year = null, month = null, author = null, coverLink = null) {
    return updateBookFields(id, { name, author, coverLink, year, month })
  }

  // Update book status (year and month only)
  function updateBookStatus(id, year = null, month = null, isUnfinished = false, score = null) {
    // Clear score when setting to in-progress
    const finalScore = (year === null && month === null) ? 0 : score

    return updateBookFields(id, {
      year,
      month,
      attributes: { isUnfinished, score: finalScore }
    })
  }


  // Delete a book
  function deleteBook(id) {
    const index = books.value.findIndex(b => b.id === id)
    if (index !== -1) {
      books.value.splice(index, 1)
      saveToLocalStorage()

      // Queue for sync if not a temp ID and authenticated
      if (!isTempId(id) && isOnline.value && !isGuestMode()) {
        syncQueue.enqueue(OPERATION_TYPES.DELETE, 'books', { id })
        syncWithBackend()
      }

      return true
    }
    return false
  }

  // Find a book by ID
  function findBookById(id) {
    return books.value.find(b => b.id === id)
  }

  // Return public API
  /**
   * Reset store to initial state
   */
  function $reset() {
    books.value = []
    lastError.value = null
    booksLoading.value = false
    syncStatus.value = 'idle'
    lastSyncTime.value = null
    pendingIdMap.value = {}
  }

  return {
    // State
    books,
    lastError,
    booksLoading,
    syncStatus,
    lastSyncTime,
    isOnline,
    // Getters
    sortedBooks,
    inProgressBooks,
    completedBooks,
    // Actions
    loadBooks,
    loadDefaultBooks,
    saveToLocalStorage,
    addBook,
    updateBook,
    updateBookStatus,
    updateBookFields,
    deleteBook,
    findBookById,
    syncWithBackend,
    performMigration,
    $reset
  }
})
