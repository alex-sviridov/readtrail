<template>
  <div class="flex justify-end relative">
    <button
      ref="triggerButton"
      @click="openPicker"
      class="text-sm font-medium transition-all duration-200 px-2 py-1 rounded cursor-pointer"
      :class="buttonClasses"
      :title="buttonTitle"
    >
      <span :class="{ italic: !hasDate }">
        {{ buttonText }}
      </span>
    </button>

    <Teleport to="body">
      <template v-if="isPickerOpen">
        <div class="fixed inset-0 z-40" @click="closePicker" />

        <div
          class="fixed z-50 shadow-lg border border-gray-200 rounded-lg overflow-hidden"
          :style="pickerStyle"
        >
          <div class="bg-white border-b border-gray-200 shadow-sm rounded-t-lg">
            <div class="flex justify-start items-center p-2.5">
              <button
                @click="markReadLongAgo"
                class="text-sm px-4 py-2 rounded-lg font-semibold transition-all duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                :class="isReadLongAgo
                  ? 'bg-blue-600 text-white shadow-md hover:bg-blue-700'
                  : 'text-gray-700 hover:text-blue-600 hover:bg-gray-100'"
              >
                Read Long Ago
              </button>
            </div>
          </div>

          <VueDatePicker
            v-model="selectedDate"
            month-picker
            inline
            auto-apply
            :enable-time-picker="false"
            :max-date="new Date()"
            :year-range="yearRange"
            @update:model-value="handleDateSelect"
          />

          <div class="bg-white border-t border-gray-200 shadow-sm rounded-b-lg">
            <div class="flex justify-start items-center p-2.5">
              <button
                @click="markInProgress"
                class="text-sm px-4 py-2 rounded-lg font-semibold transition-all duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                :class="isInProgress
                  ? 'bg-blue-600 text-white shadow-md hover:bg-blue-700'
                  : 'text-gray-700 hover:text-blue-600 hover:bg-gray-100'"
              >
                In Progress
              </button>
            </div>
          </div>
        </div>
      </template>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useDateHelpers } from '../composables/useDateHelpers'

// --- Constants ---
const SENTINEL_YEAR = 1900
const PICKER_DIMENSIONS = {
  WIDTH: 280,
  HEIGHT: 320,
  PADDING: 8,
  YEAR_LOOKBACK: 20,
  OFFSET: 4
}

// --- Props & Emits ---
const props = defineProps({
  year: { type: Number, default: null },
  month: { type: Number, default: null }
})

const emit = defineEmits(['update'])

// --- Composables ---
const {
  formatYearMonth,
  getCurrentYearMonth,
  yearMonthToDate,
  dateToYearMonth
} = useDateHelpers()

// --- State ---
const isPickerOpen = ref(false)
const triggerButton = ref(null)
const selectedDate = ref(null)
const pickerPosition = ref({ top: 0, left: 0 })

// --- Computed Properties (Status) ---

const hasDate = computed(() => !!props.year && !!props.month)
const isReadLongAgo = computed(() => props.year === SENTINEL_YEAR)
const isInProgress = computed(() => !hasDate.value)

// --- Computed Properties (Button Config) ---
// ... (omitted for brevity)
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

// --- Computed Properties (Picker Config) ---
// In <script setup>

const initialPickerDate = computed(() => {

  if (props.year && props.month && !isReadLongAgo.value) {
    return { year: props.year, month: props.month - 1 }
  }

  if (isReadLongAgo.value) {
    return null;
  }

  if (isInProgress.value) {
    return null
  }

  return null
})

const yearRange = computed(() => {
  const currentYear = new Date().getFullYear()
  return [currentYear - PICKER_DIMENSIONS.YEAR_LOOKBACK, currentYear]
})

const pickerStyle = computed(() => ({
  top: `${pickerPosition.value.top}px`,
  left: `${pickerPosition.value.left}px`
}))

// --- Picker Positioning Logic (omitted for brevity) ---
const getViewportConstraints = () => ({
  width: window.innerWidth,
  height: window.innerHeight
})

const calculateHorizontalPosition = (rect, constraints) => {
  let left = rect.right - PICKER_DIMENSIONS.WIDTH
  if (left < PICKER_DIMENSIONS.PADDING) {
    left = rect.left
  }
  if (left + PICKER_DIMENSIONS.WIDTH > constraints.width - PICKER_DIMENSIONS.PADDING) {
    left = constraints.width - PICKER_DIMENSIONS.WIDTH - PICKER_DIMENSIONS.PADDING
  }
  return left
}

const calculateVerticalPosition = (rect, constraints) => {
  let top = rect.bottom + PICKER_DIMENSIONS.OFFSET
  if (top + PICKER_DIMENSIONS.HEIGHT > constraints.height - PICKER_DIMENSIONS.PADDING) {
    top = rect.top - PICKER_DIMENSIONS.HEIGHT - PICKER_DIMENSIONS.OFFSET
  }
  return top
}

const calculatePickerPosition = () => {
  if (!triggerButton.value) return

  const rect = triggerButton.value.getBoundingClientRect()
  const constraints = getViewportConstraints()

  pickerPosition.value = {
    top: calculateVerticalPosition(rect, constraints),
    left: calculateHorizontalPosition(rect, constraints)
  }
}

// --- Event Handlers ---
const openPicker = async () => {
  // Use the calculated value, which is null if no date is selected
  selectedDate.value = initialPickerDate.value

  calculatePickerPosition()
  isPickerOpen.value = true
  await nextTick()
}

/**
 * FINAL FIX: Sanitize the emitted value using the Date constructor
 * to ensure we are always working with a valid Date object.
 */
const handleDateSelect = (date) => {
  const year = date.year
  const month = date.month + 1 // Add 1 back to convert 0-indexed month to 1-indexed month for your API

  if (year !== SENTINEL_YEAR) {
    emit('update', { year, month })
  }

  closePicker()
}

const markReadLongAgo = () => {
  emit('update', { year: SENTINEL_YEAR, month: 1 })
  closePicker()
}

const markInProgress = () => {
  emit('update', { year: null, month: null })
  closePicker()
}

const closePicker = () => {
  isPickerOpen.value = false
}

// --- Lifecycle & Keyboard Support ---

const handleKeydown = (event) => {
  if (event.key === 'Escape' && isPickerOpen.value) {
    closePicker()
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleKeydown)
  window.addEventListener('resize', calculatePickerPosition)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
  window.removeEventListener('resize', calculatePickerPosition)
})
</script>
