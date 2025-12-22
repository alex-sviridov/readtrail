import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { BooksApi } from '../booksApi'
import pb from '../pocketbase'

// Mock the pocketbase module
vi.mock('../pocketbase', () => ({
  default: {
    collection: vi.fn(),
    authStore: {
      record: { id: 'test-user-id' }
    },
    files: {
      getURL: vi.fn()
    }
  }
}))

// Mock guestMode module
vi.mock('../guestMode', () => ({
  isGuestMode: vi.fn(() => false),
  requireAuth: vi.fn()
}))

// Mock errors module
vi.mock('@/utils/errors', () => ({
  adaptPocketBaseError: vi.fn((error) => error)
}))

// Mock logger
vi.mock('@/utils/logger', () => ({
  logger: {
    warn: vi.fn(),
    debug: vi.fn()
  }
}))

describe('booksApi transformations', () => {
  let booksApi

  beforeEach(() => {
    booksApi = new BooksApi()
    vi.clearAllMocks()
  })

  describe('transformBookFromPocketBase', () => {
    it('should transform complete PocketBase book to store format', async () => {
      const pbBook = {
        id: 'pb-id-123',
        name: 'Test Book',
        author: 'Test Author',
        cover_url: 'https://example.com/cover.jpg',
        cover_file: '',
        read_date: '2024-03-15',
        attributes: {
          isUnfinished: false,
          customCover: false,
          score: 1
        },
        created: '2024-01-01T10:00:00.000Z',
        updated: '2024-01-05T12:00:00.000Z'
      }

      const mockCollection = {
        getOne: vi.fn().mockResolvedValue(pbBook)
      }
      pb.collection.mockReturnValue(mockCollection)

      const result = await booksApi.getBook('pb-id-123')

      expect(result).toEqual({
        id: 'pb-id-123',
        name: 'Test Book',
        author: 'Test Author',
        coverLink: 'https://example.com/cover.jpg',
        coverDisplayLink: 'https://example.com/cover.jpg',
        year: 2024,
        month: 3,
        attributes: {
          isUnfinished: false,
          customCover: false,
          score: 1
        },
        createdAt: new Date('2024-01-01T10:00:00.000Z'),
        updatedAt: new Date('2024-01-05T12:00:00.000Z')
      })
    })

    it('should convert read_date to year and month correctly', async () => {
      const pbBook = {
        id: 'test-id',
        name: 'Book',
        author: '',
        cover_url: '',
        cover_file: '',
        read_date: '2024-12-01',
        attributes: {},
        created: '2024-01-01T00:00:00.000Z',
        updated: '2024-01-01T00:00:00.000Z'
      }

      const mockCollection = {
        getOne: vi.fn().mockResolvedValue(pbBook)
      }
      pb.collection.mockReturnValue(mockCollection)

      const result = await booksApi.getBook('test-id')

      expect(result.year).toBe(2024)
      expect(result.month).toBe(12)
    })

    it('should handle January (month index 0) correctly', async () => {
      const pbBook = {
        id: 'test-id',
        name: 'Book',
        author: '',
        cover_url: '',
        cover_file: '',
        read_date: '2024-01-01',
        attributes: {},
        created: '2024-01-01T00:00:00.000Z',
        updated: '2024-01-01T00:00:00.000Z'
      }

      const mockCollection = {
        getOne: vi.fn().mockResolvedValue(pbBook)
      }
      pb.collection.mockReturnValue(mockCollection)

      const result = await booksApi.getBook('test-id')

      expect(result.year).toBe(2024)
      expect(result.month).toBe(1) // Should be 1, not 0
    })

    it('should handle null read_date (in-progress book)', async () => {
      const pbBook = {
        id: 'test-id',
        name: 'Book',
        author: '',
        cover_url: '',
        cover_file: '',
        read_date: null,
        attributes: {},
        created: '2024-01-01T00:00:00.000Z',
        updated: '2024-01-01T00:00:00.000Z'
      }

      const mockCollection = {
        getOne: vi.fn().mockResolvedValue(pbBook)
      }
      pb.collection.mockReturnValue(mockCollection)

      const result = await booksApi.getBook('test-id')

      expect(result.year).toBeNull()
      expect(result.month).toBeNull()
    })

    it('should handle empty read_date', async () => {
      const pbBook = {
        id: 'test-id',
        name: 'Book',
        author: '',
        cover_url: '',
        cover_file: '',
        read_date: '',
        attributes: {},
        created: '2024-01-01T00:00:00.000Z',
        updated: '2024-01-01T00:00:00.000Z'
      }

      const mockCollection = {
        getOne: vi.fn().mockResolvedValue(pbBook)
      }
      pb.collection.mockReturnValue(mockCollection)

      const result = await booksApi.getBook('test-id')

      expect(result.year).toBeNull()
      expect(result.month).toBeNull()
    })

    it('should prioritize cover_file over cover_url for coverDisplayLink', async () => {
      const pbBook = {
        id: 'test-id',
        name: 'Book',
        author: '',
        cover_url: 'https://example.com/url-cover.jpg',
        cover_file: 'file123.jpg',
        read_date: null,
        attributes: {},
        created: '2024-01-01T00:00:00.000Z',
        updated: '2024-01-01T00:00:00.000Z'
      }

      pb.files.getURL.mockReturnValue('https://pb.example.com/files/test-id/file123_thumb.jpg')

      const mockCollection = {
        getOne: vi.fn().mockResolvedValue(pbBook)
      }
      pb.collection.mockReturnValue(mockCollection)

      const result = await booksApi.getBook('test-id')

      expect(result.coverLink).toBe('https://example.com/url-cover.jpg')
      expect(result.coverDisplayLink).toBe('https://pb.example.com/files/test-id/file123_thumb.jpg')
      expect(pb.files.getURL).toHaveBeenCalledWith(pbBook, 'file123.jpg', { thumb: '200x300' })
    })

    it('should use cover_url for coverDisplayLink when no cover_file', async () => {
      const pbBook = {
        id: 'test-id',
        name: 'Book',
        author: '',
        cover_url: 'https://example.com/cover.jpg',
        cover_file: '',
        read_date: null,
        attributes: {},
        created: '2024-01-01T00:00:00.000Z',
        updated: '2024-01-01T00:00:00.000Z'
      }

      const mockCollection = {
        getOne: vi.fn().mockResolvedValue(pbBook)
      }
      pb.collection.mockReturnValue(mockCollection)

      const result = await booksApi.getBook('test-id')

      expect(result.coverDisplayLink).toBe('https://example.com/cover.jpg')
      expect(pb.files.getURL).not.toHaveBeenCalled()
    })

    it('should handle null coverDisplayLink when no covers present', async () => {
      const pbBook = {
        id: 'test-id',
        name: 'Book',
        author: '',
        cover_url: '',
        cover_file: '',
        read_date: null,
        attributes: {},
        created: '2024-01-01T00:00:00.000Z',
        updated: '2024-01-01T00:00:00.000Z'
      }

      const mockCollection = {
        getOne: vi.fn().mockResolvedValue(pbBook)
      }
      pb.collection.mockReturnValue(mockCollection)

      const result = await booksApi.getBook('test-id')

      expect(result.coverDisplayLink).toBeNull()
    })

    it('should handle empty author as null', async () => {
      const pbBook = {
        id: 'test-id',
        name: 'Book',
        author: '',
        cover_url: '',
        cover_file: '',
        read_date: null,
        attributes: {},
        created: '2024-01-01T00:00:00.000Z',
        updated: '2024-01-01T00:00:00.000Z'
      }

      const mockCollection = {
        getOne: vi.fn().mockResolvedValue(pbBook)
      }
      pb.collection.mockReturnValue(mockCollection)

      const result = await booksApi.getBook('test-id')

      expect(result.author).toBeNull()
    })

    it('should normalize attributes with defaults', async () => {
      const pbBook = {
        id: 'test-id',
        name: 'Book',
        author: '',
        cover_url: '',
        cover_file: '',
        read_date: null,
        attributes: {
          isUnfinished: true
          // Missing customCover and score
        },
        created: '2024-01-01T00:00:00.000Z',
        updated: '2024-01-01T00:00:00.000Z'
      }

      const mockCollection = {
        getOne: vi.fn().mockResolvedValue(pbBook)
      }
      pb.collection.mockReturnValue(mockCollection)

      const result = await booksApi.getBook('test-id')

      expect(result.attributes).toEqual({
        isUnfinished: true,
        customCover: false,
        score: null
      })
    })

    it('should handle missing attributes object', async () => {
      const pbBook = {
        id: 'test-id',
        name: 'Book',
        author: '',
        cover_url: '',
        cover_file: '',
        read_date: null,
        attributes: null,
        created: '2024-01-01T00:00:00.000Z',
        updated: '2024-01-01T00:00:00.000Z'
      }

      const mockCollection = {
        getOne: vi.fn().mockResolvedValue(pbBook)
      }
      pb.collection.mockReturnValue(mockCollection)

      const result = await booksApi.getBook('test-id')

      expect(result.attributes).toEqual({
        isUnfinished: false,
        customCover: false,
        score: null
      })
    })

    it('should handle all score values', async () => {
      const testScores = [null, 0, 1, -1]

      for (const score of testScores) {
        const pbBook = {
          id: 'test-id',
          name: 'Book',
          author: '',
          cover_url: '',
          cover_file: '',
          read_date: null,
          attributes: { score },
          created: '2024-01-01T00:00:00.000Z',
          updated: '2024-01-01T00:00:00.000Z'
        }

        const mockCollection = {
          getOne: vi.fn().mockResolvedValue(pbBook)
        }
        pb.collection.mockReturnValue(mockCollection)

        const result = await booksApi.getBook('test-id')

        expect(result.attributes.score).toBe(score)
      }
    })
  })

  describe('transformBookToPocketBase', () => {
    it('should transform complete store book to PocketBase format', async () => {
      const storeBook = {
        name: 'Test Book',
        author: 'Test Author',
        coverLink: 'https://example.com/cover.jpg',
        year: 2024,
        month: 3,
        attributes: {
          isUnfinished: false,
          customCover: false,
          score: 1
        }
      }

      const mockCollection = {
        create: vi.fn().mockResolvedValue({
          id: 'new-id',
          ...storeBook,
          cover_url: storeBook.coverLink,
          read_date: '2024-03-01',
          created: '2024-01-01T00:00:00.000Z',
          updated: '2024-01-01T00:00:00.000Z',
          cover_file: '',
          owner: 'test-user-id'
        })
      }
      pb.collection.mockReturnValue(mockCollection)

      await booksApi.createBook(storeBook)

      expect(mockCollection.create).toHaveBeenCalledWith({
        name: 'Test Book',
        author: 'Test Author',
        cover_url: 'https://example.com/cover.jpg',
        read_date: '2024-03-01',
        attributes: {
          isUnfinished: false,
          customCover: false,
          score: 1
        },
        owner: 'test-user-id'
      })
    })

    it('should convert year and month to read_date with zero-padding', async () => {
      const storeBook = {
        name: 'Book',
        author: null,
        coverLink: null,
        year: 2024,
        month: 3,
        attributes: {}
      }

      const mockCollection = {
        create: vi.fn().mockResolvedValue({
          id: 'new-id',
          name: 'Book',
          author: '',
          cover_url: '',
          cover_file: '',
          read_date: '2024-03-01',
          attributes: {},
          created: '2024-01-01T00:00:00.000Z',
          updated: '2024-01-01T00:00:00.000Z'
        })
      }
      pb.collection.mockReturnValue(mockCollection)

      await booksApi.createBook(storeBook)

      const callArgs = mockCollection.create.mock.calls[0][0]
      expect(callArgs.read_date).toBe('2024-03-01')
    })

    it('should handle single-digit month with zero-padding', async () => {
      const storeBook = {
        name: 'Book',
        author: null,
        coverLink: null,
        year: 2024,
        month: 5,
        attributes: {}
      }

      const mockCollection = {
        create: vi.fn().mockResolvedValue({
          id: 'new-id',
          name: 'Book',
          author: '',
          cover_url: '',
          cover_file: '',
          read_date: '2024-05-01',
          attributes: {},
          created: '2024-01-01T00:00:00.000Z',
          updated: '2024-01-01T00:00:00.000Z'
        })
      }
      pb.collection.mockReturnValue(mockCollection)

      await booksApi.createBook(storeBook)

      const callArgs = mockCollection.create.mock.calls[0][0]
      expect(callArgs.read_date).toBe('2024-05-01')
    })

    it('should handle double-digit month correctly', async () => {
      const storeBook = {
        name: 'Book',
        author: null,
        coverLink: null,
        year: 2024,
        month: 12,
        attributes: {}
      }

      const mockCollection = {
        create: vi.fn().mockResolvedValue({
          id: 'new-id',
          name: 'Book',
          author: '',
          cover_url: '',
          cover_file: '',
          read_date: '2024-12-01',
          attributes: {},
          created: '2024-01-01T00:00:00.000Z',
          updated: '2024-01-01T00:00:00.000Z'
        })
      }
      pb.collection.mockReturnValue(mockCollection)

      await booksApi.createBook(storeBook)

      const callArgs = mockCollection.create.mock.calls[0][0]
      expect(callArgs.read_date).toBe('2024-12-01')
    })

    it('should set read_date to null for in-progress books', async () => {
      const storeBook = {
        name: 'Book',
        author: null,
        coverLink: null,
        year: null,
        month: null,
        attributes: {}
      }

      const mockCollection = {
        create: vi.fn().mockResolvedValue({
          id: 'new-id',
          name: 'Book',
          author: '',
          cover_url: '',
          cover_file: '',
          read_date: null,
          attributes: {},
          created: '2024-01-01T00:00:00.000Z',
          updated: '2024-01-01T00:00:00.000Z'
        })
      }
      pb.collection.mockReturnValue(mockCollection)

      await booksApi.createBook(storeBook)

      const callArgs = mockCollection.create.mock.calls[0][0]
      expect(callArgs.read_date).toBeNull()
    })

    it('should convert null author to empty string', async () => {
      const storeBook = {
        name: 'Book',
        author: null,
        coverLink: null,
        year: null,
        month: null,
        attributes: {}
      }

      const mockCollection = {
        create: vi.fn().mockResolvedValue({
          id: 'new-id',
          name: 'Book',
          author: '',
          cover_url: '',
          cover_file: '',
          read_date: null,
          attributes: {},
          created: '2024-01-01T00:00:00.000Z',
          updated: '2024-01-01T00:00:00.000Z'
        })
      }
      pb.collection.mockReturnValue(mockCollection)

      await booksApi.createBook(storeBook)

      const callArgs = mockCollection.create.mock.calls[0][0]
      expect(callArgs.author).toBe('')
    })

    it('should convert null coverLink to empty string', async () => {
      const storeBook = {
        name: 'Book',
        author: null,
        coverLink: null,
        year: null,
        month: null,
        attributes: {}
      }

      const mockCollection = {
        create: vi.fn().mockResolvedValue({
          id: 'new-id',
          name: 'Book',
          author: '',
          cover_url: '',
          cover_file: '',
          read_date: null,
          attributes: {},
          created: '2024-01-01T00:00:00.000Z',
          updated: '2024-01-01T00:00:00.000Z'
        })
      }
      pb.collection.mockReturnValue(mockCollection)

      await booksApi.createBook(storeBook)

      const callArgs = mockCollection.create.mock.calls[0][0]
      expect(callArgs.cover_url).toBe('')
    })

    it('should normalize attributes with defaults', async () => {
      const storeBook = {
        name: 'Book',
        author: null,
        coverLink: null,
        year: null,
        month: null,
        attributes: {
          isUnfinished: true
          // Missing customCover and score
        }
      }

      const mockCollection = {
        create: vi.fn().mockResolvedValue({
          id: 'new-id',
          name: 'Book',
          author: '',
          cover_url: '',
          cover_file: '',
          read_date: null,
          attributes: { isUnfinished: true, customCover: false, score: null },
          created: '2024-01-01T00:00:00.000Z',
          updated: '2024-01-01T00:00:00.000Z'
        })
      }
      pb.collection.mockReturnValue(mockCollection)

      await booksApi.createBook(storeBook)

      const callArgs = mockCollection.create.mock.calls[0][0]
      expect(callArgs.attributes).toEqual({
        isUnfinished: true,
        customCover: false,
        score: null
      })
    })

    it('should include owner from authStore', async () => {
      const storeBook = {
        name: 'Book',
        author: null,
        coverLink: null,
        year: null,
        month: null,
        attributes: {}
      }

      const mockCollection = {
        create: vi.fn().mockResolvedValue({
          id: 'new-id',
          name: 'Book',
          author: '',
          cover_url: '',
          cover_file: '',
          read_date: null,
          attributes: {},
          created: '2024-01-01T00:00:00.000Z',
          updated: '2024-01-01T00:00:00.000Z',
          owner: 'test-user-id'
        })
      }
      pb.collection.mockReturnValue(mockCollection)

      await booksApi.createBook(storeBook)

      const callArgs = mockCollection.create.mock.calls[0][0]
      expect(callArgs.owner).toBe('test-user-id')
    })

    it('should handle FormData when coverFile is present', async () => {
      const mockFile = new File(['test'], 'cover.jpg', { type: 'image/jpeg' })
      const storeBook = {
        name: 'Book',
        author: 'Author',
        coverLink: null,
        year: 2024,
        month: 6,
        attributes: {},
        coverFile: mockFile
      }

      const mockCollection = {
        create: vi.fn().mockResolvedValue({
          id: 'new-id',
          name: 'Book',
          author: 'Author',
          cover_url: '',
          cover_file: 'generated_file_name.jpg',
          read_date: '2024-06-01',
          attributes: {},
          created: '2024-01-01T00:00:00.000Z',
          updated: '2024-01-01T00:00:00.000Z'
        })
      }
      pb.collection.mockReturnValue(mockCollection)

      await booksApi.createBook(storeBook)

      const callArgs = mockCollection.create.mock.calls[0][0]
      expect(callArgs instanceof FormData).toBe(true)
    })
  })

  describe('round-trip transformation', () => {
    it('should maintain data integrity through create and retrieve', async () => {
      const originalBook = {
        name: 'Round Trip Book',
        author: 'Round Trip Author',
        coverLink: 'https://example.com/cover.jpg',
        year: 2024,
        month: 6,
        attributes: {
          isUnfinished: false,
          customCover: true,
          score: 1
        }
      }

      const mockPbBook = {
        id: 'new-id',
        name: 'Round Trip Book',
        author: 'Round Trip Author',
        cover_url: 'https://example.com/cover.jpg',
        cover_file: '',
        read_date: '2024-06-01',
        attributes: {
          isUnfinished: false,
          customCover: true,
          score: 1
        },
        created: '2024-01-01T10:00:00.000Z',
        updated: '2024-01-01T10:00:00.000Z'
      }

      const mockCollection = {
        create: vi.fn().mockResolvedValue(mockPbBook),
        getOne: vi.fn().mockResolvedValue(mockPbBook)
      }
      pb.collection.mockReturnValue(mockCollection)

      const created = await booksApi.createBook(originalBook)
      const retrieved = await booksApi.getBook(created.id)

      expect(retrieved.name).toBe(originalBook.name)
      expect(retrieved.author).toBe(originalBook.author)
      expect(retrieved.coverLink).toBe(originalBook.coverLink)
      expect(retrieved.year).toBe(originalBook.year)
      expect(retrieved.month).toBe(originalBook.month)
      expect(retrieved.attributes).toEqual(originalBook.attributes)
    })
  })
})
