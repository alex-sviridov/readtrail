<script setup>
import { computed, ref } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import SyncStatusIndicator from '@/components/SyncStatusIndicator.vue'
import UserMenu from '@/components/UserMenu.vue'

const route = useRoute()
const mobileMenuOpen = ref(false)

const isLibraryActive = computed(() => {
  return route.path.startsWith('/library')
})

const isStatisticsActive = computed(() => {
  return route.path.startsWith('/statistics')
})

const closeMobileMenu = () => {
  mobileMenuOpen.value = false
}
</script>

<template>
  <header class="bg-white shadow-sm">
    <div class="max-w-7xl mx-auto px-4 py-4">
      <div class="flex justify-between items-center">
        <!-- Logo -->
        <RouterLink
          to="/library"
          class="flex items-center gap-3 text-2xl font-bold text-gray-900 hover:text-gray-700 transition-colors"
          @click="closeMobileMenu"
        >
          <img src="/logo.png" alt="ReadTrail Logo" class="h-8 w-8 sm:h-10 sm:w-10" />
          <span>readtrail</span>
        </RouterLink>

        <!-- Desktop Navigation -->
        <nav class="hidden md:flex items-center gap-6">
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

        <!-- Desktop Actions -->
        <div class="hidden md:flex items-center gap-3">
          <SyncStatusIndicator />
          <UserMenu />
        </div>

        <!-- Mobile Menu Button -->
        <button
          @click="mobileMenuOpen = !mobileMenuOpen"
          class="md:hidden p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
          aria-label="Toggle menu"
        >
          <svg
            v-if="!mobileMenuOpen"
            class="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
          <svg
            v-else
            class="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Mobile Menu -->
      <Transition name="mobile-menu">
        <div v-if="mobileMenuOpen" class="md:hidden mt-4 pb-2 border-t border-gray-200 pt-4">
          <!-- Mobile Navigation -->
          <nav class="flex flex-col gap-3 mb-4">
            <RouterLink
              to="/library"
              class="text-base font-medium py-2 px-3 rounded-md transition-colors"
              :class="isLibraryActive ? 'text-gray-900 bg-gray-100' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'"
              @click="closeMobileMenu"
            >
              Library
            </RouterLink>
            <RouterLink
              to="/statistics"
              class="text-base font-medium py-2 px-3 rounded-md transition-colors"
              :class="isStatisticsActive ? 'text-gray-900 bg-gray-100' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'"
              @click="closeMobileMenu"
            >
              Statistics
            </RouterLink>
          </nav>

          <!-- Mobile Actions -->
          <div class="flex items-center gap-3 px-3 py-2 border-t border-gray-200 pt-4">
            <SyncStatusIndicator />
            <UserMenu />
          </div>
        </div>
      </Transition>
    </div>
  </header>
</template>

<style scoped>
.mobile-menu-enter-active,
.mobile-menu-leave-active {
  transition: all 0.2s ease;
}

.mobile-menu-enter-from,
.mobile-menu-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>
