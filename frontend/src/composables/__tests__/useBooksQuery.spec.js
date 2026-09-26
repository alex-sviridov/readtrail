import { describe, it, expect, vi, beforeEach } from 'vitest'
import { defineComponent } from 'vue'
import { mount } from '@vue/test-utils'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { booksApi } from '@/services/booksApi'
import { ensureCoverCached } from '@/services/coverCache'
import { useBooksQuery, useCreateBook, useUpdateBook, useDeleteBook, BOOKS_QUERY_KEY } from '../useBooksQuery'

vi.mock('@/services/booksApi')
vi.mock('@/services/coverCache')

function mountWithQuery(setup) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
  })

  let result
  const TestComponent = defineComponent({
    setup() {
      result = setup()
      return () => null
    }
  })

  const wrapper = mount(TestComponent, {
    global: { plugins: [[VueQueryPlugin, { queryClient }]] }
  })

  return { wrapper, queryClient, get result() { return result } }
}

describe('useBooksQuery', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ensureCoverCached.mockResolvedValue(null)
  })

  it('fetches books via booksApi.getBooks', async () => {
    booksApi.getBooks.mockResolvedValue([{ id: '1', name: 'Dune' }])

    const { result } = mountWithQuery(() => useBooksQuery())
    await vi.waitUntil(() => !result.isLoading.value)

    expect(booksApi.getBooks).toHaveBeenCalled()
    expect(result.data.value).toEqual([{ id: '1', name: 'Dune' }])
  })

  describe('useCreateBook', () => {
    it('optimistically adds the book to the cache, then replaces it with the server result', async () => {
      booksApi.createBook.mockResolvedValue({ id: 'real-1', name: 'Dune' })

      const { queryClient, result } = mountWithQuery(() => useCreateBook())
      queryClient.setQueryData(BOOKS_QUERY_KEY, [])

      const mutationPromise = result.mutateAsync({ tempId: 'temp-1', book: { name: 'Dune' } })

      // Optimistic update happens synchronously within mutate/mutateAsync
      expect(queryClient.getQueryData(BOOKS_QUERY_KEY)).toEqual([{ id: 'temp-1', name: 'Dune' }])

      await mutationPromise

      expect(queryClient.getQueryData(BOOKS_QUERY_KEY)).toEqual([{ id: 'real-1', name: 'Dune' }])
    })

    it('rolls back the optimistic entry on failure', async () => {
      booksApi.createBook.mockRejectedValue(new Error('network error'))

      const { queryClient, result } = mountWithQuery(() => useCreateBook())
      queryClient.setQueryData(BOOKS_QUERY_KEY, [])

      await expect(
        result.mutateAsync({ tempId: 'temp-1', book: { name: 'Dune' } })
      ).rejects.toThrow('network error')

      expect(queryClient.getQueryData(BOOKS_QUERY_KEY)).toEqual([])
    })

    it('patches the cache when ensureCoverCached resolves a cached cover after create', async () => {
      booksApi.createBook.mockResolvedValue({
        id: 'b1',
        name: 'Book',
        coverLink: 'https://x/y.jpg',
        hasCachedCover: false
      })
      ensureCoverCached.mockResolvedValue({
        id: 'b1',
        name: 'Book',
        hasCachedCover: true,
        coverDisplayLink: 'https://cached/y.jpg'
      })

      const { queryClient, result } = mountWithQuery(() => useCreateBook())
      queryClient.setQueryData(BOOKS_QUERY_KEY, [])

      await result.mutateAsync({ tempId: 'temp-1', book: { name: 'Book', coverLink: 'https://x/y.jpg' } })

      expect(ensureCoverCached).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'b1', coverLink: 'https://x/y.jpg' })
      )

      await vi.waitFor(() => {
        const cached = queryClient.getQueryData(BOOKS_QUERY_KEY)
        expect(cached.find((b) => b.id === 'b1')?.coverDisplayLink).toBe('https://cached/y.jpg')
      })
    })
  })

  describe('useUpdateBook', () => {
    it('optimistically applies the update, keeping it on success', async () => {
      booksApi.updateBook.mockResolvedValue({ id: '1', name: 'Dune Messiah' })

      const { queryClient, result } = mountWithQuery(() => useUpdateBook())
      queryClient.setQueryData(BOOKS_QUERY_KEY, [{ id: '1', name: 'Dune' }])

      await result.mutateAsync({ id: '1', updates: { name: 'Dune Messiah' } })

      expect(queryClient.getQueryData(BOOKS_QUERY_KEY)).toEqual([{ id: '1', name: 'Dune Messiah' }])
    })

    it('rolls back the optimistic update on failure', async () => {
      booksApi.updateBook.mockRejectedValue(new Error('network error'))

      const { queryClient, result } = mountWithQuery(() => useUpdateBook())
      queryClient.setQueryData(BOOKS_QUERY_KEY, [{ id: '1', name: 'Dune' }])

      await expect(
        result.mutateAsync({ id: '1', updates: { name: 'Dune Messiah' } })
      ).rejects.toThrow('network error')

      expect(queryClient.getQueryData(BOOKS_QUERY_KEY)).toEqual([{ id: '1', name: 'Dune' }])
    })

    it('patches the cache when ensureCoverCached resolves a cached cover after update', async () => {
      booksApi.updateBook.mockResolvedValue({
        id: '1',
        name: 'Dune',
        coverLink: 'https://x/y.jpg',
        hasCachedCover: false
      })
      ensureCoverCached.mockResolvedValue({
        id: '1',
        name: 'Dune',
        hasCachedCover: true,
        coverDisplayLink: 'https://cached/y.jpg'
      })

      const { queryClient, result } = mountWithQuery(() => useUpdateBook())
      queryClient.setQueryData(BOOKS_QUERY_KEY, [{ id: '1', name: 'Dune' }])

      await result.mutateAsync({ id: '1', updates: { coverLink: 'https://x/y.jpg' } })

      expect(ensureCoverCached).toHaveBeenCalledWith(
        expect.objectContaining({ id: '1', coverLink: 'https://x/y.jpg' })
      )

      await vi.waitFor(() => {
        const cached = queryClient.getQueryData(BOOKS_QUERY_KEY)
        expect(cached.find((b) => b.id === '1')?.coverDisplayLink).toBe('https://cached/y.jpg')
      })
    })
  })

  describe('useDeleteBook', () => {
    it('optimistically removes the book, keeping it removed on success', async () => {
      booksApi.deleteBook.mockResolvedValue(undefined)

      const { queryClient, result } = mountWithQuery(() => useDeleteBook())
      queryClient.setQueryData(BOOKS_QUERY_KEY, [{ id: '1', name: 'Dune' }])

      await result.mutateAsync({ id: '1' })

      expect(queryClient.getQueryData(BOOKS_QUERY_KEY)).toEqual([])
    })

    it('restores the book on failure', async () => {
      booksApi.deleteBook.mockRejectedValue(new Error('network error'))

      const { queryClient, result } = mountWithQuery(() => useDeleteBook())
      queryClient.setQueryData(BOOKS_QUERY_KEY, [{ id: '1', name: 'Dune' }])

      await expect(result.mutateAsync({ id: '1' })).rejects.toThrow()

      expect(queryClient.getQueryData(BOOKS_QUERY_KEY)).toEqual([{ id: '1', name: 'Dune' }])
    })
  })
})
