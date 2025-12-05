<template>
  <div class="relative w-full aspect-[2/3] bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center flex-shrink-0 overflow-hidden">
    <!-- Cover Image or Placeholder -->
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

    <!-- Edit Overlay Indicator -->
    <div
      v-if="editable"
      class="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-30 transition-all duration-200 flex items-center justify-center opacity-0 hover:opacity-100"
      @click="handleCoverClick"
    >
      <PhotoIcon class="w-12 h-12 text-white" />
    </div>

    <!-- Modal -->
    <Teleport to="body">
      <Transition name="modal">
        <div
          v-if="isModalOpen"
          class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black bg-opacity-50"
          @click.self="closeModal"
        >
          <div class="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[95vh] sm:max-h-[90vh] overflow-y-auto flex flex-col">
            <!-- Modal Header -->
            <div class="flex items-center justify-between p-4 border-b border-gray-200 flex-shrink-0">
              <h2 class="text-lg font-semibold text-gray-900">Edit Cover</h2>
              <button
                @click="closeModal"
                class="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <XMarkIcon class="w-5 h-5" />
              </button>
            </div>

            <!-- Modal Content -->
            <div class="p-4 space-y-4 flex-1 overflow-y-auto">
              <!-- URL Input -->
              <div>
                <label for="cover-url" class="block text-sm font-medium text-gray-700 mb-1.5">
                  Cover Image URL
                </label>
                <input
                  id="cover-url"
                  v-model="tempCoverUrl"
                  type="url"
                  placeholder="https://example.com/cover.jpg"
                  class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  @input="handleUrlInput"
                />
              </div>

              <!-- Preview Section -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1.5">
                  Preview
                </label>
                <div class="w-full max-w-[200px] mx-auto aspect-[2/3] bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg overflow-hidden flex items-center justify-center">
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
                </div>
                <p v-if="imageError" class="mt-2 text-xs text-red-600 text-center">
                  Failed to load image. Please check the URL.
                </p>
              </div>
            </div>

            <!-- Modal Footer -->
            <div class="flex items-center justify-end gap-2 p-4 border-t border-gray-200 flex-shrink-0">
              <button
                @click="closeModal"
                class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                @click="saveCover"
                :disabled="!tempCoverUrl || imageError"
                class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { PhotoIcon, XMarkIcon } from '@heroicons/vue/24/outline'

const props = defineProps({
  coverLink: {
    type: String,
    default: ''
  },
  altText: {
    type: String,
    default: 'Book cover'
  },
  editable: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update'])

const isModalOpen = ref(false)
const tempCoverUrl = ref('')
const previewUrl = ref('')
const imageError = ref(false)

const handleCoverClick = (event) => {
  if (props.editable) {
    event.stopPropagation()
    openModal()
  }
}

const openModal = () => {
  tempCoverUrl.value = props.coverLink
  previewUrl.value = props.coverLink
  imageError.value = false
  isModalOpen.value = true
}

const closeModal = () => {
  isModalOpen.value = false
  tempCoverUrl.value = ''
  previewUrl.value = ''
  imageError.value = false
}

const handleUrlInput = () => {
  imageError.value = false
  previewUrl.value = tempCoverUrl.value
}

const handleImageError = () => {
  imageError.value = true
}

const saveCover = () => {
  emit('update', tempCoverUrl.value)
  closeModal()
}
</script>

<style scoped>
/* Modal transition animations */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-active .bg-white,
.modal-leave-active .bg-white {
  transition: transform 0.2s ease;
}

.modal-enter-from .bg-white,
.modal-leave-to .bg-white {
  transform: scale(0.95);
}
</style>
