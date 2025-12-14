import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick, ref } from 'vue'
import BookCard from '../library/BookCard.vue'
import EditableText from '../library/EditableText.vue'
import BookStatus from '../library/BookStatus.vue'
import BookCover from '../library/BookCover.vue'
import DatePickerCard from '../library/DatePicker.vue'
import IconButton from '../library/IconButton.vue'

// Mock the composables
vi.mock('@/composables/useDateHelpers', () => ({
  useDateHelpers: () => ({
    formatYearMonth: (year, month) => {
      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December']
      return `${monthNames[month - 1]} ${year}`
    }
  })
}))

vi.mock('@/composables/useClickOutside', () => ({
  useClickOutside: vi.fn(),
  useEscapeKey: vi.fn()
}))

vi.mock('@/composables/useTemporaryScoreEdit', () => ({
  useTemporaryScoreEdit: () => ({
    isEditing: ref(false),
    start: vi.fn(),
    stop: vi.fn()
  })
}))

vi.mock('@/constants', () => ({
  BOOK_STATUS: {
    SENTINEL_YEAR: 1900,
    SENTINEL_YEAR_LATELY: 1910,
    SENTINEL_MONTH: 1,
    isReadLongAgo: (year) => year === 1900,
    isReadLately: (year) => year === 1910,
    isSentinelYear: (year) => year === 1900 || year === 1910,
    isUnfinished: (book) => book?.attributes?.isUnfinished === true,
    getTimelineLabel: (year) => {
      if (year === 1910) return 'Read Lately'
      if (year <= 1900) return 'Long Time Ago'
      return year
    }
  },
  DATE_PICKER: {
    YEAR_LOOKBACK: 20,
    YEAR_LOOKAHEAD: 10
  },
  TYPOGRAPHY: {
    MIN_FONT_SIZE: 8,
    TITLE_MAX_FONT_SIZE: 12,
    AUTHOR_MAX_FONT_SIZE: 10,
    TITLE_DEFAULT_SIZE: '12pt',
    AUTHOR_DEFAULT_SIZE: '10pt'
  },
  LAYOUT: {
    TITLE_MAX_HEIGHT: 64,
    AUTHOR_MAX_HEIGHT: 32
  },
  TIMINGS: {
    CONFIRMATION_TIMEOUT: 5000,
    SEARCH_DEBOUNCE: 500,
    API_TIMEOUT: 10000
  },
  MONTHS: [
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
  ],
  SENTINEL_MONTH_INDEX: 0,
  Z_INDEX: {
    EDIT_OVERLAY: 10,
    BACKDROP: 20,
    PICKER_CARD: 30,
    MODAL: 50
  },
  UNFINISHED_STYLE: {
    RIBBON_COLOR: '#f59e0b'
  }
}))

describe('BookCard', () => {
  const inProgressBook = {
    id: '1',
    name: 'In Progress Book',
    author: 'Test Author',
    year: null,
    month: null,
    attributes: {
      isUnfinished: false
    },
    coverLink: null
  }

  const completedBook = {
    id: '2',
    name: 'Completed Book',
    author: 'Test Author',
    year: 2024,
    month: 6,
    attributes: {
      isUnfinished: false
    },
    coverLink: null
  }

  const mockBooksStore = {
    updateBookStatus: vi.fn(),
    updateBookFields: vi.fn(),
    deleteBook: vi.fn()
  }

  const mockSettingsStore = {
    settings: {
      showBookInfo: true,
      allowUnfinishedReading: false,
      allowScoring: false
    }
  }

  const createWrapper = (book, settingsOverride = {}) => {
    const settingsStore = {
      settings: { ...mockSettingsStore.settings, ...settingsOverride }
    }

    return mount(BookCard, {
      props: { book },
      global: {
        stubs: { Teleport: true },
        provide: {
          booksStore: mockBooksStore,
          settingsStore
        }
      }
    })
  }

  describe('View Mode', () => {
    it('renders book name', () => {
      const wrapper = createWrapper(inProgressBook)
      expect(wrapper.text()).toContain('In Progress Book')
    })

    it('displays "Reading..." status for in-progress book', () => {
      const wrapper = createWrapper(inProgressBook)
      expect(wrapper.text()).toContain('Reading...')
    })

    it('displays formatted completion date for completed book', () => {
      const wrapper = createWrapper(completedBook)
      expect(wrapper.text()).toContain('June 2024')
    })

    it('renders book cover component', () => {
      const wrapper = createWrapper(inProgressBook)
      expect(wrapper.findComponent(BookCover).exists()).toBe(true)
    })

    it('renders edit button on hover (visible in test)', () => {
      const wrapper = createWrapper(inProgressBook)
      const editButtons = wrapper.findAllComponents(IconButton)
      expect(editButtons.length).toBeGreaterThan(0)
      const editButton = editButtons.find(b => b.props('title') === 'Edit book')
      expect(editButton).toBeDefined()
    })
  })

  describe('Edit Mode', () => {
    it('enters edit mode when Edit icon is clicked', async () => {
      const wrapper = createWrapper(inProgressBook)

      const editIcon = wrapper.findAllComponents(IconButton).find(b => b.props('title') === 'Edit book')
      await editIcon.vm.$emit('click')
      await nextTick()

      // In edit mode, the card should have the edit ring class
      expect(wrapper.find('.ring-2.ring-blue-500').exists()).toBe(true)

      // EditableText components should receive editable prop
      const editableTexts = wrapper.findAllComponents(EditableText)
      expect(editableTexts.length).toBeGreaterThan(0)
      editableTexts.forEach(text => {
        expect(text.props('editable')).toBe(true)
      })
    })

    it('shows delete button when in edit mode', async () => {
      const wrapper = createWrapper(inProgressBook)

      const editIcon = wrapper.findAllComponents(IconButton).find(b => b.props('title') === 'Edit book')
      await editIcon.vm.$emit('click')
      await nextTick()

      const deleteIcon = wrapper.findAllComponents(IconButton).find(b => b.props('title') === 'Delete book')
      expect(deleteIcon).toBeDefined()
    })

    it('updates title when EditableText emits update', async () => {
      const wrapper = createWrapper(inProgressBook)

      const titleComponent = wrapper.findAllComponents(EditableText).find(c => c.props('variant') === 'title')
      await titleComponent.vm.$emit('update', 'Updated Title')
      await nextTick()

      expect(mockBooksStore.updateBookFields).toHaveBeenCalledWith('1', { name: 'Updated Title' })
    })

    it('updates author when EditableText emits update', async () => {
      const wrapper = createWrapper(inProgressBook)

      const authorComponent = wrapper.findAllComponents(EditableText).find(c => c.props('variant') === 'author')
      await authorComponent.vm.$emit('update', 'Updated Author')
      await nextTick()

      expect(mockBooksStore.updateBookFields).toHaveBeenCalledWith('1', { author: 'Updated Author' })
    })

    it('updates cover when BookCover emits update', async () => {
      const wrapper = createWrapper(inProgressBook)

      const bookCover = wrapper.findComponent(BookCover)
      await bookCover.vm.$emit('update', { coverLink: 'https://example.com/cover.jpg', customCover: null })
      await nextTick()

      expect(mockBooksStore.updateBookFields).toHaveBeenCalledWith('1', {
        coverLink: 'https://example.com/cover.jpg'
      })
    })
  })

  describe('Date Picker Mode', () => {
    it('opens date picker when BookStatus is clicked', async () => {
      const wrapper = createWrapper(inProgressBook)

      const bookStatus = wrapper.findComponent(BookStatus)
      await bookStatus.vm.$emit('open-picker')
      await nextTick()

      // DatePickerCard should be shown
      expect(wrapper.findComponent(DatePickerCard).exists()).toBe(true)

      // Normal card content should be hidden
      expect(wrapper.findAllComponents(EditableText).length).toBe(0)
    })

    it('calls updateBookStatus when date is selected', async () => {
      const wrapper = createWrapper(inProgressBook)

      // Open picker
      const bookStatus = wrapper.findComponent(BookStatus)
      await bookStatus.vm.$emit('open-picker')
      await nextTick()

      // Select date
      const datePicker = wrapper.findComponent(DatePickerCard)
      await datePicker.vm.$emit('date-select', { year: 2024, month: 11, isUnfinished: false, keepOpen: false })
      await nextTick()

      expect(mockBooksStore.updateBookStatus).toHaveBeenCalledWith('1', 2024, 12, false, null)
    })

    it('closes picker after date selection (when keepOpen is false)', async () => {
      const wrapper = createWrapper(inProgressBook)

      // Open picker
      const bookStatus = wrapper.findComponent(BookStatus)
      await bookStatus.vm.$emit('open-picker')
      await nextTick()

      expect(wrapper.findComponent(DatePickerCard).exists()).toBe(true)

      // Select date without keepOpen
      const datePicker = wrapper.findComponent(DatePickerCard)
      await datePicker.vm.$emit('date-select', { year: 2024, month: 11, isUnfinished: false, keepOpen: false })
      await nextTick()

      // Picker should be closed
      expect(wrapper.findComponent(DatePickerCard).exists()).toBe(false)
    })

    it('handles "In Progress" selection (null date)', async () => {
      const wrapper = createWrapper(completedBook)

      // Open picker
      const bookStatus = wrapper.findComponent(BookStatus)
      await bookStatus.vm.$emit('open-picker')
      await nextTick()

      // Select "In Progress" (null)
      const datePicker = wrapper.findComponent(DatePickerCard)
      await datePicker.vm.$emit('date-select', null)
      await nextTick()

      expect(mockBooksStore.updateBookStatus).toHaveBeenCalledWith('2', null, null, false, 0)
    })
  })

  describe('Delete', () => {
    it('calls deleteBook when Delete icon is clicked', async () => {
      const wrapper = createWrapper(inProgressBook)

      // Enter edit mode first
      const editIcon = wrapper.findAllComponents(IconButton).find(b => b.props('title') === 'Edit book')
      await editIcon.vm.$emit('click')
      await nextTick()

      // Now click delete
      const deleteIcon = wrapper.findAllComponents(IconButton).find(b => b.props('title') === 'Delete book')
      await deleteIcon.vm.$emit('click')
      await nextTick()

      expect(mockBooksStore.deleteBook).toHaveBeenCalledWith('1')
    })
  })

  describe('Date Formatting', () => {
    const testCases = [
      { year: 2024, month: 1, expected: 'January 2024' },
      { year: 2024, month: 6, expected: 'June 2024' },
      { year: 2024, month: 12, expected: 'December 2024' },
      { year: 2023, month: 3, expected: 'March 2023' }
    ]

    testCases.forEach(({ year, month, expected }) => {
      it(`formats ${year}-${month} as "${expected}"`, () => {
        const wrapper = createWrapper({
          ...completedBook,
          year,
          month
        })
        expect(wrapper.text()).toContain(expected)
      })
    })
  })

  describe('Card Styling', () => {
    it('applies card styling classes', () => {
      const wrapper = createWrapper(inProgressBook)

      expect(wrapper.find('.rounded-lg').exists()).toBe(true)
      expect(wrapper.find('.shadow-md').exists()).toBe(true)
      expect(wrapper.find('.hover\\:shadow-lg').exists()).toBe(true)
    })

    it('applies special styling for in-progress books', () => {
      const wrapper = createWrapper(inProgressBook)

      // In-progress books should have blue ring styling
      expect(wrapper.find('.ring-2.ring-blue-400').exists()).toBe(true)
    })

    it('applies edit mode styling when in edit mode', async () => {
      const wrapper = createWrapper(inProgressBook)

      const editIcon = wrapper.findAllComponents(IconButton).find(b => b.props('title') === 'Edit book')
      await editIcon.vm.$emit('click')
      await nextTick()

      expect(wrapper.find('.ring-2.ring-blue-500').exists()).toBe(true)
      expect(wrapper.find('.shadow-xl').exists()).toBe(true)
    })
  })

  describe('Settings', () => {
    it('hides book info when settings.showBookInfo is false', () => {
      const wrapper = createWrapper(inProgressBook, { showBookInfo: false })

      expect(wrapper.findAllComponents(EditableText).length).toBe(0)
    })

    it('shows unfinished ribbon when book is unfinished and setting is enabled', () => {
      const unfinishedBook = { ...inProgressBook, attributes: { isUnfinished: true } }
      const wrapper = createWrapper(unfinishedBook, { allowUnfinishedReading: true })

      expect(wrapper.text()).toContain('Unfinished')
    })

    it('does not show unfinished ribbon when setting is disabled', () => {
      const unfinishedBook = { ...inProgressBook, attributes: { isUnfinished: true } }
      const wrapper = createWrapper(unfinishedBook, { allowUnfinishedReading: false })

      expect(wrapper.text()).not.toContain('Unfinished')
    })
  })
})
