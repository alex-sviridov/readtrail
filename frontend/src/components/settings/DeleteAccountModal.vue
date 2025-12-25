<template>
  <BaseModal
    :is-open="isOpen"
    title="Delete Account"
    content-class="max-w-md w-full"
    :close-on-overlay-click="!isDeleting"
    :show-close-button="!isDeleting"
    @close="handleCancel"
  >
    <div class="space-y-4">
      <!-- Warning -->
      <div class="bg-red-50 border border-red-200 rounded-lg p-4">
        <div class="flex">
          <ExclamationTriangleIcon class="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
          <div class="ml-3">
            <h3 class="text-sm font-medium text-red-800">
              This action cannot be undone
            </h3>
            <p class="text-sm text-red-700 mt-2">
              Deleting your account will permanently remove:
            </p>
            <ul class="list-disc list-inside text-sm text-red-700 mt-2 space-y-1">
              <li>Your account and profile</li>
              <li>All your books ({{ bookCount }} {{ bookCount === 1 ? 'book' : 'books' }})</li>
              <li>All reading history and statistics</li>
              <li>All application settings</li>
            </ul>
          </div>
        </div>
      </div>

      <!-- Confirmation Input -->
      <div>
        <label for="delete-confirmation" class="block text-sm font-medium text-gray-700 mb-2">
          Type <span class="font-mono font-bold">DELETE</span> to confirm
        </label>
        <input
          id="delete-confirmation"
          v-model="confirmationText"
          type="text"
          class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500"
          :class="{ 'border-red-500': showError }"
          placeholder="Type DELETE"
          :disabled="isDeleting"
          @input="showError = false"
        />
        <p v-if="showError" class="text-sm text-red-600 mt-1">
          Please type DELETE exactly as shown
        </p>
      </div>

      <!-- Error Message -->
      <div v-if="errorMessage" class="bg-red-50 border border-red-200 rounded-lg p-3">
        <p class="text-sm text-red-800">{{ errorMessage }}</p>
      </div>
    </div>

    <template #footer>
      <div class="flex gap-3 justify-end">
        <button
          @click="handleCancel"
          :disabled="isDeleting"
          class="px-4 py-2 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Cancel
        </button>
        <button
          @click="handleDelete"
          :disabled="!isConfirmationValid || isDeleting"
          class="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {{ isDeleting ? 'Deleting Account...' : 'Delete Account' }}
        </button>
      </div>
    </template>
  </BaseModal>
</template>

<script setup>
import { ref, computed } from 'vue'
import { ExclamationTriangleIcon } from '@heroicons/vue/24/outline'
import BaseModal from '@/components/base/BaseModal.vue'

const props = defineProps({
  isOpen: {
    type: Boolean,
    required: true
  },
  bookCount: {
    type: Number,
    required: true
  }
})

const emit = defineEmits(['close', 'confirm'])

const confirmationText = ref('')
const showError = ref(false)
const isDeleting = ref(false)
const errorMessage = ref(null)

const isConfirmationValid = computed(() => {
  return confirmationText.value === 'DELETE'
})

const handleCancel = () => {
  if (!isDeleting.value) {
    confirmationText.value = ''
    showError.value = false
    errorMessage.value = null
    emit('close')
  }
}

const handleDelete = () => {
  if (!isConfirmationValid.value) {
    showError.value = true
    return
  }

  isDeleting.value = true
  errorMessage.value = null
  emit('confirm')
}

// Method to be called from parent if deletion fails
const setError = (error) => {
  isDeleting.value = false
  errorMessage.value = error
}

// Expose method for parent component
defineExpose({
  setError
})
</script>
