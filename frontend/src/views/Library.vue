<template>
  <div class="container mx-auto px-4 py-8 max-w-7xl">
    <!-- Header with Add Book Button -->
    <LibraryHeader
      :show-timeline="showTimeline"
      @toggle-timeline="toggleTimeline"
      @add-book="openSearchModal"
    />

    <!-- Book Grid with Timeline -->
    <div v-if="!showTimeline" class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
      <!-- Book Cards -->
      <BookCard
        v-for="book in sortedBooks"
        :key="book.id"
        :book="book"
        :settings="settingsStore"
        @delete="handleDeleteBook"
        @update-status="handleUpdateStatus"
      />
    </div>

    <!-- Book Grid with Year Separators -->
    <div v-else>
      <template v-for="(group, index) in booksGroupedByYear" :key="group.year || 'in-progress'">
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
            :settings="settingsStore"
            @delete="handleDeleteBook"
            @update-status="handleUpdateStatus"
          />
        </div>
      </template>
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

// Timeline toggle state - initialize from query parameter
const showTimeline = ref(route.query.timeline === 'true')

// Group books by year for timeline view
const booksGroupedByYear = computed(() => {
  const groups = []
  let currentYear = undefined
  let currentGroup = null
  const nowYear = new Date().getFullYear()

  sortedBooks.value.forEach(book => {
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

// Toggle timeline view and update URL
const toggleTimeline = () => {
  showTimeline.value = !showTimeline.value
  router.push({
    query: {
      ...route.query,
      timeline: showTimeline.value ? 'true' : undefined
    }
  })
}

// Watch for route changes to update timeline state
watch(() => route.query.timeline, (newValue) => {
  showTimeline.value = newValue === 'true'
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

// Handle updating book status
const handleUpdateStatus = ({ id, year, month, isUnfinished, score }) => {
  const success = booksStore.updateBookStatus(id, year, month, isUnfinished, score)

  if (!success) {
    console.error('Failed to update book status for book:', id)
  }
}

</script>
