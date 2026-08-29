import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import Library from '../Library.vue'
import BookSearch from '@/components/library/BookSearch.vue'
import { booksApi } from '@/services/booksApi'
import { isGuestMode } from '@/services/guestMode'

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

describe('Library View', () => {
  let wrapper
  let router
  let queryClient

  beforeEach(async () => {
    vi.clearAllMocks()
    isGuestMode.mockReturnValue(false)
    booksApi.getBooks.mockResolvedValue([])
    localStorage.clear()

    setActivePinia(createPinia())

    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
    })

    router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/library/grid', name: 'library-grid', component: Library }]
    })

    await router.push('/library/grid')
    await router.isReady()
  })

  afterEach(() => {
    wrapper?.unmount()
    localStorage.clear()
  })

  function mountView() {
    return mount(Library, {
      global: {
        plugins: [router, [VueQueryPlugin, { queryClient }]],
        stubs: { BookSearch: true }
      }
    })
  }

  it('passes the search result\'s isUnfinished and score through to booksApi.createBook, not shifted by the missing coverFile slot', async () => {
    booksApi.createBook.mockResolvedValue({ id: 'real-1' })
    wrapper = mountView()
    await flushPromises()

    await wrapper.findComponent(BookSearch).vm.$emit('select', {
      title: 'Dune',
      author: 'Frank Herbert',
      year: 2024,
      month: 3,
      coverLink: 'https://example.com/cover.jpg',
      isUnfinished: false,
      score: 1
    })
    await flushPromises()

    expect(booksApi.createBook).toHaveBeenCalledTimes(1)
    const [sentBook] = booksApi.createBook.mock.calls[0]
    expect(sentBook.attributes.isUnfinished).toBe(false)
    expect(sentBook.attributes.score).toBe(1)
  })
})
