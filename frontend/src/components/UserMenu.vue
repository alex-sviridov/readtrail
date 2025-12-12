<template>
  <div class="relative" v-click-outside="() => isOpen = false">
    <!-- User Button (Authenticated) -->
    <button
      v-if="isAuthenticated"
      @click="isOpen = !isOpen"
      class="flex items-center gap-2 px-3 py-2 text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
      :class="{ 'bg-gray-100': isOpen }"
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
    <Transition
      enter-active-class="transition ease-out duration-100"
      enter-from-class="transform opacity-0 scale-95"
      enter-to-class="transform opacity-100 scale-100"
      leave-active-class="transition ease-in duration-75"
      leave-from-class="transform opacity-100 scale-100"
      leave-to-class="transform opacity-0 scale-95"
    >
      <div
        v-if="isOpen"
        class="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg ring-1 ring-black ring-opacity-5 py-1 z-50"
      >
        <!-- User Info Section -->
        <div class="px-4 py-3 border-b border-gray-100">
          <p class="text-sm font-medium text-gray-900">{{ userName }}</p>
          <p class="text-xs text-gray-500 truncate">{{ userEmail }}</p>
        </div>

        <!-- Menu Items -->
        <RouterLink
          to="/settings"
          @click="isOpen = false"
          class="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
        >
          <Cog6ToothIcon class="w-5 h-5" />
          Settings
        </RouterLink>

        <button
          @click="handleLogout"
          class="flex items-center gap-3 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
        >
          <ArrowRightOnRectangleIcon class="w-5 h-5" />
          Logout
        </button>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { ChevronDownIcon, Cog6ToothIcon, ArrowRightOnRectangleIcon } from '@heroicons/vue/24/outline'
import { authManager } from '@/services/auth'
import pb from '@/services/pocketbase'

const router = useRouter()
const isOpen = ref(false)
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

function handleLogout() {
  isOpen.value = false
  authManager.logout()
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

// Click outside directive
const vClickOutside = {
  mounted(el, binding) {
    el._clickOutside = (event) => {
      if (!el.contains(event.target)) {
        binding.value()
      }
    }
    document.addEventListener('click', el._clickOutside)
  },
  unmounted(el) {
    document.removeEventListener('click', el._clickOutside)
  }
}
</script>
