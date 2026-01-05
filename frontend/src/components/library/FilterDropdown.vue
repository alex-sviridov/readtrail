<template>
  <div class="relative" ref="dropdownRef">
    <!-- Filter Button -->
    <button
      @click="toggleDropdown"
      :class="[
        'flex items-center gap-2 px-3 md:px-4 py-2 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg font-medium text-sm border-none cursor-pointer',
        hasActiveFilters
          ? 'bg-blue-600 text-white hover:bg-blue-700'
          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
      ]"
      :title="hasActiveFilters ? 'Filters active' : 'No filters'"
      aria-haspopup="true"
      :aria-expanded="isOpen"
    >
      <FunnelIcon class="w-5 h-5" />
      <span class="hidden sm:inline">Filter</span>
      <span
        v-if="activeFilterCount > 0"
        class="bg-white text-blue-600 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold"
        :class="hasActiveFilters ? '' : 'bg-blue-600 text-white'"
      >
        {{ activeFilterCount }}
      </span>
      <ChevronDownIcon
        :class="[
          'w-4 h-4 transition-transform duration-200',
          isOpen ? 'rotate-180' : ''
        ]"
      />
    </button>

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
        class="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-50"
        role="menu"
        aria-orientation="vertical"
      >
        <div class="py-2">
          <!-- Header -->
          <div class="px-4 py-2 border-b border-gray-200 flex items-center justify-between">
            <span class="text-sm font-semibold text-gray-900">Filters</span>
            <button
              v-if="hasActiveFilters"
              @click="clearAllFilters"
              class="text-xs text-blue-600 hover:text-blue-700 font-medium"
            >
              Clear all
            </button>
          </div>

          <!-- Filter Options -->
          <div class="py-1">
            <button
              v-if="allowUnfinishedReading"
              @click="toggleHideUnfinished"
              class="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
              role="menuitem"
            >
              <div class="flex items-center gap-3">
                <div
                  :class="[
                    'w-5 h-5 rounded border-2 flex items-center justify-center transition-all',
                    hideUnfinished
                      ? 'bg-blue-600 border-blue-600'
                      : 'border-gray-300'
                  ]"
                >
                  <svg
                    v-if="hideUnfinished"
                    class="w-3 h-3 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="3"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <span class="text-sm text-gray-900">Hide Unfinished</span>
              </div>
            </button>

            <button
              @click="toggleHideToRead"
              class="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
              role="menuitem"
            >
              <div class="flex items-center gap-3">
                <div
                  :class="[
                    'w-5 h-5 rounded border-2 flex items-center justify-center transition-all',
                    hideToRead
                      ? 'bg-blue-600 border-blue-600'
                      : 'border-gray-300'
                  ]"
                >
                  <svg
                    v-if="hideToRead"
                    class="w-3 h-3 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="3"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <span class="text-sm text-gray-900">Hide Unread</span>
              </div>
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { FunnelIcon, ChevronDownIcon } from '@heroicons/vue/24/outline'
import { useClickOutside, useEscapeKey } from '@/composables/useClickOutside'

const props = defineProps({
  hideUnfinished: {
    type: Boolean,
    required: true,
    default: false
  },
  hideToRead: {
    type: Boolean,
    required: true,
    default: false
  },
  allowUnfinishedReading: {
    type: Boolean,
    required: false,
    default: true
  }
})

const emit = defineEmits(['toggle-hide-unfinished', 'toggle-hide-to-read', 'clear-all'])

// State
const isOpen = ref(false)
const dropdownRef = ref(null)

// Computed
const hasActiveFilters = computed(() => {
  const unfinishedActive = props.allowUnfinishedReading && props.hideUnfinished
  return unfinishedActive || props.hideToRead
})

const activeFilterCount = computed(() => {
  let count = 0
  if (props.allowUnfinishedReading && props.hideUnfinished) count++
  if (props.hideToRead) count++
  return count
})

// Methods
function toggleDropdown() {
  isOpen.value = !isOpen.value
}

function closeDropdown() {
  isOpen.value = false
}

function toggleHideUnfinished() {
  emit('toggle-hide-unfinished')
}

function toggleHideToRead() {
  emit('toggle-hide-to-read')
}

function clearAllFilters() {
  emit('clear-all')
  closeDropdown()
}

// Close dropdown on click outside
useClickOutside(dropdownRef, closeDropdown)

// Close dropdown on escape key
useEscapeKey(closeDropdown)
</script>
