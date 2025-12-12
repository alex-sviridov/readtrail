<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
    <div class="max-w-md w-full space-y-8">
      <!-- Header -->
      <div>
        <h2 class="mt-6 text-center text-3xl font-bold text-gray-900">
          Sign in to your account
        </h2>
        <p class="mt-2 text-center text-sm text-gray-600">
          Or
          <router-link
            to="/library"
            class="font-medium text-blue-600 hover:text-blue-500"
          >
            continue as guest
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
        <div
          v-if="errorMessage"
          class="rounded-md bg-red-50 p-4"
        >
          <div class="flex">
            <div class="flex-shrink-0">
              <svg class="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
              </svg>
            </div>
            <div class="ml-3">
              <h3 class="text-sm font-medium text-red-800">
                {{ errorMessage }}
              </h3>
            </div>
          </div>
        </div>

        <!-- Submit Button -->
        <div>
          <button
            type="submit"
            :disabled="isLoading"
            class="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span v-if="!isLoading">Sign in</span>
            <span v-else class="flex items-center">
              <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Signing in...
            </span>
          </button>
        </div>

        <!-- Continue as Guest Button -->
        <div>
          <router-link
            to="/library"
            class="group relative w-full flex justify-center py-2 px-4 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Continue as Guest
          </router-link>
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
import { useRouter } from 'vue-router'
import { authManager } from '@/services/auth'
import { useBooksStore } from '@/stores/books'
import { logger } from '@/utils/logger'

const router = useRouter()
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
    // Check if there's guest data before login
    const hasGuestData = booksStore.books.length > 0

    // Attempt login
    await authManager.login(email.value, password.value)

    // Login successful - trigger migration of guest data if any
    if (hasGuestData) {
      logger.info('[Login] Migrating guest data to backend...')
      await booksStore.migrateLocalDataToBackend()

      // Clear localStorage after migration - we'll reload from backend
      localStorage.removeItem('flexlib-books')
      localStorage.removeItem('flexlib-needs-migration')
    }

    // Redirect to library with full page reload for clean state
    // The page reload will fetch fresh data from backend
    window.location.href = '/library'
  } catch (error) {
    logger.error('[Login] Login failed:', error)

    // Display user-friendly error message
    if (error.isUnauthorized?.()) {
      errorMessage.value = 'Invalid email or password. Please try again.'
    } else if (error.isNetworkError?.()) {
      errorMessage.value = 'Unable to connect to the server. Please check your internet connection.'
    } else {
      errorMessage.value = error.message || 'An error occurred during login. Please try again.'
    }
  } finally {
    isLoading.value = false
  }
}
</script>
