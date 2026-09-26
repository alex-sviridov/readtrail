import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import LibraryTable from '../LibraryTable.vue'
import BooksTable from '@/components/library/BooksTable.vue'
import { booksApi } from '@/services/booksApi'
import { isGuestMode } from '@/services/guestMode'
import { useBooksStore } from '@/stores/books'

vi.mock('@/services/booksApi')
vi.mock('@/services/guestMode')

vi.mock('vue-toastification', () => ({
  useToast: () => ({
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn()
  }),
  POSITION: { TOP_RIGHT: 'top-right' }
}))

describe('LibraryTable View', () => {
  let wrapper
  let router
  let queryClient

  const books = [
    { id: '1', name: 'Dune', author: 'Frank Herbert', year: 2020, month: 1, attributes: {} },
    { id: '2', name: 'Foundation', author: 'Isaac Asimov', year: 2021, month: 1, attributes: {} }
  ]

  beforeEach(async () => {
    vi.clearAllMocks()
    isGuestMode.mockReturnValue(false)
    booksApi.getBooks.mockResolvedValue(books)
    booksApi.updateBook.mockImplementation((id, updates) => Promise.resolve({ ...books.find((b) => b.id === id), ...updates }))
    localStorage.clear()

    setActivePinia(createPinia())

    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
    })

    router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/library/table', name: 'library-table', component: LibraryTable }]
    })

    await router.push('/library/table')
    await router.isReady()
  })

  afterEach(() => {
    wrapper?.unmount()
    localStorage.clear()
  })

  function mountView() {
    return mount(LibraryTable, {
      global: {
        plugins: [router, [VueQueryPlugin, { queryClient }]],
        stubs: { BookSearch: true, BooksTable: true }
      }
    })
  }

  it('filters the books passed to BooksTable when typing in the header search box', async () => {
    wrapper = mountView()
    await flushPromises()

    expect(wrapper.findComponent(BooksTable).props('books')).toHaveLength(2)

    await wrapper.get('input[aria-label="Search books by title, author, or year"]').setValue('dune')
    await flushPromises()

    const filtered = wrapper.findComponent(BooksTable).props('books')
    expect(filtered).toHaveLength(1)
    expect(filtered[0].name).toBe('Dune')
  })

  it('does not drop a title update when cleared to an empty string', async () => {
    wrapper = mountView()
    await flushPromises()

    const store = useBooksStore()
    const spy = vi.spyOn(store, 'updateBookFields')

    await wrapper.findComponent(BooksTable).vm.$emit('update-title', { id: '1', title: '' })

    expect(spy).toHaveBeenCalledWith('1', { name: '' })
  })

  it('does not drop an author update when cleared to an empty string', async () => {
    wrapper = mountView()
    await flushPromises()

    const store = useBooksStore()
    const spy = vi.spyOn(store, 'updateBookFields')

    await wrapper.findComponent(BooksTable).vm.$emit('update-author', { id: '1', author: '' })

    expect(spy).toHaveBeenCalledWith('1', { author: '' })
  })
})
