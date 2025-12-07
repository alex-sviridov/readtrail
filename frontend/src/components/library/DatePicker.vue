<template>
  <article class="flex flex-col h-full w-full picker-container">
    <!-- Header: Read Long Ago and Read Lately Buttons -->
    <header class="bg-white border-b border-gray-200 px-3 py-1 flex-shrink-0">
      <div class="flex gap-2">
        <button
          @click="handleReadLongAgo"
          :class="[buttonBaseClasses, getToggleButtonClasses(props.isReadLongAgo)]"
          aria-label="Mark as read long ago"
        >
          Long Ago
        </button>
        <button
          @click="handleReadLately"
          :class="[buttonBaseClasses, getToggleButtonClasses(props.isReadLately)]"
          aria-label="Mark as read lately"
        >
          Lately
        </button>
      </div>
    </header>

    <!-- Main Picker Area -->
    <main class="flex-1 flex flex-col min-h-0 py-1 px-2 bg-white">
      <!-- Year Navigation -->
      <div class="flex items-center justify-center gap-4 mb-4 flex-shrink-0">
        <button
          @click="decrementYear"
          :disabled="!canDecrementYear"
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
          @click="incrementYear"
          :disabled="!canIncrementYear"
          class="w-12 h-12 flex items-center justify-center rounded-lg bg-gray-100 hover:bg-gray-200 active:bg-gray-300 disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-150"
          aria-label="Next year"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      <!-- Responsive Month Grid -->
      <div class="flex-1 grid grid-cols-4 gap-2 auto-rows-fr content-start picker-grid">
        <button
          v-for="month in MONTHS"
          :key="month.index"
          @click="selectMonth(month.index)"
          :disabled="isFutureMonth(month.index)"
          :class="[
            'min-h-[44px] rounded-lg font-medium transition-all',
            'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500',
            computeMonthButtonClasses(month.index)
          ]"
          :aria-label="`Select ${month.fullName} ${currentYear}`"
          :aria-pressed="isSelectedMonth(month.index)"
        >
          {{ month.name }}
        </button>
      </div>
    </main>

    <!-- Footer: In Progress Button -->
    <footer class="bg-white border-t border-gray-200 px-3 py-1 flex-shrink-0">
      <button
        @click="handleInProgress"
        :class="[
          'w-full rounded-lg font-semibold min-h-[44px] transition-all duration-150',
          'ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500',
          getToggleButtonClasses(props.isInProgress)
        ]"
        aria-label="Mark as in progress"
      >
        In Progress
      </button>
    </footer>
  </article>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { BOOK_STATUS, MONTHS, SENTINEL_MONTH_INDEX } from '@/constants'

// ===== Props & Emits =====

const props = defineProps({
  selectedDate: {
    type: Object,
    default: null
  },
  yearRange: {
    type: Array,
    required: true,
    default: () => []
  },
  isReadLongAgo: {
    type: Boolean,
    default: false
  },
  isReadLately: {
    type: Boolean,
    default: false
  },
  isInProgress: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['date-select'])

// ===== State =====

const currentYear = ref(getCurrentInitialYear())
const currentTime = ref(Date.now())

// ===== Lifecycle Hooks =====

// Update current time every minute for future month detection
onMounted(() => {
  const interval = setInterval(() => {
    currentTime.value = Date.now()
  }, 60000)

  onUnmounted(() => clearInterval(interval))
})

// ===== Computed Properties =====

const maxYear = computed(() => new Date().getFullYear())

const canDecrementYear = computed(() => {
  return currentYear.value > props.yearRange[0]
})

const canIncrementYear = computed(() => {
  return currentYear.value < maxYear.value
})

// Base classes for toggle buttons (Long Ago, Lately, In Progress)
const buttonBaseClasses = 'flex-1 rounded-lg font-semibold min-h-[44px] transition-all duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'

// ===== Helper Functions =====

function isSentinelYear(year) {
  return year === BOOK_STATUS.SENTINEL_YEAR || year === BOOK_STATUS.SENTINEL_YEAR_LATELY
}

function getCurrentInitialYear() {
  if (props.selectedDate?.year && !isSentinelYear(props.selectedDate.year)) {
    return props.selectedDate.year
  }
  return new Date().getFullYear()
}

// ===== State Checks =====

function isFutureMonth(monthIndex) {
  const selectedDate = new Date(currentYear.value, monthIndex, 1)
  return selectedDate.getTime() > currentTime.value
}

function isSelectedMonth(monthIndex) {
  return props.selectedDate?.month === monthIndex &&
         props.selectedDate?.year === currentYear.value
}

function isCurrentMonth(monthIndex) {
  const now = new Date()
  return now.getMonth() === monthIndex && now.getFullYear() === currentYear.value
}

function isSelectedYear() {
  return props.selectedDate?.year === currentYear.value
}

// ===== Style Computation =====

// Returns classes for toggle buttons based on active state
function getToggleButtonClasses(isActive) {
  return {
    'bg-blue-600 text-white shadow-md hover:bg-blue-700': isActive,
    'text-gray-700 hover:text-blue-600 hover:bg-gray-100': !isActive
  }
}

// Dynamic classes for month buttons
function computeMonthButtonClasses(monthIndex) {
  const selected = isSelectedMonth(monthIndex)
  const sameYear = isSelectedYear() && !selected
  const current = isCurrentMonth(monthIndex)
  const future = isFutureMonth(monthIndex)

  return {
    // Selected state (highest priority)
    'bg-blue-600 text-white shadow-md hover:bg-blue-700': selected,

    // Same year but different month
    'bg-blue-50 text-blue-700 hover:bg-blue-100': sameYear,

    // Current month indicator
    'ring-2 ring-blue-400': current && !selected,

    // Future months (disabled)
    'opacity-40 cursor-not-allowed': future,

    // Default state
    'bg-gray-50 text-gray-700 hover:bg-gray-100': !selected && !sameYear && !future
  }
}

// ===== Event Handlers =====

function selectMonth(monthIndex) {
  if (isFutureMonth(monthIndex)) {
    return
  }

  emit('date-select', {
    year: currentYear.value,
    month: monthIndex  // 0-indexed to match VueDatePicker behavior
  })
}

function decrementYear() {
  if (canDecrementYear.value) {
    currentYear.value--
  }
}

function incrementYear() {
  if (canIncrementYear.value) {
    currentYear.value++
  }
}

function handleReadLongAgo() {
  emit('date-select', {
    year: BOOK_STATUS.SENTINEL_YEAR,
    month: SENTINEL_MONTH_INDEX
  })
}

function handleReadLately() {
  emit('date-select', {
    year: BOOK_STATUS.SENTINEL_YEAR_LATELY,
    month: SENTINEL_MONTH_INDEX
  })
}

function handleInProgress() {
  emit('date-select', null)
}

// ===== Watchers =====

watch(() => props.selectedDate, (newDate) => {
  if (newDate?.year && !isSentinelYear(newDate.year)) {
    currentYear.value = newDate.year
  }
}, { deep: true })

watch(() => props.yearRange, (newRange) => {
  if (currentYear.value < newRange[0]) {
    currentYear.value = newRange[0]
  }
  if (currentYear.value > maxYear.value) {
    currentYear.value = maxYear.value
  }
})
</script>

<style scoped>
/* Enable container queries for responsive grid */
.picker-container {
  container-type: inline-size;
  container-name: picker;
}

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
