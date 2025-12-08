import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { defineComponent, ref } from 'vue'
import { mount } from '@vue/test-utils'
import { useDatePicker } from '../useDatePicker'

// Mock constants
vi.mock('@/constants', () => ({
  BOOK_STATUS: {
    SENTINEL_YEAR: 1900,
    SENTINEL_YEAR_LATELY: 1910,
    SENTINEL_MONTH: 1
  },
  SENTINEL_MONTH_INDEX: 0
}))

describe('useDatePicker', () => {
  let wrapper
  let emit

  beforeEach(() => {
    emit = vi.fn()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-06-15'))
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
    }
    vi.clearAllTimers()
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  const createTestComponent = (propsData = {}) => {
    const defaultProps = {
      selectedDate: null,
      yearRange: [2014, 2024],
      isUnfinished: false,
      ...propsData
    }

    return defineComponent({
      setup() {
        const props = ref(defaultProps)
        const picker = useDatePicker(props.value, emit)
        return { picker, props }
      },
      template: '<div>Test</div>'
    })
  }

  describe('initialization', () => {
    it('should initialize with current year when no selectedDate', () => {
      const TestComponent = createTestComponent()
      wrapper = mount(TestComponent)

      expect(wrapper.vm.picker.currentYear.value).toBe(2024)
    })

    it('should initialize with selectedDate year when provided', () => {
      const TestComponent = createTestComponent({
        selectedDate: { year: 2022, month: 5 }
      })
      wrapper = mount(TestComponent)

      expect(wrapper.vm.picker.currentYear.value).toBe(2022)
    })

    it('should initialize with current year for sentinel year (1900)', () => {
      const TestComponent = createTestComponent({
        selectedDate: { year: 1900, month: 0 }
      })
      wrapper = mount(TestComponent)

      expect(wrapper.vm.picker.currentYear.value).toBe(2024)
    })

    it('should initialize with current year for sentinel year (1910)', () => {
      const TestComponent = createTestComponent({
        selectedDate: { year: 1910, month: 0 }
      })
      wrapper = mount(TestComponent)

      expect(wrapper.vm.picker.currentYear.value).toBe(2024)
    })

    it('should initialize isUnfinishedToggled from props', () => {
      const TestComponent = createTestComponent({ isUnfinished: true })
      wrapper = mount(TestComponent)

      expect(wrapper.vm.picker.isUnfinishedToggled.value).toBe(true)
    })

    it('should initialize currentTime', () => {
      const TestComponent = createTestComponent()
      wrapper = mount(TestComponent)

      expect(wrapper.vm.picker.currentTime.value).toBeDefined()
      expect(typeof wrapper.vm.picker.currentTime.value).toBe('number')
    })
  })

  describe('isSentinelYear', () => {
    it('should return true for 1900', () => {
      const TestComponent = createTestComponent()
      wrapper = mount(TestComponent)

      expect(wrapper.vm.picker.isSentinelYear(1900)).toBe(true)
    })

    it('should return true for 1910', () => {
      const TestComponent = createTestComponent()
      wrapper = mount(TestComponent)

      expect(wrapper.vm.picker.isSentinelYear(1910)).toBe(true)
    })

    it('should return false for regular years', () => {
      const TestComponent = createTestComponent()
      wrapper = mount(TestComponent)

      expect(wrapper.vm.picker.isSentinelYear(2024)).toBe(false)
      expect(wrapper.vm.picker.isSentinelYear(2000)).toBe(false)
    })
  })

  describe('computed properties', () => {
    it('should compute maxYear as current year', () => {
      const TestComponent = createTestComponent()
      wrapper = mount(TestComponent)

      expect(wrapper.vm.picker.maxYear.value).toBe(2024)
    })

    it('should compute canDecrementYear correctly', () => {
      const TestComponent = createTestComponent({
        yearRange: [2020, 2024]
      })
      wrapper = mount(TestComponent)

      wrapper.vm.picker.currentYear.value = 2022
      expect(wrapper.vm.picker.canDecrementYear.value).toBe(true)

      wrapper.vm.picker.currentYear.value = 2020
      expect(wrapper.vm.picker.canDecrementYear.value).toBe(false)
    })

    it('should compute canIncrementYear correctly', () => {
      const TestComponent = createTestComponent()
      wrapper = mount(TestComponent)

      wrapper.vm.picker.currentYear.value = 2022
      expect(wrapper.vm.picker.canIncrementYear.value).toBe(true)

      wrapper.vm.picker.currentYear.value = 2024
      expect(wrapper.vm.picker.canIncrementYear.value).toBe(false)
    })

    it('should have buttonBaseClasses defined', () => {
      const TestComponent = createTestComponent()
      wrapper = mount(TestComponent)

      expect(wrapper.vm.picker.buttonBaseClasses.value).toBeDefined()
      expect(typeof wrapper.vm.picker.buttonBaseClasses.value).toBe('string')
    })
  })

  describe('year navigation', () => {
    it('should increment year when canIncrementYear is true', () => {
      const TestComponent = createTestComponent()
      wrapper = mount(TestComponent)

      wrapper.vm.picker.currentYear.value = 2022
      wrapper.vm.picker.incrementYear()

      expect(wrapper.vm.picker.currentYear.value).toBe(2023)
    })

    it('should not increment year beyond maxYear', () => {
      const TestComponent = createTestComponent()
      wrapper = mount(TestComponent)

      wrapper.vm.picker.currentYear.value = 2024
      wrapper.vm.picker.incrementYear()

      expect(wrapper.vm.picker.currentYear.value).toBe(2024)
    })

    it('should decrement year when canDecrementYear is true', () => {
      const TestComponent = createTestComponent({
        yearRange: [2020, 2024]
      })
      wrapper = mount(TestComponent)

      wrapper.vm.picker.currentYear.value = 2022
      wrapper.vm.picker.decrementYear()

      expect(wrapper.vm.picker.currentYear.value).toBe(2021)
    })

    it('should not decrement year below yearRange minimum', () => {
      const TestComponent = createTestComponent({
        yearRange: [2020, 2024]
      })
      wrapper = mount(TestComponent)

      wrapper.vm.picker.currentYear.value = 2020
      wrapper.vm.picker.decrementYear()

      expect(wrapper.vm.picker.currentYear.value).toBe(2020)
    })
  })

  describe('month state checks', () => {
    it('should detect future months correctly', () => {
      const TestComponent = createTestComponent()
      wrapper = mount(TestComponent)

      wrapper.vm.picker.currentYear.value = 2024

      // June (month 5, 0-indexed) is current month in fake timer
      expect(wrapper.vm.picker.isFutureMonth(5)).toBe(false)
      expect(wrapper.vm.picker.isFutureMonth(6)).toBe(true) // July
      expect(wrapper.vm.picker.isFutureMonth(11)).toBe(true) // December
    })

    it('should detect selected month correctly', () => {
      const TestComponent = createTestComponent({
        selectedDate: { year: 2024, month: 3 }
      })
      wrapper = mount(TestComponent)

      wrapper.vm.picker.currentYear.value = 2024

      expect(wrapper.vm.picker.isSelectedMonth(3)).toBe(true)
      expect(wrapper.vm.picker.isSelectedMonth(4)).toBe(false)
    })

    it('should detect current month correctly', () => {
      const TestComponent = createTestComponent()
      wrapper = mount(TestComponent)

      wrapper.vm.picker.currentYear.value = 2024

      // June (month 5, 0-indexed) is current in fake timer
      expect(wrapper.vm.picker.isCurrentMonth(5)).toBe(true)
      expect(wrapper.vm.picker.isCurrentMonth(4)).toBe(false)
    })

    it('should detect selected year correctly', () => {
      const TestComponent = createTestComponent({
        selectedDate: { year: 2024, month: 3 }
      })
      wrapper = mount(TestComponent)

      wrapper.vm.picker.currentYear.value = 2024
      expect(wrapper.vm.picker.isSelectedYear()).toBe(true)

      wrapper.vm.picker.currentYear.value = 2023
      expect(wrapper.vm.picker.isSelectedYear()).toBe(false)
    })
  })

  describe('selectMonth', () => {
    it('should emit date-select with correct data', () => {
      const TestComponent = createTestComponent()
      wrapper = mount(TestComponent)

      wrapper.vm.picker.currentYear.value = 2024
      wrapper.vm.picker.selectMonth(3)

      expect(emit).toHaveBeenCalledWith('date-select', {
        year: 2024,
        month: 3,
        isUnfinished: false
      })
    })

    it('should include isUnfinished state in emission', () => {
      const TestComponent = createTestComponent({ isUnfinished: true })
      wrapper = mount(TestComponent)

      wrapper.vm.picker.currentYear.value = 2024
      wrapper.vm.picker.selectMonth(3)

      expect(emit).toHaveBeenCalledWith('date-select', {
        year: 2024,
        month: 3,
        isUnfinished: true
      })
    })

    it('should not emit for future months', () => {
      const TestComponent = createTestComponent()
      wrapper = mount(TestComponent)

      wrapper.vm.picker.currentYear.value = 2024
      wrapper.vm.picker.selectMonth(11) // December (future month)

      expect(emit).not.toHaveBeenCalled()
    })

    it('should allow selecting past months', () => {
      const TestComponent = createTestComponent()
      wrapper = mount(TestComponent)

      wrapper.vm.picker.currentYear.value = 2024
      wrapper.vm.picker.selectMonth(0) // January

      expect(emit).toHaveBeenCalled()
    })
  })

  describe('special handlers', () => {
    it('should emit correct data for handleReadLongAgo', () => {
      const TestComponent = createTestComponent()
      wrapper = mount(TestComponent)

      wrapper.vm.picker.handleReadLongAgo()

      expect(emit).toHaveBeenCalledWith('date-select', {
        year: 1900,
        month: 0,
        isUnfinished: false
      })
    })

    it('should emit correct data for handleReadLately', () => {
      const TestComponent = createTestComponent()
      wrapper = mount(TestComponent)

      wrapper.vm.picker.handleReadLately()

      expect(emit).toHaveBeenCalledWith('date-select', {
        year: 1910,
        month: 0,
        isUnfinished: false
      })
    })

    it('should emit null for handleInProgress', () => {
      const TestComponent = createTestComponent()
      wrapper = mount(TestComponent)

      wrapper.vm.picker.handleInProgress()

      expect(emit).toHaveBeenCalledWith('date-select', null)
    })

    it('should include isUnfinished in special handlers', () => {
      const TestComponent = createTestComponent({ isUnfinished: true })
      wrapper = mount(TestComponent)

      wrapper.vm.picker.handleReadLongAgo()

      expect(emit).toHaveBeenCalledWith('date-select', {
        year: 1900,
        month: 0,
        isUnfinished: true
      })
    })
  })

  describe('style computation', () => {
    it('should compute month button classes for selected month', () => {
      const TestComponent = createTestComponent({
        selectedDate: { year: 2024, month: 3 }
      })
      wrapper = mount(TestComponent)

      wrapper.vm.picker.currentYear.value = 2024
      const classes = wrapper.vm.picker.computeMonthButtonClasses(3)

      expect(classes['bg-blue-600 text-white shadow-md hover:bg-blue-700']).toBe(true)
    })

    it('should compute month button classes for same year different month', () => {
      const TestComponent = createTestComponent({
        selectedDate: { year: 2024, month: 3 }
      })
      wrapper = mount(TestComponent)

      wrapper.vm.picker.currentYear.value = 2024
      const classes = wrapper.vm.picker.computeMonthButtonClasses(4)

      expect(classes['bg-blue-50 text-blue-700 hover:bg-blue-100']).toBe(true)
    })

    it('should compute month button classes for current month', () => {
      const TestComponent = createTestComponent()
      wrapper = mount(TestComponent)

      wrapper.vm.picker.currentYear.value = 2024
      const classes = wrapper.vm.picker.computeMonthButtonClasses(5) // June

      expect(classes['ring-2 ring-blue-400']).toBe(true)
    })

    it('should compute month button classes for future month', () => {
      const TestComponent = createTestComponent()
      wrapper = mount(TestComponent)

      wrapper.vm.picker.currentYear.value = 2024
      const classes = wrapper.vm.picker.computeMonthButtonClasses(11) // December

      expect(classes['opacity-40 cursor-not-allowed']).toBe(true)
    })

    it('should compute toggle button classes for active state', () => {
      const TestComponent = createTestComponent()
      wrapper = mount(TestComponent)

      const classes = wrapper.vm.picker.getToggleButtonClasses(true)

      expect(classes['bg-blue-600 text-white shadow-md hover:bg-blue-700']).toBe(true)
    })

    it('should compute toggle button classes for inactive state', () => {
      const TestComponent = createTestComponent()
      wrapper = mount(TestComponent)

      const classes = wrapper.vm.picker.getToggleButtonClasses(false)

      expect(classes['text-gray-700 hover:text-blue-600 hover:bg-gray-100']).toBe(true)
    })
  })

  describe('watchers', () => {
    it('should update isUnfinishedToggled when props.isUnfinished changes', async () => {
      const TestComponent = defineComponent({
        setup() {
          const propsData = ref({
            selectedDate: null,
            yearRange: [2014, 2024],
            isUnfinished: false
          })
          const picker = useDatePicker(propsData.value, emit)
          return { picker, propsData }
        },
        template: '<div>Test</div>'
      })

      wrapper = mount(TestComponent)

      expect(wrapper.vm.picker.isUnfinishedToggled.value).toBe(false)

      wrapper.vm.propsData.isUnfinished = true
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.picker.isUnfinishedToggled.value).toBe(true)
    })

    it('should emit date-select when isUnfinishedToggled changes and book has date', async () => {
      const TestComponent = defineComponent({
        setup() {
          const propsData = ref({
            selectedDate: { year: 2024, month: 3 },
            yearRange: [2014, 2024],
            isUnfinished: false
          })
          const picker = useDatePicker(propsData.value, emit)
          return { picker, propsData }
        },
        template: '<div>Test</div>'
      })

      wrapper = mount(TestComponent)

      emit.mockClear()

      wrapper.vm.picker.isUnfinishedToggled.value = true
      await wrapper.vm.$nextTick()

      expect(emit).toHaveBeenCalledWith('date-select', {
        year: 2024,
        month: 3,
        isUnfinished: true,
        keepOpen: true
      })
    })

    it('should not emit when isUnfinishedToggled changes and book has no date', async () => {
      const TestComponent = defineComponent({
        setup() {
          const propsData = ref({
            selectedDate: null,
            yearRange: [2014, 2024],
            isUnfinished: false
          })
          const picker = useDatePicker(propsData.value, emit)
          return { picker, propsData }
        },
        template: '<div>Test</div>'
      })

      wrapper = mount(TestComponent)

      emit.mockClear()

      wrapper.vm.picker.isUnfinishedToggled.value = true
      await wrapper.vm.$nextTick()

      expect(emit).not.toHaveBeenCalled()
    })

    it('should update currentYear when selectedDate changes to non-sentinel year', async () => {
      const TestComponent = defineComponent({
        setup() {
          const propsData = ref({
            selectedDate: { year: 2022, month: 3 },
            yearRange: [2014, 2024],
            isUnfinished: false
          })
          const picker = useDatePicker(propsData.value, emit)
          return { picker, propsData }
        },
        template: '<div>Test</div>'
      })

      wrapper = mount(TestComponent)

      expect(wrapper.vm.picker.currentYear.value).toBe(2022)

      wrapper.vm.propsData.selectedDate = { year: 2023, month: 5 }
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.picker.currentYear.value).toBe(2023)
    })

    it('should not update currentYear for sentinel years', async () => {
      const TestComponent = defineComponent({
        setup() {
          const propsData = ref({
            selectedDate: { year: 2022, month: 3 },
            yearRange: [2014, 2024],
            isUnfinished: false
          })
          const picker = useDatePicker(propsData.value, emit)
          return { picker, propsData }
        },
        template: '<div>Test</div>'
      })

      wrapper = mount(TestComponent)

      expect(wrapper.vm.picker.currentYear.value).toBe(2022)

      wrapper.vm.propsData.selectedDate = { year: 1900, month: 0 }
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.picker.currentYear.value).toBe(2022) // Should not change
    })

    it('should adjust currentYear when yearRange changes to exclude current year', async () => {
      const TestComponent = defineComponent({
        setup() {
          const propsData = ref({
            selectedDate: null,
            yearRange: [2014, 2024],
            isUnfinished: false
          })
          const picker = useDatePicker(propsData.value, emit)
          return { picker, propsData }
        },
        template: '<div>Test</div>'
      })

      wrapper = mount(TestComponent)

      wrapper.vm.picker.currentYear.value = 2020

      wrapper.vm.propsData.yearRange = [2021, 2024]
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.picker.currentYear.value).toBe(2021)
    })
  })

  describe('lifecycle and intervals', () => {
    it('should set up interval to update currentTime', () => {
      const TestComponent = createTestComponent()
      wrapper = mount(TestComponent)

      const initialTime = wrapper.vm.picker.currentTime.value

      vi.advanceTimersByTime(60000) // Advance 1 minute

      expect(wrapper.vm.picker.currentTime.value).toBeGreaterThan(initialTime)
    })

    it('should clear interval on unmount', () => {
      const TestComponent = createTestComponent()
      wrapper = mount(TestComponent)

      const clearIntervalSpy = vi.spyOn(global, 'clearInterval')

      wrapper.unmount()

      expect(clearIntervalSpy).toHaveBeenCalled()
    })

    it('should update currentTime every 60 seconds', () => {
      const TestComponent = createTestComponent()
      wrapper = mount(TestComponent)

      const initialTime = wrapper.vm.picker.currentTime.value

      vi.advanceTimersByTime(60000)
      const time1 = wrapper.vm.picker.currentTime.value
      expect(time1).toBeGreaterThan(initialTime)

      vi.advanceTimersByTime(60000)
      const time2 = wrapper.vm.picker.currentTime.value
      expect(time2).toBeGreaterThan(time1)
    })
  })

  describe('edge cases', () => {
    it('should handle null selectedDate', () => {
      const TestComponent = createTestComponent({
        selectedDate: null
      })
      wrapper = mount(TestComponent)

      expect(wrapper.vm.picker.currentYear.value).toBe(2024)
      expect(wrapper.vm.picker.isSelectedYear()).toBe(false)
    })

    it('should handle undefined selectedDate', () => {
      const TestComponent = createTestComponent({
        selectedDate: undefined
      })
      wrapper = mount(TestComponent)

      expect(wrapper.vm.picker.currentYear.value).toBe(2024)
    })

    it('should handle year at lower boundary of yearRange', () => {
      const TestComponent = createTestComponent({
        yearRange: [2020, 2024]
      })
      wrapper = mount(TestComponent)

      wrapper.vm.picker.currentYear.value = 2020
      expect(wrapper.vm.picker.canDecrementYear.value).toBe(false)
      expect(wrapper.vm.picker.canIncrementYear.value).toBe(true)
    })

    it('should handle year at upper boundary (maxYear)', () => {
      const TestComponent = createTestComponent()
      wrapper = mount(TestComponent)

      wrapper.vm.picker.currentYear.value = 2024
      expect(wrapper.vm.picker.canIncrementYear.value).toBe(false)
      expect(wrapper.vm.picker.canDecrementYear.value).toBe(true)
    })

    it('should handle month at year boundaries', () => {
      const TestComponent = createTestComponent()
      wrapper = mount(TestComponent)

      wrapper.vm.picker.currentYear.value = 2024

      // January and December
      expect(wrapper.vm.picker.isFutureMonth(0)).toBe(false)
      expect(wrapper.vm.picker.isFutureMonth(11)).toBe(true)
    })

    it('should handle selectedDate with only year property', () => {
      const TestComponent = createTestComponent({
        selectedDate: { year: 2023 }
      })
      wrapper = mount(TestComponent)

      expect(wrapper.vm.picker.currentYear.value).toBe(2023)
    })

    it('should handle rapid year navigation', () => {
      const TestComponent = createTestComponent({
        yearRange: [2020, 2024]
      })
      wrapper = mount(TestComponent)

      wrapper.vm.picker.currentYear.value = 2022
      wrapper.vm.picker.incrementYear()
      wrapper.vm.picker.incrementYear()
      wrapper.vm.picker.decrementYear()

      expect(wrapper.vm.picker.currentYear.value).toBe(2023)
    })
  })
})
