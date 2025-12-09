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
    <BaseModal
      :is-open="isModalOpen"
      title="Edit Cover"
      content-class="w-full max-w-md"
      max-height-class="max-h-[95vh] sm:max-h-[90vh]"
      overlay-class="p-3 sm:p-4"
      header-class="p-4"
      title-class="text-lg"
      body-class="p-4 space-y-2"
      footer-class="flex items-center justify-end gap-2 p-4"
      @close="closeModal"
    >
      <!-- Tabs -->
      <div class="flex border-b border-gray-200">
        <button
          @click="activeTab = 'url'"
          :class="[
            'flex-1 px-4 py-2.5 text-sm font-medium transition-colors',
            activeTab === 'url'
              ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
              : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
          ]"
          type="button"
        >
          Cover URL
        </button>
        <button
          @click="activeTab = 'generate'"
          :class="[
            'flex-1 px-4 py-2.5 text-sm font-medium transition-colors',
            activeTab === 'generate'
              ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
              : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
          ]"
          type="button"
        >
          Generate Cover
        </button>
      </div>

      <!-- Tab Content -->
      <div>
        <!-- Cover URL Tab -->
        <div v-if="activeTab === 'url'">
          <input
            id="cover-url"
            v-model="tempCoverUrl"
            type="url"
            placeholder="https://example.com/cover.jpg"
            class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
            @input="handleUrlInput"
          />
        </div>

        <!-- Generate Cover Tab -->
        <div v-else-if="activeTab === 'generate'" class="text-center text-gray-600">
          <p class="text-sm py-2">
            A custom cover will be generated using the book's title and author.
          </p>
        </div>
      </div>

      <!-- Preview Section -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1.5">
          Preview
        </label>
        <div class="w-full max-w-[200px] mx-auto aspect-[2/3] bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg overflow-hidden flex items-center justify-center">
          <!-- Custom Cover Preview -->
          <CustomBookCover
            v-if="activeTab === 'generate'"
            :title="bookName"
            :author="bookAuthor"
            class="rounded-lg"
          />

          <!-- Image URL Preview -->
          <template v-else-if="activeTab === 'url'">
            <img
              v-if="previewUrl"
              :src="previewUrl"
              :alt="altText"
              class="w-full h-full object-cover"
              @error="handleImageError"
            />
            <div v-else class="text-center text-gray-400 p-3">
              <PhotoIcon class="w-12 h-12 mx-auto mb-1.5" />
              <p class="text-xs">Enter URL to preview</p>
            </div>
          </template>
        </div>
        <p v-if="activeTab === 'url' && imageError" class="mt-2 text-xs text-red-600 text-center">
          Failed to load image. Please check the URL.
        </p>
      </div>

      <!-- Footer Buttons -->
      <template #footer>
        <button
          @click="closeModal"
          class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
        >
          Cancel
        </button>
        <button
          @click="saveCover"
          :disabled="activeTab === 'url' && (!tempCoverUrl || imageError)"
          class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Save
        </button>
      </template>
    </BaseModal>
  </div>
</template>

<script setup>
// 1. Imports
import { ref, computed } from 'vue'
import { PhotoIcon } from '@heroicons/vue/24/outline'
import BaseModal from '@/components/base/BaseModal.vue'
import CustomBookCover from '@/components/library/CustomBookCover.vue'
import BookScore from '@/components/library/BookScore.vue'

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
const tempCoverUrl = ref('')
const previewUrl = ref('')
const imageError = ref(false)
const activeTab = ref('url') // 'url' or 'generate'

// 4. Methods
function handleCoverClick(event) {
  if (props.editable) {
    event.stopPropagation()
    openModal()
  }
}

function openModal() {
  tempCoverUrl.value = props.coverLink
  previewUrl.value = props.coverLink
  imageError.value = false
  activeTab.value = props.useCustomCover ? 'generate' : 'url'
  isModalOpen.value = true
}

function closeModal() {
  isModalOpen.value = false
  tempCoverUrl.value = ''
  previewUrl.value = ''
  imageError.value = false
  activeTab.value = 'url'
}

function handleUrlInput() {
  imageError.value = false
  previewUrl.value = tempCoverUrl.value
}

function handleImageError() {
  imageError.value = true
}

function saveCover() {
  const useGenerate = activeTab.value === 'generate'
  emit('update', {
    // Keep the URL even when using generated cover, so it can be restored later
    coverLink: tempCoverUrl.value || null,
    customCover: useGenerate
  })
  closeModal()
}
</script>
