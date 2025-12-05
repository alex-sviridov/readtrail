import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useBooksStore } from '../books'

describe('useBooksStore', () => {
  let store

  beforeEach(() => {
    // Create a fresh pinia instance for each test
    setActivePinia(createPinia())
    store = useBooksStore()

    // Clear localStorage before each test
    localStorage.clear()
  })

  afterEach(() => {
    // Clean up
    localStorage.clear()
  })

  describe('initial state', () => {
    it('should initialize with empty books array', () => {
      expect(store.books).toEqual([])
    })

    it('should have sortedBooks getter return empty array', () => {
      expect(store.sortedBooks).toEqual([])
    })
  })

  describe('addBook', () => {
    it('should add an in-progress book (no year/month)', () => {
      const book = store.addBook('The Great Gatsby')

      expect(store.books).toHaveLength(1)
      expect(book.name).toBe('The Great Gatsby')
      expect(book.year).toBeNull()
      expect(book.month).toBeNull()
      expect(book.createdAt).toBeInstanceOf(Date)
      expect(book.id).toBeDefined()
    })

    it('should add a completed book with year and month', () => {
      const book = store.addBook('1984', 2024, 3) // March 2024

      expect(store.books).toHaveLength(1)
      expect(book.name).toBe('1984')
      expect(book.year).toBe(2024)
      expect(book.month).toBe(3)
    })

    it('should generate unique IDs for multiple books', () => {
      const book1 = store.addBook('Book 1')
      const book2 = store.addBook('Book 2')

      expect(book1.id).not.toBe(book2.id)
    })

    it('should save to localStorage after adding', () => {
      store.addBook('Test Book')

      const stored = localStorage.getItem('flexlib-books')
      expect(stored).toBeDefined()
      const parsed = JSON.parse(stored)
      expect(parsed).toHaveLength(1)
      expect(parsed[0].name).toBe('Test Book')
    })

    it('should handle null year/month as in-progress', () => {
      const book = store.addBook('Test Book', null, null)

      expect(book.year).toBeNull()
      expect(book.month).toBeNull()
    })

    it('should add book with only year', () => {
      const book = store.addBook('Test Book', 2024)

      expect(book.year).toBe(2024)
      expect(book.month).toBeNull()
    })
  })

  describe('updateBook', () => {
    it('should update book name only', () => {
      const book = store.addBook('Original Name')
      store.updateBook(book.id, 'Updated Name')

      expect(store.books[0].name).toBe('Updated Name')
      expect(store.books[0].year).toBeNull()
      expect(store.books[0].month).toBeNull()
    })

    it('should update book name and add year/month', () => {
      const book = store.addBook('Test Book')
      store.updateBook(book.id, 'Updated Book', 2024, 6)

      expect(store.books[0].name).toBe('Updated Book')
      expect(store.books[0].year).toBe(2024)
      expect(store.books[0].month).toBe(6)
    })

    it('should update year and month of completed book', () => {
      const book = store.addBook('Test Book', 2023, 1)
      store.updateBook(book.id, 'Test Book', 2024, 12)

      expect(store.books[0].year).toBe(2024)
      expect(store.books[0].month).toBe(12)
    })

    it('should remove year/month if set to null', () => {
      const book = store.addBook('Test Book', 2024, 3)
      store.updateBook(book.id, 'Test Book', null, null)

      expect(store.books[0].year).toBeNull()
      expect(store.books[0].month).toBeNull()
    })

    it('should not update if book ID not found', () => {
      store.addBook('Test Book')
      const originalLength = store.books.length

      store.updateBook('non-existent-id', 'Should Not Update')

      expect(store.books.length).toBe(originalLength)
      expect(store.books[0].name).toBe('Test Book')
    })

    it('should save to localStorage after updating', () => {
      const book = store.addBook('Original')
      store.updateBook(book.id, 'Updated')

      const stored = JSON.parse(localStorage.getItem('flexlib-books'))
      expect(stored[0].name).toBe('Updated')
    })
  })

  describe('deleteBook', () => {
    it('should delete a book by ID', () => {
      const book = store.addBook('To Delete')
      expect(store.books).toHaveLength(1)

      store.deleteBook(book.id)

      expect(store.books).toHaveLength(0)
    })

    it('should delete the correct book when multiple exist', () => {
      const book1 = store.addBook('Book 1')
      const book2 = store.addBook('Book 2')
      const book3 = store.addBook('Book 3')

      store.deleteBook(book2.id)

      expect(store.books).toHaveLength(2)
      expect(store.books.find(b => b.id === book1.id)).toBeDefined()
      expect(store.books.find(b => b.id === book3.id)).toBeDefined()
      expect(store.books.find(b => b.id === book2.id)).toBeUndefined()
    })

    it('should not error if book ID not found', () => {
      store.addBook('Test Book')

      expect(() => {
        store.deleteBook('non-existent-id')
      }).not.toThrow()

      expect(store.books).toHaveLength(1)
    })

    it('should save to localStorage after deleting', () => {
      const book1 = store.addBook('Book 1')
      store.addBook('Book 2')

      store.deleteBook(book1.id)

      const stored = JSON.parse(localStorage.getItem('flexlib-books'))
      expect(stored).toHaveLength(1)
      expect(stored[0].name).toBe('Book 2')
    })
  })

  describe('sortedBooks getter', () => {
    it('should place in-progress books before completed books', () => {
      store.addBook('Completed 1', 2024, 1)
      store.addBook('In Progress')
      store.addBook('Completed 2', 2024, 3)

      const sorted = store.sortedBooks

      expect(sorted[0].name).toBe('In Progress')
    })

    it('should sort completed books by year and month (newest first)', () => {
      store.addBook('January 2024', 2024, 1)
      store.addBook('March 2024', 2024, 3)
      store.addBook('February 2024', 2024, 2)

      const sorted = store.sortedBooks

      expect(sorted[0].name).toBe('March 2024')
      expect(sorted[1].name).toBe('February 2024')
      expect(sorted[2].name).toBe('January 2024')
    })

    it('should sort books across different years correctly', () => {
      store.addBook('January 2023', 2023, 1)
      store.addBook('December 2024', 2024, 12)
      store.addBook('June 2024', 2024, 6)

      const sorted = store.sortedBooks

      expect(sorted[0].name).toBe('December 2024')
      expect(sorted[1].name).toBe('June 2024')
      expect(sorted[2].name).toBe('January 2023')
    })

    it('should sort in-progress books by createdAt (newest first)', () => {
      // Use vi.useFakeTimers to control time
      vi.useFakeTimers()

      vi.setSystemTime(new Date('2024-01-01'))
      store.addBook('First In Progress')

      vi.setSystemTime(new Date('2024-01-03'))
      store.addBook('Third In Progress')

      vi.setSystemTime(new Date('2024-01-02'))
      store.addBook('Second In Progress')

      const sorted = store.sortedBooks

      expect(sorted[0].name).toBe('Third In Progress')
      expect(sorted[1].name).toBe('Second In Progress')
      expect(sorted[2].name).toBe('First In Progress')

      vi.useRealTimers()
    })

    it('should handle mixed in-progress and completed books correctly', () => {
      vi.useFakeTimers()

      vi.setSystemTime(new Date('2024-01-01'))
      store.addBook('Old In Progress')

      vi.setSystemTime(new Date('2024-01-02'))
      store.addBook('Completed Dec 2023', 2023, 12)

      vi.setSystemTime(new Date('2024-01-03'))
      store.addBook('New In Progress')

      vi.setSystemTime(new Date('2024-01-04'))
      store.addBook('Completed Jan 2024', 2024, 1)

      const sorted = store.sortedBooks

      // In-progress books first (newest first)
      expect(sorted[0].name).toBe('New In Progress')
      expect(sorted[1].name).toBe('Old In Progress')
      // Then completed books (newest first)
      expect(sorted[2].name).toBe('Completed Jan 2024')
      expect(sorted[3].name).toBe('Completed Dec 2023')

      vi.useRealTimers()
    })

    it('should not mutate original books array', () => {
      store.addBook('Book A', 2024, 2)
      store.addBook('Book B', 2024, 1)

      const sorted = store.sortedBooks
      sorted[0].name = 'Modified'

      expect(store.books[0].name).not.toBe('Modified')
    })
  })

  describe('localStorage persistence', () => {
    it('should load books from localStorage on initialization', () => {
      // Manually set localStorage data
      const testBooks = [
        {
          id: '1',
          name: 'Stored Book 1',
          year: 2024,
          month: 3,
          createdAt: new Date(2024, 0, 1).toISOString()
        },
        {
          id: '2',
          name: 'Stored Book 2',
          year: null,
          month: null,
          createdAt: new Date(2024, 0, 2).toISOString()
        }
      ]
      localStorage.setItem('flexlib-books', JSON.stringify(testBooks))

      // Create a new store instance which should load from localStorage
      const newStore = useBooksStore()
      newStore.loadBooks()

      expect(newStore.books).toHaveLength(2)
      expect(newStore.books[0].name).toBe('Stored Book 1')
      expect(newStore.books[0].year).toBe(2024)
      expect(newStore.books[0].month).toBe(3)
      expect(newStore.books[1].name).toBe('Stored Book 2')
      expect(newStore.books[1].year).toBeNull()
      expect(newStore.books[1].month).toBeNull()
      expect(newStore.books[1].createdAt).toBeInstanceOf(Date)
    })

    it('should load default books when localStorage is empty', () => {
      store.loadBooks()

      expect(store.books.length).toBeGreaterThan(0)
      expect(store.books.some(b => b.name === 'The Great Gatsby')).toBe(true)
      expect(store.books.some(b => b.name === '1984')).toBe(true)
    })

    it('should handle corrupted localStorage data gracefully', () => {
      localStorage.setItem('flexlib-books', 'invalid json{')
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      store.loadBooks()

      expect(store.books).toEqual([])
      expect(consoleSpy).toHaveBeenCalled()

      consoleSpy.mockRestore()
    })

    it('should serialize createdAt to ISO strings when saving', () => {
      store.addBook('Test Book', 2024, 5)

      const stored = localStorage.getItem('flexlib-books')
      const parsed = JSON.parse(stored)

      expect(typeof parsed[0].createdAt).toBe('string')
      expect(parsed[0].createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
      expect(parsed[0].year).toBe(2024)
      expect(parsed[0].month).toBe(5)
    })

    it('should parse ISO strings back to Date objects when loading', () => {
      const isoDate = new Date(2024, 4, 1).toISOString()
      const testBook = {
        id: '1',
        name: 'Test Book',
        year: 2024,
        month: 5,
        createdAt: isoDate
      }
      localStorage.setItem('flexlib-books', JSON.stringify([testBook]))

      store.loadBooks()

      expect(store.books[0].createdAt).toBeInstanceOf(Date)
      expect(store.books[0].year).toBe(2024)
      expect(store.books[0].month).toBe(5)
    })

    it('should handle localStorage errors gracefully when saving', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      // Mock localStorage.setItem to throw an error
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('QuotaExceededError')
      })

      expect(() => {
        store.addBook('Test Book')
      }).not.toThrow()

      expect(consoleSpy).toHaveBeenCalled()

      consoleSpy.mockRestore()
      vi.restoreAllMocks()
    })
  })

  describe('edge cases', () => {
    it('should handle multiple rapid additions', () => {
      for (let i = 0; i < 100; i++) {
        store.addBook(`Book ${i}`)
      }

      expect(store.books).toHaveLength(100)
    })

    it('should handle book names with special characters', () => {
      const specialName = 'Book with "quotes" & <special> characters!'
      const book = store.addBook(specialName)

      expect(book.name).toBe(specialName)

      store.loadBooks()
      expect(store.books[0].name).toBe(specialName)
    })

    it('should handle very long book names', () => {
      const longName = 'A'.repeat(1000)
      const book = store.addBook(longName)

      expect(book.name).toBe(longName)
    })

    it('should handle months at year boundaries', () => {
      const book1 = store.addBook('Book 1', 2024, 1) // January
      const book2 = store.addBook('Book 2', 2024, 12) // December

      expect(book1.month).toBe(1)
      expect(book2.month).toBe(12)
    })

    it('should preserve book order when updating', () => {
      const book1 = store.addBook('Book 1')
      const book2 = store.addBook('Book 2')
      const book3 = store.addBook('Book 3')

      store.updateBook(book2.id, 'Updated Book 2')

      expect(store.books[0].id).toBe(book1.id)
      expect(store.books[1].id).toBe(book2.id)
      expect(store.books[2].id).toBe(book3.id)
    })
  })
})
