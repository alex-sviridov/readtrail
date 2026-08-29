import { describe, it, expect, vi } from 'vitest'
import { ref } from 'vue'
import { useLibraryFilters } from '../useLibraryFilters'

function createSettingsStore(overrides = {}) {
  return {
    settings: { hideUnfinished: true, hideToRead: true, ...overrides },
    updateSetting: vi.fn(function (key, value) {
      this.settings[key] = value
    })
  }
}

const toReadBook = { id: 'to-read', year: 2100, attributes: {} }
const unfinishedBook = { id: 'unfinished', year: 2020, attributes: { isUnfinished: true } }
const finishedBook = { id: 'finished', year: 2021, attributes: { isUnfinished: false } }

describe('useLibraryFilters', () => {
  it('shows unfinished and to-read books when both toggles are true', () => {
    const books = ref([toReadBook, unfinishedBook, finishedBook])
    const { filteredBooks } = useLibraryFilters(books, createSettingsStore())

    expect(filteredBooks.value).toEqual(books.value)
  })

  it('hides unfinished books when hideUnfinished is false', () => {
    const books = ref([unfinishedBook, finishedBook])
    const { filteredBooks } = useLibraryFilters(books, createSettingsStore({ hideUnfinished: false }))

    expect(filteredBooks.value).toEqual([finishedBook])
  })

  it('hides to-read books when hideToRead is false', () => {
    const books = ref([toReadBook, finishedBook])
    const { filteredBooks } = useLibraryFilters(books, createSettingsStore({ hideToRead: false }))

    expect(filteredBooks.value).toEqual([finishedBook])
  })

  it('toggleFilter flips hideUnfinished on the settings store', () => {
    const settingsStore = createSettingsStore({ hideUnfinished: true })
    const { toggleFilter } = useLibraryFilters(ref([]), settingsStore)

    toggleFilter()

    expect(settingsStore.updateSetting).toHaveBeenCalledWith('hideUnfinished', false)
  })

  it('toggleToReadFilter flips hideToRead on the settings store', () => {
    const settingsStore = createSettingsStore({ hideToRead: true })
    const { toggleToReadFilter } = useLibraryFilters(ref([]), settingsStore)

    toggleToReadFilter()

    expect(settingsStore.updateSetting).toHaveBeenCalledWith('hideToRead', false)
  })

  it('clearAllFilters resets both toggles to true', () => {
    const settingsStore = createSettingsStore({ hideUnfinished: false, hideToRead: false })
    const { clearAllFilters } = useLibraryFilters(ref([]), settingsStore)

    clearAllFilters()

    expect(settingsStore.updateSetting).toHaveBeenCalledWith('hideUnfinished', true)
    expect(settingsStore.updateSetting).toHaveBeenCalledWith('hideToRead', true)
  })
})
