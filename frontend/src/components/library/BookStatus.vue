<template>
  <div
    @click="$emit('open-picker')"
    class="flex justify-end relative cursor-pointer"
    :class="buttonClasses"
    :title="buttonTitle"
  >
    <div class="text-base font-semibold transition-all duration-200 px-4 py-2 rounded-lg min-w-[140px] text-right">
      <span :class="{ italic: !hasDate }">
        {{ buttonText }}
      </span>
    </div>
  </div>
</template>

<script setup>
// 1. Imports
import { computed } from 'vue'
import { useDateHelpers } from '@/composables/useDateHelpers'
import { BOOK_STATUS } from '@/constants'

// 2. Props & Emits
const props = defineProps({
  year: {
    type: Number,
    required: false,
    default: null
  },
  month: {
    type: Number,
    required: false,
    default: null
  }
})

defineEmits(['open-picker'])

// 3. Composables
const { formatYearMonth } = useDateHelpers()

// 4. Computed Properties
const hasDate = computed(() => !!props.year && !!props.month)
const isReadLongAgo = computed(() => BOOK_STATUS.isReadLongAgo(props.year))
const isReadLately = computed(() => BOOK_STATUS.isReadLately(props.year))
const buttonClasses = computed(() => {
  if (!hasDate.value) {
    return 'text-blue-600 hover:text-blue-800 hover:bg-blue-50 font-semibold'
  }
  if (isReadLongAgo.value || isReadLately.value) {
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
  if (isReadLately.value) {
    return 'Read Lately'
  }
  return hasDate.value
    ? formatYearMonth(props.year, props.month)
    : 'Reading...'
})
</script>
