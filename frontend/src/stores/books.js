// frontend/src/stores/books.js
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { useOnline } from '@vueuse/core'
import {
  useBooksQuery,
  useCreateBook,
  useUpdateBook,
  useDeleteBook
} from '@/composables/useBooksQuery'
import { getGuestBooks, clearGuestData } from '@/services/guestStore'
import { migrateLocalDataToBackend } from '@/services/migration'
import { logger } from '@/utils/logger'
import { sortBooks } from '@/utils/bookSorting'

let idCounter = 0

export const useBooksStore = defineStore('books', () => {
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

  function addBook(name, year = null, month = null, author = null, coverLink = null, coverFile = null, isUnfinished = false, score = null) {
    const tempId = generateTempId()
    const book = {
      id: tempId,
      name,
      author,
      coverLink,
      coverDisplayLink: coverLink,
      year,
      month,
      attributes: { isUnfinished, score: score ?? null },
      createdAt: new Date()
    }

    createBookMutation.mutate(
      { tempId, book: { ...book, coverFile } },
      { onError: () => { lastError.value = 'Failed to save book' } }
    )

    return book
  }

  function updateBookFields(id, updates) {
    if (!books.value.some((book) => book.id === id)) return false

    updateBookMutation.mutate(
      { id, updates },
      { onError: () => { lastError.value = 'Failed to update book' } }
    )

    return true
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

    deleteBookMutation.mutate(
      { id },
      { onError: () => { lastError.value = 'Failed to delete book' } }
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
