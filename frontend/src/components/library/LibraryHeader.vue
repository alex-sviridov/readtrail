<template>
  <div>
    <!-- Auth Prompt Banner -->
    <div
      v-if="showAuthPrompt && !dismissedAuthPrompt"
      class="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center justify-between"
    >
      <div class="flex items-center">
        <div class="flex-shrink-0">
          <svg class="h-5 w-5 text-blue-600" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
          </svg>
        </div>
        <div class="ml-3">
          <p class="text-sm font-medium text-blue-800">
            You have {{ booksCount }} books! Create an account to sync across devices.
          </p>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <router-link
          to="/login"
          class="text-sm font-medium text-blue-600 hover:text-blue-700 px-3 py-1 hover:bg-blue-100 rounded transition-colors"
        >
          Create Account
        </router-link>
        <button
          @click="dismissAuthPrompt"
          class="text-sm font-medium text-gray-600 hover:text-gray-700 px-3 py-1 hover:bg-gray-100 rounded transition-colors"
        >
          Dismiss
        </button>
      </div>
    </div>

    <!-- Header -->
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-3xl font-bold text-gray-900">My Library</h1>
      <div class="flex items-center gap-3">
        <!-- View Mode Toggle -->
        <div class="flex items-center bg-gray-200 rounded-lg p-1">
          <button
            @click="$emit('set-view-mode', 'grid')"
            :class="[
              'px-3 py-1.5 rounded transition-colors',
              viewMode === 'grid'
                ? 'bg-white text-gray-900 shadow'
                : 'text-gray-600 hover:text-gray-900'
            ]"
            title="Grid View"
          >
            <Squares2X2Icon class="w-5 h-5" />
          </button>
          <button
            @click="$emit('set-view-mode', 'timeline')"
            :class="[
              'px-3 py-1.5 rounded transition-colors',
              viewMode === 'timeline'
                ? 'bg-white text-gray-900 shadow'
                : 'text-gray-600 hover:text-gray-900'
            ]"
            title="Timeline View"
          >
            <CalendarIcon class="w-5 h-5" />
          </button>
          <button
            @click="$emit('set-view-mode', 'table')"
            :class="[
              'px-3 py-1.5 rounded transition-colors',
              viewMode === 'table'
                ? 'bg-white text-gray-900 shadow'
                : 'text-gray-600 hover:text-gray-900'
            ]"
            title="Table View"
          >
            <TableCellsIcon class="w-5 h-5" />
          </button>
        </div>

        <BaseButton
          title="Hide Unfinished"
          @click="$emit('toggle-filter')"
          :class="[
            hideUnfinished
              ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-md hover:shadow-lg'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          ]"
        >
          <template #icon>
            <FunnelIcon class="w-5 h-5" />
          </template>
        </BaseButton>
        <BaseButton
          title="Add Book"
          @click="$emit('add-book')"
        >
          <template #icon>
            <PlusIcon class="w-5 h-5" />
          </template>
        </BaseButton>
      </div>
    </div>
  </div>
</template>

<script setup>
// 1. Imports
import { ref, computed } from 'vue'
import { PlusIcon, CalendarIcon, FunnelIcon, Squares2X2Icon, TableCellsIcon } from '@heroicons/vue/24/outline'
import BaseButton from '@/components/base/BaseButton.vue'
import { useBooksStore } from '@/stores/books'
import { authManager } from '@/services/auth'

// 2. Props & Emits
defineProps({
  viewMode: {
    type: String,
    required: true,
    default: 'grid',
    validator: (value) => ['grid', 'timeline', 'table'].includes(value)
  },
  hideUnfinished: {
    type: Boolean,
    required: true,
    default: false
  }
})

defineEmits(['set-view-mode', 'toggle-filter', 'add-book'])

// 3. Store & Auth
const booksStore = useBooksStore()
const dismissedAuthPrompt = ref(false)

// 4. Computed
const booksCount = computed(() => booksStore.booksCount)
const isGuest = computed(() => authManager.isGuestUser())
const showAuthPrompt = computed(() => {
  return isGuest.value && booksCount.value >= 3
})

// 5. Methods
function dismissAuthPrompt() {
  dismissedAuthPrompt.value = true
}
</script>
