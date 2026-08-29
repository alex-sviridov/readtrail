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
import { computed, provide } from 'vue'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'
import { useBooksStore } from '@/stores/books'
import { useSettingsStore } from '@/stores/settings'
import { useAddBookFlow } from '@/composables/useAddBookFlow'
import { BOOK_STATUS } from '@/constants'
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

// Provide booksStore to child components
provide('booksStore', booksStore)

// Initialize the settings store
const settingsStore = useSettingsStore()

// Provide settingsStore to child components
provide('settingsStore', settingsStore)

// Filter toggle state - use settings store (computed for reactivity)
const hideUnfinished = computed(() => settingsStore.settings.hideUnfinished)
const hideToRead = computed(() => settingsStore.settings.hideToRead)

// Filtered books based on hideUnfinished and hideToRead toggles
const filteredBooks = computed(() => {
  let result = sortedBooks.value
  if (!hideUnfinished.value) {
    result = result.filter(book => !book.attributes?.isUnfinished)
  }
  if (!hideToRead.value) {
    result = result.filter(book => !BOOK_STATUS.isToRead(book.year))
  }
  return result
})

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

// Toggle filter and save to settings
const toggleFilter = () => {
  settingsStore.updateSetting('hideUnfinished', !hideUnfinished.value)
}

// Toggle To Read filter and save to settings
const toggleToReadFilter = () => {
  settingsStore.updateSetting('hideToRead', !hideToRead.value)
}

// Clear all filters
const clearAllFilters = () => {
  settingsStore.updateSetting('hideUnfinished', true)
  settingsStore.updateSetting('hideToRead', true)
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
