import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import Home from '../views/Home.vue'
import { useBooksStore } from '../stores/books'
import BookForm from '../components/BookForm.vue'
import BookCard from '../components/library/BookCard.vue'

describe('Home.vue', () => {
  let wrapper
  let pinia

  beforeEach(() => {
    // Create a fresh Pinia instance for each test
    pinia = createPinia()

    // Mock localStorage
    globalThis.localStorage = {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn()
    }
  })

  const mountComponent = () => {
    return mount(Home, {
      global: {
        plugins: [pinia]
      }
    })
  }

  describe('Component Rendering', () => {
    it('renders the page title', () => {
      wrapper = mountComponent()
      expect(wrapper.text()).toContain('FlexLib - My Reading List')
    })

    it('renders the subtitle', () => {
      wrapper = mountComponent()
      expect(wrapper.text()).toContain('Track your reading journey')
    })

    it('renders the BookForm component', () => {
      wrapper = mountComponent()
      expect(wrapper.findComponent(BookForm).exists()).toBe(true)
    })

    it('displays empty state when no books exist', () => {
      wrapper = mountComponent()
      expect(wrapper.text()).toContain('No books yet')
      expect(wrapper.text()).toContain('Add your first book to start tracking your reading!')
    })

    it('does not display empty state when books exist', async () => {
      wrapper = mountComponent()
      const booksStore = useBooksStore(pinia)

      // Add a book to the store
      booksStore.addBook('Test Book', null)

      await wrapper.vm.$nextTick()
      expect(wrapper.text()).not.toContain('Add your first book to start tracking your reading!')
    })
  })

  describe('Book Display', () => {
    it('renders BookCard components for each book', async () => {
      wrapper = mountComponent()
      const booksStore = useBooksStore(pinia)

      // Add books to the store
      booksStore.addBook('Book 1', null)
      booksStore.addBook('Book 2', new Date(2024, 0, 1))

      await wrapper.vm.$nextTick()

      const bookCards = wrapper.findAllComponents(BookCard)
      expect(bookCards).toHaveLength(2)
    })

    it('passes correct book data to BookCard components', async () => {
      wrapper = mountComponent()
      const booksStore = useBooksStore(pinia)

      const book = booksStore.addBook('Test Book', null)
      await wrapper.vm.$nextTick()

      const bookCard = wrapper.findComponent(BookCard)
      expect(bookCard.props('book').name).toBe('Test Book')
      expect(bookCard.props('book').id).toBe(book.id)
    })

    it('displays books in sorted order', async () => {
      wrapper = mountComponent()
      const booksStore = useBooksStore(pinia)

      // Add completed book first, then in-progress book
      booksStore.addBook('Completed Book', new Date(2024, 5, 1))
      booksStore.addBook('In Progress Book', null)

      await wrapper.vm.$nextTick()

      const bookCards = wrapper.findAllComponents(BookCard)

      // In-progress book should come first
      expect(bookCards[0].props('book').name).toBe('In Progress Book')
      expect(bookCards[1].props('book').name).toBe('Completed Book')
    })
  })

  describe('Book Addition', () => {
    it('handles adding a book without completion date (in-progress)', async () => {
      wrapper = mountComponent()
      const booksStore = useBooksStore(pinia)

      const initialCount = booksStore.books.length

      const bookForm = wrapper.findComponent(BookForm)
      await bookForm.vm.$emit('submit', {
        name: 'New Book',
        year: null,
        month: null
      })

      await wrapper.vm.$nextTick()

      expect(booksStore.books.length).toBe(initialCount + 1)
      expect(booksStore.books[booksStore.books.length - 1].name).toBe('New Book')
      expect(booksStore.books[booksStore.books.length - 1].completedAt).toBe(null)
    })

    it('handles adding a book with completion date', async () => {
      wrapper = mountComponent()
      const booksStore = useBooksStore(pinia)

      const initialCount = booksStore.books.length

      const bookForm = wrapper.findComponent(BookForm)
      await bookForm.vm.$emit('submit', {
        name: 'Completed Book',
        year: 2024,
        month: 6
      })

      await wrapper.vm.$nextTick()

      expect(booksStore.books.length).toBe(initialCount + 1)
      const addedBook = booksStore.books[booksStore.books.length - 1]
      expect(addedBook.name).toBe('Completed Book')
      expect(addedBook.completedAt).toBeInstanceOf(Date)
      expect(addedBook.completedAt.getFullYear()).toBe(2024)
      expect(addedBook.completedAt.getMonth()).toBe(5) // 0-indexed, so 5 = June
      expect(addedBook.completedAt.getDate()).toBe(1)
    })
  })

  describe('Book Updates', () => {
    it('handles updating a book without completion date', async () => {
      wrapper = mountComponent()
      const booksStore = useBooksStore(pinia)

      const book = booksStore.addBook('Test Book', null)
      await wrapper.vm.$nextTick()

      const bookCard = wrapper.findComponent(BookCard)
      await bookCard.vm.$emit('update', {
        id: book.id,
        name: 'Updated Book',
        year: null,
        month: null
      })

      await wrapper.vm.$nextTick()

      const updatedBook = booksStore.books.find(b => b.id === book.id)
      expect(updatedBook.name).toBe('Updated Book')
      expect(updatedBook.completedAt).toBe(null)
    })

    it('handles updating a book with completion date', async () => {
      wrapper = mountComponent()
      const booksStore = useBooksStore(pinia)

      const book = booksStore.addBook('Test Book', new Date(2024, 0, 1))
      await wrapper.vm.$nextTick()

      const bookCard = wrapper.findComponent(BookCard)
      await bookCard.vm.$emit('update', {
        id: book.id,
        name: 'Updated Book',
        year: 2024,
        month: 12
      })

      await wrapper.vm.$nextTick()

      const updatedBook = booksStore.books.find(b => b.id === book.id)
      expect(updatedBook.name).toBe('Updated Book')
      expect(updatedBook.completedAt.getFullYear()).toBe(2024)
      expect(updatedBook.completedAt.getMonth()).toBe(11) // 0-indexed, so 11 = December
      expect(updatedBook.completedAt.getDate()).toBe(1)
    })
  })

  describe('Book Deletion', () => {
    it('handles deleting a book', async () => {
      wrapper = mountComponent()
      const booksStore = useBooksStore(pinia)

      const book = booksStore.addBook('Test Book', null)
      await wrapper.vm.$nextTick()

      const initialCount = booksStore.books.length

      // Mock the confirm dialog to always return true
      globalThis.confirm = vi.fn(() => true)

      const bookCard = wrapper.findComponent(BookCard)
      await bookCard.vm.$emit('delete', book.id)

      await wrapper.vm.$nextTick()

      expect(booksStore.books.length).toBe(initialCount - 1)
      expect(booksStore.books.find(b => b.id === book.id)).toBe(undefined)
    })
  })

  describe('Mark as Completed', () => {
    it('handles marking a book as completed', async () => {
      wrapper = mountComponent()
      const booksStore = useBooksStore(pinia)

      const book = booksStore.addBook('Test Book', null)
      await wrapper.vm.$nextTick()

      expect(book.completedAt).toBe(null)

      const bookCard = wrapper.findComponent(BookCard)
      await bookCard.vm.$emit('markCompleted', {
        id: book.id,
        year: 2024,
        month: 7
      })

      await wrapper.vm.$nextTick()

      const updatedBook = booksStore.books.find(b => b.id === book.id)
      expect(updatedBook.completedAt).toBeInstanceOf(Date)
      expect(updatedBook.completedAt.getFullYear()).toBe(2024)
      expect(updatedBook.completedAt.getMonth()).toBe(6) // 0-indexed, so 6 = July
      expect(updatedBook.completedAt.getDate()).toBe(1)
    })
  })

  describe('Date Conversion', () => {
    it('correctly converts year and month to Date object (January)', async () => {
      wrapper = mountComponent()
      const booksStore = useBooksStore(pinia)

      const bookForm = wrapper.findComponent(BookForm)
      await bookForm.vm.$emit('submit', {
        name: 'Test Book',
        year: 2024,
        month: 1
      })

      await wrapper.vm.$nextTick()

      const addedBook = booksStore.books[booksStore.books.length - 1]
      expect(addedBook.completedAt.getFullYear()).toBe(2024)
      expect(addedBook.completedAt.getMonth()).toBe(0) // 0-indexed
      expect(addedBook.completedAt.getDate()).toBe(1)
    })

    it('correctly converts year and month to Date object (December)', async () => {
      wrapper = mountComponent()
      const booksStore = useBooksStore(pinia)

      const bookForm = wrapper.findComponent(BookForm)
      await bookForm.vm.$emit('submit', {
        name: 'Test Book',
        year: 2024,
        month: 12
      })

      await wrapper.vm.$nextTick()

      const addedBook = booksStore.books[booksStore.books.length - 1]
      expect(addedBook.completedAt.getFullYear()).toBe(2024)
      expect(addedBook.completedAt.getMonth()).toBe(11) // 0-indexed
      expect(addedBook.completedAt.getDate()).toBe(1)
    })
  })

  describe('Component Lifecycle', () => {
    it('uses books from the store', () => {
      // Add books to the store
      wrapper = mountComponent()
      const booksStore = useBooksStore(pinia)

      booksStore.addBook('Test Book')

      // Verify the component displays the books from the store
      expect(booksStore.books.length).toBeGreaterThan(0)
    })
  })

  describe('Responsive Grid Layout', () => {
    it('applies responsive grid classes', () => {
      wrapper = mountComponent()
      const gridElement = wrapper.find('.grid')

      expect(gridElement.classes()).toContain('grid-cols-1')
      expect(gridElement.classes()).toContain('md:grid-cols-2')
      expect(gridElement.classes()).toContain('lg:grid-cols-3')
    })

    it('applies gap spacing', () => {
      wrapper = mountComponent()
      const gridElement = wrapper.find('.grid')
      expect(gridElement.classes()).toContain('gap-6')
    })
  })

  describe('Integration Tests', () => {
    it('adds multiple books and displays them in correct order', async () => {
      wrapper = mountComponent()
      const booksStore = useBooksStore(pinia)

      // Add books in different order
      booksStore.addBook('Completed Book 1', new Date(2024, 5, 1))
      booksStore.addBook('In Progress Book', null)
      booksStore.addBook('Completed Book 2', new Date(2024, 7, 1))

      await wrapper.vm.$nextTick()

      const bookCards = wrapper.findAllComponents(BookCard)
      expect(bookCards).toHaveLength(3)

      // In-progress should be first
      expect(bookCards[0].props('book').name).toBe('In Progress Book')

      // More recent completed book should be second (August before June)
      expect(bookCards[1].props('book').name).toBe('Completed Book 2')
      expect(bookCards[2].props('book').name).toBe('Completed Book 1')
    })

    it('updates and deletes books correctly', async () => {
      wrapper = mountComponent()
      const booksStore = useBooksStore(pinia)

      const book1 = booksStore.addBook('Book 1', null)
      const book2 = booksStore.addBook('Book 2', null)

      await wrapper.vm.$nextTick()

      expect(booksStore.books.length).toBe(2)

      // Update first book
      const bookCards = wrapper.findAllComponents(BookCard)
      await bookCards[0].vm.$emit('update', {
        id: book1.id,
        name: 'Updated Book 1',
        year: null,
        month: null
      })

      await wrapper.vm.$nextTick()

      expect(booksStore.books[0].name).toBe('Updated Book 1')

      // Delete second book
      globalThis.confirm = vi.fn(() => true)
      await bookCards[1].vm.$emit('delete', book2.id)

      await wrapper.vm.$nextTick()

      expect(booksStore.books.length).toBe(1)
    })
  })
})
