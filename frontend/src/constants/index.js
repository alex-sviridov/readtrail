// Book status sentinel values
export const BOOK_STATUS = {
  SENTINEL_YEAR: 1900,        // Represents "Read Long Ago"
  SENTINEL_YEAR_LATELY: 1910, // Represents "Read Lately"
  SENTINEL_MONTH: 1,

  // Helper functions
  isReadLongAgo: (year) => year === 1900,
  isReadLately: (year) => year === 1910,
  isSentinelYear: (year) => year === 1900 || year === 1910,
  isUnfinished: (book) => book?.isUnfinished === true,
  getTimelineLabel: (year) => {
    if (year === 1910) return 'Read Lately'
    if (year <= 1900) return 'Long Time Ago'
    return year
  }
}

// Unfinished book styling
export const UNFINISHED_STYLE = {
  RIBBON_COLOR: '#f59e0b'  // Amber color
}

// Typography configuration
export const TYPOGRAPHY = {
  MIN_FONT_SIZE: 8,
  TITLE_MAX_FONT_SIZE: 12,
  AUTHOR_MAX_FONT_SIZE: 10,
  TITLE_DEFAULT_SIZE: '12pt',
  AUTHOR_DEFAULT_SIZE: '10pt'
}

// Layout dimensions
export const LAYOUT = {
  TITLE_MAX_HEIGHT: 64,
  AUTHOR_MAX_HEIGHT: 32
}

// UI timing
export const TIMINGS = {
  CONFIRMATION_TIMEOUT: 5000,
  SEARCH_DEBOUNCE: 500,
  API_TIMEOUT: 10000  // 10 seconds for API requests
}

// Date picker configuration
export const DATE_PICKER = {
  YEAR_LOOKBACK: 20,
  YEAR_LOOKAHEAD: 10
}

// Month data for date picker
export const MONTHS = [
  { name: 'Jan', fullName: 'January', index: 0 },
  { name: 'Feb', fullName: 'February', index: 1 },
  { name: 'Mar', fullName: 'March', index: 2 },
  { name: 'Apr', fullName: 'April', index: 3 },
  { name: 'May', fullName: 'May', index: 4 },
  { name: 'Jun', fullName: 'June', index: 5 },
  { name: 'Jul', fullName: 'July', index: 6 },
  { name: 'Aug', fullName: 'August', index: 7 },
  { name: 'Sep', fullName: 'September', index: 8 },
  { name: 'Oct', fullName: 'October', index: 9 },
  { name: 'Nov', fullName: 'November', index: 10 },
  { name: 'Dec', fullName: 'December', index: 11 }
]

// Convert from 1-indexed SENTINEL_MONTH to 0-indexed for component usage
export const SENTINEL_MONTH_INDEX = BOOK_STATUS.SENTINEL_MONTH - 1

// Z-index layers (lowest to highest)
export const Z_INDEX = {
  EDIT_OVERLAY: 10,
  BACKDROP: 20,
  PICKER_CARD: 30,
  MODAL: 50
}
