import { describe, it, expect, vi, beforeEach } from 'vitest'
import { BooksApi } from '../booksApi'
import pb from '../pocketbase'
import { getGuestBooks, createGuestBook } from '../guestStore'
import { isGuestMode } from '../guestMode'

// Mock the pocketbase module
vi.mock('../pocketbase', () => ({
  default: {
    collection: vi.fn(),
    authStore: {
      record: { id: 'test-user-id' }
    },
    files: {
      getURL: vi.fn()
    },
    send: vi.fn()
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
        hasCachedCover: false,
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

    it('prefers the expanded cover_image file over cover_url for display', async () => {
      const pbBook = {
        id: 'test-id',
        name: 'Book',
        author: '',
        cover_url: 'https://example.com/url-cover.jpg',
        cover_image: 'img1',
        expand: { cover_image: { id: 'img1', file: 'cover.jpg' } },
        read_date: null,
        attributes: {},
        created: '2024-01-01T00:00:00.000Z',
        updated: '2024-01-01T00:00:00.000Z'
      }

      pb.files.getURL.mockReturnValue('https://pb.example.com/files/cover_images/img1/cover.jpg')

      const mockCollection = {
        getOne: vi.fn().mockResolvedValue(pbBook)
      }
      pb.collection.mockReturnValue(mockCollection)

      const result = await booksApi.getBook('test-id')

      expect(result.coverLink).toBe('https://example.com/url-cover.jpg')
      expect(result.coverDisplayLink).toBe('https://pb.example.com/files/cover_images/img1/cover.jpg')
      expect(result.hasCachedCover).toBe(true)
      expect(pb.files.getURL).toHaveBeenCalledWith(pbBook.expand.cover_image, 'cover.jpg', { thumb: '200x300' })
    })

    it('falls back to cover_url when there is no cached cover_image', async () => {
      const pbBook = {
        id: 'test-id',
        name: 'Book',
        author: '',
        cover_url: 'https://example.com/cover.jpg',
        cover_image: '',
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
      expect(result.hasCachedCover).toBe(false)
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
      }, { expand: 'cover_image' })
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

    it('sends a plain object, never FormData, to pb.collection().create, even when coverFile is present', async () => {
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
          read_date: '2024-06-01',
          attributes: {},
          created: '2024-01-01T00:00:00.000Z',
          updated: '2024-01-01T00:00:00.000Z'
        })
      }
      pb.collection.mockReturnValue(mockCollection)

      await booksApi.createBook(storeBook)

      const callArgs = mockCollection.create.mock.calls[0][0]
      expect(callArgs).not.toBeInstanceOf(FormData)
      expect(callArgs).toEqual(expect.objectContaining({ name: 'Book', author: 'Author' }))
    })

    it('requests the cover_image expand on getBooks/getBook/createBook/updateBook', async () => {
      const mockCollection = {
        getList: vi.fn().mockResolvedValue({ items: [] }),
        getOne: vi.fn().mockResolvedValue({ id: 'b1', attributes: {}, created: '2024-01-01T00:00:00.000Z', updated: '2024-01-01T00:00:00.000Z' }),
        create: vi.fn().mockResolvedValue({ id: 'b1', attributes: {}, created: '2024-01-01T00:00:00.000Z', updated: '2024-01-01T00:00:00.000Z' }),
        update: vi.fn().mockResolvedValue({ id: 'b1', attributes: {}, created: '2024-01-01T00:00:00.000Z', updated: '2024-01-01T00:00:00.000Z' })
      }
      pb.collection.mockReturnValue(mockCollection)

      await booksApi.getBooks()
      expect(mockCollection.getList).toHaveBeenCalledWith(1, 500, expect.objectContaining({ expand: 'cover_image' }))

      await booksApi.getBook('b1')
      expect(mockCollection.getOne).toHaveBeenCalledWith('b1', expect.objectContaining({ expand: 'cover_image' }))

      await booksApi.createBook({ name: 'X' })
      expect(mockCollection.create).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ expand: 'cover_image' }))

      await booksApi.updateBook('b1', { name: 'Y' })
      expect(mockCollection.update).toHaveBeenCalledWith('b1', expect.anything(), expect.objectContaining({ expand: 'cover_image' }))
    })

    it('sends a plain object, never FormData, to pb.collection().create', async () => {
      const mockCollection = {
        create: vi.fn().mockResolvedValue({ id: 'b1', attributes: {}, created: '2024-01-01T00:00:00.000Z', updated: '2024-01-01T00:00:00.000Z' })
      }
      pb.collection.mockReturnValue(mockCollection)

      await booksApi.createBook({ name: 'X', coverLink: 'https://example.com/x.jpg' })

      const [sentData] = mockCollection.create.mock.calls[0]
      expect(sentData).not.toBeInstanceOf(FormData)
      expect(sentData).toEqual(expect.objectContaining({ name: 'X', cover_url: 'https://example.com/x.jpg' }))
    })
  })

  describe('updateBook (partial updates)', () => {
    it('does not send author when the update omits it, so it is not wiped server-side', async () => {
      const mockCollection = {
        update: vi.fn().mockResolvedValue({
          id: 'book-1',
          name: 'Book',
          author: 'Existing Author',
          cover_url: 'https://example.com/cover.jpg',
          cover_file: '',
          read_date: null,
          attributes: {},
          created: '2024-01-01T00:00:00.000Z',
          updated: '2024-01-01T00:00:00.000Z'
        })
      }
      pb.collection.mockReturnValue(mockCollection)

      await booksApi.updateBook('book-1', { coverLink: 'https://example.com/cover.jpg' })

      const callArgs = mockCollection.update.mock.calls[0][1]
      expect(callArgs).not.toHaveProperty('author')
    })

    it('does not send cover_url when the update omits it, so it is not wiped server-side', async () => {
      const mockCollection = {
        update: vi.fn().mockResolvedValue({
          id: 'book-1',
          name: 'New Title',
          author: 'Author',
          cover_url: 'https://example.com/cover.jpg',
          cover_file: '',
          read_date: null,
          attributes: {},
          created: '2024-01-01T00:00:00.000Z',
          updated: '2024-01-01T00:00:00.000Z'
        })
      }
      pb.collection.mockReturnValue(mockCollection)

      await booksApi.updateBook('book-1', { name: 'New Title' })

      const callArgs = mockCollection.update.mock.calls[0][1]
      expect(callArgs).not.toHaveProperty('cover_url')
    })

    it('does not send name when the update omits it', async () => {
      const mockCollection = {
        update: vi.fn().mockResolvedValue({
          id: 'book-1',
          name: 'Existing',
          author: '',
          cover_url: '',
          cover_file: '',
          read_date: null,
          attributes: { isUnfinished: true },
          created: '2024-01-01T00:00:00.000Z',
          updated: '2024-01-01T00:00:00.000Z'
        })
      }
      pb.collection.mockReturnValue(mockCollection)

      await booksApi.updateBook('book-1', { attributes: { isUnfinished: true } })

      const callArgs = mockCollection.update.mock.calls[0][1]
      expect(callArgs).not.toHaveProperty('name')
    })

    it('still sends author when the update explicitly includes it', async () => {
      const mockCollection = {
        update: vi.fn().mockResolvedValue({
          id: 'book-1',
          name: 'Book',
          author: 'New Author',
          cover_url: '',
          cover_file: '',
          read_date: null,
          attributes: {},
          created: '2024-01-01T00:00:00.000Z',
          updated: '2024-01-01T00:00:00.000Z'
        })
      }
      pb.collection.mockReturnValue(mockCollection)

      await booksApi.updateBook('book-1', { author: 'New Author' })

      const callArgs = mockCollection.update.mock.calls[0][1]
      expect(callArgs.author).toBe('New Author')
    })

    it('does not omit read_date when the update includes year/month', async () => {
      const mockCollection = {
        update: vi.fn().mockResolvedValue({
          id: 'book-1',
          name: 'Book',
          author: '',
          cover_url: '',
          cover_file: '',
          read_date: '2024-06-01',
          attributes: {},
          created: '2024-01-01T00:00:00.000Z',
          updated: '2024-01-01T00:00:00.000Z'
        })
      }
      pb.collection.mockReturnValue(mockCollection)

      await booksApi.updateBook('book-1', { year: 2024, month: 6 })

      const callArgs = mockCollection.update.mock.calls[0][1]
      expect(callArgs.read_date).toBe('2024-06-01')
    })
  })

  describe('updateBook with a coverFile (Edit Cover modal upload)', () => {
    it('updates fields first, then uploads the file, and returns the merged result', async () => {
      const mockCollection = {
        update: vi.fn().mockResolvedValue({
          id: 'b1',
          name: 'Book',
          cover_url: 'https://example.com/x.jpg',
          cover_image: '',
          attributes: {},
          created: '2024-01-01T00:00:00.000Z',
          updated: '2024-01-01T00:00:00.000Z'
        })
      }
      pb.collection.mockReturnValue(mockCollection)
      pb.send.mockResolvedValue({
        id: 'b1',
        name: 'Book',
        cover_url: 'https://example.com/x.jpg',
        cover_image: 'img1',
        expand: { cover_image: { id: 'img1', file: 'cover.jpg' } },
        attributes: {},
        created: '2024-01-01T00:00:00.000Z',
        updated: '2024-01-01T00:00:00.000Z'
      })
      pb.files.getURL.mockReturnValue('https://pb.local/cover.jpg')

      const fakeFile = new File(['x'], 'cover.jpg', { type: 'image/jpeg' })
      const result = await booksApi.updateBook('b1', { coverLink: 'https://example.com/x.jpg', coverFile: fakeFile })

      expect(mockCollection.update).toHaveBeenCalledWith(
        'b1',
        expect.not.objectContaining({ coverFile: expect.anything() }),
        expect.objectContaining({ expand: 'cover_image' })
      )
      expect(pb.send).toHaveBeenCalledWith('/api/books/b1/cover', expect.objectContaining({ method: 'POST' }))
      expect(result.hasCachedCover).toBe(true)
      expect(result.coverDisplayLink).toBe('https://pb.local/cover.jpg')
    })

    it('keeps the plain-update result (a live hotlink) if the cover upload fails', async () => {
      const mockCollection = {
        update: vi.fn().mockResolvedValue({
          id: 'b1',
          name: 'Book',
          cover_url: 'https://example.com/x.jpg',
          cover_image: '',
          attributes: {},
          created: '2024-01-01T00:00:00.000Z',
          updated: '2024-01-01T00:00:00.000Z'
        })
      }
      pb.collection.mockReturnValue(mockCollection)
      pb.send.mockRejectedValue(Object.assign(new Error('fail'), { name: 'ClientResponseError 422', status: 422 }))

      const fakeFile = new File(['x'], 'cover.jpg', { type: 'image/jpeg' })
      const result = await booksApi.updateBook('b1', { coverLink: 'https://example.com/x.jpg', coverFile: fakeFile })

      expect(result.coverDisplayLink).toBe('https://example.com/x.jpg')
      expect(result.hasCachedCover).toBe(false)
    })

    it('does not call uploadBookCover when there is no coverFile', async () => {
      const mockCollection = {
        update: vi.fn().mockResolvedValue({
          id: 'b1',
          attributes: {},
          created: '2024-01-01T00:00:00.000Z',
          updated: '2024-01-01T00:00:00.000Z'
        })
      }
      pb.collection.mockReturnValue(mockCollection)

      await booksApi.updateBook('b1', { name: 'New name' })

      expect(pb.send).not.toHaveBeenCalled()
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

describe('BooksApi guest mode', () => {
  let booksApi

  beforeEach(() => {
    booksApi = new BooksApi()
    vi.mocked(isGuestMode).mockReturnValue(true)
    localStorage.clear()
    vi.clearAllMocks()
  })

  it('getBooks reads from the guest store', async () => {
    createGuestBook({ name: 'Guest Book' })

    const books = await booksApi.getBooks()

    expect(books).toHaveLength(1)
    expect(books[0].name).toBe('Guest Book')
  })

  it('createBook writes to the guest store', async () => {
    const created = await booksApi.createBook({ name: 'New Guest Book', year: 2024, month: 1 })

    expect(created.name).toBe('New Guest Book')
    expect(getGuestBooks()).toHaveLength(1)
  })

  it('updateBook writes to the guest store', async () => {
    const book = createGuestBook({ name: 'Original' })

    const updated = await booksApi.updateBook(book.id, { name: 'Renamed' })

    expect(updated.name).toBe('Renamed')
  })

  it('deleteBook removes from the guest store', async () => {
    const book = createGuestBook({ name: 'To delete' })

    await booksApi.deleteBook(book.id)

    expect(getGuestBooks()).toHaveLength(0)
  })
})
