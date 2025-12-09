import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import mockBooksData from '@/data/mockBooks.json'

const STORAGE_KEY = 'flexlib-books'

let idCounter = 0

export const useBooksStore = defineStore('books', () => {
  // State
  const books = ref([])
  const lastError = ref(null)

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

  // Actions (functions)
  // Load books from localStorage
  function loadBooks() {
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
      } else {
        // Load default mock books if localStorage is empty
        console.info('No saved books found, loading default books')
        loadDefaultBooks()
      }
      lastError.value = null
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
      console.warn('Falling back to empty book list due to load error')
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
          id: `${Date.now()}-${idCounter++}`,
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
        id: `${Date.now()}-${idCounter++}`,
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

  // Add a new book
  function addBook(name, year = null, month = null, author = null, coverLink = null, isUnfinished = false, score = null) {
    const book = {
      id: `${Date.now()}-${idCounter++}`,
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

    books.value.push(book)
    saveToLocalStorage()
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
    findBookById
  }
})
