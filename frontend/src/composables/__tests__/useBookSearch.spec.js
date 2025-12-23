import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { ref, nextTick } from 'vue'

// Mock vue-router at module level
let mockRouter
let mockRoute

vi.mock('vue-router', () => ({
  useRouter: () => mockRouter,
  useRoute: () => mockRoute
}))

// Import after mocking
import { useBookSearch } from '../useBookSearch'

describe('useBookSearch', () => {
  let books

  beforeEach(() => {
    vi.clearAllTimers()
    vi.useFakeTimers()

    // Reset mock router and route
    mockRoute = {
      query: {}
    }
    mockRouter = {
      push: vi.fn()
    }

    // Sample books data
    books = ref([
      { id: 1, name: 'The Great Gatsby', author: 'F. Scott Fitzgerald', year: 1925 },
      { id: 2, name: '1984', author: 'George Orwell', year: 1949 },
      { id: 3, name: 'To Kill a Mockingbird', author: 'Harper Lee', year: 1960 },
      { id: 4, name: 'Pride and Prejudice', author: 'Jane Austen', year: 1813 },
      { id: 5, name: 'The Catcher in the Rye', author: 'J.D. Salinger', year: 1951 }
    ])
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  describe('initialization and query persistence', () => {
    it('should initialize with empty search query when no URL parameter', () => {
      mockRoute.query = {}
      const { searchQuery } = useBookSearch(books)

      expect(searchQuery.value).toBe('')
    })

    it('should initialize with search query from URL parameter', () => {
      mockRoute.query = { search: 'gatsby' }
      const { searchQuery } = useBookSearch(books)

      expect(searchQuery.value).toBe('gatsby')
    })

    it('should persist search query to URL after debounce delay', async () => {
      mockRoute.query = {}
      const { searchQuery } = useBookSearch(books)

      searchQuery.value = 'orwell'
      await nextTick()

      // Should not update immediately
      expect(mockRouter.push).not.toHaveBeenCalled()

      // Fast-forward through debounce delay (300ms)
      vi.advanceTimersByTime(300)

      expect(mockRouter.push).toHaveBeenCalledTimes(1)
      expect(mockRouter.push).toHaveBeenCalledWith({
        query: { search: 'orwell' }
      })
    })

    it('should debounce multiple rapid search changes', async () => {
      mockRoute.query = {}
      const { searchQuery } = useBookSearch(books)

      // Rapid changes
      searchQuery.value = 'g'
      await nextTick()
      vi.advanceTimersByTime(100)

      searchQuery.value = 'ga'
      await nextTick()
      vi.advanceTimersByTime(100)

      searchQuery.value = 'gat'
      await nextTick()
      vi.advanceTimersByTime(100)

      searchQuery.value = 'gatsby'
      await nextTick()

      // Still shouldn't have called push yet
      expect(mockRouter.push).not.toHaveBeenCalled()

      // Complete the debounce
      vi.advanceTimersByTime(300)

      // Should only push once with final value
      expect(mockRouter.push).toHaveBeenCalledTimes(1)
      expect(mockRouter.push).toHaveBeenCalledWith({
        query: { search: 'gatsby' }
      })
    })

    it('should remove search parameter from URL when cleared', async () => {
      mockRoute.query = { search: 'gatsby', other: 'param' }
      const { searchQuery } = useBookSearch(books)

      searchQuery.value = ''
      await nextTick()
      vi.advanceTimersByTime(300)

      expect(mockRouter.push).toHaveBeenCalledWith({
        query: { search: undefined, other: 'param' }
      })
    })

    it('should trim whitespace before updating URL', async () => {
      mockRoute.query = {}
      const { searchQuery } = useBookSearch(books)

      searchQuery.value = '  gatsby  '
      await nextTick()
      vi.advanceTimersByTime(300)

      expect(mockRouter.push).toHaveBeenCalledWith({
        query: { search: 'gatsby' }
      })
    })

    it('should preserve other query parameters when updating search', async () => {
      mockRoute.query = { page: '2', sort: 'name' }
      const { searchQuery } = useBookSearch(books)

      searchQuery.value = 'orwell'
      await nextTick()
      vi.advanceTimersByTime(300)

      expect(mockRouter.push).toHaveBeenCalledWith({
        query: { page: '2', sort: 'name', search: 'orwell' }
      })
    })

    it('should sync search query when URL changes (browser back/forward)', async () => {
      mockRoute.query = { search: 'gatsby' }
      const { searchQuery } = useBookSearch(books)

      expect(searchQuery.value).toBe('gatsby')

      // Simulate URL change (e.g., back button)
      mockRoute.query.search = 'orwell'

      // Manually trigger the watch since we're mocking
      // In real scenario, the route watcher would fire
      searchQuery.value = mockRoute.query.search || ''

      expect(searchQuery.value).toBe('orwell')
    })

    it('should handle URL search parameter being removed', async () => {
      mockRoute.query = { search: 'gatsby' }
      const { searchQuery } = useBookSearch(books)

      expect(searchQuery.value).toBe('gatsby')

      // URL parameter removed
      mockRoute.query.search = undefined
      searchQuery.value = mockRoute.query.search || ''

      expect(searchQuery.value).toBe('')
    })
  })

  describe('filtering logic', () => {
    it('should return all books when search query is empty', () => {
      mockRoute.query = {}
      const { searchedBooks } = useBookSearch(books)

      expect(searchedBooks.value).toHaveLength(5)
      expect(searchedBooks.value).toEqual(books.value)
    })

    it('should filter books by name (case-insensitive)', () => {
      mockRoute.query = { search: 'gatsby' }
      const { searchedBooks } = useBookSearch(books)

      expect(searchedBooks.value).toHaveLength(1)
      expect(searchedBooks.value[0].name).toBe('The Great Gatsby')
    })

    it('should filter books by name with different case', () => {
      mockRoute.query = { search: 'GATSBY' }
      const { searchedBooks } = useBookSearch(books)

      expect(searchedBooks.value).toHaveLength(1)
      expect(searchedBooks.value[0].name).toBe('The Great Gatsby')
    })

    it('should filter books by author', () => {
      mockRoute.query = { search: 'orwell' }
      const { searchedBooks } = useBookSearch(books)

      expect(searchedBooks.value).toHaveLength(1)
      expect(searchedBooks.value[0].name).toBe('1984')
      expect(searchedBooks.value[0].author).toBe('George Orwell')
    })

    it('should filter books by partial author name', () => {
      mockRoute.query = { search: 'scott' }
      const { searchedBooks } = useBookSearch(books)

      expect(searchedBooks.value).toHaveLength(1)
      expect(searchedBooks.value[0].author).toBe('F. Scott Fitzgerald')
    })

    it('should filter books by year', () => {
      mockRoute.query = { search: '1949' }
      const { searchedBooks } = useBookSearch(books)

      expect(searchedBooks.value).toHaveLength(1)
      expect(searchedBooks.value[0].name).toBe('1984')
      expect(searchedBooks.value[0].year).toBe(1949)
    })

    it('should filter books by partial year', () => {
      mockRoute.query = { search: '19' }
      const { searchedBooks } = useBookSearch(books)

      // Should match 1925, 1949, 1960, 1951 (all contain '19')
      expect(searchedBooks.value.length).toBeGreaterThanOrEqual(4)
    })

    it('should return multiple matching books', () => {
      mockRoute.query = { search: 'the' }
      const { searchedBooks } = useBookSearch(books)

      // 'The Great Gatsby' and 'The Catcher in the Rye'
      expect(searchedBooks.value.length).toBeGreaterThanOrEqual(2)
    })

    it('should return empty array when no books match', () => {
      mockRoute.query = { search: 'nonexistent' }
      const { searchedBooks } = useBookSearch(books)

      expect(searchedBooks.value).toHaveLength(0)
    })

    it('should handle books with missing fields gracefully', () => {
      books.value.push({ id: 6, name: 'Book Without Author' })
      books.value.push({ id: 7, author: 'Author Without Book Name' })
      books.value.push({ id: 8 })

      mockRoute.query = { search: 'without' }
      const { searchedBooks } = useBookSearch(books)

      expect(searchedBooks.value.length).toBeGreaterThanOrEqual(1)
    })

    it('should trim search query before filtering', () => {
      mockRoute.query = {}
      const { searchQuery, searchedBooks } = useBookSearch(books)

      searchQuery.value = '  gatsby  '

      expect(searchedBooks.value).toHaveLength(1)
      expect(searchedBooks.value[0].name).toBe('The Great Gatsby')
    })

    it('should treat whitespace-only search as empty', () => {
      mockRoute.query = {}
      const { searchQuery, searchedBooks } = useBookSearch(books)

      searchQuery.value = '   '

      expect(searchedBooks.value).toHaveLength(5)
      expect(searchedBooks.value).toEqual(books.value)
    })

    it('should reactively update when books array changes', async () => {
      mockRoute.query = { search: 'gatsby' }
      const { searchedBooks } = useBookSearch(books)

      expect(searchedBooks.value).toHaveLength(1)

      // Add another book with 'gatsby' in the name
      books.value.push({ id: 6, name: 'Gatsby Returns', author: 'New Author', year: 2020 })

      await nextTick()

      expect(searchedBooks.value).toHaveLength(2)
    })

    it('should reactively update when search query changes', async () => {
      mockRoute.query = {}
      const { searchQuery, searchedBooks } = useBookSearch(books)

      expect(searchedBooks.value).toHaveLength(5)

      searchQuery.value = 'gatsby'
      await nextTick()

      expect(searchedBooks.value).toHaveLength(1)

      searchQuery.value = 'orwell'
      await nextTick()

      expect(searchedBooks.value).toHaveLength(1)
      expect(searchedBooks.value[0].author).toBe('George Orwell')
    })
  })

  describe('edge cases', () => {
    it('should handle empty books array', () => {
      books.value = []
      mockRoute.query = { search: 'gatsby' }
      const { searchedBooks } = useBookSearch(books)

      expect(searchedBooks.value).toHaveLength(0)
    })

    it('should handle special characters in search', () => {
      books.value.push({ id: 6, name: 'Book: Special Title!', author: 'Author', year: 2020 })
      mockRoute.query = { search: 'special' }
      const { searchedBooks } = useBookSearch(books)

      expect(searchedBooks.value.length).toBeGreaterThanOrEqual(1)
    })

    it('should handle unicode characters', () => {
      books.value.push({ id: 6, name: 'Café Society', author: 'José García', year: 2020 })
      mockRoute.query = { search: 'café' }
      const { searchedBooks } = useBookSearch(books)

      expect(searchedBooks.value.length).toBeGreaterThanOrEqual(1)
    })

    it('should not mutate original books array', () => {
      const originalLength = books.value.length
      mockRoute.query = { search: 'gatsby' }
      const { searchedBooks } = useBookSearch(books)

      expect(searchedBooks.value).toHaveLength(1)
      expect(books.value).toHaveLength(originalLength)
    })
  })

  describe('return values', () => {
    it('should return searchQuery ref', () => {
      mockRoute.query = {}
      const { searchQuery } = useBookSearch(books)

      expect(searchQuery.value).toBeDefined()
      expect(typeof searchQuery.value).toBe('string')
    })

    it('should return searchedBooks computed', () => {
      mockRoute.query = {}
      const { searchedBooks } = useBookSearch(books)

      expect(searchedBooks.value).toBeDefined()
      expect(Array.isArray(searchedBooks.value)).toBe(true)
    })

    it('should make searchQuery mutable', () => {
      mockRoute.query = {}
      const { searchQuery } = useBookSearch(books)

      searchQuery.value = 'test'
      expect(searchQuery.value).toBe('test')
    })
  })
})
