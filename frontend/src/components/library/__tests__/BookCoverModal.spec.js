import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import BookCoverModal from '../BookCoverModal.vue'
import CustomBookCover from '../CustomBookCover.vue'

vi.mock('@/composables/useImageFetch', () => ({
  useImageFetch: () => ({
    isLoading: { value: false },
    error: { value: null },
    file: { value: null },
    warning: { value: null },
    fetchImage: vi.fn(),
    reset: vi.fn()
  })
}))

describe('BookCoverModal', () => {
  it('populates the Generate Cover preview immediately when mounted already open (v-if gated by the parent)', () => {
    const book = { id: '1', name: 'Dune', author: 'Frank Herbert', coverLink: null, customCover: true }

    // Mirrors how BookCover.vue mounts this: v-if="isModalOpen" with :is-open
    // already true on creation -- isOpen never transitions from false to
    // true within this component's own lifetime.
    const wrapper = mount(BookCoverModal, {
      props: { isOpen: true, book }
    })

    const preview = wrapper.getComponent(CustomBookCover)
    expect(preview.props('title')).toBe('Dune')
    expect(preview.props('author')).toBe('Frank Herbert')
  })
})
