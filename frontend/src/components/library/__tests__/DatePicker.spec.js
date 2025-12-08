import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import DatePicker from '../DatePicker.vue'
import UnfinishedCheckbox from '../datepicker/UnfinishedCheckbox.vue'
import StatusToggleButtons from '../datepicker/StatusToggleButtons.vue'
import YearNavigator from '../datepicker/YearNavigator.vue'
import MonthGrid from '../datepicker/MonthGrid.vue'
import InProgressButton from '../datepicker/InProgressButton.vue'

describe('DatePicker Component', () => {
  let wrapper
  const currentYear = new Date().getFullYear()
  const defaultYearRange = [currentYear - 20, currentYear]

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2024, 5, 15)) // June 15, 2024
  })

  afterEach(() => {
    wrapper?.unmount()
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  describe('rendering sub-components', () => {
    it('should render YearNavigator component', () => {
      wrapper = mount(DatePicker, {
        props: {
          yearRange: defaultYearRange
        }
      })

      expect(wrapper.findComponent(YearNavigator).exists()).toBe(true)
    })

    it('should render MonthGrid component', () => {
      wrapper = mount(DatePicker, {
        props: {
          yearRange: defaultYearRange
        }
      })

      expect(wrapper.findComponent(MonthGrid).exists()).toBe(true)
    })

    it('should render StatusToggleButtons component', () => {
      wrapper = mount(DatePicker, {
        props: {
          yearRange: defaultYearRange
        }
      })

      expect(wrapper.findComponent(StatusToggleButtons).exists()).toBe(true)
    })

    it('should render InProgressButton component', () => {
      wrapper = mount(DatePicker, {
        props: {
          yearRange: defaultYearRange
        }
      })

      expect(wrapper.findComponent(InProgressButton).exists()).toBe(true)
    })

    it('should render UnfinishedCheckbox when allowUnfinished is true', () => {
      wrapper = mount(DatePicker, {
        props: {
          yearRange: defaultYearRange,
          allowUnfinished: true
        }
      })

      expect(wrapper.findComponent(UnfinishedCheckbox).exists()).toBe(true)
    })

    it('should not render UnfinishedCheckbox when allowUnfinished is false', () => {
      wrapper = mount(DatePicker, {
        props: {
          yearRange: defaultYearRange,
          allowUnfinished: false
        }
      })

      expect(wrapper.findComponent(UnfinishedCheckbox).exists()).toBe(false)
    })
  })

  describe('props reactivity', () => {
    it('should pass selectedDate to composable', () => {
      wrapper = mount(DatePicker, {
        props: {
          yearRange: defaultYearRange,
          selectedDate: { year: 2023, month: 5 }
        }
      })

      // The composable will set the currentYear based on selectedDate
      const yearNavigator = wrapper.findComponent(YearNavigator)
      expect(yearNavigator.props('currentYear')).toBe(2023)
    })

    it('should pass yearRange to composable', () => {
      const customRange = [2010, 2024]
      wrapper = mount(DatePicker, {
        props: {
          yearRange: customRange
        }
      })

      // Verify the component receives the year range
      expect(wrapper.props('yearRange')).toEqual(customRange)
    })

    it('should pass isReadLongAgo prop to StatusToggleButtons', () => {
      wrapper = mount(DatePicker, {
        props: {
          yearRange: defaultYearRange,
          isReadLongAgo: true
        }
      })

      const statusButtons = wrapper.findComponent(StatusToggleButtons)
      expect(statusButtons.props('isReadLongAgo')).toBe(true)
    })

    it('should pass isReadLately prop to StatusToggleButtons', () => {
      wrapper = mount(DatePicker, {
        props: {
          yearRange: defaultYearRange,
          isReadLately: true
        }
      })

      const statusButtons = wrapper.findComponent(StatusToggleButtons)
      expect(statusButtons.props('isReadLately')).toBe(true)
    })

    it('should pass isInProgress prop to InProgressButton', () => {
      wrapper = mount(DatePicker, {
        props: {
          yearRange: defaultYearRange,
          isInProgress: true
        }
      })

      const inProgressButton = wrapper.findComponent(InProgressButton)
      expect(inProgressButton.props('isActive')).toBe(true)
    })

    it('should initialize isUnfinished state from prop', () => {
      wrapper = mount(DatePicker, {
        props: {
          yearRange: defaultYearRange,
          allowUnfinished: true,
          isUnfinished: true
        }
      })

      const unfinishedCheckbox = wrapper.findComponent(UnfinishedCheckbox)
      expect(unfinishedCheckbox.props('modelValue')).toBe(true)
    })
  })

  describe('composable integration', () => {
    it('should use useDatePicker composable for state management', () => {
      wrapper = mount(DatePicker, {
        props: {
          yearRange: defaultYearRange
        }
      })

      // Verify composable provides currentYear
      const yearNavigator = wrapper.findComponent(YearNavigator)
      expect(yearNavigator.props('currentYear')).toBeDefined()
      expect(typeof yearNavigator.props('currentYear')).toBe('number')
    })

    it('should pass canDecrementYear from composable to YearNavigator', () => {
      wrapper = mount(DatePicker, {
        props: {
          yearRange: [2020, 2024]
        }
      })

      const yearNavigator = wrapper.findComponent(YearNavigator)
      // At year 2024, should be able to decrement
      expect(yearNavigator.props('canDecrement')).toBe(true)
    })

    it('should pass canIncrementYear from composable to YearNavigator', () => {
      wrapper = mount(DatePicker, {
        props: {
          yearRange: [2020, 2024]
        }
      })

      const yearNavigator = wrapper.findComponent(YearNavigator)
      // At year 2024 (current), should not be able to increment beyond current year
      expect(yearNavigator.props('canIncrement')).toBe(false)
    })
  })

  describe('sub-component orchestration', () => {
    it('should emit date-select event when month is selected', async () => {
      wrapper = mount(DatePicker, {
        props: {
          yearRange: defaultYearRange
        }
      })

      const monthGrid = wrapper.findComponent(MonthGrid)
      await monthGrid.vm.$emit('month-select', 3) // April (index 3)

      expect(wrapper.emitted('date-select')).toBeTruthy()
      expect(wrapper.emitted('date-select')[0][0]).toEqual({
        year: 2024,
        month: 3,
        isUnfinished: false
      })
    })

    it('should increment year when YearNavigator emits increment', async () => {
      wrapper = mount(DatePicker, {
        props: {
          yearRange: [2020, 2024]
        }
      })

      // Set to a year that can be incremented
      const yearNavigator = wrapper.findComponent(YearNavigator)
      const initialYear = yearNavigator.props('currentYear')

      await yearNavigator.vm.$emit('increment')

      expect(wrapper.findComponent(YearNavigator).props('currentYear')).toBe(initialYear + 1)
    })

    it('should decrement year when YearNavigator emits decrement', async () => {
      wrapper = mount(DatePicker, {
        props: {
          yearRange: [2020, 2024]
        }
      })

      const yearNavigator = wrapper.findComponent(YearNavigator)
      const initialYear = yearNavigator.props('currentYear')

      await yearNavigator.vm.$emit('decrement')

      expect(wrapper.findComponent(YearNavigator).props('currentYear')).toBe(initialYear - 1)
    })

    it('should emit date-select with sentinel year when Read Long Ago is clicked', async () => {
      wrapper = mount(DatePicker, {
        props: {
          yearRange: defaultYearRange
        }
      })

      const statusButtons = wrapper.findComponent(StatusToggleButtons)
      await statusButtons.vm.$emit('toggle-long-ago')

      expect(wrapper.emitted('date-select')).toBeTruthy()
      expect(wrapper.emitted('date-select')[0][0]).toEqual({
        year: 1900,
        month: 0,
        isUnfinished: false
      })
    })

    it('should emit date-select with sentinel year when Read Lately is clicked', async () => {
      wrapper = mount(DatePicker, {
        props: {
          yearRange: defaultYearRange
        }
      })

      const statusButtons = wrapper.findComponent(StatusToggleButtons)
      await statusButtons.vm.$emit('toggle-lately')

      expect(wrapper.emitted('date-select')).toBeTruthy()
      expect(wrapper.emitted('date-select')[0][0]).toEqual({
        year: 1910,
        month: 0,
        isUnfinished: false
      })
    })

    it('should emit date-select with null when In Progress is clicked', async () => {
      wrapper = mount(DatePicker, {
        props: {
          yearRange: defaultYearRange
        }
      })

      const inProgressButton = wrapper.findComponent(InProgressButton)
      await inProgressButton.vm.$emit('click')

      expect(wrapper.emitted('date-select')).toBeTruthy()
      expect(wrapper.emitted('date-select')[0][0]).toBe(null)
    })
  })

  describe('unfinished checkbox integration', () => {
    it('should include isUnfinished in date-select event when checkbox is checked', async () => {
      wrapper = mount(DatePicker, {
        props: {
          yearRange: defaultYearRange,
          allowUnfinished: true
        }
      })

      // Toggle the unfinished checkbox
      const unfinishedCheckbox = wrapper.findComponent(UnfinishedCheckbox)
      await unfinishedCheckbox.vm.$emit('update:modelValue', true)

      // Select a month
      const monthGrid = wrapper.findComponent(MonthGrid)
      await monthGrid.vm.$emit('month-select', 3)

      expect(wrapper.emitted('date-select')).toBeTruthy()
      expect(wrapper.emitted('date-select')[0][0]).toEqual({
        year: 2024,
        month: 3,
        isUnfinished: true
      })
    })

    it('should update isUnfinished immediately when checkbox is toggled for selected date', async () => {
      wrapper = mount(DatePicker, {
        props: {
          yearRange: defaultYearRange,
          allowUnfinished: true,
          selectedDate: { year: 2024, month: 5 }
        }
      })

      const unfinishedCheckbox = wrapper.findComponent(UnfinishedCheckbox)
      await unfinishedCheckbox.vm.$emit('update:modelValue', true)

      // Should emit immediately with keepOpen flag
      expect(wrapper.emitted('date-select')).toBeTruthy()
      const emittedEvent = wrapper.emitted('date-select')[0][0]
      expect(emittedEvent.isUnfinished).toBe(true)
      expect(emittedEvent.keepOpen).toBe(true)
    })
  })

  describe('year range constraints', () => {
    it('should not allow incrementing year beyond current year', async () => {
      wrapper = mount(DatePicker, {
        props: {
          yearRange: [2020, 2024]
        }
      })

      const yearNavigator = wrapper.findComponent(YearNavigator)
      expect(yearNavigator.props('canIncrement')).toBe(false)
    })

    it('should not allow decrementing year below range minimum', async () => {
      wrapper = mount(DatePicker, {
        props: {
          yearRange: [2023, 2024]
        }
      })

      const yearNavigator = wrapper.findComponent(YearNavigator)

      // Decrement to minimum
      await yearNavigator.vm.$emit('decrement')

      expect(wrapper.findComponent(YearNavigator).props('canDecrement')).toBe(false)
    })
  })

  describe('month selection constraints', () => {
    it('should pass isFutureMonth function to MonthGrid', () => {
      wrapper = mount(DatePicker, {
        props: {
          yearRange: defaultYearRange
        }
      })

      const monthGrid = wrapper.findComponent(MonthGrid)
      expect(monthGrid.props('isFutureMonth')).toBeDefined()
      expect(typeof monthGrid.props('isFutureMonth')).toBe('function')
    })

    it('should pass isSelectedMonth function to MonthGrid', () => {
      wrapper = mount(DatePicker, {
        props: {
          yearRange: defaultYearRange,
          selectedDate: { year: 2024, month: 5 }
        }
      })

      const monthGrid = wrapper.findComponent(MonthGrid)
      expect(monthGrid.props('isSelectedMonth')).toBeDefined()
      expect(typeof monthGrid.props('isSelectedMonth')).toBe('function')
    })

    it('should pass MONTHS constant to MonthGrid', () => {
      wrapper = mount(DatePicker, {
        props: {
          yearRange: defaultYearRange
        }
      })

      const monthGrid = wrapper.findComponent(MonthGrid)
      const months = monthGrid.props('months')

      expect(Array.isArray(months)).toBe(true)
      expect(months.length).toBe(12)
      expect(months[0].name).toBe('Jan')
    })
  })

  describe('layout structure', () => {
    it('should have proper semantic HTML structure', () => {
      wrapper = mount(DatePicker, {
        props: {
          yearRange: defaultYearRange,
          allowUnfinished: true
        }
      })

      expect(wrapper.find('article').exists()).toBe(true)
      expect(wrapper.find('header').exists()).toBe(true)
      expect(wrapper.find('main').exists()).toBe(true)
      expect(wrapper.find('footer').exists()).toBe(true)
      expect(wrapper.find('section').exists()).toBe(true) // UnfinishedCheckbox section
    })

    it('should apply picker-container class for container queries', () => {
      wrapper = mount(DatePicker, {
        props: {
          yearRange: defaultYearRange
        }
      })

      expect(wrapper.find('.picker-container').exists()).toBe(true)
    })
  })
})
