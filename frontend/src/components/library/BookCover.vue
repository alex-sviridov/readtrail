<template>
  <div class="relative w-full aspect-[2/3] bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center flex-shrink-0 overflow-hidden">
    <!-- Custom Cover (Book Name + Author) -->
    <CustomBookCover
      v-if="useCustomCover"
      :title="bookName"
      :author="bookAuthor"
      :class="{ 'cursor-pointer': editable }"
      @click="handleCoverClick"
    />

    <!-- Cover Image or Placeholder -->
    <template v-else>
      <img
        v-if="coverLink"
        :src="coverLink"
        :alt="altText"
        class="w-full h-full object-cover"
        :class="{ 'cursor-pointer': editable }"
        @click="handleCoverClick"
      />
      <svg
        v-else
        class="w-16 h-16 text-gray-400"
        :class="{ 'cursor-pointer': editable }"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        @click="handleCoverClick"
      >
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
    </template>

    <!-- Score Component Overlay -->
    <BookScore
      v-if="allowScoring"
      :score="score || 0"
      :editable="isScoreEditable"
      :allow-scoring="allowScoring"
      class="absolute bottom-2 right-2 z-10"
      @update:score="$emit('update:score', $event)"
    />

    <!-- Edit Overlay Indicator -->
    <div
      v-if="editable"
      class="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-30 transition-all duration-200 flex items-center justify-center opacity-0 hover:opacity-100"
      @click="handleCoverClick"
    >
      <PhotoIcon class="w-12 h-12 text-white" />
    </div>

    <!-- Modal -->
    <BookCoverModal
      :is-open="isModalOpen"
      :book="bookData"
      @close="closeModal"
      @save="handleSave"
    />
  </div>
</template>

<script setup>
// 1. Imports
import { ref, computed } from 'vue'
import { PhotoIcon } from '@heroicons/vue/24/outline'
import CustomBookCover from '@/components/library/CustomBookCover.vue'
import BookScore from '@/components/library/BookScore.vue'
import BookCoverModal from '@/components/library/BookCoverModal.vue'

// 2. Props & Emits
const props = defineProps({
  coverLink: {
    type: String,
    required: false,
    default: ''
  },
  altText: {
    type: String,
    required: false,
    default: 'Book cover'
  },
  editable: {
    type: Boolean,
    required: false,
    default: false
  },
  useCustomCover: {
    type: Boolean,
    required: false,
    default: false
  },
  bookName: {
    type: String,
    required: false,
    default: 'Untitled'
  },
  bookAuthor: {
    type: String,
    required: false,
    default: null
  },
  score: {
    type: Number,
    required: false,
    default: null
  },
  isScoreEditable: {
    type: Boolean,
    required: false,
    default: false
  },
  allowScoring: {
    type: Boolean,
    required: false,
    default: false
  }
})

const emit = defineEmits(['update', 'update:score'])

// 3. Local State
const isModalOpen = ref(false)

// Computed book data for modal
const bookData = computed(() => ({
  name: props.bookName,
  author: props.bookAuthor,
  coverLink: props.coverLink,
  customCover: props.useCustomCover
}))

// 4. Methods
function handleCoverClick(event) {
  if (props.editable) {
    event.stopPropagation()
    openModal()
  }
}

function openModal() {
  isModalOpen.value = true
}

function closeModal() {
  isModalOpen.value = false
}

function handleSave({ coverLink, customCover }) {
  emit('update', {
    coverLink: coverLink || null,
    customCover: customCover
  })
}
</script>
