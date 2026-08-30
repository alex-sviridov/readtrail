<template>
  <LibraryPageLayout
    view-mode="table"
    :hide-unfinished="hideUnfinished"
    :hide-to-read="hideToRead"
    :is-search-modal-open="isSearchModalOpen"
    @set-view-mode="setViewMode"
    @toggle-filter="toggleFilter"
    @toggle-to-read-filter="toggleToReadFilter"
    @clear-all-filters="clearAllFilters"
    @add-book="openSearchModal"
    @close-search-modal="closeSearchModal"
    @select-book="handleBookSelect"
  >
    <BooksTable
      :books="filteredBooks"
      :settings="settingsStore"
      @delete="handleDeleteBook"
      @update-cover="handleUpdateCover"
      @update-title="handleUpdateTitle"
      @update-author="handleUpdateAuthor"
      @update-status="handleUpdateStatus"
    />
  </LibraryPageLayout>
</template>

<script setup>
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'
import { useBooksStore } from '@/stores/books'
import { useSettingsStore } from '@/stores/settings'
import { useAddBookFlow } from '@/composables/useAddBookFlow'
import { useLibraryFilters } from '@/composables/useLibraryFilters'
import BooksTable from '@/components/library/BooksTable.vue'
import LibraryPageLayout from '@/components/library/LibraryPageLayout.vue'
import { logger } from '@/utils/logger'

defineOptions({
  name: 'LibraryTablePage'
})

// Router
const router = useRouter()

// Initialize the books store
const booksStore = useBooksStore()
const { sortedBooks } = storeToRefs(booksStore)

// Initialize the settings store
const settingsStore = useSettingsStore()

// Filtered books based on hideUnfinished and hideToRead toggles
const {
  hideUnfinished,
  hideToRead,
  filteredBooks,
  toggleFilter,
  toggleToReadFilter,
  clearAllFilters
} = useLibraryFilters(sortedBooks, settingsStore)

// Set view mode and navigate to appropriate route
const setViewMode = (mode) => {
  // Save preference BEFORE navigation
  settingsStore.updateSetting('lastLibraryView', mode)

  if (mode === 'grid') {
    router.push('/library/grid')
  } else if (mode === 'timeline') {
    router.push('/library/timeline')
  }
  // Already on table view, no need to navigate
}

// Search modal / add-book flow
const { isSearchModalOpen, openSearchModal, closeSearchModal, handleBookSelect } = useAddBookFlow(booksStore)

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
