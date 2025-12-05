<template>
  <div class="container mx-auto px-4 py-8 max-w-7xl">
    <!-- Header with Add Book Button -->
    <LibraryHeader
      :show-timeline="showTimeline"
      :show-bookinfo="showBookinfo"
      @toggle-timeline="toggleTimeline"
      @toggle-bookinfo="toggleBookinfo"
      @add-book="openSearchModal"
    />

    <!-- Book Grid with Timeline -->
    <div v-if="!showTimeline" class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
      <!-- Book Cards -->
      <BookCard
        v-for="book in sortedBooks"
        :key="book.id"
        :book="book"
        :show-bookinfo="showBookinfo"
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
            :show-bookinfo="showBookinfo"
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
import { useBooksStore } from '@/stores/books'
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

// Timeline toggle state - initialize from query parameter
const showTimeline = ref(route.query.timeline === 'true')

// Book info toggle state - initialize from query parameter
const showBookinfo = ref(route.query.bookinfo !== 'false')

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

// Toggle book info view and update URL
const toggleBookinfo = () => {
  showBookinfo.value = !showBookinfo.value
  router.push({
    query: {
      ...route.query,
      bookinfo: showBookinfo.value ? undefined : 'false'
    }
  })
}

// Watch for route changes to update timeline state
watch(() => route.query.timeline, (newValue) => {
  showTimeline.value = newValue === 'true'
})

// Watch for route changes to update bookinfo state
watch(() => route.query.bookinfo, (newValue) => {
  showBookinfo.value = newValue !== 'false'
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
