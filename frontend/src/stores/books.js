import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import mockBooksData from '@/data/mockBooks.json'
import { booksApi } from '@/services/booksApi'
import { syncQueue, OPERATION_TYPES } from '@/services/syncQueue'
import { useOnlineStatus, setApiAvailability } from '@/composables/useOnlineStatus'
import { apiClient } from '@/services/api'
import { authManager } from '@/services/auth'

const STORAGE_KEY = 'flexlib-books'
const MIGRATION_FLAG_KEY = 'flexlib-needs-migration'

let idCounter = 0

export const useBooksStore = defineStore('books', () => {
  // State
  const books = ref([])
  const lastError = ref(null)
  const syncStatus = ref('idle') // 'idle' | 'syncing' | 'error'
  const lastSyncTime = ref(null)
  const pendingIdMap = ref({}) // Map temp IDs to backend IDs
  const { isOnline } = useOnlineStatus(handleOnlineStatusChange)

  // Getters (computed)
  // Sort books: in-progress first, then by year and month (descending)
  const sortedBooks = computed(() => {
    return [...books.value].sort((a, b) => {
      // In-progress books (no year/month) come first
      const aCompleted = a.year !== null && a.month !== null
      const bCompleted = b.year !== null && b.month !== null

      if (!aCompleted && bCompleted) return -1
      if (aCompleted && !bCompleted) return 1

      // Both in-progress - sort by createdAt (newest first)
      if (!aCompleted && !bCompleted) {
        return new Date(b.createdAt) - new Date(a.createdAt)
      }

      // Both completed - sort by year and month (newest first)
      if (a.year !== b.year) {
        return b.year - a.year
      }
      return b.month - a.month
    })
  })

  const booksCount = computed(() => books.value.length)

  const inProgressBooks = computed(() =>
    books.value.filter(book => !book.year && !book.month)
  )

  const completedBooks = computed(() =>
    books.value.filter(book => book.year && book.month)
  )

  const pendingOperations = computed(() => syncQueue.getPendingCount())

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
    if (book) {
      book.id = backendId
      pendingIdMap.value[tempId] = backendId
      saveToLocalStorage()
    }
  }

  /**
   * Handle online status changes
   */
  async function handleOnlineStatusChange(online) {
    if (online && syncQueue.getPendingCount() > 0) {
      console.info('Connection restored, processing sync queue')
      await syncWithBackend()
    }
  }

  /**
   * Load books from backend or localStorage
   */
  async function loadBooks() {
    // Set up auth header provider for API client
    apiClient.setAuthHeaderProvider(() => authManager.getAuthHeaders())

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
            console.info(`Loaded ${books.value.length} books from backend`)
          } else {
            // Backend has no data, check localStorage for migration
            const hasLocalData = await loadFromLocalStorage()

            if (hasLocalData) {
              // Mark for migration
              localStorage.setItem(MIGRATION_FLAG_KEY, 'true')
              console.info('Loaded books from localStorage, marked for migration')
            } else {
              // No data anywhere, load defaults
              loadDefaultBooks()
            }
          }

          lastError.value = null
        } catch (error) {
          // Backend error, mark API as unavailable
          setApiAvailability(false)
          console.warn('Failed to load from backend, using localStorage:', error)
          await loadFromLocalStorage() || loadDefaultBooks()
        }
      } else {
        // Offline, load from localStorage
        await loadFromLocalStorage() || loadDefaultBooks()
      }

      // Check if we need to migrate
      if (localStorage.getItem(MIGRATION_FLAG_KEY) === 'true') {
        await migrateLocalDataToBackend()
      }
    } catch (error) {
      console.error('Failed to load books:', error)
      lastError.value = 'Failed to load books'
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
        books.value = parsed.map(book => {
          // Migrate old isUnfinished property to attributes hash
          const attributes = book.attributes || {}
          if (book.isUnfinished !== undefined && attributes.isUnfinished === undefined) {
            attributes.isUnfinished = book.isUnfinished
          }
          if (attributes.isUnfinished === undefined) {
            attributes.isUnfinished = false
          }
          if (attributes.customCover === undefined) {
            attributes.customCover = false
          }
          if (attributes.score === undefined) {
            attributes.score = null
          }

          return {
            ...book,
            attributes,
            createdAt: new Date(book.createdAt)
          }
        })
        console.info(`Loaded ${books.value.length} books from localStorage`)
        return true
      }
      return false
    } catch (error) {
      let errorMessage = 'Failed to load books from localStorage'

      if (error instanceof SyntaxError) {
        errorMessage = 'Corrupted data in localStorage. Unable to load books.'
        console.error(errorMessage, error)
      } else if (error.name === 'SecurityError') {
        errorMessage = 'localStorage access denied. Check browser privacy settings.'
        console.error(errorMessage, error)
      } else {
        console.error(errorMessage, error)
      }

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
          year: null,
          month: null,
          attributes: {
            isUnfinished: false,
            customCover: false,
            score: null
          },
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
        year,
        month,
        attributes: {
          isUnfinished: false,
          score: null
        },
        createdAt: new Date(year, month - 1, 15 - index * 5)
      }
    })

    books.value = mockBooks
    saveToLocalStorage()
  }

  // Save books to localStorage
  function saveToLocalStorage() {
    try {
      const serialized = books.value.map(book => ({
        ...book,
        createdAt: book.createdAt.toISOString()
      }))
      const data = JSON.stringify(serialized)
      localStorage.setItem(STORAGE_KEY, data)
      lastError.value = null
    } catch (error) {
      let errorMessage = 'Failed to save books to localStorage'

      if (error.name === 'QuotaExceededError') {
        const sizeKB = Math.round(JSON.stringify(books.value).length / 1024)
        errorMessage = `Storage quota exceeded. Unable to save ${books.value.length} books (~${sizeKB}KB).`
        console.error(errorMessage, error)
        console.warn('Consider deleting old books or clearing browser data')
      } else if (error.name === 'SecurityError') {
        errorMessage = 'localStorage access denied. Check browser privacy settings.'
        console.error(errorMessage, error)
      } else {
        console.error(errorMessage, error)
      }

      lastError.value = errorMessage
    }
  }

  /**
   * Migrate localStorage data to backend
   */
  async function migrateLocalDataToBackend() {
    if (!isOnline.value) {
      console.debug('Offline, skipping migration')
      return
    }

    try {
      console.info('Migrating localStorage books to backend')
      syncStatus.value = 'syncing'

      // Filter out any temp IDs and create books on backend
      const booksToMigrate = books.value.filter(book => !isTempId(book.id))

      if (booksToMigrate.length === 0) {
        // All books have temp IDs, need to create them
        const booksData = books.value.map(book => ({
          name: book.name,
          author: book.author,
          coverLink: book.coverLink,
          year: book.year,
          month: book.month,
          attributes: book.attributes
        }))

        const createdBooks = await booksApi.batchCreateBooks(booksData)

        // Replace temp IDs with backend IDs
        books.value.forEach((book, index) => {
          if (createdBooks[index]) {
            replaceTempId(book.id, createdBooks[index].id)
          }
        })
      }

      localStorage.removeItem(MIGRATION_FLAG_KEY)
      syncStatus.value = 'idle'
      lastSyncTime.value = new Date()
      console.info('Migration completed successfully')
    } catch (error) {
      console.error('Migration failed:', error)
      syncStatus.value = 'error'
      lastError.value = 'Failed to migrate data to backend'
    }
  }

  /**
   * Sync with backend
   */
  async function syncWithBackend() {
    if (!isOnline.value) {
      console.debug('Offline, skipping sync')
      return
    }

    if (syncQueue.isQueueProcessing()) {
      console.debug('Sync already in progress')
      return
    }

    try {
      syncStatus.value = 'syncing'

      // Define API handlers for sync queue
      const apiHandlers = {
        'books_CREATE': async (operation) => {
          const createdBook = await booksApi.createBook(operation.data)
          replaceTempId(operation.tempId, createdBook.id)
          return createdBook
        },
        'books_UPDATE': async (operation) => {
          return await booksApi.updateBook(operation.data.id, operation.data)
        },
        'books_DELETE': async (operation) => {
          return await booksApi.deleteBook(operation.data.id)
        },
        'books_BATCH_CREATE': async (operation) => {
          return await booksApi.batchCreateBooks(operation.data.books)
        }
      }

      // Process queue
      const results = await syncQueue.processQueue(apiHandlers, (operationId, status, result) => {
        console.debug(`Operation ${operationId}: ${status}`, result)
      })

      // Sync succeeded, mark API as available
      setApiAvailability(true)

      syncStatus.value = 'idle'
      lastSyncTime.value = new Date()

      console.info(`Sync completed: ${results.successful.length} successful, ${results.failed.length} failed`)

      if (results.failed.length > 0) {
        lastError.value = `Sync completed with ${results.failed.length} errors`
      }
    } catch (error) {
      // Sync failed, mark API as unavailable
      setApiAvailability(false)
      console.error('Sync failed:', error)
      syncStatus.value = 'error'
      lastError.value = 'Sync failed'
    }
  }

  // Add a new book
  function addBook(name, year = null, month = null, author = null, coverLink = null, isUnfinished = false, score = null) {
    const tempId = generateTempId()
    const book = {
      id: tempId,
      name,
      author,
      coverLink,
      year,
      month,
      attributes: {
        isUnfinished,
        score: score ?? null
      },
      createdAt: new Date()
    }

    // Optimistically add to local state
    books.value.push(book)
    saveToLocalStorage()

    // Queue for sync if online
    if (isOnline.value) {
      syncQueue.enqueue(OPERATION_TYPES.CREATE, 'books', {
        name,
        author,
        coverLink,
        year,
        month,
        attributes: {
          isUnfinished,
          score: score ?? null
        }
      }, tempId)

      // Try to sync immediately
      syncWithBackend()
    }

    return book
  }

  // Update an existing book
  function updateBook(id, name, year = null, month = null, author = null, coverLink = null) {
    const book = books.value.find(b => b.id === id)
    if (book) {
      book.name = name
      book.author = author
      book.coverLink = coverLink
      book.year = year
      book.month = month
      saveToLocalStorage()

      // Queue for sync if not a temp ID and online
      if (!isTempId(id) && isOnline.value) {
        syncQueue.enqueue(OPERATION_TYPES.UPDATE, 'books', {
          id,
          name,
          author,
          coverLink,
          year,
          month,
          attributes: book.attributes
        })

        syncWithBackend()
      }

      return true
    }
    return false
  }

  // Update book status (year and month only)
  function updateBookStatus(id, year = null, month = null, isUnfinished = false, score = null) {
    const book = books.value.find(b => b.id === id)
    if (book) {
      book.year = year
      book.month = month
      if (!book.attributes) {
        book.attributes = {}
      }
      book.attributes.isUnfinished = isUnfinished

      // Handle score update
      if (score !== null) {
        book.attributes.score = score
      }

      // Clear score when setting to in-progress
      if (year === null && month === null) {
        book.attributes.score = 0
      }

      saveToLocalStorage()

      // Queue for sync if not a temp ID and online
      if (!isTempId(id) && isOnline.value) {
        syncQueue.enqueue(OPERATION_TYPES.UPDATE, 'books', {
          id,
          name: book.name,
          author: book.author,
          coverLink: book.coverLink,
          year,
          month,
          attributes: book.attributes
        })

        syncWithBackend()
      }

      return true
    }
    return false
  }

  // Update book title
  function updateBookTitle(id, title = null) {
    const book = books.value.find(b => b.id === id)
    if (book && title) {
      book.name = title
      saveToLocalStorage()

      // Queue for sync
      if (!isTempId(id) && isOnline.value) {
        syncQueue.enqueue(OPERATION_TYPES.UPDATE, 'books', {
          id,
          name: title,
          author: book.author,
          coverLink: book.coverLink,
          year: book.year,
          month: book.month,
          attributes: book.attributes
        })

        syncWithBackend()
      }

      return true
    }
    return false
  }

  // Update book author
  function updateBookAuthor(id, author = null) {
    const book = books.value.find(b => b.id === id)
    if (book && author) {
      book.author = author
      saveToLocalStorage()

      // Queue for sync
      if (!isTempId(id) && isOnline.value) {
        syncQueue.enqueue(OPERATION_TYPES.UPDATE, 'books', {
          id,
          name: book.name,
          author,
          coverLink: book.coverLink,
          year: book.year,
          month: book.month,
          attributes: book.attributes
        })

        syncWithBackend()
      }

      return true
    }
    return false
  }

  // Update book cover
  function updateBookCover(id, coverLink = null, customCover = null) {
    const book = books.value.find(b => b.id === id)
    if (book) {
      book.coverLink = coverLink
      if (customCover !== null) {
        if (!book.attributes) {
          book.attributes = {}
        }
        book.attributes.customCover = customCover
      }
      saveToLocalStorage()

      // Queue for sync
      if (!isTempId(id) && isOnline.value) {
        syncQueue.enqueue(OPERATION_TYPES.UPDATE, 'books', {
          id,
          name: book.name,
          author: book.author,
          coverLink,
          year: book.year,
          month: book.month,
          attributes: book.attributes
        })

        syncWithBackend()
      }

      return true
    }
    return false
  }

  // Update book score
  function updateBookScore(id, score = null) {
    const book = books.value.find(b => b.id === id)
    if (book) {
      if (!book.attributes) {
        book.attributes = {}
      }
      book.attributes.score = score
      saveToLocalStorage()

      // Queue for sync
      if (!isTempId(id) && isOnline.value) {
        syncQueue.enqueue(OPERATION_TYPES.UPDATE, 'books', {
          id,
          name: book.name,
          author: book.author,
          coverLink: book.coverLink,
          year: book.year,
          month: book.month,
          attributes: book.attributes
        })

        syncWithBackend()
      }

      return true
    }
    return false
  }

  // Delete a book
  function deleteBook(id) {
    const index = books.value.findIndex(b => b.id === id)
    if (index !== -1) {
      books.value.splice(index, 1)
      saveToLocalStorage()

      // Queue for sync if not a temp ID
      if (!isTempId(id) && isOnline.value) {
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
  return {
    // State
    books,
    lastError,
    syncStatus,
    lastSyncTime,
    pendingOperations,
    isOnline,
    // Getters
    sortedBooks,
    booksCount,
    inProgressBooks,
    completedBooks,
    // Actions
    loadBooks,
    loadDefaultBooks,
    saveToLocalStorage,
    addBook,
    updateBook,
    updateBookStatus,
    updateBookTitle,
    updateBookAuthor,
    updateBookCover,
    updateBookScore,
    deleteBook,
    findBookById,
    syncWithBackend,
    migrateLocalDataToBackend
  }
})
