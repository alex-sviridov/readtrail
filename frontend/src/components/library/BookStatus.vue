<template>
  <div
    @click="handleClick"
    class="flex justify-end relative"
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
  },
  isDateEditable: {
    type: Boolean,
    required: false,
    default: false
  }
})

const emit = defineEmits(['open-picker'])

// 3. Composables
const { formatYearMonth } = useDateHelpers()

// 4. Computed Properties
const hasDate = computed(() => !!props.year && !!props.month)
const isReadLongAgo = computed(() => BOOK_STATUS.isReadLongAgo(props.year))
const isReadLately = computed(() => BOOK_STATUS.isReadLately(props.year))
const buttonClasses = computed(() => {
  const baseClasses = props.isDateEditable ? 'cursor-pointer' : 'cursor-default'

  if (!hasDate.value) {
    return `${baseClasses} text-blue-600 ${props.isDateEditable ? 'hover:text-blue-800 hover:bg-blue-50' : ''} font-semibold`
  }
  if (isReadLongAgo.value || isReadLately.value) {
    return `${baseClasses} text-gray-700 bg-gray-50 ${props.isDateEditable ? 'hover:bg-gray-100' : ''} font-semibold`
  }
  return `${baseClasses} text-gray-700 ${props.isDateEditable ? 'hover:text-gray-900 hover:bg-gray-100' : ''}`
})

const buttonTitle = computed(() => {
  if (!props.isDateEditable) {
    return hasDate.value ? formatYearMonth(props.year, props.month) : 'Currently reading'
  }
  return hasDate.value ? 'Click to change completion date' : 'Click to set completion date'
})

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

// 5. Methods
function handleClick() {
  if (props.isDateEditable) {
    emit('open-picker')
  }
}
</script>
