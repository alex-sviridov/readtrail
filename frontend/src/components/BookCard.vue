<template>
  <div class="group relative bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-200 flex flex-col">
    <!-- Hover Icons -->
    <div class="absolute top-0 right-0 z-10 pointer-events-none">
      <div class="opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-auto">
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

    <!-- Image Placeholder -->
    <div class="w-full aspect-[2/3] bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center flex-shrink-0">
      <svg class="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
    </div>

    <!-- Card Content -->
    <div class="p-4 flex flex-col flex-grow">
      <BookTitle
        :title="book.name"
        @update="handleTitleUpdate"
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
import { TrashIcon } from '@heroicons/vue/24/outline'
import IconButton from './IconButton.vue'
import BookTitle from './BookTitle.vue'
import BookStatus from './BookStatus.vue'

const props = defineProps({
  book: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['delete', 'update-title', 'update-status'])

const handleDelete = () => {
  emit('delete', props.book.id)
}

const handleTitleUpdate = (title) => {
  emit('update-title', { id: props.book.id, title: title })
}

const handleStatusUpdate = (statusData) => {
  emit('update-status', { id: props.book.id, ...statusData })
}
</script>
