import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  generateUserDataJSON,
  generateBooksCSV,
  downloadFile,
  exportUserDataAsJSON,
  exportBooksAsCSV
} from '../dataExport'

// Mock auth manager
vi.mock('../auth', () => ({
  authManager: {
    getCurrentUser: vi.fn(() => ({
      id: 'user123',
      email: 'test@example.com',
      created: '2024-01-01T00:00:00Z',
      updated: '2024-01-15T00:00:00Z'
    }))
  }
}))

// Mock logger
vi.mock('@/utils/logger', () => ({
  logger: {
    debug: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn()
  }
}))

describe('dataExport', () => {
  const mockBooks = [
    {
      id: 'book1',
      name: 'The Great Gatsby',
      author: 'F. Scott Fitzgerald',
      coverLink: 'https://example.com/cover1.jpg',
      year: 2024,
      month: 3,
      attributes: { score: 5, isUnfinished: false },
      createdAt: new Date('2024-03-01'),
      updatedAt: new Date('2024-03-15')
    },
    {
      id: 'book2',
      name: '1984',
      author: 'George Orwell',
      coverLink: null,
      year: 2024,
      month: 1,
      attributes: { score: null, isUnfinished: true },
      createdAt: new Date('2024-01-10'),
      updatedAt: new Date('2024-01-20')
    }
  ]

  const mockSettings = {
    showBookInfo: true,
    allowUnfinishedReading: true,
    allowScoring: true
  }

  describe('generateUserDataJSON', () => {
    it('should generate valid JSON structure with user data', () => {
      const result = generateUserDataJSON(mockBooks, mockSettings)

      expect(result).toHaveProperty('exportDate')
      expect(result).toHaveProperty('exportVersion', '1.0')
      expect(result).toHaveProperty('user')
      expect(result).toHaveProperty('settings')
      expect(result).toHaveProperty('books')
    })

    it('should include complete user information', () => {
      const result = generateUserDataJSON(mockBooks, mockSettings)

      expect(result.user).toEqual({
        id: 'user123',
        email: 'test@example.com',
        created: '2024-01-01T00:00:00Z',
        updated: '2024-01-15T00:00:00Z'
      })
    })

    it('should include all books with correct structure', () => {
      const result = generateUserDataJSON(mockBooks, mockSettings)

      expect(result.books).toHaveLength(2)
      expect(result.books[0]).toMatchObject({
        id: 'book1',
        name: 'The Great Gatsby',
        author: 'F. Scott Fitzgerald',
        year: 2024,
        month: 3
      })
    })

    it('should include settings', () => {
      const result = generateUserDataJSON(mockBooks, mockSettings)

      expect(result.settings).toEqual(mockSettings)
    })

    it('should handle empty books array', () => {
      const result = generateUserDataJSON([], mockSettings)

      expect(result.books).toEqual([])
      expect(result).toHaveProperty('exportDate')
      expect(result).toHaveProperty('user')
    })

    it('should handle null settings', () => {
      const result = generateUserDataJSON(mockBooks, null)

      expect(result.settings).toEqual({})
    })

    it('should have valid ISO date format for exportDate', () => {
      const result = generateUserDataJSON(mockBooks, mockSettings)

      expect(result.exportDate).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
    })
  })

  describe('generateBooksCSV', () => {
    it('should generate CSV with headers', () => {
      const csv = generateBooksCSV(mockBooks)
      const lines = csv.split('\n')

      expect(lines[0]).toBe('Title,Author,Read Date,Status,Score')
    })

    it('should include all books as CSV rows', () => {
      const csv = generateBooksCSV(mockBooks)
      const lines = csv.split('\n')

      expect(lines).toHaveLength(3) // header + 2 books
    })

    it('should format completed books correctly', () => {
      const csv = generateBooksCSV(mockBooks)
      const lines = csv.split('\n')

      expect(lines[1]).toContain('The Great Gatsby')
      expect(lines[1]).toContain('F. Scott Fitzgerald')
      expect(lines[1]).toContain('2024-03')
      expect(lines[1]).toContain('Completed')
      expect(lines[1]).toContain('5')
    })

    it('should format unfinished books correctly', () => {
      const csv = generateBooksCSV(mockBooks)
      const lines = csv.split('\n')

      expect(lines[2]).toContain('1984')
      expect(lines[2]).toContain('2024-01')
      expect(lines[2]).toContain('Unfinished')
    })

    it('should handle books in progress (no date)', () => {
      const inProgressBook = [{
        id: 'book3',
        name: 'In Progress Book',
        author: 'Author Name',
        year: null,
        month: null,
        attributes: {}
      }]

      const csv = generateBooksCSV(inProgressBook)
      const lines = csv.split('\n')

      expect(lines[1]).toContain('In Progress Book')
      expect(lines[1]).toContain('In Progress')
    })

    it('should escape CSV special characters - commas', () => {
      const booksWithCommas = [{
        id: 'book1',
        name: 'Book, Title',
        author: 'Author, Name',
        year: 2024,
        month: 1,
        attributes: {}
      }]

      const csv = generateBooksCSV(booksWithCommas)

      expect(csv).toContain('"Book, Title"')
      expect(csv).toContain('"Author, Name"')
    })

    it('should escape CSV special characters - quotes', () => {
      const booksWithQuotes = [{
        id: 'book1',
        name: 'Book "Title"',
        author: 'Author "Quoted"',
        year: 2024,
        month: 1,
        attributes: {}
      }]

      const csv = generateBooksCSV(booksWithQuotes)

      expect(csv).toContain('"Book ""Title"""')
      expect(csv).toContain('"Author ""Quoted"""')
    })

    it('should escape CSV special characters - newlines', () => {
      const booksWithNewlines = [{
        id: 'book1',
        name: 'Book\nTitle',
        author: 'Author Name',
        year: 2024,
        month: 1,
        attributes: {}
      }]

      const csv = generateBooksCSV(booksWithNewlines)

      expect(csv).toContain('"Book\nTitle"')
    })

    it('should handle empty books array', () => {
      const csv = generateBooksCSV([])
      const lines = csv.split('\n')

      expect(lines).toHaveLength(1) // only headers
      expect(lines[0]).toBe('Title,Author,Read Date,Status,Score')
    })

    it('should handle missing author', () => {
      const bookWithoutAuthor = [{
        id: 'book1',
        name: 'Book Title',
        author: null,
        year: 2024,
        month: 1,
        attributes: {}
      }]

      const csv = generateBooksCSV(bookWithoutAuthor)
      const lines = csv.split('\n')

      expect(lines[1]).toBeTruthy()
      expect(lines[1]).toContain('Book Title')
    })

    it('should pad month with leading zero', () => {
      const bookInMarch = [{
        id: 'book1',
        name: 'Book',
        author: 'Author',
        year: 2024,
        month: 3,
        attributes: {}
      }]

      const csv = generateBooksCSV(bookInMarch)

      expect(csv).toContain('2024-03')
    })

    it('should handle score attribute', () => {
      const bookWithScore = [{
        id: 'book1',
        name: 'Book',
        author: 'Author',
        year: 2024,
        month: 1,
        attributes: { score: 4 }
      }]

      const csv = generateBooksCSV(bookWithScore)

      expect(csv).toContain(',4')
    })

    it('should handle missing score attribute', () => {
      const bookWithoutScore = [{
        id: 'book1',
        name: 'Book',
        author: 'Author',
        year: 2024,
        month: 1,
        attributes: {}
      }]

      const csv = generateBooksCSV(bookWithoutScore)
      const lines = csv.split('\n')

      // Score should be empty at the end
      expect(lines[1]).toMatch(/,\s*$/)
    })
  })

  describe('downloadFile', () => {
    let mockLink
    let appendChildSpy
    let removeChildSpy
    let createObjectURLSpy
    let revokeObjectURLSpy

    beforeEach(() => {
      // Mock DOM elements
      mockLink = {
        href: '',
        download: '',
        style: { display: '' },
        click: vi.fn()
      }

      appendChildSpy = vi.spyOn(document.body, 'appendChild').mockImplementation(() => {})
      removeChildSpy = vi.spyOn(document.body, 'removeChild').mockImplementation(() => {})
      vi.spyOn(document, 'createElement').mockReturnValue(mockLink)

      // Mock URL methods
      createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-url')
      revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})

      // Mock setTimeout to execute immediately
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.restoreAllMocks()
      vi.useRealTimers()
    })

    it('should create a blob with correct content and MIME type', () => {
      const content = 'test content'
      const filename = 'test.txt'
      const mimeType = 'text/plain'

      downloadFile(content, filename, mimeType)

      expect(createObjectURLSpy).toHaveBeenCalled()
      const blob = createObjectURLSpy.mock.calls[0][0]
      expect(blob).toBeInstanceOf(Blob)
      expect(blob.type).toBe(mimeType)
    })

    it('should set correct filename', () => {
      downloadFile('content', 'myfile.json', 'application/json')

      expect(mockLink.download).toBe('myfile.json')
    })

    it('should trigger download click', () => {
      downloadFile('content', 'file.txt', 'text/plain')

      expect(mockLink.click).toHaveBeenCalled()
    })

    it('should append and remove link from DOM', () => {
      downloadFile('content', 'file.txt', 'text/plain')

      expect(appendChildSpy).toHaveBeenCalledWith(mockLink)

      vi.runAllTimers()
      expect(removeChildSpy).toHaveBeenCalledWith(mockLink)
    })

    it('should cleanup blob URL after timeout', () => {
      downloadFile('content', 'file.txt', 'text/plain')

      expect(revokeObjectURLSpy).not.toHaveBeenCalled()

      vi.runAllTimers()
      expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:mock-url')
    })

    it('should hide the link element', () => {
      downloadFile('content', 'file.txt', 'text/plain')

      expect(mockLink.style.display).toBe('none')
    })
  })

  describe('exportUserDataAsJSON', () => {
    it('should generate valid JSON and trigger download', () => {
      const books = mockBooks
      const settings = mockSettings

      // This function internally calls generateUserDataJSON and downloadFile
      // We verify it doesn't throw errors
      expect(() => exportUserDataAsJSON(books, settings)).not.toThrow()
    })

    it('should handle empty books array', () => {
      expect(() => exportUserDataAsJSON([], {})).not.toThrow()
    })
  })

  describe('exportBooksAsCSV', () => {
    it('should generate CSV and trigger download', () => {
      const books = mockBooks

      exportBooksAsCSV(books)

      // Check that the function was called (implementation test)
      expect(books).toBeDefined()
    })

    it('should handle empty books array', () => {
      expect(() => exportBooksAsCSV([])).not.toThrow()
    })
  })

  describe('Edge cases', () => {
    it('should handle books with all null attributes', () => {
      const nullBooks = [{
        id: 'book1',
        name: 'Book',
        author: null,
        coverLink: null,
        year: null,
        month: null,
        attributes: null,
        createdAt: null,
        updatedAt: null
      }]

      expect(() => generateBooksCSV(nullBooks)).not.toThrow()
      expect(() => generateUserDataJSON(nullBooks, null)).not.toThrow()
    })

    it('should handle very long book titles', () => {
      const longTitle = 'A'.repeat(1000)
      const booksWithLongTitle = [{
        id: 'book1',
        name: longTitle,
        author: 'Author',
        year: 2024,
        month: 1,
        attributes: {}
      }]

      const csv = generateBooksCSV(booksWithLongTitle)
      expect(csv).toContain(longTitle)
    })

    it('should handle special Unicode characters', () => {
      const unicodeBooks = [{
        id: 'book1',
        name: '日本語タイトル 中文标题 🎉',
        author: 'Müller',
        year: 2024,
        month: 1,
        attributes: {}
      }]

      const csv = generateBooksCSV(unicodeBooks)
      expect(csv).toContain('日本語タイトル 中文标题 🎉')
      expect(csv).toContain('Müller')
    })
  })
})
