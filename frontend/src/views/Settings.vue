<template>
  <div class="container mx-auto px-4 py-8 max-w-4xl">
    <div class="mb-8">
      <h1 class="text-3xl font-bold text-gray-800 mb-2">Settings</h1>
      <p class="text-gray-600">Manage your application preferences</p>
    </div>

    <div class="bg-white rounded-lg shadow-md overflow-hidden">
      <!-- Tab Navigation -->
      <div class="border-b border-gray-200">
        <nav class="flex -mb-px" aria-label="Tabs">
          <router-link
            to="/settings/account"
            class="flex-1 py-4 px-6 text-center border-b-2 font-medium text-sm transition-colors"
            :class="isAccountActive ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'"
          >
            Account
          </router-link>
          <router-link
            to="/settings/application"
            class="flex-1 py-4 px-6 text-center border-b-2 font-medium text-sm transition-colors"
            :class="isApplicationActive ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'"
          >
            Application
          </router-link>
        </nav>
      </div>

      <!-- Tab Content -->
      <div class="p-6">
        <router-view />
      </div>
    </div>

  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'

defineOptions({
  name: 'SettingsPage'
})

const route = useRoute()

const isAccountActive = computed(() => route.path.includes('/settings/account'))
const isApplicationActive = computed(() => route.path.includes('/settings/application'))
</script>
