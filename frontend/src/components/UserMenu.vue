<template>
  <div v-if="isAuthenticated" class="flex flex-wrap items-center gap-x-4 gap-y-1">
    <span class="text-sm text-gray-500 truncate max-w-[10rem]" :title="userEmail">{{ userEmail }}</span>

    <RouterLink
      to="/settings"
      class="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
    >
      Settings
    </RouterLink>

    <button
      v-if="canLogout"
      @click="handleLogout"
      class="text-sm font-medium text-red-600 hover:text-red-700 transition-colors"
    >
      Logout
    </button>
  </div>

  <RouterLink
    v-else
    to="/login"
    class="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors font-medium"
  >
    Login
  </RouterLink>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { authManager } from '@/services/auth'
import { isRemoteUserModeActive } from '@/services/remoteUserMode'
import pb from '@/services/pocketbase'

const canLogout = !isRemoteUserModeActive()
const authState = ref(pb.authStore.isValid)

const isAuthenticated = computed(() => authState.value)
const user = computed(() => pb.authStore.record)
const userEmail = computed(() => user.value?.email || '')

async function handleLogout() {
  await authManager.logout()
  // Reload to ensure clean state
  window.location.href = '/login'
}

// Subscribe to auth state changes
let unsubscribe
onMounted(() => {
  unsubscribe = pb.authStore.onChange(() => {
    authState.value = pb.authStore.isValid
  })
})

onUnmounted(() => {
  unsubscribe?.()
})
</script>
