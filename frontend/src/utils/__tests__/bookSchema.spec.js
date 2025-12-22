import { describe, it, expect } from 'vitest'
import { DEFAULT_BOOK_ATTRIBUTES, normalizeBookAttributes } from '../bookSchema'

describe('bookSchema', () => {
  describe('DEFAULT_BOOK_ATTRIBUTES', () => {
    it('should have correct default structure', () => {
      expect(DEFAULT_BOOK_ATTRIBUTES).toEqual({
        isUnfinished: false,
        customCover: false,
        score: null
      })
    })

    it('should be immutable (not affect other instances)', () => {
      const attrs1 = { ...DEFAULT_BOOK_ATTRIBUTES }
      attrs1.isUnfinished = true

      expect(DEFAULT_BOOK_ATTRIBUTES.isUnfinished).toBe(false)
    })
  })

  describe('normalizeBookAttributes', () => {
    it('should return default attributes for empty book object', () => {
      const result = normalizeBookAttributes({})

      expect(result).toEqual({
        isUnfinished: false,
        customCover: false,
        score: null
      })
    })

    it('should preserve existing attributes object', () => {
      const book = {
        attributes: {
          isUnfinished: true,
          customCover: true,
          score: 1
        }
      }

      const result = normalizeBookAttributes(book)

      expect(result).toEqual({
        isUnfinished: true,
        customCover: true,
        score: 1
      })
    })

    it('should merge partial attributes with defaults', () => {
      const book = {
        attributes: {
          isUnfinished: true
        }
      }

      const result = normalizeBookAttributes(book)

      expect(result).toEqual({
        isUnfinished: true,
        customCover: false,
        score: null
      })
    })

    it('should handle migration from old format (top-level isUnfinished)', () => {
      const book = {
        isUnfinished: true
      }

      const result = normalizeBookAttributes(book)

      expect(result).toEqual({
        isUnfinished: true,
        customCover: false,
        score: null
      })
    })

    it('should prioritize attributes.isUnfinished over top-level isUnfinished', () => {
      const book = {
        isUnfinished: true,
        attributes: {
          isUnfinished: false
        }
      }

      const result = normalizeBookAttributes(book)

      expect(result.isUnfinished).toBe(false)
    })

    it('should use top-level isUnfinished only when attributes.isUnfinished is undefined', () => {
      const book = {
        isUnfinished: true,
        attributes: {
          customCover: true
        }
      }

      const result = normalizeBookAttributes(book)

      expect(result.isUnfinished).toBe(true)
      expect(result.customCover).toBe(true)
    })

    it('should handle null attributes', () => {
      const book = {
        attributes: null
      }

      const result = normalizeBookAttributes(book)

      expect(result).toEqual({
        isUnfinished: false,
        customCover: false,
        score: null
      })
    })

    it('should handle undefined attributes', () => {
      const book = {
        attributes: undefined
      }

      const result = normalizeBookAttributes(book)

      expect(result).toEqual({
        isUnfinished: false,
        customCover: false,
        score: null
      })
    })

    it('should handle score attribute with value 0', () => {
      const book = {
        attributes: {
          score: 0
        }
      }

      const result = normalizeBookAttributes(book)

      expect(result.score).toBe(0)
    })

    it('should handle score attribute with value -1', () => {
      const book = {
        attributes: {
          score: -1
        }
      }

      const result = normalizeBookAttributes(book)

      expect(result.score).toBe(-1)
    })

    it('should handle score attribute with value 1', () => {
      const book = {
        attributes: {
          score: 1
        }
      }

      const result = normalizeBookAttributes(book)

      expect(result.score).toBe(1)
    })

    it('should not mutate original book object', () => {
      const book = {
        attributes: {
          isUnfinished: true
        }
      }

      const result = normalizeBookAttributes(book)
      result.customCover = true

      expect(book.attributes.customCover).toBeUndefined()
    })

    it('should handle extra unknown attributes gracefully', () => {
      const book = {
        attributes: {
          isUnfinished: true,
          unknownField: 'test',
          anotherField: 123
        }
      }

      const result = normalizeBookAttributes(book)

      // Should include unknown fields
      expect(result.isUnfinished).toBe(true)
      expect(result.unknownField).toBe('test')
      expect(result.anotherField).toBe(123)
    })

    it('should handle boolean false values correctly', () => {
      const book = {
        attributes: {
          isUnfinished: false,
          customCover: false
        }
      }

      const result = normalizeBookAttributes(book)

      expect(result.isUnfinished).toBe(false)
      expect(result.customCover).toBe(false)
    })
  })
})
