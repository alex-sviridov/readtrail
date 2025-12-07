<template>
  <div class="flex items-center justify-center gap-4 mb-1 flex-shrink-0">
    <button
      @click="$emit('decrement')"
      :disabled="!canDecrement"
      class="w-12 h-12 flex items-center justify-center rounded-lg bg-gray-100 hover:bg-gray-200 active:bg-gray-300 disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-150"
      aria-label="Previous year"
    >
      <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
      </svg>
    </button>

    <div class="text-xl font-semibold min-w-[80px] text-center text-gray-800">
      {{ currentYear }}
    </div>

    <button
      @click="$emit('increment')"
      :disabled="!canIncrement"
      class="w-12 h-12 flex items-center justify-center rounded-lg bg-gray-100 hover:bg-gray-200 active:bg-gray-300 disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-150"
      aria-label="Next year"
    >
      <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
      </svg>
    </button>
  </div>
</template>

<script setup>
// 1. Imports
// (none required)

// 2. Props & Emits
defineProps({
  currentYear: {
    type: Number,
    required: true
  },
  canDecrement: {
    type: Boolean,
    required: true
  },
  canIncrement: {
    type: Boolean,
    required: true
  }
})

defineEmits(['decrement', 'increment'])
</script>
