<template>
  <div class="container mx-auto px-4 py-8 max-w-7xl">
    <!-- Header with Add Book Button -->
    <LibraryHeader
      view-mode="table"
      :hide-unfinished="hideUnfinished"
      @set-view-mode="setViewMode"
      @toggle-filter="toggleFilter"
      @add-book="openSearchModal"
    />

    <!-- Table View -->
    <BooksTable
      :books="filteredBooks"
      :settings="settingsStore"
      @delete="handleDeleteBook"
      @update-cover="handleUpdateCover"
      @update-title="handleUpdateTitle"
      @update-author="handleUpdateAuthor"
      @update-status="handleUpdateStatus"
    />

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
import BookSearch from '@/components/library/BookSearch.vue'
import LibraryHeader from '@/components/library/LibraryHeader.vue'
import BooksTable from '@/components/library/BooksTable.vue'
import { logger } from '@/utils/logger'

defineOptions({
  name: 'LibraryTablePage'
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

// Filter toggle state - initialize from query parameter
const hideUnfinished = ref(route.query.hideUnfinished === 'true')

// Filtered books based on hideUnfinished toggle
const filteredBooks = computed(() => {
  if (!hideUnfinished.value) {
    return sortedBooks.value
  }
  return sortedBooks.value.filter(book => !book.attributes?.isUnfinished)
})

// Set view mode and navigate to appropriate route
const setViewMode = (mode) => {
  if (mode === 'grid') {
    router.push('/library')
  } else if (mode === 'timeline') {
    router.push('/library/timeline')
  }
  // Already on table view, no need to navigate
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

// Handle deleting a book
const handleDeleteBook = (id) => {
  booksStore.deleteBook(id)
}

// Handle updating book cover
const handleUpdateCover = ({ id, coverLink }) => {
  booksStore.updateBookFields(id, {
    coverLink,
    attributes: { customCover: false }
  })
}

// Handle updating book title
const handleUpdateTitle = ({ id, title }) => {
  if (title) {
    booksStore.updateBookFields(id, { name: title })
  }
}

// Handle updating book author
const handleUpdateAuthor = ({ id, author }) => {
  if (author) {
    booksStore.updateBookFields(id, { author })
  }
}

// Handle updating book status
const handleUpdateStatus = ({ id, year, month, isUnfinished, score }) => {
  const success = booksStore.updateBookStatus(id, year, month, isUnfinished, score)

  if (!success) {
    logger.error('Failed to update book status for book:', id)
  }
}

</script>
