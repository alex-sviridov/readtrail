<template>
  <div
    @click="$emit('open-picker')"
    class="flex justify-end relative cursor-pointer"
    :class="buttonClasses"
    :title="buttonTitle"
  >
    <div class="text-sm font-medium transition-all duration-200 px-2 py-1 rounded">
      <span :class="{ italic: !hasDate }">
        {{ buttonText }}
      </span>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useDateHelpers } from '../../composables/useDateHelpers'

// --- Constants ---
const SENTINEL_YEAR = 1900

// --- Props & Emits ---
const props = defineProps({
  year: { type: Number, default: null },
  month: { type: Number, default: null }
})

defineEmits(['open-picker'])

// --- Composables ---
const { formatYearMonth } = useDateHelpers()

// --- Computed Properties (Status) ---
const hasDate = computed(() => !!props.year && !!props.month)
const isReadLongAgo = computed(() => props.year === SENTINEL_YEAR)

// --- Computed Properties (Button Config) ---
const buttonClasses = computed(() => {
  if (!hasDate.value) {
    return 'text-blue-600 hover:text-blue-800 hover:bg-blue-50 font-semibold'
  }
  if (isReadLongAgo.value) {
    return 'text-gray-700 bg-gray-50 hover:bg-gray-100 font-semibold'
  }
  return 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
})

const buttonTitle = computed(() =>
  hasDate.value ? 'Click to change completion date' : 'Click to set completion date'
)

const buttonText = computed(() => {
  if (isReadLongAgo.value) {
    return 'Read Long Ago'
  }
  return hasDate.value
    ? formatYearMonth(props.year, props.month)
    : 'Reading...'
})
</script>
