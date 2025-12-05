import { defineStore } from 'pinia'
import mockBooksData from '@/data/mockBooks.json'

const STORAGE_KEY = 'flexlib-books'

let idCounter = 0

export const useBooksStore = defineStore('books', {
  state: () => ({
    books: []
  }),

  getters: {
    // Sort books: in-progress first, then by year and month (descending)
    sortedBooks: (state) => {
      return [...state.books].sort((a, b) => {
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
      }).map(book => ({
        // Return a shallow copy to prevent mutations
        ...book
      }))
    }
  },

  actions: {
    // Load books from localStorage
    loadBooks() {
      try {
        const stored = localStorage.getItem(STORAGE_KEY)
        if (stored) {
          const parsed = JSON.parse(stored)
          this.books = parsed.map(book => ({
            ...book,
            createdAt: new Date(book.createdAt)
          }))
        } else {
          // Load default mock books if localStorage is empty
          this.loadDefaultBooks()
        }
      } catch (error) {
        console.error('Error loading books from localStorage:', error)
        this.books = []
      }
    },

    // Load default mock books
    loadDefaultBooks() {
      const now = new Date()
      const currentYear = now.getFullYear()
      const currentMonth = now.getMonth() + 1

      const mockBooks = mockBooksData.map((bookTemplate, index) => {
        if (bookTemplate.inProgress) {
          return {
            id: `${Date.now()}-${idCounter++}`,
            name: bookTemplate.name,
            year: null,
            month: null,
            createdAt: new Date(currentYear, currentMonth - 1 - index, 1)
          }
        }

        const year = currentYear + (bookTemplate.yearOffset || 0)
        const month = bookTemplate.month || (currentMonth + (bookTemplate.monthOffset || 0))

        return {
          id: `${Date.now()}-${idCounter++}`,
          name: bookTemplate.name,
          year,
          month,
          createdAt: new Date(year, month - 1, 15 - index * 5)
        }
      })

      this.books = mockBooks
      this.saveToLocalStorage()
    },

    // Save books to localStorage
    saveToLocalStorage() {
      try {
        const serialized = this.books.map(book => ({
          ...book,
          createdAt: book.createdAt.toISOString()
        }))
        localStorage.setItem(STORAGE_KEY, JSON.stringify(serialized))
      } catch (error) {
        console.error('Error saving books to localStorage:', error)
      }
    },

    // Add a new book
    addBook(name, year = null, month = null) {
      const book = {
        id: `${Date.now()}-${idCounter++}`,
        name,
        year,
        month,
        createdAt: new Date()
      }

      this.books.push(book)
      this.saveToLocalStorage()
      return book
    },

    // Update an existing book
    updateBook(id, name, year = null, month = null) {
      const book = this.books.find(b => b.id === id)
      if (book) {
        book.name = name
        book.year = year
        book.month = month
        this.saveToLocalStorage()
      }
    },

    // Update book status (year and month only)
    updateBookStatus(id, year = null, month = null) {
      const book = this.books.find(b => b.id === id)
      if (book) {
        book.year = year
        book.month = month
        this.saveToLocalStorage()
        return true
      }
      return false
    },

    // Update book title
    updateBookTitle(id, title = null) {
      const book = this.books.find(b => b.id === id)
      if (book && title) {
        book.name = title
        this.saveToLocalStorage()
        return true
      }
      return false
    },

    // Delete a book
    deleteBook(id) {
      const index = this.books.findIndex(b => b.id === id)
      if (index !== -1) {
        this.books.splice(index, 1)
        this.saveToLocalStorage()
      }
    }
  }
})
