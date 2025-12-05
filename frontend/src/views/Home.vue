<template>
  <div class="container mx-auto px-4 py-8 max-w-7xl">
    <!-- Header with Add Book Button -->
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-3xl font-bold text-gray-900">My Library</h1>
      <div class="flex items-center gap-3">
        <button
          @click="toggleTimeline"
          :class="[
            'flex items-center gap-2 px-3 md:px-4 py-2 rounded-lg transition-colors duration-200',
            showTimeline
              ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-md hover:shadow-lg'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          ]"
        >
          <CalendarIcon class="w-5 h-5" />
          <span class="hidden md:inline">{{ showTimeline ? 'Hide Timeline' : 'Show Timeline' }}</span>
        </button>
        <button
          @click="openSearchModal"
          class="flex items-center gap-2 px-3 md:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 shadow-md hover:shadow-lg"
        >
          <PlusIcon class="w-5 h-5" />
          <span class="hidden md:inline">Add Book</span>
        </button>
      </div>
    </div>

    <!-- Book Grid with Timeline -->
    <div v-if="!showTimeline" class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
      <!-- Book Cards -->
      <BookCard
        v-for="book in sortedBooks"
        :key="book.id"
        :book="book"
        @delete="handleDeleteBook"
        @update-title="handleUpdateTitle"
        @update-author="handleUpdateAuthor"
        @update-status="handleUpdateStatus"
        @update-cover="handleUpdateCover"
      />
    </div>

    <!-- Book Grid with Year Separators -->
    <div v-else>
      <template v-for="(group, index) in booksGroupedByYear" :key="group.year || 'in-progress'">
        <div v-if="index > 0" class="my-8 border-t-2 border-gray-300"></div>
        <div class="mb-2">
          <h2 class="text-2xl font-semibold text-gray-800">
            {{ group.year <= 1900 ? 'Long Time Ago' : group.year }}
          </h2>
        </div>
        <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6 mb-8">
          <BookCard
            v-for="book in group.books"
            :key="book.id"
            :book="book"
            @delete="handleDeleteBook"
            @update-title="handleUpdateTitle"
            @update-author="handleUpdateAuthor"
            @update-status="handleUpdateStatus"
            @update-cover="handleUpdateCover"
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
import { ref, computed, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useRouter, useRoute } from 'vue-router'
import { PlusIcon, CalendarIcon } from '@heroicons/vue/24/outline'
import { useBooksStore } from '../stores/books'
import BookCard from '../components/BookCard.vue'
import BookSearch from '../components/BookSearch.vue'

defineOptions({
  name: 'HomePage'
})

// Router
const router = useRouter()
const route = useRoute()

// Initialize the books store
const booksStore = useBooksStore()
const { sortedBooks } = storeToRefs(booksStore)

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
  // Add the book to the store (initially as in-progress)
  booksStore.addBook(bookData.title, null, null, bookData.author, bookData.coverLink)
}

// Handle deleting a book
const handleDeleteBook = (id) => {
  booksStore.deleteBook(id)
}

// Handle updating book title
const handleUpdateTitle = ({ id, title }) => {
  const success = booksStore.updateBookTitle(id, title)

  if (!success) {
    console.error('Failed to update book title:', id)
  }
}

// Handle updating book author
const handleUpdateAuthor = ({ id, author }) => {
  const success = booksStore.updateBookAuthor(id, author)

  if (!success) {
    console.error('Failed to update book author:', id)
  }
}

// Handle updating book status
const handleUpdateStatus = ({ id, year, month }) => {
  const success = booksStore.updateBookStatus(id, year, month)

  if (!success) {
    console.error('Failed to update book status for book:', id)
  }
}

// Handle updating book cover
const handleUpdateCover = ({ id, coverLink }) => {
  const success = booksStore.updateBookCover(id, coverLink)

  if (!success) {
    console.error('Failed to update book cover:', id)
  }
}
</script>
