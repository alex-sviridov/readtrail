/**
 * Runs a Goodreads CSV import: parse and map in the browser, look up covers
 * through /api/books/search, then post small chunks to /api/books/import.
 * Chunks are saved as they go, and books already in the library are skipped,
 * so a cancelled or failed run can simply be repeated.
 */
import { computed, ref } from 'vue'
import { useMutation, useQueryClient } from '@tanstack/vue-query'
import pb from '@/services/pocketbase'
import { booksApi } from '@/services/booksApi'
import { BOOKS_QUERY_KEY } from '@/composables/useBooksQuery'
import { logger } from '@/utils/logger'
import {
  GoodreadsImportError,
  cleanTitleForSearch,
  coverUrlFromDocs,
  mapRow,
  parseGoodreadsCsv,
  validateFile
} from '@/utils/goodreadsImport'

const CHUNK_SIZE = 20
const LOOKUP_CONCURRENCY = 3
const RATE_LIMITED_STATUSES = [429, 503]

const bookKey = (name, author) => `${name}\u0000${author || ''}`

export function useGoodreadsImport() {
  const queryClient = useQueryClient()
  const progress = ref({ done: 0, total: 0 })
  let controller = null

  const mutation = useMutation({
    mutationFn: async (file) => {
      validateFile(file)
      const rows = parseGoodreadsCsv(await file.text())

      const errors = []
      const candidates = []
      rows.forEach((row, rowIndex) => {
        const { book, error } = mapRow(row)
        if (error) errors.push({ index: rowIndex, reason: error })
        else candidates.push({ rowIndex, book })
      })

      const existing = await queryClient.ensureQueryData({
        queryKey: BOOKS_QUERY_KEY,
        queryFn: () => booksApi.getBooks()
      })
      const inLibrary = new Set(existing.map((b) => bookKey(b.name, b.author)))
      const toImport = candidates.filter(({ book }) => !inLibrary.has(bookKey(book.name, book.author)))

      let imported = 0
      let skipped = candidates.length - toImport.length
      const covers = { found: 0, notFound: 0, skipped: 0 }
      let lookupsStopped = false

      controller = new AbortController()
      const { signal } = controller
      progress.value = { done: 0, total: toImport.length }

      async function lookupCover(book) {
        if (lookupsStopped) {
          covers.skipped++
          return
        }
        try {
          const { docs } = await pb.send('/api/books/search', {
            query: { title: cleanTitleForSearch(book.name), author: book.author },
            requestKey: null,
            signal
          })
          const url = coverUrlFromDocs(docs)
          if (url) {
            book.cover_url = url
            covers.found++
          } else {
            covers.notFound++
          }
        } catch (error) {
          if (signal.aborted) return
          if (RATE_LIMITED_STATUSES.includes(error?.status)) {
            lookupsStopped = true
            covers.skipped++
          } else {
            covers.notFound++
          }
        }
      }

      for (let i = 0; i < toImport.length; i += CHUNK_SIZE) {
        const chunk = toImport.slice(i, i + CHUNK_SIZE)

        for (let j = 0; j < chunk.length; j += LOOKUP_CONCURRENCY) {
          await Promise.all(chunk.slice(j, j + LOOKUP_CONCURRENCY).map(({ book }) => lookupCover(book)))
        }

        try {
          if (signal.aborted) break
          const result = await pb.send('/api/books/import', {
            method: 'POST',
            body: { version: 1, books: chunk.map(({ book }) => book) },
            requestKey: null,
            signal
          })
          imported += result.imported
          skipped += result.skipped
          result.errors.forEach((e) => errors.push({ index: chunk[e.index].rowIndex, reason: e.reason }))
        } catch (error) {
          if (signal.aborted) break
          throw error
        }

        progress.value = { done: i + chunk.length, total: toImport.length }
      }

      errors.sort((a, b) => a.index - b.index)
      return { imported, skipped, errors, covers, cancelled: signal.aborted }
    },
    onError: (error) => logger.error('[useGoodreadsImport] Import failed:', error),
    onSettled: () => queryClient.invalidateQueries({ queryKey: BOOKS_QUERY_KEY })
  })

  const errorMessage = computed(() => {
    const error = mutation.error.value
    if (!error) return ''
    if (error instanceof GoodreadsImportError) return error.message
    return 'Import failed. Books imported before the failure were kept; run the import again to continue.'
  })

  return {
    importFile: mutation.mutate,
    cancel: () => controller?.abort(),
    isImporting: mutation.isPending,
    result: mutation.data,
    errorMessage,
    progress
  }
}
