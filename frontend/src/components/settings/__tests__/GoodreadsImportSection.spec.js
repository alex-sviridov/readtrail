import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import GoodreadsImportSection from '../GoodreadsImportSection.vue'
import { useGoodreadsImport } from '@/composables/useGoodreadsImport'

vi.mock('@heroicons/vue/24/outline', () => ({
  ArrowUpTrayIcon: { name: 'ArrowUpTrayIcon', template: '<div />' }
}))

vi.mock('@/composables/useGoodreadsImport', () => ({
  useGoodreadsImport: vi.fn()
}))

const summary = (overrides = {}) => ({
  imported: 5,
  skipped: 2,
  errors: [],
  covers: { found: 3, notFound: 2, skipped: 0 },
  cancelled: false,
  ...overrides
})

describe('GoodreadsImportSection', () => {
  let wrapper
  let state

  const mountSection = () => {
    wrapper = mount(GoodreadsImportSection)
  }

  beforeEach(() => {
    state = {
      importFile: vi.fn(),
      cancel: vi.fn(),
      isImporting: ref(false),
      result: ref(undefined),
      errorMessage: ref(''),
      progress: ref({ done: 0, total: 0 })
    }
    useGoodreadsImport.mockReturnValue(state)
  })

  afterEach(() => {
    wrapper?.unmount()
  })

  it('hands the chosen file to the import and resets the input', async () => {
    mountSection()
    const input = wrapper.get('[data-testid="goodreads-file-input"]')
    const file = new File(['Title,Author'], 'export.csv')
    Object.defineProperty(input.element, 'files', { value: [file], configurable: true })

    await input.trigger('change')

    expect(state.importFile).toHaveBeenCalledWith(file)
  })

  it('ignores a cancelled file dialog', async () => {
    mountSection()
    const input = wrapper.get('[data-testid="goodreads-file-input"]')
    Object.defineProperty(input.element, 'files', { value: [], configurable: true })

    await input.trigger('change')

    expect(state.importFile).not.toHaveBeenCalled()
  })

  it('shows progress, a cancel button and a disabled import button while importing', () => {
    state.isImporting.value = true
    state.progress.value = { done: 40, total: 100 }
    mountSection()

    expect(wrapper.get('[role="status"]').text()).toContain('Importing books: 40 of 100.')
    expect(wrapper.get('[role="status"] [style]').attributes('style')).toContain('width: 40%')
    expect(wrapper.get('[aria-label="Import Goodreads CSV"]').attributes('disabled')).toBeDefined()
  })

  it('cancels the running import', async () => {
    state.isImporting.value = true
    mountSection()

    await wrapper.get('[role="status"] button').trigger('click')

    expect(state.cancel).toHaveBeenCalled()
  })

  it('shows a success summary with cover counts', () => {
    state.result.value = summary()
    mountSection()

    expect(wrapper.text()).toContain('Imported 5 books, skipped 2 already in your library.')
    expect(wrapper.text()).toContain('Found covers for 3 of 5.')
    expect(wrapper.text()).not.toContain('could not be imported')
    expect(wrapper.text()).not.toContain('cancelled')
  })

  it('mentions when cover lookup stopped early', () => {
    state.result.value = summary({ covers: { found: 1, notFound: 0, skipped: 3 } })
    mountSection()

    expect(wrapper.text()).toContain('Cover lookup stopped early, so 3 books were left without one.')
  })

  it('says when the import was cancelled', () => {
    state.result.value = summary({ cancelled: true })
    mountSection()

    expect(wrapper.text()).toContain('Import cancelled.')
  })

  it('lists rows that could not be imported', () => {
    state.result.value = summary({ errors: [{ index: 5, reason: "Title 'Kim' is shorter than 4 characters" }] })
    mountSection()

    expect(wrapper.text()).toContain('1 row could not be imported.')
    expect(wrapper.text()).toContain("Row 6: Title 'Kim' is shorter than 4 characters")
  })

  it('shows the error message', () => {
    state.errorMessage.value = 'Not a Goodreads export: missing column(s) Title, Author'
    mountSection()

    expect(wrapper.get('[role="alert"]').text()).toBe('Not a Goodreads export: missing column(s) Title, Author')
  })
})
