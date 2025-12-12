<template>
  <BaseModal
    :is-open="isOpen"
    :title="modalTitle"
    body-class=""
    @close="closeModal"
  >
    <!-- Step 1: Book Search -->
    <template v-if="currentStep === 'search'">
      <!-- Search Input -->
      <div class="p-6 border-b space-y-3">
      <div class="relative">
        <input
          ref="searchInputRef"
          v-model="titleQuery"
          type="text"
          placeholder="Enter book title..."
          class="w-full px-4 py-3 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          @input="handleSearchInput"
        />
        <MagnifyingGlassIcon class="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
      </div>
      <div class="relative">
        <input
          v-model="authorQuery"
          type="text"
          placeholder="Enter author name..."
          class="w-full px-4 py-3 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          @input="handleSearchInput"
        />
        <MagnifyingGlassIcon class="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
      </div>
    </div>

    <!-- Search Results -->
    <div class="flex-1 overflow-y-auto p-6">
      <!-- Loading State -->
      <div v-if="isLoading" class="flex items-center justify-center py-12">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="text-center py-12">
        <p class="text-red-600">{{ error }}</p>
      </div>

      <!-- Empty State -->
      <div v-else-if="!hasSearchQuery" class="text-center py-12 text-gray-500">
        <MagnifyingGlassIcon class="w-16 h-16 mx-auto mb-4 text-gray-300" />
        <p>Start typing a title and/or author to search</p>
      </div>

      <!-- No Results -->
      <div v-else-if="searchResults.length === 0 && !isLoading" class="text-center py-12">
        <p class="text-gray-500 mb-4">
          No books found
          <span v-if="titleQuery.trim() || authorQuery.trim()"> for</span>
          <span v-if="titleQuery.trim()"> title: "{{ titleQuery }}"</span>
          <span v-if="titleQuery.trim() && authorQuery.trim()"> and</span>
          <span v-if="authorQuery.trim()"> author: "{{ authorQuery }}"</span>
        </p>
        <button
          v-if="titleQuery.trim()"
          @click="addManually"
          class="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200 shadow-md hover:shadow-lg"
        >
          Add "{{ titleQuery.trim() }}" Manually
        </button>
      </div>

      <!-- Results List -->
      <div v-else class="space-y-3">
        <!-- Add Manually Button -->
        <button
          v-if="titleQuery.trim()"
          @click="addManually"
          class="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200 shadow-md hover:shadow-lg font-semibold"
        >
          Add "{{ titleQuery.trim() }}" Manually
        </button>

        <!-- Search Results -->
        <button
          v-for="book in searchResults"
          :key="book.key"
          @click="selectBook(book)"
          class="w-full text-left p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <div class="flex gap-4">
            <!-- Book Cover -->
            <div class="flex-shrink-0 w-16 h-24 bg-gradient-to-br from-gray-100 to-gray-200 rounded flex items-center justify-center">
              <img
                v-if="book.cover_i"
                :src="`https://covers.openlibrary.org/b/id/${book.cover_i}-M.jpg`"
                :alt="book.title"
                class="w-full h-full object-cover rounded"
              />
              <BookOpenIcon v-else class="w-8 h-8 text-gray-400" />
            </div>

            <!-- Book Info -->
            <div class="flex-1 min-w-0">
              <h3 class="font-semibold text-gray-900 truncate">{{ book.title }}</h3>
              <p v-if="book.author_name" class="text-sm text-gray-600 truncate">
                by {{ book.author_name.join(', ') }}
              </p>
              <p v-if="book.first_publish_year" class="text-xs text-gray-500 mt-1">
                First published: {{ book.first_publish_year }}
              </p>
            </div>
          </div>
        </button>
      </div>
    </div>
    </template>

    <!-- Step 2: Date Picker -->
    <template v-else-if="currentStep === 'datePicker'">
      <div class="p-6">

        <!-- Two cards side by side -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <!-- Book Info Card -->
          <div class="bg-white border border-gray-200 rounded-lg shadow-sm p-2">
          <!-- Back button -->
          <button
            @click="goBackToSearch"
            class="flex items-center gap-2 text-blue-600 hover:text-blue-800 mb-4 transition-colors"
          >
            <ArrowLeftIcon class="w-5 h-5" />
            <span>Back to search</span>
          </button>
            <div class="flex flex-col items-center">
              <!-- Book cover with score -->
              <div class="relative w-32 h-48 bg-gradient-to-br from-gray-100 to-gray-200 rounded shadow-md mb-4">
                <img
                  v-if="pendingBookData?.coverLink"
                  :src="pendingBookData.coverLink"
                  :alt="pendingBookData.title"
                  class="w-full h-full object-cover rounded"
                />
                <div v-else class="w-full h-full flex items-center justify-center">
                  <BookOpenIcon class="w-16 h-16 text-gray-400" />
                </div>

                <!-- Score Component (always editable in this context) -->
                <BookScore
                  v-if="settingsStore.allowScoring"
                  :score="selectedScore"
                  :editable="true"
                  :allow-scoring="settingsStore.allowScoring"
                  class="absolute bottom-2 right-2 z-10"
                  @update:score="selectedScore = $event"
                />
              </div>

              <!-- Book info -->
              <div class="text-center w-full">
                <h4 class="font-semibold text-gray-900 text-base mb-2">
                  {{ pendingBookData?.title }}
                </h4>
                <p v-if="pendingBookData?.author" class="text-sm text-gray-600">
                  {{ pendingBookData.author }}
                </p>
              </div>
            </div>
          </div>

          <!-- Date Picker Card -->
          <div class="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
            <DatePickerCard
              :selected-date="selectedDate"
              :year-range="yearRange"
              :is-read-long-ago="false"
              :is-read-lately="false"
              :is-in-progress="true"
              :is-unfinished="false"
              :allow-unfinished="true"
              @date-select="handleDateSelect"
            />
          </div>
        </div>
      </div>
    </template>
  </BaseModal>
</template>

<script setup>
// 1. Imports
import { ref, watch, nextTick, computed, onUnmounted, inject } from 'vue'
import { MagnifyingGlassIcon, BookOpenIcon, ArrowLeftIcon } from '@heroicons/vue/24/outline'
import BaseModal from '@/components/base/BaseModal.vue'
import DatePickerCard from '@/components/library/DatePicker.vue'
import BookScore from '@/components/library/BookScore.vue'
import { TIMINGS, DATE_PICKER } from '@/constants'
import { logger } from '@/utils/logger'

// 2. Constants
const API_BASE_URL = import.meta.env.VITE_OPEN_LIBRARY_API_URL || 'https://openlibrary.org'
const SEARCH_LIMIT = 20

// 3. Props & Emits
const props = defineProps({
  isOpen: {
    type: Boolean,
    required: false,
    default: false
  }
})

const emit = defineEmits(['close', 'select'])

// 3. Injections
const settingsStore = inject('settingsStore', { allowScoring: false })

// 4. Local State
const titleQuery = ref('')
const authorQuery = ref('')
const searchResults = ref([])
const isLoading = ref(false)
const error = ref(null)
const searchInputRef = ref(null)
const currentStep = ref('search') // 'search' or 'datePicker'
const pendingBookData = ref(null)
const selectedDate = ref(null)
const selectedScore = ref(0)
let debounceTimeout = null
let abortController = null

// 5. Computed Properties
const hasSearchQuery = computed(() => {
  return titleQuery.value.trim() || authorQuery.value.trim()
})

const isDatePickerStep = computed(() => currentStep.value === 'datePicker')

const yearRange = computed(() => {
  const currentYear = new Date().getFullYear()
  return [currentYear - DATE_PICKER.YEAR_LOOKBACK, currentYear]
})

const modalTitle = computed(() => {
  return isDatePickerStep.value ? 'When did you read it?' : 'Add Book'
})

// 6. Utility Methods
/**
 * Creates a fetch request with timeout support
 * @param {string} url - The URL to fetch
 * @param {object} options - Fetch options
 * @param {number} timeout - Timeout in milliseconds
 * @returns {Promise} Fetch promise with timeout
 */
function fetchWithTimeout(url, options = {}, timeout = TIMINGS.API_TIMEOUT) {
  return Promise.race([
    fetch(url, options),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Request timeout')), timeout)
    )
  ])
}

/**
 * Cancels any in-flight request
 */
function cancelPendingRequest() {
  if (abortController) {
    abortController.abort()
    abortController = null
  }
}

// 7. Search Methods
function handleSearchInput() {
  // Clear existing timeout
  clearTimeout(debounceTimeout)

  // Cancel any pending request
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
  // Build query parameters
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

  // Cancel any existing request
  cancelPendingRequest()

  // Create new abort controller for this request
  abortController = new AbortController()

  isLoading.value = true
  error.value = null

  try {
    const url = `${API_BASE_URL}/search.json?${queryParams.join('&')}&limit=${SEARCH_LIMIT}`

    const response = await fetchWithTimeout(
      url,
      { signal: abortController.signal },
      TIMINGS.API_TIMEOUT
    )

    if (!response.ok) {
      const statusMessages = {
        400: 'Invalid search query. Please check your input.',
        404: 'Search service not found. Please try again later.',
        429: 'Too many requests. Please wait a moment and try again.',
        500: 'Search service is experiencing issues. Please try again later.',
        503: 'Search service is temporarily unavailable. Please try again later.'
      }

      const message = statusMessages[response.status] ||
        `Search failed with status ${response.status}. Please try again.`

      throw new Error(message)
    }

    const data = await response.json()

    // Only update results if this request wasn't cancelled
    if (abortController) {
      searchResults.value = data.docs || []
    }
  } catch (err) {
    // Ignore aborted requests
    if (err.name === 'AbortError') {
      return
    }

    // Handle different error types
    if (err.message === 'Request timeout') {
      error.value = 'Search request timed out. Please check your connection and try again.'
    } else if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
      error.value = 'Network error. Please check your internet connection.'
    } else {
      error.value = err.message || 'Failed to search for books. Please try again.'
    }

    logger.error('Search error:', err)
  } finally {
    isLoading.value = false
    abortController = null
  }
}

// 8. Selection Methods
function selectBook(book) {
  pendingBookData.value = {
    title: book.title,
    author: book.author_name ? book.author_name.join(', ') : null,
    year: book.first_publish_year || null,
    coverLink: book.cover_i
      ? `https://covers.openlibrary.org/b/id/${book.cover_i}-L.jpg`
      : null
  }

  // Move to date picker step instead of closing
  currentStep.value = 'datePicker'
  selectedDate.value = null
  selectedScore.value = 0
}

function addManually() {
  pendingBookData.value = {
    title: titleQuery.value.trim(),
    author: authorQuery.value.trim() || null,
    year: null,
    coverLink: null
  }

  // Move to date picker step instead of closing
  currentStep.value = 'datePicker'
  selectedDate.value = null
  selectedScore.value = 0
}

// 9. Date Picker Event Handlers
function handleDateSelect(dateInfo) {
  // Handle "In Progress" (null date)
  if (dateInfo === null) {
    finalizeBookAddition(null, null, false)
    return
  }

  const { year, month, isUnfinished } = dateInfo
  const adjustedMonth = month + 1
  finalizeBookAddition(year, adjustedMonth, isUnfinished || false)
}

function finalizeBookAddition(year, month, isUnfinished) {
  // Emit complete book data with date/status
  const completeBookData = {
    ...pendingBookData.value,
    year,
    month,
    isUnfinished,
    // Only include score if book has a date (not "in progress")
    score: (year !== null && month !== null) ? selectedScore.value : null
  }

  emit('select', completeBookData)
  closeModal()
}

function goBackToSearch() {
  currentStep.value = 'search'
  selectedScore.value = 0
  // Keep pendingBookData in case user goes back again
}

// 10. Modal Management
function closeModal() {
  // Cancel any pending requests on close
  cancelPendingRequest()
  clearTimeout(debounceTimeout)

  emit('close')
}

// 9. Lifecycle
onUnmounted(() => {
  // Clean up on component unmount
  cancelPendingRequest()
  clearTimeout(debounceTimeout)
})

// 11. Watchers
watch(() => props.isOpen, async (isOpen) => {
  if (isOpen) {
    await nextTick()
    searchInputRef.value?.focus()
  } else {
    // Reset ALL state when closing
    currentStep.value = 'search'
    pendingBookData.value = null
    selectedDate.value = null
    selectedScore.value = 0
    titleQuery.value = ''
    authorQuery.value = ''
    searchResults.value = []
    error.value = null
    isLoading.value = false

    // Clean up pending operations
    cancelPendingRequest()
    clearTimeout(debounceTimeout)
  }
})
</script>
