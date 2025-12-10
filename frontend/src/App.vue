<script setup>
import { RouterView, RouterLink } from 'vue-router'
import { Cog6ToothIcon, WifiIcon } from '@heroicons/vue/24/outline'
import { useOnlineStatus } from '@/composables/useOnlineStatus'

const { isOnline } = useOnlineStatus()
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <header class="bg-white shadow-sm">
      <div class="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
        <RouterLink to="/library" class="text-2xl font-bold text-gray-900 hover:text-gray-700 transition-colors">
          FlexLib
        </RouterLink>
        <div class="flex items-center gap-3">
          <!-- Offline Indicator -->
          <div
            v-if="!isOnline"
            class="flex items-center gap-1.5 px-2.5 py-1.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-md"
            title="You are currently offline. Changes will sync when connection is restored."
          >
            <WifiIcon class="w-4 h-4" />
            <span class="text-xs font-medium">Offline</span>
          </div>

          <RouterLink
            to="/settings"
            class="flex items-center gap-2 px-3 py-2 text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            title="Settings"
          >
            <Cog6ToothIcon class="w-5 h-5" />
            <span class="text-sm font-medium">Settings</span>
          </RouterLink>
        </div>
      </div>
    </header>
    <main>
      <RouterView />
    </main>
  </div>
</template>

<style scoped></style>
