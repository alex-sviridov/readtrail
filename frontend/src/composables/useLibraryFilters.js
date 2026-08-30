import { computed } from 'vue'
import { BOOK_STATUS } from '@/constants'

/**
 * Shared "hide unfinished" / "hide to-read" filtering used by both the
 * grid/timeline and table library views, backed by the settings store so
 * the toggles persist across views.
 */
export function useLibraryFilters(books, settingsStore) {
  const hideUnfinished = computed(() => settingsStore.settings.hideUnfinished)
  const hideToRead = computed(() => settingsStore.settings.hideToRead)

  const filteredBooks = computed(() => {
    let result = books.value
    if (!hideUnfinished.value) {
      result = result.filter(book => !book.attributes?.isUnfinished)
    }
    if (!hideToRead.value) {
      result = result.filter(book => !BOOK_STATUS.isToRead(book.year))
    }
    return result
  })

  function toggleFilter() {
    settingsStore.updateSetting('hideUnfinished', !hideUnfinished.value)
  }

  function toggleToReadFilter() {
    settingsStore.updateSetting('hideToRead', !hideToRead.value)
  }

  function clearAllFilters() {
    settingsStore.updateSetting('hideUnfinished', true)
    settingsStore.updateSetting('hideToRead', true)
  }

  return {
    hideUnfinished,
    hideToRead,
    filteredBooks,
    toggleFilter,
    toggleToReadFilter,
    clearAllFilters
  }
}
