import { computed } from 'vue'

/**
 * Composable for date-related utilities and constants
 */
export function useDateHelpers() {
  // Month names array
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  // Generate year options (current year ± 10 years)
  const yearOptions = computed(() => {
    const currentYear = new Date().getFullYear()
    const years = []
    for (let i = currentYear + 10; i >= currentYear - 10; i--) {
      years.push(i)
    }
    return years
  })

  // Format year and month to "Month Year" string
  const formatYearMonth = (year, month) => {
    if (!year || !month) return ''
    const monthName = monthNames[month - 1]
    return `${monthName} ${year}`
  }

  // Get current year and month
  const getCurrentYearMonth = () => {
    const now = new Date()
    return {
      year: now.getFullYear(),
      month: now.getMonth() + 1 // JavaScript months are 0-indexed
    }
  }

  // Convert year and month to Date object for VueDatePicker
  const yearMonthToDate = (year, month) => {
    if (!year || !month) return null
    return new Date(year, month - 1, 1)
  }

  // Convert Date object from VueDatePicker to year and month
  const dateToYearMonth = (date) => {
    if (!date) return { year: null, month: null }
    return {
      year: date.year(),
      month: date.month() + 1
    }
  }

  return {
    monthNames,
    yearOptions,
    formatYearMonth,
    getCurrentYearMonth,
    yearMonthToDate,
    dateToYearMonth
  }
}
