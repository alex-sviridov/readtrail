import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import GoodreadsImportSection from '../GoodreadsImportSection.vue'
import pb from '@/services/pocketbase'
import { BOOKS_QUERY_KEY } from '@/composables/useBooksQuery'

vi.mock('@heroicons/vue/24/outline', () => ({
  ArrowUpTrayIcon: { name: 'ArrowUpTrayIcon', template: '<div />' }
}))

vi.mock('@/composables/useBooksQuery', () => ({
  BOOKS_QUERY_KEY: ['books']
}))

vi.mock('@/services/pocketbase', () => ({
  default: { send: vi.fn() }
}))

describe('GoodreadsImportSection', () => {
  let wrapper
  let queryClient

  const mountSection = () =>
    mount(GoodreadsImportSection, {
      global: { plugins: [[VueQueryPlugin, { queryClient }]] }
    })

  const chooseFile = async (file) => {
    const input = wrapper.get('[data-testid="goodreads-file-input"]')
    Object.defineProperty(input.element, 'files', { value: [file], configurable: true })
    await input.trigger('change')
    // FileReader completes on a later macrotask than flushPromises() covers.
    await new Promise((resolve) => setTimeout(resolve, 20))
    await flushPromises()
  }

  const csvFile = (name = 'goodreads_library_export.csv', content = 'Title,Author\nDune,Frank Herbert') =>
    new File([content], name, { type: 'text/csv' })

  beforeEach(() => {
    vi.clearAllMocks()
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    vi.spyOn(queryClient, 'invalidateQueries').mockResolvedValue()
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    wrapper?.unmount()
    vi.restoreAllMocks()
  })

  it('posts the CSV text to the goodreads endpoint and refreshes books', async () => {
    pb.send.mockResolvedValue({ imported: 1, skipped: 0, errors: [], covers: { found: 1, notFound: 0, skipped: 0 } })
    wrapper = mountSection()

    await chooseFile(csvFile())

    expect(pb.send).toHaveBeenCalledWith('/api/books/import/goodreads', {
      method: 'POST',
      headers: { 'Content-Type': 'text/csv' },
      body: 'Title,Author\nDune,Frank Herbert'
    })
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: BOOKS_QUERY_KEY })
  })

  it('shows an inline success summary with cover counts', async () => {
    pb.send.mockResolvedValue({ imported: 5, skipped: 2, errors: [], covers: { found: 3, notFound: 2, skipped: 0 } })
    wrapper = mountSection()

    await chooseFile(csvFile())

    expect(wrapper.text()).toContain('Imported 5 books, skipped 2 already in your library.')
    expect(wrapper.text()).toContain('Found covers for 3 of 5.')
    expect(wrapper.text()).not.toContain('could not be imported')
  })

  it('mentions when cover lookup stopped early', async () => {
    pb.send.mockResolvedValue({ imported: 4, skipped: 0, errors: [], covers: { found: 1, notFound: 0, skipped: 3 } })
    wrapper = mountSection()

    await chooseFile(csvFile())

    expect(wrapper.text()).toContain('Cover lookup stopped early, so 3 books were left without one.')
  })

  it('lists rows that could not be imported', async () => {
    pb.send.mockResolvedValue({
      imported: 1,
      skipped: 0,
      errors: [{ index: 5, reason: "Title 'Kim' is shorter than 4 characters" }],
      covers: { found: 0, notFound: 1, skipped: 0 }
    })
    wrapper = mountSection()

    await chooseFile(csvFile())

    expect(wrapper.text()).toContain('1 row could not be imported.')
    expect(wrapper.text()).toContain("Row 6: Title 'Kim' is shorter than 4 characters")
  })

  it('shows the server message for a rejected file', async () => {
    pb.send.mockRejectedValue({ status: 400, response: { message: 'Not a Goodreads export: missing column(s) Title, Author' } })
    wrapper = mountSection()

    await chooseFile(csvFile())

    const alert = wrapper.get('[role="alert"]')
    expect(alert.text()).toBe('Not a Goodreads export: missing column(s) Title, Author')
  })

  it('shows a size message when the server returns 413', async () => {
    pb.send.mockRejectedValue({ status: 413 })
    wrapper = mountSection()

    await chooseFile(csvFile())

    expect(wrapper.get('[role="alert"]').text()).toContain('too large')
  })

  it('shows a generic message for other failures', async () => {
    pb.send.mockRejectedValue({ status: 500 })
    wrapper = mountSection()

    await chooseFile(csvFile())

    expect(wrapper.get('[role="alert"]').text()).toBe('Import failed. Please try again.')
  })

  it('rejects non-csv files without contacting the backend', async () => {
    wrapper = mountSection()

    await chooseFile(new File(['{}'], 'backup.json', { type: 'application/json' }))

    expect(pb.send).not.toHaveBeenCalled()
    expect(wrapper.get('[role="alert"]').text()).toContain('.csv')
  })

  it('rejects files over 10 MB without contacting the backend', async () => {
    wrapper = mountSection()
    const big = csvFile()
    Object.defineProperty(big, 'size', { value: 10 * 1024 * 1024 + 1 })

    await chooseFile(big)

    expect(pb.send).not.toHaveBeenCalled()
    expect(wrapper.get('[role="alert"]').text()).toContain('too large')
  })

  it('shows progress and disables the button while importing', async () => {
    let resolveSend
    pb.send.mockReturnValue(new Promise((resolve) => { resolveSend = resolve }))
    wrapper = mountSection()

    await chooseFile(csvFile())

    expect(wrapper.get('[role="status"]').text()).toContain('Importing your books')
    expect(wrapper.get('button').attributes('disabled')).toBeDefined()

    resolveSend({ imported: 0, skipped: 0, errors: [], covers: { found: 0, notFound: 0, skipped: 0 } })
    await flushPromises()

    expect(wrapper.get('button').attributes('disabled')).toBeUndefined()
    expect(wrapper.text()).not.toContain('Importing your books')
  })

  it('clears the previous result when a new import starts', async () => {
    pb.send.mockResolvedValueOnce({ imported: 1, skipped: 0, errors: [], covers: { found: 0, notFound: 1, skipped: 0 } })
    pb.send.mockRejectedValueOnce({ status: 500 })
    wrapper = mountSection()

    await chooseFile(csvFile())
    expect(wrapper.text()).toContain('Imported 1 book,')

    await chooseFile(csvFile())
    expect(wrapper.text()).not.toContain('Imported 1 book')
    expect(wrapper.get('[role="alert"]').exists()).toBe(true)
  })
})
