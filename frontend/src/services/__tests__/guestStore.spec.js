import { describe, it, expect, beforeEach } from 'vitest'
import {
  getGuestBooks,
  createGuestBook,
  updateGuestBook,
  deleteGuestBook,
  getGuestSettings,
  updateGuestSettings,
  clearGuestData
} from '../guestStore'

describe('guestStore', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  describe('books', () => {
    it('returns an empty array when nothing is stored', () => {
      expect(getGuestBooks()).toEqual([])
    })

    it('creates a book with a generated id and persists it', () => {
      const book = createGuestBook({ name: '1984', author: 'George Orwell', year: 2024, month: 3 })

      expect(book.id).toBeDefined()
      expect(book.name).toBe('1984')
      expect(book.attributes).toEqual({ isUnfinished: false, customCover: false, score: null })
      expect(getGuestBooks()).toHaveLength(1)
      expect(getGuestBooks()[0].id).toBe(book.id)
    })

    it('updates an existing book by id', () => {
      const book = createGuestBook({ name: 'Dune' })
      const updated = updateGuestBook(book.id, { name: 'Dune Messiah' })

      expect(updated.name).toBe('Dune Messiah')
      expect(getGuestBooks()[0].name).toBe('Dune Messiah')
    })

    it('returns null when updating a missing book', () => {
      expect(updateGuestBook('missing-id', { name: 'x' })).toBeNull()
    })

    it('deletes a book by id', () => {
      const book = createGuestBook({ name: 'Dune' })
      const result = deleteGuestBook(book.id)

      expect(result).toBe(true)
      expect(getGuestBooks()).toHaveLength(0)
    })

    it('returns false when deleting a missing book', () => {
      expect(deleteGuestBook('missing-id')).toBe(false)
    })
  })

  describe('settings', () => {
    it('returns defaults when nothing is stored', () => {
      expect(getGuestSettings()).toEqual({
        showBookInfo: true,
        allowUnfinishedReading: true,
        allowScoring: true,
        lastLibraryView: 'timeline',
        hideUnfinished: true,
        hideToRead: true
      })
    })

    it('merges partial updates over the current settings and persists them', () => {
      const updated = updateGuestSettings({ hideUnfinished: false })

      expect(updated.hideUnfinished).toBe(false)
      expect(updated.showBookInfo).toBe(true)
      expect(getGuestSettings().hideUnfinished).toBe(false)
    })
  })

  describe('clearGuestData', () => {
    it('removes stored books and settings', () => {
      createGuestBook({ name: 'Dune' })
      updateGuestSettings({ hideUnfinished: false })

      clearGuestData()

      expect(getGuestBooks()).toEqual([])
      expect(getGuestSettings().hideUnfinished).toBe(true)
    })
  })
})
