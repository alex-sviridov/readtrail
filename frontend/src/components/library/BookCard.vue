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
      <div v-if="book.attributes?.isUnfinished && settingsStore.settings.allowUnfinishedReading" class="book-card__ribbon">
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


    <!-- Book Cover with conditional overlay -->
    <div class="relative">
      <BookCover
        :cover-link="book.coverDisplayLink"
        :cover-url="book.coverLink"
        :alt-text="book.name"
        :editable="isEditMode"
        :use-custom-cover="book.attributes?.customCover"
        :book-name="book.name"
        :book-author="book.author"
        :score="book.attributes?.score"
        :is-score-editable="isScoreEditable"
        :allow-scoring="settingsStore.settings.allowScoring"
        @update="handleCoverUpdate"
        @update:score="handleScoreUpdate"
      />

      <!-- Book Info Overlay (when showBookInfo is false and in edit mode) -->
      <div
        v-if="!settingsStore.settings.showBookInfo && isEditMode"
        class="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-1 z-10"
      >
        <EditableText
          :value="book.name"
          as="h3"
          variant="title"
          editable
          @update="handleTitleUpdate"
        />

        <EditableText
          v-if="book.author"
          :value="book.author"
          as="p"
          variant="author"
          editable
          @update="handleAuthorUpdate"
        />
      </div>
    </div>

    <!-- Card Content -->
    <div class="flex flex-col flex-1 gap-1">
      <EditableText
        v-if="settingsStore.settings.showBookInfo"
        :value="book.name"
        as="h3"
        variant="title"
        :editable="isEditMode"
        @update="handleTitleUpdate"
      />

      <EditableText
        v-if="settingsStore.settings.showBookInfo && book.author"
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
          :is-date-editable="isDateEditable"
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
        :is-to-read="isToRead"
        :is-in-progress="isInProgress"
        :is-unfinished="book.attributes?.isUnfinished"
        :allow-unfinished="settingsStore.settings.allowUnfinishedReading"
        @date-select="handleDateSelect"
      />
    </template>
  </div>
</template>

<script setup>
// 1. Imports
import { ref, computed, inject } from 'vue'
import { TrashIcon, PencilIcon } from '@heroicons/vue/24/outline'
import IconButton from '@/components/library/IconButton.vue'
import EditableText from '@/components/library/EditableText.vue'
import BookStatus from '@/components/library/BookStatus.vue'
import BookCover from '@/components/library/BookCover.vue'
import DatePickerCard from '@/components/library/DatePicker.vue'
import { useClickOutside, useEscapeKey } from '@/composables/useClickOutside'
import { useTemporaryScoreEdit } from '@/composables/useTemporaryScoreEdit'
import { BOOK_STATUS, DATE_PICKER } from '@/constants'

// 2. Props & Emits
const props = defineProps({
  book: {
    type: Object,
    required: true,
    default: null
  }
})

// 3. Composables & Injections
const booksStore = inject('booksStore')
const settingsStore = inject('settingsStore')
const temporaryScoreEdit = useTemporaryScoreEdit(5000)

// 4. Local State
const isEditMode = ref(false)
const cardRef = ref(null)
const isPickerOpen = ref(false)
const selectedDate = ref(null)
const previousWasInProgress = ref(false)

// 5. Computed Properties
const hasDate = computed(() => !!props.book.year && !!props.book.month)
const isReadLongAgo = computed(() => BOOK_STATUS.isReadLongAgo(props.book.year))
const isReadLately = computed(() => BOOK_STATUS.isReadLately(props.book.year))
const isToRead = computed(() => BOOK_STATUS.isToRead(props.book.year))
const isInProgress = computed(() => !hasDate.value)

const initialPickerDate = computed(() => {
  if (props.book.year && props.book.month && !isReadLongAgo.value && !isReadLately.value && !isToRead.value) {
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

const isScoreEditable = computed(() => isEditMode.value || temporaryScoreEdit.isEditing.value)

const isDateEditable = computed(() => isInProgress.value || isEditMode.value)

// 6. Methods
function toggleEditMode() {
  isEditMode.value = !isEditMode.value

  // Clear temporary score edit if user manually enters edit mode
  if (isEditMode.value && temporaryScoreEdit.isEditing.value) {
    temporaryScoreEdit.stop()
  }
}

function openPicker() {
  // Only allow opening picker if book is in progress or in edit mode
  if (!isDateEditable.value) {
    return
  }

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
    booksStore.updateBookStatus(props.book.id, null, null, false, 0)
    closePicker()
    return
  }

  const { year, month, isUnfinished, keepOpen } = dateInfo
  const adjustedMonth = month + 1

  booksStore.updateBookStatus(
    props.book.id,
    year,
    adjustedMonth,
    isUnfinished,
    props.book.attributes?.score ?? null
  )

  // If book was "In Progress" and now has a date, show score edit for 5 seconds
  if (previousWasInProgress.value && !keepOpen) {
    temporaryScoreEdit.start()
  }

  if (!keepOpen) {
    closePicker()
  }
}

function handleScoreUpdate(newScore) {
  booksStore.updateBookFields(props.book.id, {
    attributes: { score: newScore }
  })

  // If user scored during temporary edit mode, end it immediately
  if (temporaryScoreEdit.isEditing.value) {
    temporaryScoreEdit.stop()
  }
}

function handleCardClick(event) {
  // Prevent click from bubbling when in edit mode
  if (isEditMode.value) {
    event.stopPropagation()
  }
}

function handleDelete() {
  booksStore.deleteBook(props.book.id)
}

function handleTitleUpdate(title) {
  if (title) {
    booksStore.updateBookFields(props.book.id, { name: title })
  }
}

function handleAuthorUpdate(author) {
  if (author) {
    booksStore.updateBookFields(props.book.id, { author })
  }
}

function handleCoverUpdate(coverData) {
  const updates = {
    coverLink: coverData.coverLink,
    coverFile: coverData.coverFile || null
  }
  if (coverData.customCover !== null) {
    updates.attributes = { customCover: coverData.customCover }
  }
  booksStore.updateBookFields(props.book.id, updates)
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
