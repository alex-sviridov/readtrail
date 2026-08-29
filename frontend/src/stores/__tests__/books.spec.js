// frontend/src/stores/__tests__/books.spec.js
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { defineComponent } from 'vue'
import { mount } from '@vue/test-utils'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { useBooksStore } from '../books'
import { booksApi } from '@/services/booksApi'
import { isGuestMode } from '@/services/guestMode'

vi.mock('@/services/booksApi')
vi.mock('@/services/guestMode')

describe('useBooksStore', () => {
  let queryClient

  beforeEach(() => {
    vi.clearAllMocks()
    isGuestMode.mockReturnValue(false)
    localStorage.clear()
    setActivePinia(createPinia())
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
    })
  })

  function mountStore() {
    let store
    const TestComponent = defineComponent({
      setup() {
        store = useBooksStore()
        return () => null
      }
    })
    mount(TestComponent, { global: { plugins: [[VueQueryPlugin, { queryClient }]] } })
    return store
  }

  it('starts with an empty books array before the query resolves', () => {
    booksApi.getBooks.mockResolvedValue([])
    const store = mountStore()
    expect(store.books).toEqual([])
  })

  it('addBook returns the new book synchronously and adds it to the list', async () => {
    booksApi.getBooks.mockResolvedValue([])
    booksApi.createBook.mockResolvedValue({ id: 'real-1', name: 'The Great Gatsby' })

    const store = mountStore()
    const book = store.addBook('The Great Gatsby')

    expect(book.name).toBe('The Great Gatsby')
    expect(book.id).toBeDefined()
    expect(store.books).toHaveLength(1)
  })

  it('updateBookFields updates the matching book', () => {
    booksApi.getBooks.mockResolvedValue([])
    const store = mountStore()
    const book = store.addBook('1984', 2024, 3)

    const result = store.updateBookFields(book.id, { name: '1984 (revised)' })

    expect(result).toBe(true)
    expect(store.findBookById(book.id).name).toBe('1984 (revised)')
  })

  it('deleteBook removes the matching book', () => {
    booksApi.getBooks.mockResolvedValue([])
    const store = mountStore()
    const book = store.addBook('1984')

    const result = store.deleteBook(book.id)

    expect(result).toBe(true)
    expect(store.books).toHaveLength(0)
  })

  it('sortedBooks/inProgressBooks/completedBooks derive from books', () => {
    booksApi.getBooks.mockResolvedValue([])
    const store = mountStore()
    store.addBook('In progress')
    store.addBook('Done', 2024, 1)

    expect(store.inProgressBooks).toHaveLength(1)
    expect(store.completedBooks).toHaveLength(1)
    expect(store.sortedBooks).toHaveLength(2)
  })

  describe('performMigration', () => {
    it('migrates guest books to the backend and clears guest data', async () => {
      localStorage.setItem('readtrail-books', JSON.stringify([
        { id: 'guest-1', name: 'Guest Book', author: null, coverLink: null, year: null, month: null, attributes: { isUnfinished: false, customCover: false, score: null }, createdAt: new Date().toISOString() }
      ]))
      booksApi.getBooks.mockResolvedValue([])
      booksApi.batchCreateBooks.mockResolvedValue([
        { id: 'real-1', name: 'Guest Book', createdAt: new Date(), updatedAt: new Date() }
      ])

      const store = mountStore()
      const result = await store.performMigration()

      expect(result.success).toBe(true)
      expect(booksApi.batchCreateBooks).toHaveBeenCalled()
      expect(localStorage.getItem('readtrail-books')).toBeNull()
    })
  })

  it('$reset clears local state', () => {
    booksApi.getBooks.mockResolvedValue([])
    const store = mountStore()
    store.addBook('1984')

    store.$reset()

    expect(store.lastError).toBeNull()
    expect(store.booksLoading).toBe(false)
  })
})
