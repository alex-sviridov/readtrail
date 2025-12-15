<template>
  <BaseModal
    :is-open="isOpen"
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
      <div v-if="activeTab === 'url'" class="space-y-2">
        <input
          id="cover-url"
          v-model="tempCoverUrl"
          type="url"
          placeholder="https://example.com/cover.jpg"
          class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
          @input="handleUrlInput"
        />

        <!-- Loading state -->
        <div v-if="isLoading" class="text-sm text-blue-600 py-1 flex items-center gap-2">
          <svg class="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span>Fetching image...</span>
        </div>

        <!-- Fetch error -->
        <div v-if="error" class="text-sm text-red-600 py-1">
          {{ error }}
        </div>

        <!-- Size warning -->
        <div v-if="warning" class="text-sm text-amber-600 py-1">
          {{ warning }}
        </div>

        <!-- Offline warning -->
        <div v-if="!isOnline && tempCoverUrl" class="text-sm text-amber-600 py-1">
          You're offline. Image will be fetched when connection is restored.
        </div>
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
        :disabled="activeTab === 'url' && (!tempCoverUrl || imageError || isLoading)"
        class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Save
      </button>
    </template>
  </BaseModal>
</template>

<script setup>
import { ref, watch } from 'vue'
import { PhotoIcon } from '@heroicons/vue/24/outline'
import { useDebounceFn } from '@vueuse/core'
import BaseModal from '@/components/base/BaseModal.vue'
import CustomBookCover from '@/components/library/CustomBookCover.vue'
import { useImageFetch } from '@/composables/useImageFetch'
import { useOnlineStatus } from '@/composables/useOnlineStatus'

const props = defineProps({
  isOpen: {
    type: Boolean,
    required: true
  },
  book: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['close', 'save'])

// Composables
const { isOnline } = useOnlineStatus()
const { isLoading, error, file, warning, fetchImage, reset } = useImageFetch()

// Modal state
const tempCoverUrl = ref('')
const previewUrl = ref('')
const imageError = ref(false)
const activeTab = ref('url')

// Book data
const bookName = ref('')
const bookAuthor = ref('')
const altText = ref('Book cover')

// Debounced image fetch
const debouncedFetch = useDebounceFn(async (url) => {
  if (!url || imageError.value || !isOnline.value) return
  await fetchImage(url, 'book-cover')
}, 500)

// Initialize on modal open
watch(() => props.isOpen, (open) => {
  if (!open) return

  bookName.value = props.book?.name || 'Untitled'
  bookAuthor.value = props.book?.author || null
  altText.value = props.book?.name || 'Book cover'
  tempCoverUrl.value = props.book?.coverLink || ''
  previewUrl.value = props.book?.coverLink || ''
  imageError.value = false
  activeTab.value = props.book?.customCover ? 'generate' : 'url'
  reset() // Clear image fetch state
})

// Clear file when switching to generate tab
watch(activeTab, (tab) => {
  if (tab === 'generate') reset()
})

function handleUrlInput() {
  imageError.value = false
  previewUrl.value = tempCoverUrl.value
  debouncedFetch(tempCoverUrl.value)
}

function handleImageError() {
  imageError.value = true
}

function closeModal() {
  emit('close')
  tempCoverUrl.value = ''
  previewUrl.value = ''
  imageError.value = false
  activeTab.value = 'url'
  reset()
}

function saveCover() {
  const useGenerate = activeTab.value === 'generate'

  emit('save', {
    id: props.book.id,
    coverLink: tempCoverUrl.value || null,
    coverFile: !useGenerate ? file.value : null,
    customCover: useGenerate
  })

  closeModal()
}
</script>
