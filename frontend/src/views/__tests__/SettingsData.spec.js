import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import SettingsData from '../SettingsData.vue'
import { authManager } from '@/services/auth'
import pb from '@/services/pocketbase'

const mockToast = {
  success: vi.fn(),
  error: vi.fn(),
  warning: vi.fn(),
  info: vi.fn()
}

vi.mock('vue-toastification', () => ({
  useToast: () => mockToast,
  POSITION: { TOP_RIGHT: 'top-right' }
}))

vi.mock('@/services/auth', () => ({
  authManager: {
    isGuestUser: vi.fn(),
    getCurrentUser: vi.fn()
  }
}))

vi.mock('@heroicons/vue/24/outline', () => ({
  ArrowDownTrayIcon: { name: 'ArrowDownTrayIcon', template: '<div />' },
  ArrowUpTrayIcon: { name: 'ArrowUpTrayIcon', template: '<div />' }
}))

vi.mock('@/services/pocketbase', () => ({
  default: {
    send: vi.fn()
  }
}))

vi.mock('@/composables/useBooksQuery', () => ({
  BOOKS_QUERY_KEY: ['books']
}))

describe('SettingsData', () => {
  let wrapper
  let router
  let queryClient

  const mountSettingsData = () =>
    mount(SettingsData, {
      global: {
        plugins: [router, [VueQueryPlugin, { queryClient }]]
      }
    })

  beforeEach(async () => {
    vi.clearAllMocks()

    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
    })

    router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/settings/data', name: 'settings-data', component: SettingsData },
        { path: '/login', name: 'login', component: { template: '<div>Login</div>' } }
      ]
    })
    await router.push('/settings/data')
    await router.isReady()
  })

  afterEach(() => {
    wrapper?.unmount()
  })

  describe('guest mode', () => {
    beforeEach(() => {
      authManager.isGuestUser.mockReturnValue(true)
    })

    it('shows a sign-in notice instead of the backup and import sections', () => {
      wrapper = mountSettingsData()

      expect(wrapper.text()).toContain("You're using guest mode")
      expect(wrapper.text()).not.toContain('Export Books')
      expect(wrapper.text()).not.toContain('Import from Goodreads')
      expect(wrapper.find('a[href="/login"]').exists()).toBe(true)
    })
  })

  describe('authenticated', () => {
    beforeEach(() => {
      authManager.isGuestUser.mockReturnValue(false)
    })

    it('renders the books backup and Goodreads import sections', () => {
      wrapper = mountSettingsData()

      expect(wrapper.text()).toContain('Books Backup')
      expect(wrapper.text()).toContain('Export Books')
      expect(wrapper.text()).toContain('Import Books')
      expect(wrapper.text()).toContain('Import from Goodreads')
    })

    it('uses verb-only buttons of identical width, with the full name as accessible label', () => {
      wrapper = mountSettingsData()

      const buttons = wrapper.findAll('button')
      expect(buttons.map((b) => b.text())).toEqual(['Export', 'Import', 'Import'])
      expect(buttons.map((b) => b.attributes('aria-label'))).toEqual([
        'Export Books',
        'Import Books',
        'Import Goodreads CSV'
      ])
      buttons.forEach((b) => expect(b.classes()).toEqual(expect.arrayContaining(['w-28', 'justify-center'])))
    })
  })

  describe('books backup', () => {
    let createdLink
    const originalCreateElement = document.createElement.bind(document)

    beforeEach(() => {
      authManager.isGuestUser.mockReturnValue(false)
      authManager.getCurrentUser.mockReturnValue({
        id: 'user123',
        email: 'test@example.com'
      })

      createdLink = null
      vi.spyOn(document, 'createElement').mockImplementation((tag) => {
        const el = originalCreateElement(tag)
        if (tag === 'a') {
          createdLink = el
          vi.spyOn(el, 'click').mockImplementation(() => {})
        }
        return el
      })
    })

    afterEach(() => {
      vi.restoreAllMocks()
    })

    it('exports books via the backend endpoint and downloads the result', async () => {
      const exportPayload = { version: 1, exportedAt: '2026-01-01T00:00:00.000Z', books: [] }
      pb.send.mockResolvedValueOnce(exportPayload)

      wrapper = mountSettingsData()
      const exportButton = wrapper.findAll('button').find((btn) => btn.attributes('aria-label') === 'Export Books')
      await exportButton.trigger('click')
      await flushPromises()

      expect(pb.send).toHaveBeenCalledWith('/api/books/export', { method: 'GET' })
      expect(createdLink.download).toMatch(/^readtrail-books-backup-.*\.json$/)
      expect(createdLink.click).toHaveBeenCalled()
      expect(mockToast.success).toHaveBeenCalledWith('Books exported successfully')
    })

    it('imports a selected file via the backend endpoint and reports the result', async () => {
      pb.send.mockResolvedValueOnce({ imported: 2, skipped: 1, errors: [] })

      wrapper = mountSettingsData()
      const fileInput = wrapper.find('input[type="file"]')
      const file = new File(
        [JSON.stringify({ version: 1, books: [{ name: 'Dune', author: 'Frank Herbert' }] })],
        'backup.json',
        { type: 'application/json' }
      )
      Object.defineProperty(fileInput.element, 'files', { value: [file] })
      await fileInput.trigger('change')
      // FileReader dispatches its 'load' event on its own macrotask in jsdom,
      // so the read needs an extra flush beyond the one for our own awaits.
      await flushPromises()
      await flushPromises()

      expect(pb.send).toHaveBeenCalledWith('/api/books/import', {
        method: 'POST',
        body: { version: 1, books: [{ name: 'Dune', author: 'Frank Herbert' }] }
      })
      expect(mockToast.success).toHaveBeenCalledWith('Imported 2 book(s), skipped 1 already in your library')
      expect(mockToast.warning).not.toHaveBeenCalled()
    })

    it('warns about entries that failed to import', async () => {
      pb.send.mockResolvedValueOnce({ imported: 1, skipped: 0, errors: [{ index: 1, reason: 'bad' }] })

      wrapper = mountSettingsData()
      const fileInput = wrapper.find('input[type="file"]')
      const file = new File([JSON.stringify({ books: [] })], 'backup.json', { type: 'application/json' })
      Object.defineProperty(fileInput.element, 'files', { value: [file] })
      await fileInput.trigger('change')
      // FileReader dispatches its 'load' event on its own macrotask in jsdom,
      // so the read needs an extra flush beyond the one for our own awaits.
      await flushPromises()
      await flushPromises()

      expect(mockToast.warning).toHaveBeenCalledWith('1 entry could not be imported')
    })

    it('rejects a file that is not valid JSON without calling the backend', async () => {
      wrapper = mountSettingsData()
      const fileInput = wrapper.find('input[type="file"]')
      const file = new File(['not json'], 'backup.json', { type: 'application/json' })
      Object.defineProperty(fileInput.element, 'files', { value: [file] })
      await fileInput.trigger('change')
      // FileReader dispatches its 'load' event on its own macrotask in jsdom,
      // so the read needs an extra flush beyond the one for our own awaits.
      await flushPromises()
      await flushPromises()

      expect(pb.send).not.toHaveBeenCalled()
      expect(mockToast.error).toHaveBeenCalledWith('That file is not valid JSON.')
    })
  })
})
