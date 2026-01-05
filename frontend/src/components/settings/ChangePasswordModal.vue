<template>
  <BaseModal
    :is-open="props.isOpen"
    title="Change Password"
    content-class="max-w-md w-full"
    :close-on-overlay-click="!isChangingPassword"
    :show-close-button="!isChangingPassword"
    @close="handleCancel"
  >
    <form @submit.prevent="handleSubmit" class="space-y-4">
      <!-- Current Password -->
      <div>
        <label for="current-password" class="block text-sm font-medium text-gray-700 mb-1">
          Current Password
        </label>
        <input
          id="current-password"
          v-model="passwordForm.oldPassword"
          type="password"
          required
          class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          :disabled="isChangingPassword"
        />
      </div>

      <!-- New Password -->
      <div>
        <label for="new-password" class="block text-sm font-medium text-gray-700 mb-1">
          New Password
        </label>
        <input
          id="new-password"
          v-model="passwordForm.newPassword"
          type="password"
          required
          minlength="8"
          class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          :disabled="isChangingPassword"
        />
        <p class="text-xs text-gray-500 mt-1">Minimum 8 characters</p>
      </div>

      <!-- Confirm New Password -->
      <div>
        <label for="confirm-password" class="block text-sm font-medium text-gray-700 mb-1">
          Confirm New Password
        </label>
        <input
          id="confirm-password"
          v-model="passwordForm.passwordConfirm"
          type="password"
          required
          minlength="8"
          class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          :disabled="isChangingPassword"
        />
      </div>

      <!-- Error Message -->
      <div v-if="errorMessage" class="bg-red-50 border border-red-200 rounded-lg p-3">
        <p class="text-sm text-red-800">{{ errorMessage }}</p>
      </div>
    </form>

    <template #footer>
      <div class="flex gap-3 justify-end">
        <button
          type="button"
          @click="handleCancel"
          :disabled="isChangingPassword"
          class="px-4 py-2 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Cancel
        </button>
        <button
          type="button"
          @click="handleSubmit"
          :disabled="isChangingPassword"
          class="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {{ isChangingPassword ? 'Changing Password...' : 'Change Password' }}
        </button>
      </div>
    </template>
  </BaseModal>
</template>

<script setup>
import { ref, reactive } from 'vue'
import BaseModal from '@/components/base/BaseModal.vue'

const props = defineProps({
  isOpen: {
    type: Boolean,
    required: true
  }
})

const emit = defineEmits(['close', 'submit'])

const passwordForm = reactive({
  oldPassword: '',
  newPassword: '',
  passwordConfirm: ''
})

const isChangingPassword = ref(false)
const errorMessage = ref(null)

const resetForm = () => {
  passwordForm.oldPassword = ''
  passwordForm.newPassword = ''
  passwordForm.passwordConfirm = ''
  errorMessage.value = null
}

const handleCancel = () => {
  if (!isChangingPassword.value) {
    resetForm()
    emit('close')
  }
}

const handleSubmit = () => {
  errorMessage.value = null

  // Client-side validation
  if (passwordForm.newPassword !== passwordForm.passwordConfirm) {
    errorMessage.value = 'New passwords do not match'
    return
  }

  if (passwordForm.newPassword.length < 8) {
    errorMessage.value = 'Password must be at least 8 characters long'
    return
  }

  if (passwordForm.oldPassword === passwordForm.newPassword) {
    errorMessage.value = 'New password must be different from current password'
    return
  }

  isChangingPassword.value = true
  errorMessage.value = null

  emit('submit', {
    oldPassword: passwordForm.oldPassword,
    newPassword: passwordForm.newPassword,
    passwordConfirm: passwordForm.passwordConfirm
  })
}

// Method to be called from parent if password change fails
const setError = (error) => {
  isChangingPassword.value = false
  errorMessage.value = error
}

// Method to be called from parent if password change succeeds
const handleSuccess = () => {
  isChangingPassword.value = false
  resetForm()
  emit('close')
}

// Expose methods for parent component
defineExpose({
  setError,
  handleSuccess
})
</script>
