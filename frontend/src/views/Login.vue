<script>
export default {
  name: 'LoginPage'
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
    <div class="max-w-md w-full space-y-8">
      <!-- Header -->
      <div>
        <h2 class="mt-6 text-center text-3xl font-bold text-gray-900">
          Sign in to your account
        </h2>
        <p class="mt-2 text-center text-sm text-gray-600">
          Don't have an account?
          <router-link
            to="/register"
            class="font-medium text-blue-600 hover:text-blue-500"
          >
            Sign up
          </router-link>
        </p>
      </div>

      <!-- Login Form -->
      <form class="mt-8 space-y-6" @submit.prevent="handleLogin">
        <div class="rounded-md shadow-sm space-y-4">
          <!-- Email Input -->
          <div>
            <label for="email" class="sr-only">Email address</label>
            <input
              id="email"
              v-model="email"
              name="email"
              type="email"
              autocomplete="email"
              required
              class="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
              placeholder="Email address"
              :disabled="isLoading"
            />
          </div>

          <!-- Password Input -->
          <div>
            <label for="password" class="sr-only">Password</label>
            <input
              id="password"
              v-model="password"
              name="password"
              type="password"
              autocomplete="current-password"
              required
              class="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
              placeholder="Password"
              :disabled="isLoading"
            />
          </div>
        </div>

        <!-- Error Message -->
        <AuthErrorBanner :message="errorMessage" />

        <!-- Submit Button -->
        <div>
          <AuthSubmitButton :is-loading="isLoading">
            Sign in
            <template #loading>Signing in...</template>
          </AuthSubmitButton>
        </div>

        <!-- Continue as Guest Button -->
        <div>
          <ContinueAsGuestLink :disabled="isLoading" />
        </div>
      </form>

      <!-- Additional Info -->
      <div class="text-center text-sm text-gray-600">
        <p>
          Guest mode allows you to explore the app without signing in.
        </p>
        <p class="mt-1">
          Your data will be stored locally on this device only.
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useToast } from 'vue-toastification'
import { authManager } from '@/services/auth'
import { completeAuthAndRedirect } from '@/services/postAuth'
import { useBooksStore } from '@/stores/books'
import { logger } from '@/utils/logger'
import AuthErrorBanner from '@/components/auth/AuthErrorBanner.vue'
import AuthSubmitButton from '@/components/auth/AuthSubmitButton.vue'
import ContinueAsGuestLink from '@/components/auth/ContinueAsGuestLink.vue'

const toast = useToast()
const booksStore = useBooksStore()

// Form state
const email = ref('')
const password = ref('')
const isLoading = ref(false)
const errorMessage = ref('')

/**
 * Handle login form submission
 */
async function handleLogin() {
  if (isLoading.value) return

  // Clear previous error
  errorMessage.value = ''
  isLoading.value = true

  try {
    // Attempt login
    await authManager.login(email.value, password.value)

    // Login successful - migrate guest data (if any) and redirect
    await completeAuthAndRedirect(booksStore, 'Login')
  } catch (error) {
    logger.error('[Login] Login failed:', error)

    // Display user-friendly error message
    let message = ''
    if (error.isUnauthorized?.()) {
      message = 'Invalid email or password. Please try again.'
    } else if (error.isNetworkError?.()) {
      message = 'Unable to connect to the server. Please check your internet connection.'
    } else {
      message = error.message || 'An error occurred during login. Please try again.'
    }

    errorMessage.value = message
    toast.error(message, { timeout: 5000 })
  } finally {
    isLoading.value = false
  }
}
</script>
