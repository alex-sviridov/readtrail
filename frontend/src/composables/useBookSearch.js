import { ref, computed, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'

/**
 * Composable for book search functionality
 * Handles search state, URL persistence, and filtering
 */
export function useBookSearch(books) {
  const router = useRouter()
  const route = useRoute()

  const searchQuery = ref(route.query.search || '')

  // Debounced URL update on search change
  let debounceTimeout = null
  watch(searchQuery, (newValue) => {
    clearTimeout(debounceTimeout)
    debounceTimeout = setTimeout(() => {
      router.push({
        query: {
          ...route.query,
          search: newValue.trim() || undefined
        }
      })
    }, 300)
  })

  // Sync search from URL changes (back/forward navigation)
  watch(() => route.query.search, (newValue) => {
    searchQuery.value = newValue || ''
  })

  // Filter books by search query
  const searchedBooks = computed(() => {
    const query = searchQuery.value.toLowerCase().trim()
    if (!query) return books.value

    return books.value.filter(book => {
      // Searchable fields - easy to extend
      const name = (book.name || '').toLowerCase()
      const author = (book.author || '').toLowerCase()
      const year = book.year ? String(book.year) : ''

      return name.includes(query) || author.includes(query) || year.includes(query)
    })
  })

  return {
    searchQuery,
    searchedBooks
  }
}
