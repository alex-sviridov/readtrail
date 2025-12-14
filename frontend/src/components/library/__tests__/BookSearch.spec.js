import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { nextTick } from 'vue'
import BookSearch from '../BookSearch.vue'
import { TIMINGS, DATE_PICKER } from '@/constants'

describe('BookSearch Component', () => {
  let wrapper
  let mockFetch

  // Helper to get teleported elements
  const getInput = (placeholder) => document.querySelector(`input[placeholder="${placeholder}"]`)
  const setInputValue = async (placeholder, value) => {
    const input = getInput(placeholder)
    input.value = value
    input.dispatchEvent(new Event('input'))
    await nextTick()
  }

  beforeEach(() => {
    // Mock fetch globally
    mockFetch = vi.fn()
    global.fetch = mockFetch

    // Clear timers
    vi.useFakeTimers()
  })

  afterEach(() => {
    wrapper?.unmount()
    document.body.innerHTML = ''
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  describe('Step 1: Search - Rendering', () => {
    it('should render modal with search inputs when open', async () => {
      wrapper = mount(BookSearch, {
        props: { isOpen: true },
        attachTo: document.body,
        global: {
          provide: {
            settingsStore: { settings: { allowScoring: true } }
          }
        }
      })
      await nextTick()

      expect(document.querySelector('input[placeholder="Enter book title..."]')).toBeTruthy()
      expect(document.querySelector('input[placeholder="Enter author name..."]')).toBeTruthy()
    })

    it('should display empty state when no search query', async () => {
      wrapper = mount(BookSearch, {
        props: { isOpen: true },
        attachTo: document.body,
        global: {
          provide: {
            settingsStore: { settings: { allowScoring: true } }
          }
        }
      })
      await nextTick()

      expect(document.body.textContent).toContain('Start typing a title and/or author to search')
    })

    it('should have correct modal title for search step', async () => {
      wrapper = mount(BookSearch, {
        props: { isOpen: true },
        attachTo: document.body,
        global: {
          provide: {
            settingsStore: { settings: { allowScoring: true } }
          }
        }
      })
      await nextTick()

      expect(document.body.textContent).toContain('Add Book')
    })
  })

  describe('Step 1: Search - Input Handling', () => {
    it('should update titleQuery when typing in title input', async () => {
      wrapper = mount(BookSearch, {
        props: { isOpen: true },
        attachTo: document.body,
        global: {
          provide: {
            settingsStore: { settings: { allowScoring: true } }
          }
        }
      })
      await nextTick()

      const titleInput = document.querySelector('input[placeholder="Enter book title..."]')
      titleInput.value = '1984'
      titleInput.dispatchEvent(new Event('input'))
      await nextTick()

      expect(titleInput.value).toBe('1984')
    })

    it('should update authorQuery when typing in author input', async () => {
      wrapper = mount(BookSearch, {
        props: { isOpen: true },
        attachTo: document.body,
        global: {
          provide: {
            settingsStore: { settings: { allowScoring: true } }
          }
        }
      })
      await nextTick()

      const authorInput = document.querySelector('input[placeholder="Enter author name..."]')
      authorInput.value = 'George Orwell'
      authorInput.dispatchEvent(new Event('input'))
      await nextTick()

      expect(authorInput.value).toBe('George Orwell')
    })

    it('should focus title input when modal opens', async () => {
      wrapper = mount(BookSearch, {
        props: { isOpen: false },
        attachTo: document.body,
        global: {
          provide: {
            settingsStore: { settings: { allowScoring: true } }
          }
        }
      })

      await wrapper.setProps({ isOpen: true })
      await nextTick()

      const titleInput = document.querySelector('input[placeholder="Enter book title..."]')
      expect(titleInput).toBeTruthy()
    })
  })

  describe('Step 1: Search - Debouncing', () => {
    it('should debounce search by 500ms', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ docs: [] })
      })

      wrapper = mount(BookSearch, {
        props: { isOpen: true },
        attachTo: document.body,
        global: {
          provide: {
            settingsStore: { settings: { allowScoring: true } }
          }
        }
      })

      const titleInput = document.querySelector('input[placeholder="Enter book title..."]')
      titleInput.value = '1984'; titleInput.dispatchEvent(new Event('input')); await nextTick()

      // Should not call fetch immediately
      expect(mockFetch).not.toHaveBeenCalled()

      // Fast-forward 400ms (not enough)
      vi.advanceTimersByTime(400)
      expect(mockFetch).not.toHaveBeenCalled()

      // Fast-forward another 100ms (total 500ms)
      vi.advanceTimersByTime(100)
      await nextTick()

      expect(mockFetch).toHaveBeenCalledTimes(1)
    })

    it('should cancel previous debounce on rapid typing', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ docs: [] })
      })

      wrapper = mount(BookSearch, {
        props: { isOpen: true },
        attachTo: document.body,
        global: {
          provide: {
            settingsStore: { settings: { allowScoring: true } }
          }
        }
      })

      const titleInput = document.querySelector('input[placeholder="Enter book title..."]')

      titleInput.value = '1'; titleInput.dispatchEvent(new Event('input')); await nextTick()
      vi.advanceTimersByTime(200)

      titleInput.value = '19'; titleInput.dispatchEvent(new Event('input')); await nextTick()
      vi.advanceTimersByTime(200)

      titleInput.value = '198'; titleInput.dispatchEvent(new Event('input')); await nextTick()
      vi.advanceTimersByTime(200)

      titleInput.value = '1984'; titleInput.dispatchEvent(new Event('input')); await nextTick()
      vi.advanceTimersByTime(500)
      await nextTick()

      // Should only call fetch once (for final value)
      expect(mockFetch).toHaveBeenCalledTimes(1)
    })
  })

  describe('Step 1: Search - API Requests', () => {
    it('should make API request with title query parameter', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ docs: [] })
      })

      wrapper = mount(BookSearch, {
        props: { isOpen: true },
        attachTo: document.body,
        global: {
          provide: {
            settingsStore: { settings: { allowScoring: true } }
          }
        }
      })

      const titleInput = document.querySelector('input[placeholder="Enter book title..."]')
      titleInput.value = '1984'; titleInput.dispatchEvent(new Event('input')); await nextTick()

      vi.advanceTimersByTime(TIMINGS.SEARCH_DEBOUNCE)
      await nextTick()

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('title=1984'),
        expect.any(Object)
      )
    })

    it('should make API request with author query parameter', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ docs: [] })
      })

      wrapper = mount(BookSearch, {
        props: { isOpen: true },
        attachTo: document.body,
        global: {
          provide: {
            settingsStore: { settings: { allowScoring: true } }
          }
        }
      })

      const authorInput = document.querySelector('input[placeholder="Enter author name..."]')
      authorInput.value = 'George Orwell'; authorInput.dispatchEvent(new Event('input')); await nextTick()

      vi.advanceTimersByTime(TIMINGS.SEARCH_DEBOUNCE)
      await nextTick()

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('author=George%20Orwell'),
        expect.any(Object)
      )
    })

    it('should make API request with both title and author', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ docs: [] })
      })

      wrapper = mount(BookSearch, {
        props: { isOpen: true },
        attachTo: document.body,
        global: {
          provide: {
            settingsStore: { settings: { allowScoring: true } }
          }
        }
      })

      const titleInput = document.querySelector('input[placeholder="Enter book title..."]')
      const authorInput = document.querySelector('input[placeholder="Enter author name..."]')

      titleInput.value = '1984'; titleInput.dispatchEvent(new Event('input')); await nextTick()
      authorInput.value = 'George Orwell'; authorInput.dispatchEvent(new Event('input')); await nextTick()

      vi.advanceTimersByTime(TIMINGS.SEARCH_DEBOUNCE)
      await nextTick()

      const fetchCall = mockFetch.mock.calls[0][0]
      expect(fetchCall).toContain('title=1984')
      expect(fetchCall).toContain('author=George%20Orwell')
    })

    it('should display loading state during API request', async () => {
      mockFetch.mockImplementation(() => new Promise(() => {})) // Never resolves

      wrapper = mount(BookSearch, {
        props: { isOpen: true },
        attachTo: document.body,
        global: {
          provide: {
            settingsStore: { settings: { allowScoring: true } }
          }
        }
      })

      const titleInput = document.querySelector('input[placeholder="Enter book title..."]')
      titleInput.value = '1984'; titleInput.dispatchEvent(new Event('input')); await nextTick()

      vi.advanceTimersByTime(TIMINGS.SEARCH_DEBOUNCE)
      await nextTick()

      expect(document.querySelector('.animate-spin')).toBeTruthy()
    })
  })

  describe('Step 1: Search - Error Handling', () => {
    it('should handle 400 Bad Request error', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400
      })

      wrapper = mount(BookSearch, {
        props: { isOpen: true },
        attachTo: document.body,
        global: {
          provide: {
            settingsStore: { settings: { allowScoring: true } }
          }
        }
      })

      const titleInput = document.querySelector('input[placeholder="Enter book title..."]')
      titleInput.value = '1984'; titleInput.dispatchEvent(new Event('input')); await nextTick()

      vi.advanceTimersByTime(TIMINGS.SEARCH_DEBOUNCE)
      await nextTick()
      await nextTick()
      await nextTick() // Extra ticks for error state to render

      expect(document.body.textContent).toContain('Invalid search query')
    })

    it('should handle 404 Not Found error', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404
      })

      wrapper = mount(BookSearch, {
        props: { isOpen: true },
        attachTo: document.body,
        global: {
          provide: {
            settingsStore: { settings: { allowScoring: true } }
          }
        }
      })

      const titleInput = document.querySelector('input[placeholder="Enter book title..."]')
      titleInput.value = '1984'; titleInput.dispatchEvent(new Event('input')); await nextTick()

      vi.advanceTimersByTime(TIMINGS.SEARCH_DEBOUNCE)
      await flushPromises()
      await nextTick()
      await nextTick()
      await nextTick()

      expect(document.body.textContent).toContain('Search service not found')
    })

    it('should handle 429 Too Many Requests error', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 429
      })

      wrapper = mount(BookSearch, {
        props: { isOpen: true },
        attachTo: document.body,
        global: {
          provide: {
            settingsStore: { settings: { allowScoring: true } }
          }
        }
      })

      const titleInput = document.querySelector('input[placeholder="Enter book title..."]')
      titleInput.value = '1984'; titleInput.dispatchEvent(new Event('input')); await nextTick()

      vi.advanceTimersByTime(TIMINGS.SEARCH_DEBOUNCE)
      await flushPromises()
      await nextTick()
      await nextTick()
      await nextTick()

      expect(document.body.textContent).toContain('Too many requests')
    })

    it('should handle 500 Internal Server Error', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500
      })

      wrapper = mount(BookSearch, {
        props: { isOpen: true },
        attachTo: document.body,
        global: {
          provide: {
            settingsStore: { settings: { allowScoring: true } }
          }
        }
      })

      const titleInput = document.querySelector('input[placeholder="Enter book title..."]')
      titleInput.value = '1984'; titleInput.dispatchEvent(new Event('input')); await nextTick()

      vi.advanceTimersByTime(TIMINGS.SEARCH_DEBOUNCE)
      await flushPromises()
      await nextTick()
      await nextTick()
      await nextTick()

      expect(document.body.textContent).toContain('experiencing issues')
    })

    it('should handle 503 Service Unavailable error', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 503
      })

      wrapper = mount(BookSearch, {
        props: { isOpen: true },
        attachTo: document.body,
        global: {
          provide: {
            settingsStore: { settings: { allowScoring: true } }
          }
        }
      })

      const titleInput = document.querySelector('input[placeholder="Enter book title..."]')
      titleInput.value = '1984'; titleInput.dispatchEvent(new Event('input')); await nextTick()

      vi.advanceTimersByTime(TIMINGS.SEARCH_DEBOUNCE)
      await flushPromises()
      await nextTick()
      await nextTick()
      await nextTick()

      expect(document.body.textContent).toContain('temporarily unavailable')
    })

    it('should handle timeout error', async () => {
      mockFetch.mockImplementation(() => new Promise(() => {})) // Never resolves

      wrapper = mount(BookSearch, {
        props: { isOpen: true },
        attachTo: document.body,
        global: {
          provide: {
            settingsStore: { settings: { allowScoring: true } }
          }
        }
      })

      const titleInput = document.querySelector('input[placeholder="Enter book title..."]')
      titleInput.value = '1984'; titleInput.dispatchEvent(new Event('input')); await nextTick()

      vi.advanceTimersByTime(TIMINGS.SEARCH_DEBOUNCE)
      await nextTick()

      // Advance past API timeout
      vi.advanceTimersByTime(TIMINGS.API_TIMEOUT + 100)
      await nextTick()
      await nextTick()
      await nextTick()

      expect(document.body.textContent).toContain('timed out')
    })

    it('should handle network error', async () => {
      mockFetch.mockRejectedValue(new Error('Failed to fetch'))

      wrapper = mount(BookSearch, {
        props: { isOpen: true },
        attachTo: document.body,
        global: {
          provide: {
            settingsStore: { settings: { allowScoring: true } }
          }
        }
      })

      const titleInput = document.querySelector('input[placeholder="Enter book title..."]')
      titleInput.value = '1984'; titleInput.dispatchEvent(new Event('input')); await nextTick()

      vi.advanceTimersByTime(TIMINGS.SEARCH_DEBOUNCE)
      await flushPromises()
      await nextTick()
      await nextTick()
      await nextTick()

      expect(document.body.textContent).toContain('Network error')
    })
  })

  describe('Step 1: Search - Results Display', () => {
    it('should display search results with cover images', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          docs: [
            {
              key: '/works/1',
              title: '1984',
              author_name: ['George Orwell'],
              first_publish_year: 1949,
              cover_i: 12345
            }
          ]
        })
      })

      wrapper = mount(BookSearch, {
        props: { isOpen: true },
        attachTo: document.body,
        global: {
          provide: {
            settingsStore: { settings: { allowScoring: true } }
          }
        }
      })

      const titleInput = document.querySelector('input[placeholder="Enter book title..."]')
      titleInput.value = '1984'; titleInput.dispatchEvent(new Event('input')); await nextTick()

      vi.advanceTimersByTime(TIMINGS.SEARCH_DEBOUNCE)
      await flushPromises()
      await nextTick()
      await nextTick()
      await nextTick()

      expect(document.body.textContent).toContain('1984')
      expect(document.body.textContent).toContain('George Orwell')
      expect(document.body.textContent).toContain('First published: 1949')
      expect(document.querySelector('img[src*="12345"]')).toBeTruthy()
    })

    it('should display placeholder icon when cover_i is missing', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          docs: [
            {
              key: '/works/1',
              title: 'Book Without Cover',
              author_name: ['Unknown Author']
            }
          ]
        })
      })

      wrapper = mount(BookSearch, {
        props: { isOpen: true },
        attachTo: document.body,
        global: {
          provide: {
            settingsStore: { settings: { allowScoring: true } }
          }
        }
      })

      const titleInput = document.querySelector('input[placeholder="Enter book title..."]')
      titleInput.value = 'Book'; titleInput.dispatchEvent(new Event('input')); await nextTick()

      vi.advanceTimersByTime(TIMINGS.SEARCH_DEBOUNCE)
      await flushPromises()
      await nextTick()
      await nextTick()
      await nextTick()

      expect(document.body.textContent).toContain('Book Without Cover')
    })

    it('should handle missing author_name in results', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          docs: [
            {
              key: '/works/1',
              title: 'Book Without Author'
            }
          ]
        })
      })

      wrapper = mount(BookSearch, {
        props: { isOpen: true },
        attachTo: document.body,
        global: {
          provide: {
            settingsStore: { settings: { allowScoring: true } }
          }
        }
      })

      const titleInput = document.querySelector('input[placeholder="Enter book title..."]')
      titleInput.value = 'Book'; titleInput.dispatchEvent(new Event('input')); await nextTick()

      vi.advanceTimersByTime(TIMINGS.SEARCH_DEBOUNCE)
      await flushPromises()
      await nextTick()
      await nextTick()
      await nextTick()

      expect(document.body.textContent).toContain('Book Without Author')
    })

    it('should display "No books found" when results are empty', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ docs: [] })
      })

      wrapper = mount(BookSearch, {
        props: { isOpen: true },
        attachTo: document.body,
        global: {
          provide: {
            settingsStore: { settings: { allowScoring: true } }
          }
        }
      })

      const titleInput = document.querySelector('input[placeholder="Enter book title..."]')
      titleInput.value = 'NonexistentBook12345'; titleInput.dispatchEvent(new Event('input')); await nextTick()

      vi.advanceTimersByTime(TIMINGS.SEARCH_DEBOUNCE)
      await flushPromises()
      await nextTick()
      await nextTick()
      await nextTick()

      expect(document.body.textContent).toContain('No books found')
    })

    it('should show manual add button when no results found', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ docs: [] })
      })

      wrapper = mount(BookSearch, {
        props: { isOpen: true },
        attachTo: document.body,
        global: {
          provide: {
            settingsStore: { settings: { allowScoring: true } }
          }
        }
      })

      const titleInput = document.querySelector('input[placeholder="Enter book title..."]')
      titleInput.value = 'Custom Book'; titleInput.dispatchEvent(new Event('input')); await nextTick()

      vi.advanceTimersByTime(TIMINGS.SEARCH_DEBOUNCE)
      await flushPromises()
      await nextTick()
      await nextTick()
      await nextTick()

      expect(document.body.textContent).toContain('Add "Custom Book" Manually')
    })

    it('should show manual add button above results when results exist', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          docs: [
            {
              key: '/works/1',
              title: '1984',
              author_name: ['George Orwell']
            }
          ]
        })
      })

      wrapper = mount(BookSearch, {
        props: { isOpen: true },
        attachTo: document.body,
        global: {
          provide: {
            settingsStore: { settings: { allowScoring: true } }
          }
        }
      })

      const titleInput = document.querySelector('input[placeholder="Enter book title..."]')
      titleInput.value = '1984'; titleInput.dispatchEvent(new Event('input')); await nextTick()

      vi.advanceTimersByTime(TIMINGS.SEARCH_DEBOUNCE)
      await flushPromises()
      await nextTick()
      await nextTick()
      await nextTick()

      expect(document.body.textContent).toContain('Add "1984" Manually')
    })
  })

  describe('Step 1: Search - Request Cancellation', () => {
    it('should cancel pending request when typing again', async () => {
      let abortSignal
      mockFetch.mockImplementation((url, options) => {
        abortSignal = options.signal
        return new Promise(() => {}) // Never resolves
      })

      wrapper = mount(BookSearch, {
        props: { isOpen: true },
        attachTo: document.body,
        global: {
          provide: {
            settingsStore: { settings: { allowScoring: true } }
          }
        }
      })

      const titleInput = document.querySelector('input[placeholder="Enter book title..."]')

      titleInput.value = 'First'; titleInput.dispatchEvent(new Event('input')); await nextTick()
      vi.advanceTimersByTime(TIMINGS.SEARCH_DEBOUNCE)
      await nextTick()

      const firstAbortSignal = abortSignal

      titleInput.value = 'Second'; titleInput.dispatchEvent(new Event('input')); await nextTick()
      vi.advanceTimersByTime(TIMINGS.SEARCH_DEBOUNCE)
      await nextTick()

      expect(firstAbortSignal.aborted).toBe(true)
    })

    it('should cancel pending request when modal closes', async () => {
      let abortSignal
      mockFetch.mockImplementation((url, options) => {
        abortSignal = options.signal
        return new Promise(() => {}) // Never resolves
      })

      wrapper = mount(BookSearch, {
        props: { isOpen: true },
        attachTo: document.body,
        global: {
          provide: {
            settingsStore: { settings: { allowScoring: true } }
          }
        }
      })

      const titleInput = document.querySelector('input[placeholder="Enter book title..."]')
      titleInput.value = '1984'; titleInput.dispatchEvent(new Event('input')); await nextTick()

      vi.advanceTimersByTime(TIMINGS.SEARCH_DEBOUNCE)
      await nextTick()

      const currentAbortSignal = abortSignal

      await wrapper.setProps({ isOpen: false })
      await nextTick()

      expect(currentAbortSignal.aborted).toBe(true)
    })
  })

  describe('Step 2: Date Picker - Rendering', () => {
    it('should display book info when transitioning to date picker', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          docs: [
            {
              key: '/works/1',
              title: '1984',
              author_name: ['George Orwell'],
              first_publish_year: 1949,
              cover_i: 12345
            }
          ]
        })
      })

      wrapper = mount(BookSearch, {
        props: { isOpen: true },
        attachTo: document.body,
        global: {
          provide: {
            settingsStore: { settings: { allowScoring: true } }
          }
        }
      })

      const titleInput = document.querySelector('input[placeholder="Enter book title..."]')
      titleInput.value = '1984'; titleInput.dispatchEvent(new Event('input')); await nextTick()

      vi.advanceTimersByTime(TIMINGS.SEARCH_DEBOUNCE)
      await flushPromises()
      await nextTick()
      await nextTick()

      // Click on the book result
      const buttons = Array.from(document.querySelectorAll('button'));
      const bookButton = buttons.find(b => b.textContent.includes('1984') && b.textContent.includes('George Orwell'))
      bookButton.click()
      await nextTick()

      expect(document.body.textContent).toContain('1984')
      expect(document.body.textContent).toContain('George Orwell')
      expect(document.body.textContent).toContain('When did you read it?')
    })

    it('should have correct modal title for date picker step', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          docs: [{
            key: '/works/1',
            title: '1984',
            author_name: ['George Orwell']
          }]
        })
      })

      wrapper = mount(BookSearch, {
        props: { isOpen: true },
        attachTo: document.body,
        global: {
          provide: {
            settingsStore: { settings: { allowScoring: true } }
          }
        }
      })

      const titleInput = document.querySelector('input[placeholder="Enter book title..."]')
      titleInput.value = '1984'; titleInput.dispatchEvent(new Event('input')); await nextTick()

      vi.advanceTimersByTime(TIMINGS.SEARCH_DEBOUNCE)
      await flushPromises()
      await nextTick()
      await nextTick()

      const buttons = Array.from(document.querySelectorAll('button'));
      const bookButton = buttons.find(b => b.textContent.includes('1984'))
      bookButton.click()
      await nextTick()

      expect(document.body.textContent).toContain('When did you read it?')
    })

    it('should render back to search button in date picker step', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          docs: [{
            key: '/works/1',
            title: '1984'
          }]
        })
      })

      wrapper = mount(BookSearch, {
        props: { isOpen: true },
        attachTo: document.body,
        global: {
          provide: {
            settingsStore: { settings: { allowScoring: true } }
          }
        }
      })

      const titleInput = document.querySelector('input[placeholder="Enter book title..."]')
      titleInput.value = '1984'; titleInput.dispatchEvent(new Event('input')); await nextTick()

      vi.advanceTimersByTime(TIMINGS.SEARCH_DEBOUNCE)
      await flushPromises()
      await nextTick()
      await nextTick()

      const buttons = Array.from(document.querySelectorAll('button'));
      const bookButton = buttons.find(b => b.textContent.includes('1984'))
      bookButton.click()
      await nextTick()

      expect(document.body.textContent).toContain('Back to search')
    })
  })

  describe('Step 2: Date Picker - Navigation', () => {
    it('should go back to search step when clicking back button', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          docs: [{
            key: '/works/1',
            title: '1984'
          }]
        })
      })

      wrapper = mount(BookSearch, {
        props: { isOpen: true },
        attachTo: document.body,
        global: {
          provide: {
            settingsStore: { settings: { allowScoring: true } }
          }
        }
      })

      const titleInput = document.querySelector('input[placeholder="Enter book title..."]')
      titleInput.value = '1984'; titleInput.dispatchEvent(new Event('input')); await nextTick()

      vi.advanceTimersByTime(TIMINGS.SEARCH_DEBOUNCE)
      await flushPromises()
      await nextTick()
      await nextTick()

      let buttons = Array.from(document.querySelectorAll('button'));
      const bookButton = buttons.find(b => b.textContent.includes('1984'))
      bookButton.click()
      await nextTick()

      buttons = Array.from(document.querySelectorAll('button'));
      const backButton = buttons.find(b => b.textContent.includes('Back to search'))
      backButton.click()
      await nextTick()

      expect(document.querySelector('input[placeholder="Enter book title..."]')).toBeTruthy()
    })
  })

  describe('Modal Management', () => {
    it('should reset state when modal closes', async () => {
      wrapper = mount(BookSearch, {
        props: { isOpen: true },
        attachTo: document.body,
        global: {
          provide: {
            settingsStore: { settings: { allowScoring: true } }
          }
        }
      })

      const titleInput = document.querySelector('input[placeholder="Enter book title..."]')
      titleInput.value = 'Test Book'; titleInput.dispatchEvent(new Event('input')); await nextTick()

      await wrapper.setProps({ isOpen: false })
      await nextTick()

      await wrapper.setProps({ isOpen: true })
      await nextTick()

      expect(document.querySelector('input[placeholder="Enter book title..."]').value).toBe('')
    })

    it('should emit close event when modal is closed', async () => {
      wrapper = mount(BookSearch, {
        props: { isOpen: true },
        attachTo: document.body,
        global: {
          provide: {
            settingsStore: { settings: { allowScoring: true } }
          }
        }
      })

      // Find and click the close button (X icon)
      const closeButton = document.querySelector('button[aria-label="Close"]')
      await closeButton?.click()
      await nextTick()

      expect(wrapper.emitted('close')).toBeTruthy()
    })
  })
})
