<template>
  <div class="space-y-6">
    <!-- Guest Mode -->
    <div v-if="isGuest" class="space-y-4">
      <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <p class="text-sm text-yellow-800 mb-3">
          You're using guest mode. Your data is stored locally on this device only.
        </p>
        <div class="flex gap-2">
          <router-link
            to="/login"
            class="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
          >
            Sign In
          </router-link>
          <router-link
            to="/login"
            class="px-4 py-2 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-50 transition-colors"
          >
            Create Account
          </router-link>
        </div>
      </div>
    </div>

    <!-- Authenticated -->
    <div v-else class="space-y-6">
      <!-- Account Information -->
      <div class="space-y-4">
        <div class="flex items-center justify-between py-3">
          <div>
            <h3 class="text-base font-medium text-gray-800">Email</h3>
            <p class="text-sm text-gray-600 mt-1">{{ userEmail }}</p>
          </div>
        </div>
        <div class="flex items-center justify-between py-3 border-t border-gray-200">
          <div>
            <h3 class="text-base font-medium text-gray-800">Account Status</h3>
            <p class="text-sm text-gray-600 mt-1">Signed in and syncing</p>
          </div>
        </div>
      </div>

      <!-- Change Password Section -->
      <div class="border-t border-gray-200 pt-6">
        <h3 class="text-lg font-semibold text-gray-800 mb-4">Change Password</h3>

        <form @submit.prevent="handlePasswordChange" class="space-y-4">
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
          <div v-if="passwordError" class="bg-red-50 border border-red-200 rounded-lg p-3">
            <p class="text-sm text-red-800">{{ passwordError }}</p>
          </div>

          <!-- Submit Button -->
          <div class="flex gap-3">
            <button
              type="submit"
              :disabled="isChangingPassword"
              class="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {{ isChangingPassword ? 'Changing Password...' : 'Change Password' }}
            </button>
            <button
              v-if="passwordForm.oldPassword || passwordForm.newPassword || passwordForm.passwordConfirm"
              type="button"
              @click="resetPasswordForm"
              :disabled="isChangingPassword"
              class="px-4 py-2 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>

      <!-- Sign Out Section -->
      <div class="border-t border-gray-200 pt-6">
        <button
          @click="handleLogout"
          class="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 transition-colors"
        >
          Sign Out
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, reactive } from 'vue'
import { useToast } from 'vue-toastification'
import { authManager } from '@/services/auth'

defineOptions({
  name: 'SettingsAccount'
})

const toast = useToast()

// Auth state
const isGuest = computed(() => authManager.isGuestUser())
const userEmail = computed(() => authManager.getCurrentUser()?.email || null)

// Password change state
const isChangingPassword = ref(false)
const passwordError = ref(null)
const passwordForm = reactive({
  oldPassword: '',
  newPassword: '',
  passwordConfirm: ''
})

const resetPasswordForm = () => {
  passwordForm.oldPassword = ''
  passwordForm.newPassword = ''
  passwordForm.passwordConfirm = ''
  passwordError.value = null
}

const handlePasswordChange = async () => {
  passwordError.value = null

  // Client-side validation
  if (passwordForm.newPassword !== passwordForm.passwordConfirm) {
    passwordError.value = 'New passwords do not match'
    return
  }

  if (passwordForm.newPassword.length < 8) {
    passwordError.value = 'Password must be at least 8 characters long'
    return
  }

  if (passwordForm.oldPassword === passwordForm.newPassword) {
    passwordError.value = 'New password must be different from current password'
    return
  }

  isChangingPassword.value = true

  try {
    await authManager.changePassword(
      passwordForm.oldPassword,
      passwordForm.newPassword,
      passwordForm.passwordConfirm
    )

    toast.success('Password changed successfully')
    resetPasswordForm()
  } catch (error) {
    console.error('Password change error:', error)
    passwordError.value = error.message || 'Failed to change password. Please check your current password and try again.'
  } finally {
    isChangingPassword.value = false
  }
}

const handleLogout = () => {
  authManager.logout()
  toast.success('Signed out successfully')
  // Small delay to show toast before redirect
  setTimeout(() => {
    window.location.href = '/login'
  }, 500)
}
</script>
