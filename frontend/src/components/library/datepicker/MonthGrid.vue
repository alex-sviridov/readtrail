<template>
  <div class="flex-1 grid grid-cols-4 gap-1 auto-rows-fr content-start picker-grid">
    <button
      v-for="month in months"
      :key="month.index"
      @click="$emit('month-select', month.index)"
      :disabled="isFutureMonth(month.index)"
      :class="[
        'min-h-[32px] rounded-lg font-medium transition-all',
        'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500',
        computeClasses(month.index)
      ]"
      :aria-label="`Select ${month.fullName} ${currentYear}`"
      :aria-pressed="isSelectedMonth(month.index)"
    >
      {{ month.name }}
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
  months: {
    type: Array,
    required: true
  },
  computeClasses: {
    type: Function,
    required: true
  },
  isFutureMonth: {
    type: Function,
    required: true
  },
  isSelectedMonth: {
    type: Function,
    required: true
  }
})

defineEmits(['month-select'])
</script>

<style scoped>
/* Responsive grid: 4x3 (landscape) or 3x4 (portrait) */
.picker-grid {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

@container picker (aspect-ratio > 1.0) {
  .picker-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
</style>
