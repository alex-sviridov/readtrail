<script setup>
import { computed } from 'vue'
import { useOnlineStatus } from '@/composables/useOnlineStatus'
import { useBooksStore } from '@/stores/books'
import { useSettingsStore } from '@/stores/settings'
import { authManager } from '@/services/auth'
import { syncQueue } from '@/services/syncQueue'
import { WifiIcon, ArrowPathIcon, ExclamationTriangleIcon } from '@heroicons/vue/24/outline'

const { isOnline } = useOnlineStatus()
const booksStore = useBooksStore()
const settingsStore = useSettingsStore()

const isGuest = computed(() => authManager.isGuestUser())
const pendingCount = computed(() => syncQueue.getPendingCount())
const isSyncing = computed(() =>
  booksStore.syncStatus === 'syncing' || settingsStore.syncStatus === 'syncing'
)
const hasError = computed(() =>
  booksStore.syncStatus === 'error' || settingsStore.syncStatus === 'error'
)

const state = computed(() => {
  if (!isOnline.value) return 'offline'
  if (hasError.value) return 'error'
  if (isSyncing.value) return 'syncing'
  return 'idle'
})

async function syncNow() {
  await Promise.all([
    booksStore.syncWithBackend(),
    settingsStore.syncWithBackend()
  ])
}
</script>

<template>
  <!-- Only show for authenticated users -->
  <div
    v-if="!isGuest && state !== 'idle'"
    class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md"
    :class="{
      'bg-amber-50 text-amber-700 border border-amber-200': state === 'offline',
      'bg-blue-50 text-blue-700 border border-blue-200': state === 'syncing',
      'bg-red-50 text-red-700 border border-red-200 cursor-pointer hover:bg-red-100': state === 'error'
    }"
    @click="state === 'error' && syncNow()"
  >
    <WifiIcon v-if="state === 'offline'" class="w-4 h-4" />
    <ArrowPathIcon v-if="state === 'syncing'" class="w-4 h-4 animate-spin" />
    <ExclamationTriangleIcon v-if="state === 'error'" class="w-4 h-4" />

    <span class="text-xs font-medium">
      {{ state === 'offline' ? 'Offline' : state === 'syncing' ? `Syncing${pendingCount > 0 ? ` (${pendingCount})` : ''}` : 'Sync Error (click to retry)' }}
    </span>
  </div>
</template>
