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
        v-if="showBookinfo"
        :title="book.name"
        :editable="isEditMode"
        @update="handleTitleUpdate"
      />

      <BookAuthor
        v-if="showBookinfo && book.author"
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
        :is-read-lately="isReadLately"
        :is-in-progress="isInProgress"
        @date-select="handleDateSelect"
      />
    </template>
  </div>
</template>

<script setup>
// 1. Imports
import { ref, computed } from 'vue'
import { TrashIcon, PencilIcon } from '@heroicons/vue/24/outline'
import IconButton from '@/components/library/IconButton.vue'
import BookTitle from '@/components/library/BookTitle.vue'
import BookAuthor from '@/components/library/BookAuthor.vue'
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
  showBookinfo: {
    type: Boolean,
    required: false,
    default: true
  }
})

const emit = defineEmits(['delete', 'update-title', 'update-author', 'update-status', 'update-cover'])

// 3. Composables
const { formatYearMonth } = useDateHelpers()

// 4. Local State
const isEditMode = ref(false)
const showEditButton = ref(false)
const cardRef = ref(null)
const isPickerOpen = ref(false)
const selectedDate = ref(null)

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

// 6. Methods
function toggleEditMode() {
  isEditMode.value = !isEditMode.value
}

function openPicker() {
  isEditMode.value = false
  selectedDate.value = initialPickerDate.value
  isPickerOpen.value = true
}

function closePicker() {
  isPickerOpen.value = false
}

function handleDateSelect(date) {
  // Handle "In Progress" (null date)
  if (date === null) {
    emit('update-status', { id: props.book.id, year: null, month: null })
    closePicker()
    return
  }

  const year = date.year
  const month = date.month + 1
  emit('update-status', { id: props.book.id, year, month })
  closePicker()
}

function handleCardClick(event) {
  // On mobile (no hover support), first click shows the edit button
  if (window.matchMedia('(hover: none)').matches && !showEditButton.value && !isEditMode.value) {
    showEditButton.value = true
  }

  // Prevent click from bubbling when in edit mode
  if (isEditMode.value) {
    event.stopPropagation()
  }
}

function handleDelete() {
  emit('delete', props.book.id)
}

function handleTitleUpdate(title) {
  emit('update-title', { id: props.book.id, title })
}

function handleAuthorUpdate(author) {
  emit('update-author', { id: props.book.id, author })
}

function handleCoverUpdate(coverLink) {
  emit('update-cover', { id: props.book.id, coverLink })
}

// 7. Lifecycle - Composables with side effects
useClickOutside(cardRef, () => {
  if (isEditMode.value) {
    isEditMode.value = false
  }
  if (showEditButton.value) {
    showEditButton.value = false
  }
})

useEscapeKey(() => {
  if (isPickerOpen.value) {
    closePicker()
  } else if (isEditMode.value) {
    isEditMode.value = false
  }
})
</script>
