import { ref, computed } from 'vue'
import { TIMINGS } from '@/constants'
import { logger } from '@/utils/logger'

const API_BASE_URL = import.meta.env.VITE_OPEN_LIBRARY_API_URL || 'https://openlibrary.org'
const SEARCH_LIMIT = 20

const STATUS_MESSAGES = {
  400: 'Invalid search query. Please check your input.',
  404: 'Search service not found. Please try again later.',
  429: 'Too many requests. Please wait a moment and try again.',
  500: 'Search service is experiencing issues. Please try again later.',
  503: 'Search service is temporarily unavailable. Please try again later.'
}

/**
 * Debounced OpenLibrary title/author search with request cancellation and
 * a client-side timeout that actually aborts the in-flight request (rather
 * than just abandoning it) so a stale response can't land after the user
 * has already been shown a timeout error.
 */
export function useOpenLibrarySearch() {
  const titleQuery = ref('')
  const authorQuery = ref('')
  const searchResults = ref([])
  const isLoading = ref(false)
  const error = ref(null)

  let debounceTimeout = null
  let abortController = null

  const hasSearchQuery = computed(() => {
    return titleQuery.value.trim() || authorQuery.value.trim()
  })

  function cancelPendingRequest() {
    if (abortController) {
      abortController.abort()
      abortController = null
    }
  }

  function handleSearchInput() {
    clearTimeout(debounceTimeout)
    cancelPendingRequest()

    if (!hasSearchQuery.value) {
      searchResults.value = []
      error.value = null
      return
    }

    debounceTimeout = setTimeout(() => {
      performSearch()
    }, TIMINGS.SEARCH_DEBOUNCE)
  }

  async function performSearch() {
    const queryParams = []
    const title = titleQuery.value.trim()
    const author = authorQuery.value.trim()

    if (title) {
      queryParams.push(`title=${encodeURIComponent(title)}`)
    }
    if (author) {
      queryParams.push(`author=${encodeURIComponent(author)}`)
    }

    if (queryParams.length === 0) return

    cancelPendingRequest()

    const controller = new AbortController()
    abortController = controller

    let timedOut = false
    const timeoutId = setTimeout(() => {
      timedOut = true
      controller.abort()
    }, TIMINGS.API_TIMEOUT)

    isLoading.value = true
    error.value = null

    try {
      const url = `${API_BASE_URL}/search.json?${queryParams.join('&')}&limit=${SEARCH_LIMIT}`

      const response = await fetch(url, { signal: controller.signal })

      if (!response.ok) {
        const message = STATUS_MESSAGES[response.status] ||
          `Search failed with status ${response.status}. Please try again.`

        throw new Error(message)
      }

      const data = await response.json()
      searchResults.value = data.docs || []
    } catch (err) {
      if (err.name === 'AbortError') {
        if (timedOut) {
          error.value = 'Search request timed out. Please check your connection and try again.'
        }
        // Otherwise this request was superseded by a newer search - ignore.
        return
      }

      if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
        error.value = 'Network error. Please check your internet connection.'
      } else {
        error.value = err.message || 'Failed to search for books. Please try again.'
      }

      logger.error('Search error:', err)
    } finally {
      clearTimeout(timeoutId)
      isLoading.value = false
      if (abortController === controller) {
        abortController = null
      }
    }
  }

  function reset() {
    cancelPendingRequest()
    clearTimeout(debounceTimeout)
    titleQuery.value = ''
    authorQuery.value = ''
    searchResults.value = []
    error.value = null
    isLoading.value = false
  }

  function cleanup() {
    cancelPendingRequest()
    clearTimeout(debounceTimeout)
  }

  return {
    titleQuery,
    authorQuery,
    searchResults,
    isLoading,
    error,
    hasSearchQuery,
    handleSearchInput,
    reset,
    cleanup
  }
}
