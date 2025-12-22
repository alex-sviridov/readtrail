import { describe, it, expect } from 'vitest'
import { sortBooks } from '../bookSorting'

describe('bookSorting', () => {
  describe('sortBooks', () => {
    it('should return an empty array for empty input', () => {
      const result = sortBooks([])
      expect(result).toEqual([])
    })

    it('should return a new array (not mutate input)', () => {
      const books = [
        { id: '1', name: 'Book 1', year: 2024, month: 1, createdAt: new Date('2024-01-01') },
        { id: '2', name: 'Book 2', year: 2023, month: 12, createdAt: new Date('2023-12-01') }
      ]
      const original = [...books]

      const result = sortBooks(books)

      expect(result).not.toBe(books)
      expect(books).toEqual(original)
    })

    it('should sort in-progress books before completed books', () => {
      const books = [
        { id: '1', name: 'Completed', year: 2024, month: 12, createdAt: new Date('2024-01-01') },
        { id: '2', name: 'In Progress', year: null, month: null, createdAt: new Date('2024-01-15') },
        { id: '3', name: 'Another Completed', year: 2024, month: 11, createdAt: new Date('2024-01-10') }
      ]

      const result = sortBooks(books)

      expect(result[0].id).toBe('2') // In-progress first
      expect(result[1].id).toBe('1') // Then completed books
      expect(result[2].id).toBe('3')
    })

    it('should sort in-progress books by createdAt (newest first)', () => {
      const books = [
        { id: '1', name: 'Old', year: null, month: null, createdAt: new Date('2024-01-01T10:00:00Z') },
        { id: '2', name: 'Newest', year: null, month: null, createdAt: new Date('2024-01-15T10:00:00Z') },
        { id: '3', name: 'Middle', year: null, month: null, createdAt: new Date('2024-01-10T10:00:00Z') }
      ]

      const result = sortBooks(books)

      expect(result[0].id).toBe('2') // Newest
      expect(result[1].id).toBe('3') // Middle
      expect(result[2].id).toBe('1') // Oldest
    })

    it('should sort completed books by year (newest first)', () => {
      const books = [
        { id: '1', name: 'Book 2022', year: 2022, month: 6, createdAt: new Date('2024-01-01') },
        { id: '2', name: 'Book 2024', year: 2024, month: 3, createdAt: new Date('2024-01-01') },
        { id: '3', name: 'Book 2023', year: 2023, month: 9, createdAt: new Date('2024-01-01') }
      ]

      const result = sortBooks(books)

      expect(result[0].year).toBe(2024)
      expect(result[1].year).toBe(2023)
      expect(result[2].year).toBe(2022)
    })

    it('should sort completed books by month within same year (newest first)', () => {
      const books = [
        { id: '1', name: 'March', year: 2024, month: 3, createdAt: new Date('2024-01-01') },
        { id: '2', name: 'December', year: 2024, month: 12, createdAt: new Date('2024-01-01') },
        { id: '3', name: 'January', year: 2024, month: 1, createdAt: new Date('2024-01-01') },
        { id: '4', name: 'July', year: 2024, month: 7, createdAt: new Date('2024-01-01') }
      ]

      const result = sortBooks(books)

      expect(result[0].month).toBe(12) // December
      expect(result[1].month).toBe(7)  // July
      expect(result[2].month).toBe(3)  // March
      expect(result[3].month).toBe(1)  // January
    })

    it('should handle mixed in-progress and completed books', () => {
      const books = [
        { id: '1', name: 'Completed Old', year: 2022, month: 5, createdAt: new Date('2024-01-01') },
        { id: '2', name: 'In Progress New', year: null, month: null, createdAt: new Date('2024-01-20') },
        { id: '3', name: 'Completed Recent', year: 2024, month: 12, createdAt: new Date('2024-01-05') },
        { id: '4', name: 'In Progress Old', year: null, month: null, createdAt: new Date('2024-01-10') }
      ]

      const result = sortBooks(books)

      // In-progress books first (sorted by createdAt newest first)
      expect(result[0].id).toBe('2') // In Progress New
      expect(result[1].id).toBe('4') // In Progress Old
      // Then completed books (sorted by year/month newest first)
      expect(result[2].id).toBe('3') // Completed Recent
      expect(result[3].id).toBe('1') // Completed Old
    })

    it('should handle books with only year null (month present)', () => {
      const books = [
        { id: '1', name: 'Year null', year: null, month: 5, createdAt: new Date('2024-01-10') },
        { id: '2', name: 'Both null', year: null, month: null, createdAt: new Date('2024-01-15') },
        { id: '3', name: 'Both present', year: 2024, month: 3, createdAt: new Date('2024-01-01') }
      ]

      const result = sortBooks(books)

      // Books with null year should be treated as in-progress
      expect(result[0].id).toBe('2') // Both null, newest createdAt
      expect(result[1].id).toBe('1') // Year null
      expect(result[2].id).toBe('3') // Both present
    })

    it('should handle books with only month null (year present)', () => {
      const books = [
        { id: '1', name: 'Month null', year: 2024, month: null, createdAt: new Date('2024-01-10') },
        { id: '2', name: 'Both present', year: 2024, month: 6, createdAt: new Date('2024-01-01') },
        { id: '3', name: 'Both null', year: null, month: null, createdAt: new Date('2024-01-15') }
      ]

      const result = sortBooks(books)

      // Books with null month should be treated as in-progress
      expect(result[0].id).toBe('3') // Both null, newest createdAt
      expect(result[1].id).toBe('1') // Month null
      expect(result[2].id).toBe('2') // Both present
    })

    it('should handle createdAt as Date objects', () => {
      const books = [
        { id: '1', name: 'Old', year: null, month: null, createdAt: new Date('2024-01-01T00:00:00Z') },
        { id: '2', name: 'New', year: null, month: null, createdAt: new Date('2024-01-31T23:59:59Z') }
      ]

      const result = sortBooks(books)

      expect(result[0].id).toBe('2')
      expect(result[1].id).toBe('1')
    })

    it('should handle createdAt as ISO strings', () => {
      const books = [
        { id: '1', name: 'Old', year: null, month: null, createdAt: '2024-01-01T00:00:00Z' },
        { id: '2', name: 'New', year: null, month: null, createdAt: '2024-01-31T23:59:59Z' }
      ]

      const result = sortBooks(books)

      expect(result[0].id).toBe('2')
      expect(result[1].id).toBe('1')
    })

    it('should handle single book', () => {
      const books = [
        { id: '1', name: 'Only Book', year: 2024, month: 6, createdAt: new Date('2024-01-01') }
      ]

      const result = sortBooks(books)

      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('1')
    })

    it('should handle books with same year and month', () => {
      const books = [
        { id: '1', name: 'Book A', year: 2024, month: 6, createdAt: new Date('2024-01-01') },
        { id: '2', name: 'Book B', year: 2024, month: 6, createdAt: new Date('2024-01-02') },
        { id: '3', name: 'Book C', year: 2024, month: 6, createdAt: new Date('2024-01-03') }
      ]

      const result = sortBooks(books)

      // All have same year/month, so order doesn't change (stable sort)
      expect(result).toHaveLength(3)
      result.forEach(book => {
        expect(book.year).toBe(2024)
        expect(book.month).toBe(6)
      })
    })

    it('should handle books with same createdAt for in-progress', () => {
      const sameDate = new Date('2024-01-15T10:00:00Z')
      const books = [
        { id: '1', name: 'Book A', year: null, month: null, createdAt: sameDate },
        { id: '2', name: 'Book B', year: null, month: null, createdAt: sameDate },
        { id: '3', name: 'Book C', year: null, month: null, createdAt: sameDate }
      ]

      const result = sortBooks(books)

      // All have same createdAt, so order doesn't change (stable sort)
      expect(result).toHaveLength(3)
      result.forEach(book => {
        expect(book.year).toBeNull()
        expect(book.month).toBeNull()
      })
    })

    it('should handle complex real-world scenario', () => {
      const books = [
        { id: '1', name: 'Currently Reading 1', year: null, month: null, createdAt: new Date('2024-12-20') },
        { id: '2', name: 'Read Last Year', year: 2023, month: 12, createdAt: new Date('2023-12-01') },
        { id: '3', name: 'Currently Reading 2', year: null, month: null, createdAt: new Date('2024-12-15') },
        { id: '4', name: 'Read This Month', year: 2024, month: 12, createdAt: new Date('2024-12-01') },
        { id: '5', name: 'Read Earlier This Year', year: 2024, month: 6, createdAt: new Date('2024-06-01') },
        { id: '6', name: 'Currently Reading 3', year: null, month: null, createdAt: new Date('2024-12-22') }
      ]

      const result = sortBooks(books)

      // In-progress books first (newest first)
      expect(result[0].id).toBe('6') // Dec 22
      expect(result[1].id).toBe('1') // Dec 20
      expect(result[2].id).toBe('3') // Dec 15
      // Completed books (newest first)
      expect(result[3].id).toBe('4') // 2024-12
      expect(result[4].id).toBe('5') // 2024-06
      expect(result[5].id).toBe('2') // 2023-12
    })

    it('should handle special year values (sentinel years)', () => {
      const books = [
        { id: '1', name: 'Long Ago', year: 1900, month: 1, createdAt: new Date('2024-01-01') },
        { id: '2', name: 'Lately', year: 1910, month: 1, createdAt: new Date('2024-01-02') },
        { id: '3', name: 'Recent', year: 2024, month: 6, createdAt: new Date('2024-01-03') }
      ]

      const result = sortBooks(books)

      // Sorted by year descending
      expect(result[0].year).toBe(2024)
      expect(result[1].year).toBe(1910)
      expect(result[2].year).toBe(1900)
    })

    it('should handle year 0 and negative years', () => {
      const books = [
        { id: '1', name: 'Year 0', year: 0, month: 1, createdAt: new Date('2024-01-01') },
        { id: '2', name: 'Negative Year', year: -100, month: 1, createdAt: new Date('2024-01-02') },
        { id: '3', name: 'Positive Year', year: 2024, month: 1, createdAt: new Date('2024-01-03') }
      ]

      const result = sortBooks(books)

      expect(result[0].year).toBe(2024)
      expect(result[1].year).toBe(0)
      expect(result[2].year).toBe(-100)
    })

    it('should handle edge case months (1 and 12)', () => {
      const books = [
        { id: '1', name: 'January', year: 2024, month: 1, createdAt: new Date('2024-01-01') },
        { id: '2', name: 'December', year: 2024, month: 12, createdAt: new Date('2024-01-01') },
        { id: '3', name: 'June', year: 2024, month: 6, createdAt: new Date('2024-01-01') }
      ]

      const result = sortBooks(books)

      expect(result[0].month).toBe(12)
      expect(result[1].month).toBe(6)
      expect(result[2].month).toBe(1)
    })

    it('should preserve extra book properties', () => {
      const books = [
        {
          id: '1',
          name: 'Book',
          author: 'Author',
          coverLink: 'link',
          year: 2024,
          month: 6,
          createdAt: new Date('2024-01-01'),
          attributes: { isUnfinished: false, customCover: false, score: 1 }
        }
      ]

      const result = sortBooks(books)

      expect(result[0]).toEqual(books[0])
      expect(result[0].author).toBe('Author')
      expect(result[0].coverLink).toBe('link')
      expect(result[0].attributes).toEqual({ isUnfinished: false, customCover: false, score: 1 })
    })
  })
})
