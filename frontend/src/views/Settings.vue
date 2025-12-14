<template>
  <div class="container mx-auto px-4 py-8 max-w-4xl">
    <div class="mb-8">
      <h1 class="text-3xl font-bold text-gray-800 mb-2">Settings</h1>
      <p class="text-gray-600">Manage your application preferences</p>
    </div>

    <div class="bg-white rounded-lg shadow-md p-6">
      <div class="space-y-6">
        <!-- Account Section -->
        <div class="border-b border-gray-200 pb-6">
          <h2 class="text-xl font-semibold text-gray-800 mb-4">Account</h2>

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
          <div v-else class="space-y-4">
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
            <div class="pt-2">
              <button
                @click="handleLogout"
                class="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>

        <!-- Dynamically generated settings sections -->
        <div v-for="section in settingsConfig" :key="section.section">
          <h2 class="text-xl font-semibold text-gray-800 mb-4">{{ section.section }}</h2>

          <div class="space-y-4">
            <!-- Dynamically generated settings items -->
            <div
              v-for="setting in section.settings"
              :key="setting.key"
              class="flex items-center justify-between py-3 border-b border-gray-200"
            >
              <div>
                <h3 class="text-base font-medium text-gray-800">{{ setting.label }}</h3>
                <p class="text-sm text-gray-600 mt-1">{{ setting.description }}</p>
              </div>

              <!-- Toggle Switch -->
              <button
                v-if="setting.type === 'toggle'"
                @click="setting.toggle"
                :class="[
                  'relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
                  setting.value ? 'bg-blue-600' : 'bg-gray-300'
                ]"
                role="switch"
                :aria-checked="setting.value"
              >
                <span
                  :class="[
                    'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                    setting.value ? 'translate-x-6' : 'translate-x-1'
                  ]"
                />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Back to Library Button -->
    <div class="mt-6">
      <button
        @click="goToLibrary"
        class="px-4 py-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
      >
        &larr; Back to Library
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'
import { useToast } from 'vue-toastification'
import { useSettingsStore } from '@/stores/settings'
import { authManager } from '@/services/auth'

defineOptions({
  name: 'SettingsPage'
})

const toast = useToast()
const router = useRouter()
const settingsStore = useSettingsStore()
const { settings } = storeToRefs(settingsStore)

// Auth state
const isGuest = computed(() => authManager.isGuestUser())
const userEmail = computed(() => authManager.getCurrentUser()?.email || null)

// Settings configuration (moved from store to component where it belongs)
const settingsConfig = computed(() => [
  {
    section: 'Display Settings',
    settings: [
      {
        key: 'showBookInfo',
        label: 'Show Book Information',
        description: 'Display book title and author on book cards in the library',
        type: 'toggle',
        value: settings.value.showBookInfo,
        toggle: () => settingsStore.updateSetting('showBookInfo', !settings.value.showBookInfo)
      },
      {
        key: 'allowUnfinishedReading',
        label: 'Allow Unfinished Reading',
        description: 'Enable marking books as unfinished when setting their completion date',
        type: 'toggle',
        value: settings.value.allowUnfinishedReading,
        toggle: () => settingsStore.updateSetting('allowUnfinishedReading', !settings.value.allowUnfinishedReading)
      },
      {
        key: 'allowScoring',
        label: 'Allow Book Scoring',
        description: 'Enable like/dislike functionality for books',
        type: 'toggle',
        value: settings.value.allowScoring,
        toggle: () => settingsStore.updateSetting('allowScoring', !settings.value.allowScoring)
      }
    ]
  }
])

const goToLibrary = () => {
  router.push('/library')
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
