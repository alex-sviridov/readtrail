<script setup>
import { computed } from 'vue'
import { RouterView, RouterLink, useRoute } from 'vue-router'
import { useSyncNotifications } from '@/composables/useSyncNotifications'
import SyncStatusIndicator from '@/components/SyncStatusIndicator.vue'
import UserMenu from '@/components/UserMenu.vue'

useSyncNotifications()

const route = useRoute()

const isLibraryActive = computed(() => {
  return route.path.startsWith('/library')
})

const isStatisticsActive = computed(() => {
  return route.path.startsWith('/statistics')
})

const shouldShowHeader = computed(() => {
  return route.path !== '/login' && route.path !== '/register'
})
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <header v-if="shouldShowHeader" class="bg-white shadow-sm">
      <div class="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
        <div class="flex items-center gap-8">
          <RouterLink to="/library" class="text-2xl font-bold text-gray-900 hover:text-gray-700 transition-colors">
            readtrail
          </RouterLink>
          <nav class="flex items-center gap-6">
            <RouterLink
              to="/library"
              class="text-sm font-medium transition-colors"
              :class="isLibraryActive ? 'text-gray-900 border-b-2 border-gray-900 pb-1' : 'text-gray-600 hover:text-gray-900'"
            >
              Library
            </RouterLink>
            <RouterLink
              to="/statistics"
              class="text-sm font-medium transition-colors"
              :class="isStatisticsActive ? 'text-gray-900 border-b-2 border-gray-900 pb-1' : 'text-gray-600 hover:text-gray-900'"
            >
              Statistics
            </RouterLink>
          </nav>
        </div>
        <div class="flex items-center gap-3">
          <SyncStatusIndicator />
          <UserMenu />
        </div>
      </div>
    </header>
    <main>
      <RouterView />
    </main>
  </div>
</template>

<style scoped></style>
