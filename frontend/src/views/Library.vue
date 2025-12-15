<template>
  <div class="container mx-auto px-4 py-8 max-w-7xl">
    <!-- Header with Add Book Button -->
    <LibraryHeader
      :view-mode="viewMode"
      :hide-unfinished="hideUnfinished"
      :search-query="searchQuery"
      @update:search-query="searchQuery = $event"
      @set-view-mode="setViewMode"
      @toggle-filter="toggleFilter"
      @add-book="openSearchModal"
    />

    <!-- Empty State -->
    <div v-if="filteredBooks.length === 0" class="flex flex-col items-center justify-center py-16 px-4">
      <div class="text-center max-w-md">
        <svg
          class="mx-auto h-24 w-24 text-gray-400 mb-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="1.5"
            d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
          />
        </svg>
        <h3 class="text-2xl font-semibold text-gray-900 mb-2">Your library is empty</h3>
        <p class="text-gray-600 mb-6">
          Start tracking your reading journey by adding your first book. You can search for books and add them to your collection.
        </p>
        <button
          @click="openSearchModal"
          class="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
        >
          <svg class="mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          Add Your First Book
        </button>
      </div>
    </div>

    <!-- Grid View -->
    <div v-if="viewMode === 'grid' && filteredBooks.length > 0" class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
      <BookCard
        v-for="book in filteredBooks"
        :key="book.id"
        :book="book"
      />
    </div>

    <!-- Timeline View -->
    <div v-else-if="viewMode === 'timeline' && filteredBooks.length > 0">
      <div v-for="(group, index) in booksGroupedByYear" :key="group.year || 'in-progress'">
        <div v-if="index > 0" class="my-8 border-t-2 border-gray-300"></div>
        <div class="mb-2">
          <h2 class="text-2xl font-semibold text-gray-800">
            {{ BOOK_STATUS.getTimelineLabel(group.year) }}
          </h2>
        </div>
        <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6 mb-8">
          <BookCard
            v-for="book in group.books"
            :key="book.id"
            :book="book"
          />
        </div>
      </div>
    </div>

    <!-- Book Search Modal -->
    <BookSearch
      :is-open="isSearchModalOpen"
      @close="closeSearchModal"
      @select="handleBookSelect"
    />
  </div>
</template>

<script setup>
import { ref, computed, watch, provide } from 'vue'
import { storeToRefs } from 'pinia'
import { useRouter, useRoute } from 'vue-router'
import { useBooksStore } from '@/stores/books'
import { useSettingsStore } from '@/stores/settings'
import { useBookSearch } from '@/composables/useBookSearch'
import { BOOK_STATUS } from '@/constants'
import BookCard from '@/components/library/BookCard.vue'
import BookSearch from '@/components/library/BookSearch.vue'
import LibraryHeader from '@/components/library/LibraryHeader.vue'

defineOptions({
  name: 'LibraryPage'
})

// Router
const router = useRouter()
const route = useRoute()

// Initialize the books store
const booksStore = useBooksStore()
const { sortedBooks } = storeToRefs(booksStore)

// Provide booksStore to child components
provide('booksStore', booksStore)

// Initialize the settings store
const settingsStore = useSettingsStore()

// Provide settingsStore to child components
provide('settingsStore', settingsStore)

// Initialize search functionality
const { searchQuery, searchedBooks } = useBookSearch(sortedBooks)

// Filter toggle state - initialize from query parameter
const hideUnfinished = ref(route.query.hideUnfinished === 'true')

// Get view mode from route path
const viewMode = computed(() => {
  if (route.path === '/library/timeline') return 'timeline'
  if (route.path === '/library/table') return 'table'
  return 'grid'
})

// Filtered books based on search and hideUnfinished toggle
const filteredBooks = computed(() => {
  let result = searchedBooks.value
  if (hideUnfinished.value) {
    result = result.filter(book => !book.attributes?.isUnfinished)
  }
  return result
})

// Group books by year for timeline view
const booksGroupedByYear = computed(() => {
  const groups = []
  let currentYear = undefined
  let currentGroup = null
  const nowYear = new Date().getFullYear()

  filteredBooks.value.forEach(book => {
    // In-progress books (year: null) are assigned to current year
    const bookYear = book.year === null ? nowYear : book.year

    if (bookYear !== currentYear) {
      if (currentGroup) {
        groups.push(currentGroup)
      }
      currentYear = bookYear
      currentGroup = {
        year: bookYear,
        books: [book]
      }
    } else {
      currentGroup.books.push(book)
    }
  })

  if (currentGroup) {
    groups.push(currentGroup)
  }

  return groups
})

// Set view mode and navigate to appropriate route
const setViewMode = (mode) => {
  if (mode === 'grid') {
    router.push('/library')
  } else if (mode === 'timeline') {
    router.push('/library/timeline')
  } else if (mode === 'table') {
    router.push('/library/table')
  }
}

// Toggle filter view and update URL
const toggleFilter = () => {
  hideUnfinished.value = !hideUnfinished.value
  router.push({
    query: {
      ...route.query,
      hideUnfinished: hideUnfinished.value ? 'true' : undefined
    }
  })
}

// Watch for route changes to update filter state
watch(() => route.query.hideUnfinished, (newValue) => {
  hideUnfinished.value = newValue === 'true'
})

// Search modal state
const isSearchModalOpen = ref(false)

// Open search modal
const openSearchModal = () => {
  isSearchModalOpen.value = true
}

// Close search modal
const closeSearchModal = () => {
  isSearchModalOpen.value = false
}

// Handle book selection from search
const handleBookSelect = (bookData) => {
  // Add the book to the store with selected date/status
  booksStore.addBook(
    bookData.title,
    bookData.year,
    bookData.month,
    bookData.author,
    bookData.coverLink,
    bookData.isUnfinished || false,
    bookData.score || null
  )
}

</script>
