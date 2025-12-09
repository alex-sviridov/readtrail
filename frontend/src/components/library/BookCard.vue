<template>
  <div
    ref="cardRef"
    class="group relative bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-all duration-200 flex flex-col"
    :class="cardClasses"
    @click="handleCardClick"
  >
    <!-- Backdrop (only when picker is open) -->
    <Teleport to="body">
      <div
        v-if="isPickerOpen"
        class="fixed inset-0 bg-black/30 z-20"
        @click="closePicker"
      />
    </Teleport>

    <!-- Normal Card Content (when picker is closed) -->
    <template v-if="!isPickerOpen">
      <!-- Bookmark Ribbon (only when unfinished) -->
      <div v-if="book.attributes?.isUnfinished && settings.allowUnfinishedReading" class="book-card__ribbon">
        Unfinished
      </div>

      <!-- Edit Icon (Top Left) -->
      <div class="absolute top-0 left-0 z-10 pointer-events-none">
      <div
        class="transition-opacity duration-200 pointer-events-auto opacity-0 group-hover:opacity-100 edit-button"
        :class="{ 'opacity-100': isEditMode }"
      >
        <IconButton
          :icon="PencilIcon"
          title="Edit book"
          variant="primary"
          position="left"
          @click="toggleEditMode"
        />
      </div>
    </div>

    <!-- Delete Icon (Top Right) -->
    <div v-if="isEditMode" class="absolute top-0 right-0 z-10 pointer-events-none">
      <div class="opacity-100 transition-opacity duration-200 pointer-events-auto">
        <IconButton
          :icon="TrashIcon"
          title="Delete book"
          variant="danger"
          :require-confirmation="true"
          confirm-title="Click again to delete"
          @click="handleDelete"
        />
      </div>
    </div>


    <!-- Book Cover -->
    <BookCover
      :cover-link="book.coverLink"
      :alt-text="book.name"
      :editable="isEditMode"
      :use-custom-cover="book.attributes?.customCover"
      :book-name="book.name"
      :book-author="book.author"
      :score="book.attributes?.score"
      :is-score-editable="isScoreEditable"
      :allow-scoring="settings.allowScoring"
      @update="handleCoverUpdate"
      @update:score="handleScoreUpdate"
    />

    <!-- Card Content -->
    <div class="flex flex-col flex-1 gap-1">
      <EditableText
        v-if="settings.showBookInfo"
        :value="book.name"
        as="h3"
        variant="title"
        :editable="isEditMode"
        @update="handleTitleUpdate"
      />

      <EditableText
        v-if="settings.showBookInfo && book.author"
        :value="book.author"
        as="p"
        variant="author"
        :editable="isEditMode"
        @update="handleAuthorUpdate"
      />

      <div class="mt-auto">
        <BookStatus
          :year="book.year"
          :month="book.month"
          @open-picker="openPicker"
        />
      </div>
    </div>
    </template>

    <!-- DatePicker Content (when picker is open) -->
    <template v-else>
      <DatePickerCard
        :selected-date="selectedDate"
        :year-range="yearRange"
        :is-read-long-ago="isReadLongAgo"
        :is-read-lately="isReadLately"
        :is-in-progress="isInProgress"
        :is-unfinished="book.attributes?.isUnfinished"
        :allow-unfinished="settings.allowUnfinishedReading"
        @date-select="handleDateSelect"
      />
    </template>
  </div>
</template>

<script setup>
// 1. Imports
import { ref, computed, inject, onUnmounted } from 'vue'
import { TrashIcon, PencilIcon } from '@heroicons/vue/24/outline'
import IconButton from '@/components/library/IconButton.vue'
import EditableText from '@/components/library/EditableText.vue'
import BookStatus from '@/components/library/BookStatus.vue'
import BookCover from '@/components/library/BookCover.vue'
import DatePickerCard from '@/components/library/DatePicker.vue'
import { useDateHelpers } from '@/composables/useDateHelpers'
import { useClickOutside, useEscapeKey } from '@/composables/useClickOutside'
import { BOOK_STATUS, DATE_PICKER } from '@/constants'

// 2. Props & Emits
const props = defineProps({
  book: {
    type: Object,
    required: true,
    default: null
  },
  settings: {
    type: Object,
    required: false,
    default: () => ({ showBookInfo: true })
  }
})

const emit = defineEmits(['delete', 'update-status'])

// 3. Composables & Injections
const { formatYearMonth } = useDateHelpers()
const booksStore = inject('booksStore')

// 4. Local State
const isEditMode = ref(false)
const cardRef = ref(null)
const isPickerOpen = ref(false)
const selectedDate = ref(null)
const previousWasInProgress = ref(false)
const showScoreEditTemporarily = ref(false)
let scoreEditTimer = null

// 5. Computed Properties
const hasDate = computed(() => !!props.book.year && !!props.book.month)
const isReadLongAgo = computed(() => BOOK_STATUS.isReadLongAgo(props.book.year))
const isReadLately = computed(() => BOOK_STATUS.isReadLately(props.book.year))
const isInProgress = computed(() => !hasDate.value)

const initialPickerDate = computed(() => {
  if (props.book.year && props.book.month && !isReadLongAgo.value && !isReadLately.value) {
    return { year: props.book.year, month: props.book.month - 1 }
  }
  return null
})

const yearRange = computed(() => {
  const currentYear = new Date().getFullYear()
  return [currentYear - DATE_PICKER.YEAR_LOOKBACK, currentYear]
})

const cardClasses = computed(() => ({
  'ring-2 ring-blue-500 shadow-xl': isEditMode.value,
  'z-30 relative': isPickerOpen.value,
  'ring-2 ring-blue-400 shadow-blue-100 bg-gradient-to-br from-white to-blue-50 animate-pulse-slow': isInProgress.value && !isEditMode.value
}))

const isScoreEditable = computed(() => isEditMode.value || showScoreEditTemporarily.value)

// 6. Methods
function toggleEditMode() {
  isEditMode.value = !isEditMode.value

  // Clear temporary score edit if user manually enters edit mode
  if (isEditMode.value && showScoreEditTemporarily.value) {
    if (scoreEditTimer) {
      clearTimeout(scoreEditTimer)
      scoreEditTimer = null
    }
    showScoreEditTemporarily.value = false
  }
}

function startTemporaryScoreEdit() {
  // Clear any existing timer
  if (scoreEditTimer) {
    clearTimeout(scoreEditTimer)
  }

  showScoreEditTemporarily.value = true
  scoreEditTimer = setTimeout(() => {
    showScoreEditTemporarily.value = false
    scoreEditTimer = null
  }, 5000)
}

function openPicker() {
  isEditMode.value = false
  selectedDate.value = initialPickerDate.value
  previousWasInProgress.value = isInProgress.value
  isPickerOpen.value = true
}

function closePicker() {
  isPickerOpen.value = false
}

function handleDateSelect(dateInfo) {
  // Handle "In Progress" (null date)
  if (dateInfo === null) {
    emit('update-status', {
      id: props.book.id,
      year: null,
      month: null,
      isUnfinished: false,
      score: 0
    })
    closePicker()
    return
  }

  const { year, month, isUnfinished, keepOpen } = dateInfo
  const adjustedMonth = month + 1

  emit('update-status', {
    id: props.book.id,
    year,
    month: adjustedMonth,
    isUnfinished,
    score: props.book.attributes?.score ?? null
  })

  // If book was "In Progress" and now has a date, show score edit for 5 seconds
  if (previousWasInProgress.value && !keepOpen) {
    startTemporaryScoreEdit()
  }

  if (!keepOpen) {
    closePicker()
  }
}

function handleScoreUpdate(newScore) {
  booksStore.updateBookScore(props.book.id, newScore)

  // If user scored during temporary edit mode, end it immediately
  if (showScoreEditTemporarily.value) {
    if (scoreEditTimer) {
      clearTimeout(scoreEditTimer)
      scoreEditTimer = null
    }
    showScoreEditTemporarily.value = false
  }
}

function handleCardClick(event) {
  // Prevent click from bubbling when in edit mode
  if (isEditMode.value) {
    event.stopPropagation()
  }
}

function handleDelete() {
  emit('delete', props.book.id)
}

function handleTitleUpdate(title) {
  booksStore.updateBookTitle(props.book.id, title)
}

function handleAuthorUpdate(author) {
  booksStore.updateBookAuthor(props.book.id, author)
}

function handleCoverUpdate(coverData) {
  booksStore.updateBookCover(props.book.id, coverData.coverLink, coverData.customCover)
}

// 7. Lifecycle - Composables with side effects
useClickOutside(cardRef, () => {
  if (isEditMode.value) {
    isEditMode.value = false
  }
})

useEscapeKey(() => {
  if (isPickerOpen.value) {
    closePicker()
  } else if (isEditMode.value) {
    isEditMode.value = false
  }
})

// Cleanup timer on unmount
onUnmounted(() => {
  if (scoreEditTimer) {
    clearTimeout(scoreEditTimer)
  }
})
</script>

<style scoped>
.book-card__ribbon {
  position: absolute;
  top: 10px;
  right: -6px;
  background: #f59e0b;
  color: white;
  padding: 2px 10px;
  font-size: 10px;
  font-weight: 600;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  z-index: 10;
  pointer-events: none;
}

/* Show edit button on mobile without hover */
@media (hover: none) {
  .group .edit-button {
    opacity: 1 !important;
  }
}
</style>
