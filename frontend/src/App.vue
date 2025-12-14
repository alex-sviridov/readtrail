<script setup>
import { RouterView, RouterLink } from 'vue-router'
import { useSyncNotifications } from '@/composables/useSyncNotifications'
import SyncStatusIndicator from '@/components/SyncStatusIndicator.vue'
import UserMenu from '@/components/UserMenu.vue'

useSyncNotifications()
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <header class="bg-white shadow-sm">
      <div class="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
        <RouterLink to="/library" class="text-2xl font-bold text-gray-900 hover:text-gray-700 transition-colors">
          readtrail
        </RouterLink>
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
