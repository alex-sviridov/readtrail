<template>
  <div class="relative">
    <!-- User Button (Authenticated) -->
    <button
      v-if="isAuthenticated"
      ref="buttonRef"
      :popovertarget="menuId"
      class="flex items-center gap-2 px-3 py-2 text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
      :class="{ 'bg-gray-100': isOpen }"
      aria-haspopup="true"
      :aria-expanded="isOpen"
    >
      <div class="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-medium">
        {{ userInitials }}
      </div>
      <span class="text-sm font-medium">{{ userName }}</span>
      <ChevronDownIcon
        class="w-4 h-4 transition-transform"
        :class="{ 'rotate-180': isOpen }"
      />
    </button>

    <!-- Login Button (Not Authenticated) -->
    <RouterLink
      v-else
      to="/login"
      class="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors font-medium"
    >
      Login
    </RouterLink>

    <!-- Dropdown Menu -->
    <div
      v-if="isAuthenticated"
      :id="menuId"
      ref="menuRef"
      popover
      class="user-menu-popover w-56 bg-white rounded-lg shadow-lg ring-1 ring-black ring-opacity-5 py-1"
      :class="{ hidden: !isOpen }"
      @beforetoggle="handleBeforeToggle"
      @toggle="handleToggle"
    >
      <!-- User Info Section -->
      <div class="px-4 py-3 border-b border-gray-100">
        <p class="text-sm font-medium text-gray-900">{{ userName }}</p>
        <p class="text-xs text-gray-500 truncate">{{ userEmail }}</p>
      </div>

      <!-- Menu Items -->
      <RouterLink
        to="/settings"
        :popovertarget="menuId"
        popovertargetaction="hide"
        class="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
      >
        <Cog6ToothIcon class="w-5 h-5" />
        Settings
      </RouterLink>

      <button
        v-if="canLogout"
        @click="handleLogout"
        class="flex items-center gap-3 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
      >
        <ArrowRightOnRectangleIcon class="w-5 h-5" />
        Logout
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, useId } from 'vue'
import { RouterLink } from 'vue-router'
import { ChevronDownIcon, Cog6ToothIcon, ArrowRightOnRectangleIcon } from '@heroicons/vue/24/outline'
import { authManager } from '@/services/auth'
import { isRemoteUserModeActive } from '@/services/remoteUserMode'
import pb from '@/services/pocketbase'

const isOpen = ref(false)
const menuId = useId()
const buttonRef = ref(null)
const menuRef = ref(null)
const MENU_WIDTH = 224 // matches w-56
const canLogout = !isRemoteUserModeActive()
const authState = ref(pb.authStore.isValid)

const isAuthenticated = computed(() => authState.value)
const user = computed(() => pb.authStore.record)
const userName = computed(() => user.value?.name || user.value?.username || user.value?.email?.split('@')[0] || 'User')
const userEmail = computed(() => user.value?.email || '')
const userInitials = computed(() => {
  const name = userName.value
  const words = name.split(' ')
  return words.length >= 2
    ? (words[0][0] + words[1][0]).toUpperCase()
    : name.substring(0, 2).toUpperCase()
})

function handleBeforeToggle(event) {
  if (event.newState !== 'open' || !buttonRef.value || !menuRef.value) return
  const rect = buttonRef.value.getBoundingClientRect()
  menuRef.value.style.top = `${rect.bottom + 8}px`
  menuRef.value.style.left = `${Math.max(8, rect.right - MENU_WIDTH)}px`
}

function handleToggle(event) {
  isOpen.value = event.newState === 'open'
}

async function handleLogout() {
  isOpen.value = false
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

<style scoped>
[popover] {
  position: fixed;
  margin: 0;
}

.user-menu-popover {
  opacity: 0;
  transform: scale(0.95);
  transition: opacity 0.1s ease, transform 0.1s ease, overlay 0.1s allow-discrete, display 0.1s allow-discrete;
}

.user-menu-popover:not(.hidden) {
  opacity: 1;
  transform: scale(1);
}

@starting-style {
  .user-menu-popover:not(.hidden) {
    opacity: 0;
    transform: scale(0.95);
  }
}
</style>
