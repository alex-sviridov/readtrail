import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { useDateHelpers } from '../useDateHelpers'

describe('useDateHelpers', () => {
  let helpers

  beforeEach(() => {
    helpers = useDateHelpers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('monthNames', () => {
    it('should return array of 12 month names', () => {
      expect(helpers.monthNames).toHaveLength(12)
    })

    it('should have correct month names in order', () => {
      const expectedMonths = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
      ]

      expect(helpers.monthNames).toEqual(expectedMonths)
    })

    it('should have January as first month', () => {
      expect(helpers.monthNames[0]).toBe('January')
    })

    it('should have December as last month', () => {
      expect(helpers.monthNames[11]).toBe('December')
    })
  })

  describe('yearOptions', () => {
    it('should generate 21 years (current year ± 10)', () => {
      expect(helpers.yearOptions.value).toHaveLength(21)
    })

    it('should include current year', () => {
      const currentYear = new Date().getFullYear()
      expect(helpers.yearOptions.value).toContain(currentYear)
    })

    it('should include 10 years before current year', () => {
      const currentYear = new Date().getFullYear()
      expect(helpers.yearOptions.value).toContain(currentYear - 10)
    })

    it('should include 10 years after current year', () => {
      const currentYear = new Date().getFullYear()
      expect(helpers.yearOptions.value).toContain(currentYear + 10)
    })

    it('should be sorted in descending order', () => {
      const years = helpers.yearOptions.value
      for (let i = 0; i < years.length - 1; i++) {
        expect(years[i]).toBeGreaterThan(years[i + 1])
      }
    })

    it('should have future year as first element', () => {
      const currentYear = new Date().getFullYear()
      expect(helpers.yearOptions.value[0]).toBe(currentYear + 10)
    })

    it('should have past year as last element', () => {
      const currentYear = new Date().getFullYear()
      expect(helpers.yearOptions.value[20]).toBe(currentYear - 10)
    })

    it('should be reactive to system time changes', () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2024-06-15'))

      const helpers2024 = useDateHelpers()
      expect(helpers2024.yearOptions.value).toContain(2024)
      expect(helpers2024.yearOptions.value[0]).toBe(2034)

      vi.setSystemTime(new Date('2025-06-15'))

      const helpers2025 = useDateHelpers()
      expect(helpers2025.yearOptions.value).toContain(2025)
      expect(helpers2025.yearOptions.value[0]).toBe(2035)
    })
  })

  describe('formatYearMonth', () => {
    it('should format valid year and month correctly', () => {
      const result = helpers.formatYearMonth(2024, 6)
      expect(result).toBe('June 2024')
    })

    it('should format January correctly', () => {
      const result = helpers.formatYearMonth(2024, 1)
      expect(result).toBe('January 2024')
    })

    it('should format December correctly', () => {
      const result = helpers.formatYearMonth(2024, 12)
      expect(result).toBe('December 2024')
    })

    it('should return empty string for null year', () => {
      const result = helpers.formatYearMonth(null, 6)
      expect(result).toBe('')
    })

    it('should return empty string for null month', () => {
      const result = helpers.formatYearMonth(2024, null)
      expect(result).toBe('')
    })

    it('should return empty string for both null', () => {
      const result = helpers.formatYearMonth(null, null)
      expect(result).toBe('')
    })

    it('should return empty string for undefined year', () => {
      const result = helpers.formatYearMonth(undefined, 6)
      expect(result).toBe('')
    })

    it('should return empty string for undefined month', () => {
      const result = helpers.formatYearMonth(2024, undefined)
      expect(result).toBe('')
    })

    it('should handle edge case months (1 and 12)', () => {
      expect(helpers.formatYearMonth(2024, 1)).toBe('January 2024')
      expect(helpers.formatYearMonth(2024, 12)).toBe('December 2024')
    })
  })

  describe('getCurrentYearMonth', () => {
    it('should return current year and month', () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2024-06-15'))

      const result = helpers.getCurrentYearMonth()

      expect(result.year).toBe(2024)
      expect(result.month).toBe(6)
    })

    it('should return correct month for January', () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2024-01-15'))

      const result = helpers.getCurrentYearMonth()

      expect(result.year).toBe(2024)
      expect(result.month).toBe(1)
    })

    it('should return correct month for December', () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2024-12-15'))

      const result = helpers.getCurrentYearMonth()

      expect(result.year).toBe(2024)
      expect(result.month).toBe(12)
    })

    it('should return object with year and month properties', () => {
      const result = helpers.getCurrentYearMonth()

      expect(result).toHaveProperty('year')
      expect(result).toHaveProperty('month')
      expect(typeof result.year).toBe('number')
      expect(typeof result.month).toBe('number')
    })

    it('should handle year transitions correctly', () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2023-12-31'))

      const result2023 = helpers.getCurrentYearMonth()
      expect(result2023.year).toBe(2023)
      expect(result2023.month).toBe(12)

      vi.setSystemTime(new Date('2024-01-01'))

      const result2024 = helpers.getCurrentYearMonth()
      expect(result2024.year).toBe(2024)
      expect(result2024.month).toBe(1)
    })
  })

  describe('yearMonthToDate', () => {
    it('should convert year and month to Date object', () => {
      const result = helpers.yearMonthToDate(2024, 6)

      expect(result).toBeInstanceOf(Date)
      expect(result.getFullYear()).toBe(2024)
      expect(result.getMonth()).toBe(5) // JavaScript months are 0-indexed
      expect(result.getDate()).toBe(1) // First day of month
    })

    it('should return null for null year', () => {
      const result = helpers.yearMonthToDate(null, 6)
      expect(result).toBeNull()
    })

    it('should return null for null month', () => {
      const result = helpers.yearMonthToDate(2024, null)
      expect(result).toBeNull()
    })

    it('should return null for both null', () => {
      const result = helpers.yearMonthToDate(null, null)
      expect(result).toBeNull()
    })

    it('should return null for undefined year', () => {
      const result = helpers.yearMonthToDate(undefined, 6)
      expect(result).toBeNull()
    })

    it('should return null for undefined month', () => {
      const result = helpers.yearMonthToDate(2024, undefined)
      expect(result).toBeNull()
    })

    it('should handle boundary months correctly', () => {
      const january = helpers.yearMonthToDate(2024, 1)
      expect(january.getMonth()).toBe(0)

      const december = helpers.yearMonthToDate(2024, 12)
      expect(december.getMonth()).toBe(11)
    })
  })

  describe('dateToYearMonth', () => {
    it('should convert date object with year() and month() methods', () => {
      const mockDate = {
        year: () => 2024,
        month: () => 5 // JavaScript 0-indexed month (June)
      }

      const result = helpers.dateToYearMonth(mockDate)

      expect(result.year).toBe(2024)
      expect(result.month).toBe(6) // Converted to 1-indexed
    })

    it('should return null values for null date', () => {
      const result = helpers.dateToYearMonth(null)

      expect(result.year).toBeNull()
      expect(result.month).toBeNull()
    })

    it('should return null values for undefined date', () => {
      const result = helpers.dateToYearMonth(undefined)

      expect(result.year).toBeNull()
      expect(result.month).toBeNull()
    })

    it('should handle January correctly (month 0 -> 1)', () => {
      const mockDate = {
        year: () => 2024,
        month: () => 0
      }

      const result = helpers.dateToYearMonth(mockDate)

      expect(result.month).toBe(1)
    })

    it('should handle December correctly (month 11 -> 12)', () => {
      const mockDate = {
        year: () => 2024,
        month: () => 11
      }

      const result = helpers.dateToYearMonth(mockDate)

      expect(result.month).toBe(12)
    })
  })

  describe('integration tests', () => {
    it('should convert year/month to date and back consistently', () => {
      const year = 2024
      const month = 6

      const formatted = helpers.formatYearMonth(year, month)
      expect(formatted).toBe('June 2024')

      const date = helpers.yearMonthToDate(year, month)
      expect(date).toBeInstanceOf(Date)
      expect(date.getFullYear()).toBe(year)
      expect(date.getMonth()).toBe(month - 1)
    })

    it('should handle current date consistently across functions', () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2024-06-15'))

      const current = helpers.getCurrentYearMonth()
      const formatted = helpers.formatYearMonth(current.year, current.month)
      const date = helpers.yearMonthToDate(current.year, current.month)

      expect(formatted).toBe('June 2024')
      expect(date.getFullYear()).toBe(2024)
      expect(date.getMonth()).toBe(5)
    })
  })
})
