import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import BookStatus from '../BookStatus.vue'
import { BOOK_STATUS } from '@/constants'

describe('BookStatus', () => {
  const createWrapper = (props = {}) => {
    return mount(BookStatus, {
      props: {
        year: null,
        month: null,
        isDateEditable: false,
        ...props
      }
    })
  }

  beforeEach(() => {
    // Reset any state if needed
  })

  describe('Reading... Display', () => {
    it('displays "Reading..." when no date is provided', () => {
      const wrapper = createWrapper()

      expect(wrapper.text()).toBe('Reading...')
    })

    it('displays "Reading..." when year is null', () => {
      const wrapper = createWrapper({ year: null, month: 5 })

      expect(wrapper.text()).toBe('Reading...')
    })

    it('displays "Reading..." when month is null', () => {
      const wrapper = createWrapper({ year: 2024, month: null })

      expect(wrapper.text()).toBe('Reading...')
    })

    it('applies italic style to "Reading..." text', () => {
      const wrapper = createWrapper()
      const span = wrapper.find('span')

      expect(span.classes()).toContain('italic')
    })

    it('applies blue styling for in-progress books when not editable', () => {
      const wrapper = createWrapper({ isDateEditable: false })
      const container = wrapper.find('.flex')

      expect(container.classes()).toContain('text-blue-600')
      expect(container.classes()).toContain('font-semibold')
      // When not editable, should not have hover styles
      expect(container.classes()).toContain('cursor-default')
    })

    it('applies blue styling with hover for in-progress books when editable', () => {
      const wrapper = createWrapper({ isDateEditable: true })
      const container = wrapper.find('.flex')

      expect(container.classes()).toContain('text-blue-600')
      expect(container.classes()).toContain('font-semibold')
      expect(container.classes()).toContain('cursor-pointer')
    })
  })

  describe('Date Formatting', () => {
    it('formats date as "Month Year" when both year and month are provided', () => {
      const wrapper = createWrapper({ year: 2024, month: 5 })

      expect(wrapper.text()).toBe('May 2024')
    })

    it('formats January correctly', () => {
      const wrapper = createWrapper({ year: 2023, month: 1 })

      expect(wrapper.text()).toBe('January 2023')
    })

    it('formats December correctly', () => {
      const wrapper = createWrapper({ year: 2023, month: 12 })

      expect(wrapper.text()).toBe('December 2023')
    })

    it('formats multiple different months correctly', () => {
      const testCases = [
        { month: 1, expected: 'January' },
        { month: 2, expected: 'February' },
        { month: 3, expected: 'March' },
        { month: 4, expected: 'April' },
        { month: 5, expected: 'May' },
        { month: 6, expected: 'June' },
        { month: 7, expected: 'July' },
        { month: 8, expected: 'August' },
        { month: 9, expected: 'September' },
        { month: 10, expected: 'October' },
        { month: 11, expected: 'November' },
        { month: 12, expected: 'December' }
      ]

      testCases.forEach(({ month, expected }) => {
        const wrapper = createWrapper({ year: 2024, month })
        expect(wrapper.text()).toBe(`${expected} 2024`)
      })
    })

    it('does not apply italic style to formatted dates', () => {
      const wrapper = createWrapper({ year: 2024, month: 5 })
      const span = wrapper.find('span')

      expect(span.classes()).not.toContain('italic')
    })

    it('applies standard gray styling for regular dates when not editable', () => {
      const wrapper = createWrapper({ year: 2020, month: 6, isDateEditable: false })
      const container = wrapper.find('.flex')

      expect(container.classes()).toContain('text-gray-700')
      expect(container.classes()).toContain('cursor-default')
    })

    it('applies standard gray styling with hover for regular dates when editable', () => {
      const wrapper = createWrapper({ year: 2020, month: 6, isDateEditable: true })
      const container = wrapper.find('.flex')

      expect(container.classes()).toContain('text-gray-700')
      expect(container.classes()).toContain('cursor-pointer')
    })
  })

  describe('Special Status Displays', () => {
    it('displays "Read Long Ago" for sentinel year 1900', () => {
      const wrapper = createWrapper({
        year: BOOK_STATUS.SENTINEL_YEAR,
        month: BOOK_STATUS.SENTINEL_MONTH
      })

      expect(wrapper.text()).toBe('Read Long Ago')
    })

    it('displays "Read Lately" for sentinel year 1910', () => {
      const wrapper = createWrapper({
        year: BOOK_STATUS.SENTINEL_YEAR_LATELY,
        month: BOOK_STATUS.SENTINEL_MONTH
      })

      expect(wrapper.text()).toBe('Read Lately')
    })

    it('does not apply italic style to "Read Long Ago"', () => {
      const wrapper = createWrapper({
        year: BOOK_STATUS.SENTINEL_YEAR,
        month: BOOK_STATUS.SENTINEL_MONTH
      })
      const span = wrapper.find('span')

      expect(span.classes()).not.toContain('italic')
    })

    it('does not apply italic style to "Read Lately"', () => {
      const wrapper = createWrapper({
        year: BOOK_STATUS.SENTINEL_YEAR_LATELY,
        month: BOOK_STATUS.SENTINEL_MONTH
      })
      const span = wrapper.find('span')

      expect(span.classes()).not.toContain('italic')
    })

    it('applies gray background styling for "Read Long Ago" when not editable', () => {
      const wrapper = createWrapper({
        year: BOOK_STATUS.SENTINEL_YEAR,
        month: BOOK_STATUS.SENTINEL_MONTH,
        isDateEditable: false
      })
      const container = wrapper.find('.flex')

      expect(container.classes()).toContain('text-gray-700')
      expect(container.classes()).toContain('bg-gray-50')
      expect(container.classes()).toContain('font-semibold')
      expect(container.classes()).toContain('cursor-default')
    })

    it('applies gray background styling for "Read Lately" when editable', () => {
      const wrapper = createWrapper({
        year: BOOK_STATUS.SENTINEL_YEAR_LATELY,
        month: BOOK_STATUS.SENTINEL_MONTH,
        isDateEditable: true
      })
      const container = wrapper.find('.flex')

      expect(container.classes()).toContain('text-gray-700')
      expect(container.classes()).toContain('bg-gray-50')
      expect(container.classes()).toContain('font-semibold')
      expect(container.classes()).toContain('cursor-pointer')
    })
  })

  describe('Click Event Handling', () => {
    it('emits "open-picker" event when clicked and editable', async () => {
      const wrapper = createWrapper({ year: 2024, month: 5, isDateEditable: true })

      await wrapper.trigger('click')

      expect(wrapper.emitted('open-picker')).toBeTruthy()
      expect(wrapper.emitted('open-picker')).toHaveLength(1)
    })

    it('does NOT emit "open-picker" event when clicked and NOT editable', async () => {
      const wrapper = createWrapper({ year: 2024, month: 5, isDateEditable: false })

      await wrapper.trigger('click')

      expect(wrapper.emitted('open-picker')).toBeFalsy()
    })

    it('emits "open-picker" event when in-progress book is clicked and editable', async () => {
      const wrapper = createWrapper({ isDateEditable: true })

      await wrapper.trigger('click')

      expect(wrapper.emitted('open-picker')).toBeTruthy()
      expect(wrapper.emitted('open-picker')).toHaveLength(1)
    })

    it('does NOT emit when in-progress book is clicked and NOT editable', async () => {
      const wrapper = createWrapper({ isDateEditable: false })

      await wrapper.trigger('click')

      expect(wrapper.emitted('open-picker')).toBeFalsy()
    })

    it('emits "open-picker" event when special status is clicked and editable', async () => {
      const wrapper = createWrapper({
        year: BOOK_STATUS.SENTINEL_YEAR,
        month: BOOK_STATUS.SENTINEL_MONTH,
        isDateEditable: true
      })

      await wrapper.trigger('click')

      expect(wrapper.emitted('open-picker')).toBeTruthy()
      expect(wrapper.emitted('open-picker')).toHaveLength(1)
    })

    it('has cursor pointer styling when editable', () => {
      const wrapper = createWrapper({ isDateEditable: true })
      const container = wrapper.find('.flex')

      expect(container.classes()).toContain('cursor-pointer')
    })

    it('has cursor default styling when not editable', () => {
      const wrapper = createWrapper({ isDateEditable: false })
      const container = wrapper.find('.flex')

      expect(container.classes()).toContain('cursor-default')
    })

    it('multiple clicks emit multiple events when editable', async () => {
      const wrapper = createWrapper({ year: 2024, month: 5, isDateEditable: true })

      await wrapper.trigger('click')
      await wrapper.trigger('click')
      await wrapper.trigger('click')

      expect(wrapper.emitted('open-picker')).toHaveLength(3)
    })

    it('multiple clicks do NOT emit events when not editable', async () => {
      const wrapper = createWrapper({ year: 2024, month: 5, isDateEditable: false })

      await wrapper.trigger('click')
      await wrapper.trigger('click')
      await wrapper.trigger('click')

      expect(wrapper.emitted('open-picker')).toBeFalsy()
    })
  })

  describe('Title Attribute', () => {
    it('shows "Click to set completion date" when no date is provided and editable', () => {
      const wrapper = createWrapper({ isDateEditable: true })
      const container = wrapper.find('.flex')

      expect(container.attributes('title')).toBe('Click to set completion date')
    })

    it('shows "Currently reading" when no date is provided and not editable', () => {
      const wrapper = createWrapper({ isDateEditable: false })
      const container = wrapper.find('.flex')

      expect(container.attributes('title')).toBe('Currently reading')
    })

    it('shows "Click to change completion date" when date is provided and editable', () => {
      const wrapper = createWrapper({ year: 2024, month: 5, isDateEditable: true })
      const container = wrapper.find('.flex')

      expect(container.attributes('title')).toBe('Click to change completion date')
    })

    it('shows formatted date when date is provided and not editable', () => {
      const wrapper = createWrapper({ year: 2024, month: 5, isDateEditable: false })
      const container = wrapper.find('.flex')

      expect(container.attributes('title')).toBe('May 2024')
    })

    it('shows "Click to change completion date" for special status when editable', () => {
      const wrapper = createWrapper({
        year: BOOK_STATUS.SENTINEL_YEAR,
        month: BOOK_STATUS.SENTINEL_MONTH,
        isDateEditable: true
      })
      const container = wrapper.find('.flex')

      expect(container.attributes('title')).toBe('Click to change completion date')
    })
  })

  describe('Component Structure', () => {
    it('has correct flex layout classes', () => {
      const wrapper = createWrapper()
      const container = wrapper.find('.flex')

      expect(container.exists()).toBe(true)
      expect(container.classes()).toContain('justify-end')
      expect(container.classes()).toContain('relative')
    })

    it('has correct text container styling', () => {
      const wrapper = createWrapper()
      const textContainer = wrapper.find('.text-base')

      expect(textContainer.exists()).toBe(true)
      expect(textContainer.classes()).toContain('font-semibold')
      expect(textContainer.classes()).toContain('transition-all')
      expect(textContainer.classes()).toContain('duration-200')
      expect(textContainer.classes()).toContain('px-4')
      expect(textContainer.classes()).toContain('py-2')
      expect(textContainer.classes()).toContain('rounded-lg')
      expect(textContainer.classes()).toContain('min-w-[140px]')
      expect(textContainer.classes()).toContain('text-right')
    })
  })

  describe('Edge Cases', () => {
    it('handles year 0 gracefully', () => {
      const wrapper = createWrapper({ year: 0, month: 1 })

      // Year 0 with a month should still be considered as having no date
      expect(wrapper.text()).toBe('Reading...')
    })

    it('handles month 0 gracefully', () => {
      const wrapper = createWrapper({ year: 2024, month: 0 })

      // Month 0 is invalid, should show "Reading..."
      expect(wrapper.text()).toBe('Reading...')
    })

    it('handles future years', () => {
      const wrapper = createWrapper({ year: 2099, month: 12 })

      expect(wrapper.text()).toBe('December 2099')
    })

    it('handles old years that are not sentinel values', () => {
      const wrapper = createWrapper({ year: 1950, month: 6 })

      expect(wrapper.text()).toBe('June 1950')
    })
  })

  describe('Props Validation', () => {
    it('uses default null values when props not provided', () => {
      const wrapper = mount(BookStatus, {
        props: {}
      })

      expect(wrapper.text()).toBe('Reading...')
    })

    it('accepts number type for year prop', () => {
      const wrapper = createWrapper({ year: 2024 })

      expect(wrapper.vm.year).toBe(2024)
    })

    it('accepts number type for month prop', () => {
      const wrapper = createWrapper({ month: 5 })

      expect(wrapper.vm.month).toBe(5)
    })
  })
})
