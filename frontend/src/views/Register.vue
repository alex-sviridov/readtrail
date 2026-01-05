<script>
export default {
  name: 'RegisterPage'
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
    <div class="max-w-md w-full space-y-8">
      <!-- Header -->
      <div>
        <h2 class="mt-6 text-center text-3xl font-bold text-gray-900">
          Create your account
        </h2>
        <p class="mt-2 text-center text-sm text-gray-600">
          Already have an account?
          <router-link
            to="/login"
            class="font-medium text-blue-600 hover:text-blue-500"
          >
            Sign in
          </router-link>
        </p>
      </div>

      <!-- Registration Form -->
      <form class="mt-8 space-y-6" @submit.prevent="handleRegister">
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
              @blur="validateEmail"
            />
            <p v-if="emailError" class="mt-1 text-sm text-red-600">
              {{ emailError }}
            </p>
          </div>

          <!-- Password Input -->
          <div>
            <label for="password" class="sr-only">Password</label>
            <input
              id="password"
              v-model="password"
              name="password"
              type="password"
              autocomplete="new-password"
              required
              class="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
              placeholder="Password (min 8 characters)"
              :disabled="isLoading"
              @input="validatePassword"
            />

            <!-- Password Strength Indicator -->
            <div v-if="password" class="mt-2">
              <div class="flex items-center gap-1">
                <div
                  v-for="i in 4"
                  :key="i"
                  class="h-1 flex-1 rounded-full transition-colors"
                  :class="i <= passwordStrength ? strengthColors[passwordStrength] : 'bg-gray-200'"
                ></div>
              </div>
              <p class="mt-1 text-xs" :class="strengthTextColors[passwordStrength]">
                {{ strengthLabels[passwordStrength] }}
              </p>
            </div>

            <!-- Password Requirements -->
            <ul class="mt-2 text-xs text-gray-600 space-y-1">
              <li :class="{ 'text-green-600': passwordChecks.length }">
                <span v-if="passwordChecks.length">✓</span>
                <span v-else>•</span>
                At least 8 characters
              </li>
              <li :class="{ 'text-green-600': passwordChecks.uppercase }">
                <span v-if="passwordChecks.uppercase">✓</span>
                <span v-else>•</span>
                One uppercase letter
              </li>
              <li :class="{ 'text-green-600': passwordChecks.lowercase }">
                <span v-if="passwordChecks.lowercase">✓</span>
                <span v-else>•</span>
                One lowercase letter
              </li>
              <li :class="{ 'text-green-600': passwordChecks.number }">
                <span v-if="passwordChecks.number">✓</span>
                <span v-else>•</span>
                One number
              </li>
            </ul>
          </div>

          <!-- Password Confirmation Input -->
          <div>
            <label for="password-confirm" class="sr-only">Confirm password</label>
            <input
              id="password-confirm"
              v-model="passwordConfirm"
              name="password-confirm"
              type="password"
              autocomplete="new-password"
              required
              class="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
              placeholder="Confirm password"
              :disabled="isLoading"
              @blur="validatePasswordConfirm"
            />
            <p v-if="passwordConfirmError" class="mt-1 text-sm text-red-600">
              {{ passwordConfirmError }}
            </p>
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
            :disabled="isLoading || !isFormValid"
            class="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span v-if="!isLoading">Create Account</span>
            <span v-else class="flex items-center">
              <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Creating account...
            </span>
          </button>
        </div>

        <!-- Continue as Guest Button -->
        <div>
          <component
            :is="isLoading ? 'button' : 'router-link'"
            :to="isLoading ? undefined : '/library'"
            :disabled="isLoading"
            class="group relative w-full flex justify-center py-2 px-4 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Continue as Guest
          </component>
        </div>
      </form>

      <!-- Additional Info -->
      <div class="text-center text-sm text-gray-600">
        <p>
          By creating an account, your data will be securely stored and synced across devices.
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useToast } from 'vue-toastification'
import { authManager } from '@/services/auth'
import { useBooksStore } from '@/stores/books'
import { logger } from '@/utils/logger'

const toast = useToast()
const booksStore = useBooksStore()

// Form state
const email = ref('')
const password = ref('')
const passwordConfirm = ref('')
const isLoading = ref(false)
const errorMessage = ref('')
const emailError = ref('')
const passwordConfirmError = ref('')

// Password strength visualization
const strengthColors = {
  0: 'bg-red-500',
  1: 'bg-orange-500',
  2: 'bg-yellow-500',
  3: 'bg-green-500',
  4: 'bg-green-600'
}

const strengthTextColors = {
  0: 'text-red-600',
  1: 'text-orange-600',
  2: 'text-yellow-600',
  3: 'text-green-600',
  4: 'text-green-700'
}

const strengthLabels = {
  0: 'Very weak',
  1: 'Weak',
  2: 'Fair',
  3: 'Good',
  4: 'Strong'
}

// Password validation checks
const passwordChecks = computed(() => ({
  length: password.value.length >= 8,
  uppercase: /[A-Z]/.test(password.value),
  lowercase: /[a-z]/.test(password.value),
  number: /[0-9]/.test(password.value)
}))

// Calculate password strength (0-4)
const passwordStrength = computed(() => {
  if (!password.value) return 0

  let strength = 0
  if (passwordChecks.value.length) strength++
  if (passwordChecks.value.uppercase) strength++
  if (passwordChecks.value.lowercase) strength++
  if (passwordChecks.value.number) strength++

  // Bonus point for special characters
  if (/[^A-Za-z0-9]/.test(password.value)) strength = Math.min(4, strength + 1)

  return strength
})

// Check if all password requirements are met
const isPasswordValid = computed(() => {
  return passwordChecks.value.length &&
         passwordChecks.value.uppercase &&
         passwordChecks.value.lowercase &&
         passwordChecks.value.number
})

// Form validation
const isFormValid = computed(() => {
  return email.value &&
         password.value &&
         passwordConfirm.value &&
         isPasswordValid.value &&
         password.value === passwordConfirm.value &&
         !emailError.value &&
         !passwordConfirmError.value
})

/**
 * Validate email format
 */
function validateEmail() {
  if (!email.value) {
    emailError.value = ''
    return
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email.value)) {
    emailError.value = 'Please enter a valid email address'
  } else {
    emailError.value = ''
  }
}

/**
 * Validate password meets requirements
 */
function validatePassword() {
  // Validation is handled by computed properties and visual indicators
  // This function exists for consistency and potential future use
  if (passwordConfirm.value) {
    validatePasswordConfirm()
  }
}

/**
 * Validate password confirmation matches
 */
function validatePasswordConfirm() {
  if (!passwordConfirm.value) {
    passwordConfirmError.value = ''
    return
  }

  if (password.value !== passwordConfirm.value) {
    passwordConfirmError.value = 'Passwords do not match'
  } else {
    passwordConfirmError.value = ''
  }
}

/**
 * Handle registration form submission
 */
async function handleRegister() {
  if (isLoading.value || !isFormValid.value) return

  // Clear previous errors
  errorMessage.value = ''
  isLoading.value = true

  try {
    // Validate one more time before submission
    validateEmail()
    validatePasswordConfirm()

    if (emailError.value || passwordConfirmError.value) {
      return
    }

    // Check if there's guest data before registration
    const hasGuestData = booksStore.books.length > 0

    // Attempt registration (auto-login happens inside authManager.register)
    await authManager.register(email.value, password.value, passwordConfirm.value)

    // Registration and login successful
    toast.success('Account created successfully! Welcome to ReadTrail.', { timeout: 5000 })

    // Migrate guest data if any
    if (hasGuestData) {
      logger.info('[Register] Migrating guest data to backend...')
      await booksStore.performMigration()

      // Clear localStorage after migration
      localStorage.removeItem('readtrail-books')
      localStorage.removeItem('readtrail-needs-migration')
    }

    // Redirect to library with full page reload for clean state
    window.location.href = '/library'
  } catch (error) {
    logger.error('[Register] Registration failed:', error)

    // Display user-friendly error message
    let message = ''

    // Handle specific PocketBase validation errors
    if (error.data?.data) {
      const validationErrors = error.data.data
      if (validationErrors.email) {
        message = 'This email is already registered. Please use a different email or sign in.'
      } else if (validationErrors.password) {
        message = 'Password does not meet security requirements.'
      } else {
        message = 'Registration failed due to validation errors. Please check your input.'
      }
    } else if (error.isNetworkError?.()) {
      message = 'Unable to connect to the server. Please check your internet connection.'
    } else {
      message = error.message || 'An error occurred during registration. Please try again.'
    }

    errorMessage.value = message
    toast.error(message, { timeout: 5000 })
  } finally {
    isLoading.value = false
  }
}
</script>
