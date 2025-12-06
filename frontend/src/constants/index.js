// Book status sentinel values
export const BOOK_STATUS = {
  SENTINEL_YEAR: 1900,  // Represents "Read Long Ago"
  SENTINEL_MONTH: 1
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

// Z-index layers (lowest to highest)
export const Z_INDEX = {
  EDIT_OVERLAY: 10,
  BACKDROP: 20,
  PICKER_CARD: 30,
  MODAL: 50
}
