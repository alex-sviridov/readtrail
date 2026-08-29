<script setup>
import { computed } from 'vue'
import { useOnline } from '@vueuse/core'
import { useIsMutating } from '@tanstack/vue-query'
import { authManager } from '@/services/auth'
import { useBooksStore } from '@/stores/books'
import { useSettingsStore } from '@/stores/settings'
import { WifiIcon, ArrowPathIcon, ExclamationTriangleIcon } from '@heroicons/vue/24/outline'

const isOnline = useOnline()
const isMutating = useIsMutating()
const booksStore = useBooksStore()
const settingsStore = useSettingsStore()

const isGuest = computed(() => authManager.isGuestUser())
const hasError = computed(() => !!booksStore.lastError || !!settingsStore.lastError)

const state = computed(() => {
  if (!isOnline.value) return 'offline'
  if (hasError.value) return 'error'
  if (isMutating.value > 0) return 'syncing'
  return 'idle'
})
</script>

<template>
  <div
    v-if="!isGuest && state !== 'idle'"
    class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md"
    :class="{
      'bg-amber-50 text-amber-700 border border-amber-200': state === 'offline',
      'bg-blue-50 text-blue-700 border border-blue-200': state === 'syncing',
      'bg-red-50 text-red-700 border border-red-200': state === 'error'
    }"
  >
    <WifiIcon v-if="state === 'offline'" class="w-4 h-4" />
    <ArrowPathIcon v-if="state === 'syncing'" class="w-4 h-4 animate-spin" />
    <ExclamationTriangleIcon v-if="state === 'error'" class="w-4 h-4" />

    <span class="text-xs font-medium">
      {{ state === 'offline' ? 'Offline' : state === 'syncing' ? 'Syncing' : 'Sync error' }}
    </span>
  </div>
</template>
