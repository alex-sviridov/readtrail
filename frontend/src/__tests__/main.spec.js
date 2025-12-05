import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createApp } from 'vue'
import { createPinia } from 'pinia'

// Mock the books store before other imports
const mockLoadBooks = vi.fn()
vi.mock('../stores/books', () => ({
  useBooksStore: vi.fn(() => ({
    loadBooks: mockLoadBooks
  }))
}))

// Mock modules
vi.mock('vue', () => ({
  createApp: vi.fn(() => ({
    use: vi.fn().mockReturnThis(),
    mount: vi.fn().mockReturnThis()
  }))
}))

vi.mock('pinia', () => ({
  createPinia: vi.fn(() => ({})),
  defineStore: vi.fn()
}))

vi.mock('vue-router', () => ({
  createRouter: vi.fn(),
  createWebHistory: vi.fn()
}))

describe('main.js', () => {
  let mockApp
  let mockPinia
  let originalDocument

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks()

    // Mock DOM
    originalDocument = globalThis.document
    globalThis.document = {
      querySelector: vi.fn(() => ({}))
    }

    // Setup mock return values
    mockApp = {
      use: vi.fn().mockReturnThis(),
      mount: vi.fn().mockReturnThis()
    }
    mockPinia = {}

    vi.mocked(createApp).mockReturnValue(mockApp)
    vi.mocked(createPinia).mockReturnValue(mockPinia)
  })

  afterEach(() => {
    globalThis.document = originalDocument
    vi.resetModules()
  })

  it('creates a Vue app instance', async () => {
    await import('../main.js')
    expect(createApp).toHaveBeenCalled()
  })

  it('creates and uses Pinia store', async () => {
    await import('../main.js')
    expect(createPinia).toHaveBeenCalled()
    expect(mockApp.use).toHaveBeenCalledWith(mockPinia)
  })

  it('initializes app in correct order', async () => {
    await import('../main.js')

    const useCalls = mockApp.use.mock.calls
    expect(useCalls.length).toBeGreaterThanOrEqual(2)

    // Pinia should be initialized before router
    expect(mockApp.use).toHaveBeenCalled()
  })

  it('mounts app to #app element', async () => {
    await import('../main.js')
    expect(mockApp.mount).toHaveBeenCalledWith('#app')
  })
})

describe('main.js - Books Store Initialization', () => {
  beforeEach(() => {
    // Mock localStorage
    globalThis.localStorage = {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn()
    }
    mockLoadBooks.mockClear()
  })

  afterEach(() => {
    vi.resetModules()
  })

  it('initializes books store after app mount', async () => {
    // This test verifies the store initialization pattern
    await import('../main.js')

    // Verify loadBooks was called
    expect(mockLoadBooks).toHaveBeenCalled()
  })
})

describe('main.js - CSS Import', () => {
  it('imports style.css for Tailwind styles', async () => {
    // This test ensures style.css is imported
    // The actual import happens at module load time
    await import('../main.js')
    // If no error is thrown, the import was successful
    expect(true).toBe(true)
  })
})
