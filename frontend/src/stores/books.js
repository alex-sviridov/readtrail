// frontend/src/stores/books.js
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { useOnline } from '@vueuse/core'
import { useToast } from 'vue-toastification'
import { useQueryClient } from '@tanstack/vue-query'
import {
  useBooksQuery,
  useCreateBook,
  useUpdateBook,
  useDeleteBook,
  BOOKS_QUERY_KEY
} from '@/composables/useBooksQuery'
import { getGuestBooks, clearGuestData } from '@/services/guestStore'
import { migrateLocalDataToBackend } from '@/services/migration'
import { logger } from '@/utils/logger'
import { sortBooks } from '@/utils/bookSorting'

let idCounter = 0

/**
 * A `temp-` id is a client-side placeholder for a book whose create
 * mutation hasn't resolved yet — the backend knows nothing about it.
 * (Guest-mode ids start with `guest-` and ARE real, permanent ids.)
 */
function isTempId(id) {
  return typeof id === 'string' && id.startsWith('temp-')
}

export const useBooksStore = defineStore('books', () => {
  const toast = useToast()
  const queryClient = useQueryClient()
  const booksQuery = useBooksQuery()
  const createBookMutation = useCreateBook()
  const updateBookMutation = useUpdateBook()
  const deleteBookMutation = useDeleteBook()

  const books = computed(() => booksQuery.data.value ?? [])
  const booksLoading = computed(() => booksQuery.isLoading.value)
  const lastError = ref(null)
  const isOnline = useOnline()

  const sortedBooks = computed(() => sortBooks(books.value))
  const inProgressBooks = computed(() => books.value.filter((book) => !book.year && !book.month))
  const completedBooks = computed(() => books.value.filter((book) => book.year && book.month))

  function generateTempId() {
    return `temp-${Date.now()}-${idCounter++}`
  }

  /** Re-trigger the books query (kept for API compatibility with main.js). */
  function loadBooks() {
    return booksQuery.refetch()
  }

  function addBook({ name, year = null, month = null, author = null, coverLink = null, coverFile = null, isUnfinished = false, score = null }) {
    const tempId = generateTempId()
    const book = {
      id: tempId,
      name,
      author,
      coverLink,
      coverDisplayLink: coverLink,
      year,
      month,
      attributes: { isUnfinished, score: score ?? null, customCover: false },
      createdAt: new Date()
    }

    createBookMutation.mutate(
      { tempId, book: { ...book, coverFile } },
      {
        onSuccess: () => { lastError.value = null },
        onError: () => {
          lastError.value = 'Failed to save book'
          toast.error('Failed to save book. Please try again.')
        }
      }
    )

    return book
  }

  function updateBookFields(id, updates) {
    if (!books.value.some((book) => book.id === id)) return false

    if (isTempId(id)) {
      // The book's create mutation hasn't resolved, so the backend has no
      // record to update — calling it would 404 and roll the edit back.
      // Apply the change to the optimistic cache entry only.
      applyLocalUpdate(id, updates)
      logger.debug(
        '[BooksStore] Edited a book whose create is still pending; the change is local only and will not persist if the create resolves first:',
        id
      )
      return true
    }

    updateBookMutation.mutate(
      { id, updates },
      {
        onSuccess: () => { lastError.value = null },
        onError: () => {
          lastError.value = 'Failed to update book'
          toast.error('Failed to save book. Please try again.')
        }
      }
    )

    return true
  }

  /** Merge `updates` into the cached book, mirroring the mutation's optimistic merge. */
  function applyLocalUpdate(id, updates) {
    const current = queryClient.getQueryData(BOOKS_QUERY_KEY) ?? []
    const { attributes, coverFile, ...rest } = updates
    void coverFile

    if (rest.coverLink !== undefined && !rest.coverDisplayLink) {
      rest.coverDisplayLink = rest.coverLink
    }

    queryClient.setQueryData(
      BOOKS_QUERY_KEY,
      current.map((book) =>
        book.id === id
          ? { ...book, ...rest, ...(attributes ? { attributes: { ...book.attributes, ...attributes } } : {}) }
          : book
      )
    )
  }

  function updateBook(id, name, year = null, month = null, author = null, coverLink = null) {
    return updateBookFields(id, { name, author, coverLink, year, month })
  }

  function updateBookStatus(id, year = null, month = null, isUnfinished = false, score = null) {
    const finalScore = (year === null && month === null) ? 0 : score

    return updateBookFields(id, {
      year,
      month,
      attributes: { isUnfinished, score: finalScore }
    })
  }

  function deleteBook(id) {
    if (!books.value.some((book) => book.id === id)) return false

    if (isTempId(id)) {
      // Never created on the backend yet — just drop the optimistic entry.
      const current = queryClient.getQueryData(BOOKS_QUERY_KEY) ?? []
      queryClient.setQueryData(BOOKS_QUERY_KEY, current.filter((book) => book.id !== id))
      logger.debug(
        '[BooksStore] Deleted a book whose create is still pending; if the create resolves it will reappear:',
        id
      )
      return true
    }

    deleteBookMutation.mutate(
      { id },
      {
        onSuccess: () => { lastError.value = null },
        onError: () => {
          lastError.value = 'Failed to delete book'
          toast.error('Failed to delete book. Please try again.')
        }
      }
    )

    return true
  }

  function findBookById(id) {
    return books.value.find((book) => book.id === id)
  }

  /**
   * Migrate guest-mode books to the backend. Called right after a
   * successful login/register, while `books.value` may still be stale —
   * reads the guest data directly instead.
   */
  async function performMigration() {
    const guestBooks = getGuestBooks()
    const result = await migrateLocalDataToBackend(guestBooks, isOnline.value, null)

    if (result.success) {
      clearGuestData()
      if (result.migratedCount > 0) {
        window.dispatchEvent(new CustomEvent('migration-success', { detail: { count: result.migratedCount } }))
      }
    } else if (result.reason === 'error') {
      lastError.value = 'Failed to migrate data to backend'
      window.dispatchEvent(new CustomEvent('migration-error', { detail: { error: result.error } }))
      logger.error('[BooksStore] Migration failed:', result.error)
    }

    return result
  }

  function $reset() {
    lastError.value = null
  }

  return {
    books,
    lastError,
    booksLoading,
    isOnline,
    sortedBooks,
    inProgressBooks,
    completedBooks,
    loadBooks,
    addBook,
    updateBook,
    updateBookStatus,
    updateBookFields,
    deleteBook,
    findBookById,
    performMigration,
    $reset
  }
})
