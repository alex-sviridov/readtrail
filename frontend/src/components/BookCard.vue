<template>
  <div
    ref="cardRef"
    class="group relative bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-all duration-200 flex flex-col"
    :class="{ 'ring-2 ring-blue-500 shadow-xl': isEditMode }"
    @click="handleCardClick"
  >
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
    <div class="px-4 flex flex-col flex-grow">
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
          @update="handleStatusUpdate"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { TrashIcon, PencilIcon } from '@heroicons/vue/24/outline'
import IconButton from './IconButton.vue'
import BookTitle from './BookTitle.vue'
import BookAuthor from './BookAuthor.vue'
import BookStatus from './BookStatus.vue'
import BookCover from './BookCover.vue'

const props = defineProps({
  book: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['delete', 'update-title', 'update-author', 'update-status', 'update-cover'])

const isEditMode = ref(false)
const showEditButton = ref(false)
const cardRef = ref(null)

const toggleEditMode = () => {
  isEditMode.value = !isEditMode.value
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

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside)
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
