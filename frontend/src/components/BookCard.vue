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
      <!-- Edit Icon (Top Left) -->
      <div class="absolute top-0 left-0 z-10 pointer-events-none">
      <div
        class="transition-opacity duration-200 pointer-events-auto"
        :class="isEditMode || showEditButton ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'"
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
      @update="handleCoverUpdate"
    />

    <!-- Card Content -->
    <div class="pt-2 flex flex-col flex-1 gap-1">
      <BookTitle
        :title="book.name"
        :editable="isEditMode"
        @update="handleTitleUpdate"
      />

      <BookAuthor
        v-if="book.author"
        :author="book.author"
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
        :is-in-progress="isInProgress"
        @date-select="handleDateSelect"
        @mark-read-long-ago="markReadLongAgo"
        @mark-in-progress="markInProgress"
      />
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { TrashIcon, PencilIcon } from '@heroicons/vue/24/outline'
import IconButton from './IconButton.vue'
import BookTitle from './BookTitle.vue'
import BookAuthor from './BookAuthor.vue'
import BookStatus from './BookStatus.vue'
import BookCover from './BookCover.vue'
import DatePickerCard from './DatePickerCard.vue'
import { useDateHelpers } from '../composables/useDateHelpers'

// --- Constants ---
const SENTINEL_YEAR = 1900
const PICKER_DIMENSIONS = {
  YEAR_LOOKBACK: 20
}

const props = defineProps({
  book: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['delete', 'update-title', 'update-author', 'update-status', 'update-cover'])

// --- Composables ---
const { formatYearMonth } = useDateHelpers()

// --- State ---
const isEditMode = ref(false)
const showEditButton = ref(false)
const cardRef = ref(null)
const isPickerOpen = ref(false)
const selectedDate = ref(null)

// --- Computed Properties ---
const hasDate = computed(() => !!props.book.year && !!props.book.month)
const isReadLongAgo = computed(() => props.book.year === SENTINEL_YEAR)
const isInProgress = computed(() => !hasDate.value)

const initialPickerDate = computed(() => {
  if (props.book.year && props.book.month && !isReadLongAgo.value) {
    return { year: props.book.year, month: props.book.month - 1 }
  }
  return null
})

const yearRange = computed(() => {
  const currentYear = new Date().getFullYear()
  return [currentYear - PICKER_DIMENSIONS.YEAR_LOOKBACK, currentYear]
})

const cardClasses = computed(() => ({
  'ring-2 ring-blue-500 shadow-xl': isEditMode.value,
  'z-30 relative': isPickerOpen.value
}))

// --- Methods ---
const toggleEditMode = () => {
  isEditMode.value = !isEditMode.value
}

const openPicker = () => {
  isEditMode.value = false // Close edit mode if open
  selectedDate.value = initialPickerDate.value
  isPickerOpen.value = true
}

const closePicker = () => {
  isPickerOpen.value = false
}

const handleDateSelect = (date) => {
  const year = date.year
  const month = date.month + 1
  if (year !== SENTINEL_YEAR) {
    emit('update-status', { id: props.book.id, year, month })
  }
  closePicker()
}

const markReadLongAgo = () => {
  emit('update-status', { id: props.book.id, year: SENTINEL_YEAR, month: 1 })
  closePicker()
}

const markInProgress = () => {
  emit('update-status', { id: props.book.id, year: null, month: null })
  closePicker()
}

const handleClickOutside = (event) => {
  if (isEditMode.value && cardRef.value && !cardRef.value.contains(event.target)) {
    isEditMode.value = false
  }
  // Hide edit button when clicking outside
  if (showEditButton.value && cardRef.value && !cardRef.value.contains(event.target)) {
    showEditButton.value = false
  }
}

const handleCardClick = (event) => {
  // On mobile (no hover support), first click shows the edit button
  // Check if we're on a device without hover support
  if (window.matchMedia('(hover: none)').matches && !showEditButton.value && !isEditMode.value) {
    showEditButton.value = true
  }

  // Prevent click from bubbling to document when in edit mode
  // This keeps edit mode active when clicking inside the card
  if (isEditMode.value) {
    event.stopPropagation()
  }
}

const handleKeydown = (event) => {
  if (event.key === 'Escape') {
    if (isPickerOpen.value) {
      closePicker()
    } else if (isEditMode.value) {
      isEditMode.value = false
    }
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
  document.addEventListener('keydown', handleKeydown)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside)
  document.removeEventListener('keydown', handleKeydown)
})

const handleDelete = () => {
  emit('delete', props.book.id)
}

const handleTitleUpdate = (title) => {
  emit('update-title', { id: props.book.id, title: title })
}

const handleAuthorUpdate = (author) => {
  emit('update-author', { id: props.book.id, author: author })
}

const handleStatusUpdate = (statusData) => {
  emit('update-status', { id: props.book.id, ...statusData })
}

const handleCoverUpdate = (coverLink) => {
  emit('update-cover', { id: props.book.id, coverLink })
}
</script>
