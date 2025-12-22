import { describe, it, expect, vi } from 'vitest'
import { serializeBook, deserializeBook, serializeBookForApi } from '../bookSerialization'

describe('bookSerialization', () => {
  describe('serializeBook', () => {
    it('should serialize a complete book object', () => {
      const book = {
        id: 'test-id-123',
        name: 'Test Book',
        author: 'Test Author',
        coverLink: 'https://example.com/cover.jpg',
        year: 2024,
        month: 3,
        attributes: {
          isUnfinished: false,
          customCover: false,
          score: 1
        },
        createdAt: new Date('2024-01-15T10:30:00.000Z'),
        updatedAt: new Date('2024-01-20T14:45:00.000Z')
      }

      const result = serializeBook(book)

      expect(result).toEqual({
        id: 'test-id-123',
        name: 'Test Book',
        author: 'Test Author',
        coverLink: 'https://example.com/cover.jpg',
        year: 2024,
        month: 3,
        attributes: {
          isUnfinished: false,
          customCover: false,
          score: 1
        },
        createdAt: '2024-01-15T10:30:00.000Z',
        updatedAt: '2024-01-20T14:45:00.000Z'
      })
    })

    it('should convert Date objects to ISO strings', () => {
      const book = {
        id: 'test-id',
        name: 'Book',
        author: null,
        coverLink: null,
        year: null,
        month: null,
        attributes: { isUnfinished: false, customCover: false, score: null },
        createdAt: new Date('2024-06-15T08:00:00.000Z'),
        updatedAt: new Date('2024-06-20T09:00:00.000Z')
      }

      const result = serializeBook(book)

      expect(result.createdAt).toBe('2024-06-15T08:00:00.000Z')
      expect(result.updatedAt).toBe('2024-06-20T09:00:00.000Z')
      expect(typeof result.createdAt).toBe('string')
      expect(typeof result.updatedAt).toBe('string')
    })

    it('should handle already-serialized dates (ISO strings)', () => {
      const book = {
        id: 'test-id',
        name: 'Book',
        author: null,
        coverLink: null,
        year: null,
        month: null,
        attributes: { isUnfinished: false, customCover: false, score: null },
        createdAt: '2024-06-15T08:00:00.000Z',
        updatedAt: '2024-06-20T09:00:00.000Z'
      }

      const result = serializeBook(book)

      expect(result.createdAt).toBe('2024-06-15T08:00:00.000Z')
      expect(result.updatedAt).toBe('2024-06-20T09:00:00.000Z')
    })

    it('should handle undefined updatedAt', () => {
      const book = {
        id: 'test-id',
        name: 'Book',
        author: null,
        coverLink: null,
        year: null,
        month: null,
        attributes: { isUnfinished: false, customCover: false, score: null },
        createdAt: new Date('2024-01-01T00:00:00.000Z'),
        updatedAt: undefined
      }

      const result = serializeBook(book)

      expect(result.updatedAt).toBeUndefined()
    })

    it('should handle null values', () => {
      const book = {
        id: 'test-id',
        name: 'Book',
        author: null,
        coverLink: null,
        year: null,
        month: null,
        attributes: { isUnfinished: false, customCover: false, score: null },
        createdAt: new Date('2024-01-01T00:00:00.000Z'),
        updatedAt: null
      }

      const result = serializeBook(book)

      expect(result.author).toBeNull()
      expect(result.coverLink).toBeNull()
      expect(result.year).toBeNull()
      expect(result.month).toBeNull()
      expect(result.updatedAt).toBeNull()
    })

    it('should preserve all attribute fields', () => {
      const book = {
        id: 'test-id',
        name: 'Book',
        author: null,
        coverLink: null,
        year: 2024,
        month: 12,
        attributes: {
          isUnfinished: true,
          customCover: true,
          score: -1
        },
        createdAt: new Date('2024-01-01T00:00:00.000Z'),
        updatedAt: undefined
      }

      const result = serializeBook(book)

      expect(result.attributes).toEqual({
        isUnfinished: true,
        customCover: true,
        score: -1
      })
    })

    it('should not mutate original book object', () => {
      const createdAt = new Date('2024-01-01T00:00:00.000Z')
      const book = {
        id: 'test-id',
        name: 'Book',
        author: 'Author',
        coverLink: null,
        year: null,
        month: null,
        attributes: { isUnfinished: false, customCover: false, score: null },
        createdAt,
        updatedAt: undefined
      }

      serializeBook(book)

      expect(book.createdAt).toBe(createdAt)
      expect(book.createdAt instanceof Date).toBe(true)
    })
  })

  describe('deserializeBook', () => {
    it('should deserialize a complete book object', () => {
      const storedBook = {
        id: 'test-id-456',
        name: 'Stored Book',
        author: 'Stored Author',
        coverLink: 'https://example.com/stored.jpg',
        year: 2023,
        month: 7,
        attributes: {
          isUnfinished: true,
          customCover: true,
          score: 0
        },
        createdAt: '2023-07-15T12:00:00.000Z',
        updatedAt: '2023-07-20T15:30:00.000Z'
      }

      const result = deserializeBook(storedBook)

      expect(result).toEqual({
        id: 'test-id-456',
        name: 'Stored Book',
        author: 'Stored Author',
        coverLink: 'https://example.com/stored.jpg',
        year: 2023,
        month: 7,
        attributes: {
          isUnfinished: true,
          customCover: true,
          score: 0
        },
        createdAt: new Date('2023-07-15T12:00:00.000Z'),
        updatedAt: new Date('2023-07-20T15:30:00.000Z')
      })
    })

    it('should convert ISO string dates to Date objects', () => {
      const storedBook = {
        id: 'test-id',
        name: 'Book',
        author: null,
        coverLink: null,
        year: null,
        month: null,
        createdAt: '2024-03-10T08:45:00.000Z',
        updatedAt: '2024-03-15T10:00:00.000Z'
      }

      const result = deserializeBook(storedBook)

      expect(result.createdAt instanceof Date).toBe(true)
      expect(result.updatedAt instanceof Date).toBe(true)
      expect(result.createdAt.toISOString()).toBe('2024-03-10T08:45:00.000Z')
      expect(result.updatedAt.toISOString()).toBe('2024-03-15T10:00:00.000Z')
    })

    it('should handle undefined updatedAt', () => {
      const storedBook = {
        id: 'test-id',
        name: 'Book',
        author: null,
        coverLink: null,
        year: null,
        month: null,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: undefined
      }

      const result = deserializeBook(storedBook)

      expect(result.updatedAt).toBeUndefined()
    })

    it('should handle null updatedAt', () => {
      const storedBook = {
        id: 'test-id',
        name: 'Book',
        author: null,
        coverLink: null,
        year: null,
        month: null,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: null
      }

      const result = deserializeBook(storedBook)

      expect(result.updatedAt).toBeUndefined()
    })

    it('should normalize attributes using normalizeBookAttributes', () => {
      const storedBook = {
        id: 'test-id',
        name: 'Book',
        author: null,
        coverLink: null,
        year: null,
        month: null,
        attributes: {
          isUnfinished: true
          // Missing customCover and score
        },
        createdAt: '2024-01-01T00:00:00.000Z'
      }

      const result = deserializeBook(storedBook)

      expect(result.attributes).toEqual({
        isUnfinished: true,
        customCover: false,
        score: null
      })
    })

    it('should handle missing attributes object', () => {
      const storedBook = {
        id: 'test-id',
        name: 'Book',
        author: null,
        coverLink: null,
        year: null,
        month: null,
        createdAt: '2024-01-01T00:00:00.000Z'
      }

      const result = deserializeBook(storedBook)

      expect(result.attributes).toEqual({
        isUnfinished: false,
        customCover: false,
        score: null
      })
    })

    it('should handle migration from old format with top-level isUnfinished', () => {
      const storedBook = {
        id: 'test-id',
        name: 'Book',
        author: null,
        coverLink: null,
        year: null,
        month: null,
        isUnfinished: true, // Old format
        createdAt: '2024-01-01T00:00:00.000Z'
      }

      const result = deserializeBook(storedBook)

      expect(result.attributes.isUnfinished).toBe(true)
    })

    it('should preserve all fields from stored book', () => {
      const storedBook = {
        id: 'test-id',
        name: 'My Book',
        author: 'John Doe',
        coverLink: 'https://example.com/cover.jpg',
        year: 2024,
        month: 5,
        attributes: {
          isUnfinished: false,
          customCover: true,
          score: 1
        },
        createdAt: '2024-05-01T00:00:00.000Z',
        updatedAt: '2024-05-10T00:00:00.000Z',
        extraField: 'should be preserved'
      }

      const result = deserializeBook(storedBook)

      expect(result.id).toBe('test-id')
      expect(result.name).toBe('My Book')
      expect(result.author).toBe('John Doe')
      expect(result.coverLink).toBe('https://example.com/cover.jpg')
      expect(result.year).toBe(2024)
      expect(result.month).toBe(5)
      expect(result.extraField).toBe('should be preserved')
    })
  })

  describe('serializeBookForApi', () => {
    it('should serialize minimal book data for API', () => {
      const book = {
        id: 'should-be-excluded',
        name: 'API Book',
        author: 'API Author',
        coverLink: 'https://example.com/api.jpg',
        year: 2024,
        month: 8,
        attributes: {
          isUnfinished: false,
          customCover: true,
          score: 1
        },
        createdAt: new Date('2024-01-01T00:00:00.000Z'),
        updatedAt: new Date('2024-01-05T00:00:00.000Z')
      }

      const result = serializeBookForApi(book)

      expect(result).toEqual({
        name: 'API Book',
        author: 'API Author',
        coverLink: 'https://example.com/api.jpg',
        year: 2024,
        month: 8,
        attributes: {
          isUnfinished: false,
          customCover: true,
          score: 1
        }
      })
    })

    it('should exclude id, createdAt, and updatedAt', () => {
      const book = {
        id: 'test-id',
        name: 'Book',
        author: null,
        coverLink: null,
        year: null,
        month: null,
        attributes: {
          isUnfinished: false,
          customCover: false,
          score: null
        },
        createdAt: new Date('2024-01-01T00:00:00.000Z'),
        updatedAt: new Date('2024-01-02T00:00:00.000Z')
      }

      const result = serializeBookForApi(book)

      expect(result.id).toBeUndefined()
      expect(result.createdAt).toBeUndefined()
      expect(result.updatedAt).toBeUndefined()
    })

    it('should handle null values', () => {
      const book = {
        name: 'Book',
        author: null,
        coverLink: null,
        year: null,
        month: null,
        attributes: {
          isUnfinished: false,
          customCover: false,
          score: null
        }
      }

      const result = serializeBookForApi(book)

      expect(result.author).toBeNull()
      expect(result.coverLink).toBeNull()
      expect(result.year).toBeNull()
      expect(result.month).toBeNull()
      expect(result.attributes.score).toBeNull()
    })

    it('should preserve all attributes', () => {
      const book = {
        name: 'Book',
        author: 'Author',
        coverLink: 'link',
        year: 2024,
        month: 1,
        attributes: {
          isUnfinished: true,
          customCover: true,
          score: -1
        }
      }

      const result = serializeBookForApi(book)

      expect(result.attributes).toEqual({
        isUnfinished: true,
        customCover: true,
        score: -1
      })
    })

    it('should not mutate original book object', () => {
      const attributes = {
        isUnfinished: false,
        customCover: false,
        score: null
      }
      const book = {
        id: 'test-id',
        name: 'Book',
        author: 'Author',
        coverLink: null,
        year: null,
        month: null,
        attributes
      }

      serializeBookForApi(book)

      expect(book.id).toBe('test-id')
      expect(book.attributes).toBe(attributes)
    })
  })

  describe('serialize/deserialize round-trip', () => {
    it('should maintain data integrity through round-trip', () => {
      const original = {
        id: 'test-id',
        name: 'Round Trip Book',
        author: 'Round Trip Author',
        coverLink: 'https://example.com/roundtrip.jpg',
        year: 2024,
        month: 6,
        attributes: {
          isUnfinished: true,
          customCover: false,
          score: 1
        },
        createdAt: new Date('2024-06-01T10:00:00.000Z'),
        updatedAt: new Date('2024-06-10T12:00:00.000Z')
      }

      const serialized = serializeBook(original)
      const deserialized = deserializeBook(serialized)

      expect(deserialized.id).toBe(original.id)
      expect(deserialized.name).toBe(original.name)
      expect(deserialized.author).toBe(original.author)
      expect(deserialized.coverLink).toBe(original.coverLink)
      expect(deserialized.year).toBe(original.year)
      expect(deserialized.month).toBe(original.month)
      expect(deserialized.attributes).toEqual(original.attributes)
      expect(deserialized.createdAt.getTime()).toBe(original.createdAt.getTime())
      expect(deserialized.updatedAt.getTime()).toBe(original.updatedAt.getTime())
    })

    it('should handle multiple round-trips', () => {
      const original = {
        id: 'test-id',
        name: 'Book',
        author: null,
        coverLink: null,
        year: null,
        month: null,
        attributes: {
          isUnfinished: false,
          customCover: false,
          score: null
        },
        createdAt: new Date('2024-01-01T00:00:00.000Z'),
        updatedAt: undefined
      }

      let current = original
      for (let i = 0; i < 5; i++) {
        const serialized = serializeBook(current)
        current = deserializeBook(serialized)
      }

      expect(current.id).toBe(original.id)
      expect(current.name).toBe(original.name)
      expect(current.createdAt.getTime()).toBe(original.createdAt.getTime())
    })
  })
})
