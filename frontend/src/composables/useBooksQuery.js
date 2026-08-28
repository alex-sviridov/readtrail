/**
 * TanStack Query composables for books: one query, three mutations.
 * Mutations use optimistic updates against the ['books'] cache entry and
 * roll back on failure — there is no retry queue, a failed write just
 * surfaces an error to the caller.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import { booksApi } from '@/services/booksApi'
import { logger } from '@/utils/logger'

export const BOOKS_QUERY_KEY = ['books']

export function useBooksQuery() {
  return useQuery({
    queryKey: BOOKS_QUERY_KEY,
    queryFn: () => booksApi.getBooks()
  })
}

export function useCreateBook() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ book }) => booksApi.createBook(book),
    onMutate: async ({ tempId, book }) => {
      const previousBooks = queryClient.getQueryData(BOOKS_QUERY_KEY) ?? []
      const { coverFile, ...optimisticFields } = book
      void coverFile
      const optimisticBook = { ...optimisticFields, id: tempId }

      queryClient.setQueryData(BOOKS_QUERY_KEY, [...previousBooks, optimisticBook])

      await queryClient.cancelQueries({ queryKey: BOOKS_QUERY_KEY })

      return { previousBooks, tempId }
    },
    onError: (error, _variables, context) => {
      logger.error('[useCreateBook] Create failed:', error)
      if (context?.previousBooks) {
        queryClient.setQueryData(BOOKS_QUERY_KEY, context.previousBooks)
      }
    },
    onSuccess: (createdBook, _variables, context) => {
      const current = queryClient.getQueryData(BOOKS_QUERY_KEY) ?? []
      queryClient.setQueryData(
        BOOKS_QUERY_KEY,
        current.map((book) => (book.id === context.tempId ? createdBook : book))
      )
    }
  })
}

export function useUpdateBook() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, updates }) => booksApi.updateBook(id, updates),
    onMutate: async ({ id, updates }) => {
      const previousBooks = queryClient.getQueryData(BOOKS_QUERY_KEY) ?? []
      const { attributes, coverFile, ...rest } = updates
      void coverFile

      queryClient.setQueryData(
        BOOKS_QUERY_KEY,
        previousBooks.map((book) =>
          book.id === id
            ? { ...book, ...rest, ...(attributes ? { attributes: { ...book.attributes, ...attributes } } : {}) }
            : book
        )
      )

      await queryClient.cancelQueries({ queryKey: BOOKS_QUERY_KEY })

      return { previousBooks }
    },
    onError: (error, _variables, context) => {
      logger.error('[useUpdateBook] Update failed:', error)
      if (context?.previousBooks) {
        queryClient.setQueryData(BOOKS_QUERY_KEY, context.previousBooks)
      }
    },
    onSuccess: (updatedBook) => {
      const current = queryClient.getQueryData(BOOKS_QUERY_KEY) ?? []
      queryClient.setQueryData(
        BOOKS_QUERY_KEY,
        current.map((book) => (book.id === updatedBook.id ? updatedBook : book))
      )
    }
  })
}

export function useDeleteBook() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id }) => booksApi.deleteBook(id),
    onMutate: async ({ id }) => {
      const previousBooks = queryClient.getQueryData(BOOKS_QUERY_KEY) ?? []

      queryClient.setQueryData(
        BOOKS_QUERY_KEY,
        previousBooks.filter((book) => book.id !== id)
      )

      await queryClient.cancelQueries({ queryKey: BOOKS_QUERY_KEY })

      return { previousBooks }
    },
    onError: (error, _variables, context) => {
      logger.error('[useDeleteBook] Delete failed:', error)
      if (context?.previousBooks) {
        queryClient.setQueryData(BOOKS_QUERY_KEY, context.previousBooks)
      }
    }
  })
}
