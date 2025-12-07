// 1. Imports
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { BOOK_STATUS, SENTINEL_MONTH_INDEX } from '@/constants'

// 2. Composable Function
export function useDatePicker(props, emit) {

  // 3. Helper Functions
  function isSentinelYear(year) {
    return year === BOOK_STATUS.SENTINEL_YEAR || year === BOOK_STATUS.SENTINEL_YEAR_LATELY
  }

  function getCurrentInitialYear() {
    if (props.selectedDate?.year && !isSentinelYear(props.selectedDate.year)) {
      return props.selectedDate.year
    }
    return new Date().getFullYear()
  }

  // 4. State
  const currentYear = ref(getCurrentInitialYear())
  const currentTime = ref(Date.now())
  const isUnfinishedToggled = ref(false)

  // 5. Computed Properties
  const maxYear = computed(() => new Date().getFullYear())

  const canDecrementYear = computed(() => {
    return currentYear.value > props.yearRange[0]
  })

  const canIncrementYear = computed(() => {
    return currentYear.value < maxYear.value
  })

  const buttonBaseClasses = computed(() =>
    'flex-1 rounded-lg font-semibold min-h-[32px] transition-all duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
  )

  // 6. State Check Functions
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

  // 7. Style Computation Functions
  function getToggleButtonClasses(isActive) {
    return {
      'bg-blue-600 text-white shadow-md hover:bg-blue-700': isActive,
      'text-gray-700 hover:text-blue-600 hover:bg-gray-100': !isActive
    }
  }

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

  // 8. Action Handlers
  function incrementYear() {
    if (canIncrementYear.value) {
      currentYear.value++
    }
  }

  function decrementYear() {
    if (canDecrementYear.value) {
      currentYear.value--
    }
  }

  function selectMonth(monthIndex) {
    if (isFutureMonth(monthIndex)) {
      return
    }

    emit('date-select', {
      year: currentYear.value,
      month: monthIndex,
      isUnfinished: isUnfinishedToggled.value
    })
  }

  function handleReadLongAgo() {
    emit('date-select', {
      year: BOOK_STATUS.SENTINEL_YEAR,
      month: SENTINEL_MONTH_INDEX,
      isUnfinished: isUnfinishedToggled.value
    })
  }

  function handleReadLately() {
    emit('date-select', {
      year: BOOK_STATUS.SENTINEL_YEAR_LATELY,
      month: SENTINEL_MONTH_INDEX,
      isUnfinished: isUnfinishedToggled.value
    })
  }

  function handleInProgress() {
    emit('date-select', null)
  }

  // 9. Watchers
  // Initialize unfinished toggle from prop
  watch(() => props.isUnfinished, (newValue) => {
    isUnfinishedToggled.value = newValue
  }, { immediate: true })

  // Watch checkbox toggle and immediately update status if book has a date
  watch(isUnfinishedToggled, (newValue, oldValue) => {
    // Only emit if the value actually changed (not initial load)
    if (newValue === oldValue) return

    // If book has a date (not in progress), immediately update the unfinished status
    if (props.selectedDate?.year && props.selectedDate?.month !== undefined) {
      emit('date-select', {
        year: props.selectedDate.year,
        month: props.selectedDate.month,
        isUnfinished: newValue,
        keepOpen: true
      })
    }
  })

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

  // 10. Lifecycle Hooks
  let intervalId = null
  onMounted(() => {
    intervalId = setInterval(() => {
      currentTime.value = Date.now()
    }, 60000)
  })

  onUnmounted(() => {
    if (intervalId) {
      clearInterval(intervalId)
    }
  })

  // 11. Return Public API
  return {
    // State
    currentYear,
    currentTime,
    isUnfinishedToggled,

    // Computed
    maxYear,
    canDecrementYear,
    canIncrementYear,
    buttonBaseClasses,

    // Year Navigation
    incrementYear,
    decrementYear,

    // Month Selection
    selectMonth,
    isFutureMonth,
    isSelectedMonth,
    isCurrentMonth,
    isSelectedYear,
    computeMonthButtonClasses,

    // Toggle Handlers
    handleReadLongAgo,
    handleReadLately,
    handleInProgress,
    getToggleButtonClasses,

    // Helpers
    isSentinelYear,
    getCurrentInitialYear
  }
}
