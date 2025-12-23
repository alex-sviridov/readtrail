import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import BookCover from '../BookCover.vue'
import CustomBookCover from '../CustomBookCover.vue'
import BookScore from '../BookScore.vue'
import BookCoverModal from '../BookCoverModal.vue'

// Mock heroicons
vi.mock('@heroicons/vue/24/outline', () => ({
  PhotoIcon: {
    name: 'PhotoIcon',
    template: '<svg data-testid="photo-icon"></svg>'
  }
}))

describe('BookCover', () => {
  const defaultProps = {
    coverLink: 'https://example.com/cover.jpg',
    coverUrl: null,
    altText: 'Test Book Cover',
    editable: false,
    useCustomCover: false,
    bookName: 'Test Book',
    bookAuthor: 'Test Author',
    score: null,
    isScoreEditable: false,
    allowScoring: false
  }

  const createWrapper = (props = {}) => {
    return mount(BookCover, {
      props: { ...defaultProps, ...props },
      global: {
        stubs: {
          CustomBookCover: true,
          BookScore: true,
          BookCoverModal: {
            template: '<div data-testid="book-cover-modal"></div>',
            props: ['isOpen', 'book'],
            emits: ['close', 'save']
          }
        }
      }
    })
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Image Display', () => {
    it('renders image when coverLink is provided', () => {
      const wrapper = createWrapper()
      const img = wrapper.find('img')

      expect(img.exists()).toBe(true)
      expect(img.attributes('src')).toBe('https://example.com/cover.jpg')
      expect(img.attributes('alt')).toBe('Test Book Cover')
    })

    it('displays placeholder SVG when no cover is provided', () => {
      const wrapper = createWrapper({ coverLink: '', coverUrl: null })
      const svg = wrapper.find('svg')

      expect(svg.exists()).toBe(true)
      expect(wrapper.find('img').exists()).toBe(false)
    })

    it('uses correct alt text from prop', () => {
      const wrapper = createWrapper({ altText: 'Custom Alt Text' })
      const img = wrapper.find('img')

      expect(img.attributes('alt')).toBe('Custom Alt Text')
    })

    it('displays coverLink by default', () => {
      const wrapper = createWrapper({
        coverLink: 'https://example.com/cover1.jpg',
        coverUrl: 'https://example.com/cover2.jpg'
      })
      const img = wrapper.find('img')

      expect(img.attributes('src')).toBe('https://example.com/cover1.jpg')
    })
  })

  describe('Custom Cover', () => {
    it('renders CustomBookCover when useCustomCover is true', () => {
      const wrapper = createWrapper({ useCustomCover: true })
      const customCover = wrapper.findComponent(CustomBookCover)

      expect(customCover.exists()).toBe(true)
      expect(wrapper.find('img').exists()).toBe(false)
      expect(wrapper.find('svg').exists()).toBe(false)
    })

    it('passes correct props to CustomBookCover', () => {
      const wrapper = createWrapper({
        useCustomCover: true,
        bookName: 'Amazing Book',
        bookAuthor: 'Great Author'
      })
      const customCover = wrapper.findComponent(CustomBookCover)

      expect(customCover.props('title')).toBe('Amazing Book')
      expect(customCover.props('author')).toBe('Great Author')
    })

    it('does not render image when using custom cover', () => {
      const wrapper = createWrapper({
        useCustomCover: true,
        coverLink: 'https://example.com/cover.jpg'
      })

      expect(wrapper.find('img').exists()).toBe(false)
      expect(wrapper.findComponent(CustomBookCover).exists()).toBe(true)
    })
  })

  describe('Error Handling', () => {
    it('handles image load error by trying coverUrl fallback', async () => {
      const wrapper = createWrapper({
        coverLink: 'https://example.com/broken.jpg',
        coverUrl: 'https://example.com/fallback.jpg'
      })

      const img = wrapper.find('img')
      expect(img.attributes('src')).toBe('https://example.com/broken.jpg')

      // Trigger error event
      await img.trigger('error')
      await nextTick()

      // Should switch to fallback URL
      expect(img.attributes('src')).toBe('https://example.com/fallback.jpg')
    })

    it('does not change src if coverUrl is same as coverLink', async () => {
      const wrapper = createWrapper({
        coverLink: 'https://example.com/cover.jpg',
        coverUrl: 'https://example.com/cover.jpg'
      })

      const img = wrapper.find('img')
      await img.trigger('error')
      await nextTick()

      // Should remain the same
      expect(img.attributes('src')).toBe('https://example.com/cover.jpg')
    })

    it('does not trigger fallback if no coverUrl provided', async () => {
      const wrapper = createWrapper({
        coverLink: 'https://example.com/broken.jpg',
        coverUrl: null
      })

      const img = wrapper.find('img')
      await img.trigger('error')
      await nextTick()

      // Should remain the same
      expect(img.attributes('src')).toBe('https://example.com/broken.jpg')
    })

    it('only triggers fallback once', async () => {
      const wrapper = createWrapper({
        coverLink: 'https://example.com/broken.jpg',
        coverUrl: 'https://example.com/fallback.jpg'
      })

      const img = wrapper.find('img')

      // First error - should trigger fallback
      await img.trigger('error')
      await nextTick()
      expect(img.attributes('src')).toBe('https://example.com/fallback.jpg')

      // Second error - should not change
      await img.trigger('error')
      await nextTick()
      expect(img.attributes('src')).toBe('https://example.com/fallback.jpg')
    })
  })

  describe('Edit Mode', () => {
    it('shows cursor pointer when editable is true', () => {
      const wrapper = createWrapper({ editable: true })
      const img = wrapper.find('img')

      expect(img.classes()).toContain('cursor-pointer')
    })

    it('does not show cursor pointer when editable is false', () => {
      const wrapper = createWrapper({ editable: false })
      const img = wrapper.find('img')

      expect(img.classes()).not.toContain('cursor-pointer')
    })

    it('shows edit overlay when editable is true', () => {
      const wrapper = createWrapper({ editable: true })
      const overlay = wrapper.find('.absolute.inset-0.bg-black')

      expect(overlay.exists()).toBe(true)
    })

    it('does not show edit overlay when editable is false', () => {
      const wrapper = createWrapper({ editable: false })
      const overlay = wrapper.find('.absolute.inset-0.bg-black')

      expect(overlay.exists()).toBe(false)
    })

    it('opens modal when cover is clicked in edit mode', async () => {
      const wrapper = createWrapper({ editable: true })
      const modal = wrapper.findComponent(BookCoverModal)

      expect(modal.props('isOpen')).toBe(false)

      const img = wrapper.find('img')
      await img.trigger('click')
      await nextTick()

      expect(modal.props('isOpen')).toBe(true)
    })

    it('does not open modal when cover is clicked in non-edit mode', async () => {
      const wrapper = createWrapper({ editable: false })
      const modal = wrapper.findComponent(BookCoverModal)

      const img = wrapper.find('img')
      await img.trigger('click')
      await nextTick()

      expect(modal.props('isOpen')).toBe(false)
    })

    it('opens modal when custom cover is clicked in edit mode', async () => {
      const wrapper = createWrapper({
        editable: true,
        useCustomCover: true
      })
      const modal = wrapper.findComponent(BookCoverModal)

      const customCover = wrapper.findComponent(CustomBookCover)
      await customCover.trigger('click')
      await nextTick()

      expect(modal.props('isOpen')).toBe(true)
    })

    it('opens modal when placeholder is clicked in edit mode', async () => {
      const wrapper = createWrapper({
        editable: true,
        coverLink: '',
        coverUrl: null
      })
      const modal = wrapper.findComponent(BookCoverModal)

      const svg = wrapper.find('svg')
      await svg.trigger('click')
      await nextTick()

      expect(modal.props('isOpen')).toBe(true)
    })

    it('opens modal when edit overlay is clicked', async () => {
      const wrapper = createWrapper({ editable: true })
      const modal = wrapper.findComponent(BookCoverModal)

      const overlay = wrapper.find('.absolute.inset-0.bg-black')
      await overlay.trigger('click')
      await nextTick()

      expect(modal.props('isOpen')).toBe(true)
    })
  })

  describe('Modal Integration', () => {
    it('passes correct book data to modal', () => {
      const wrapper = createWrapper({
        bookName: 'Great Book',
        bookAuthor: 'Famous Author',
        coverLink: 'https://example.com/cover.jpg',
        coverUrl: 'https://example.com/cached.jpg',
        useCustomCover: false
      })
      const modal = wrapper.findComponent(BookCoverModal)

      expect(modal.props('book')).toEqual({
        name: 'Great Book',
        author: 'Famous Author',
        coverLink: 'https://example.com/cached.jpg',
        customCover: false
      })
    })

    it('uses coverLink when coverUrl is null', () => {
      const wrapper = createWrapper({
        coverLink: 'https://example.com/cover.jpg',
        coverUrl: null
      })
      const modal = wrapper.findComponent(BookCoverModal)

      expect(modal.props('book').coverLink).toBe('https://example.com/cover.jpg')
    })

    it('closes modal when close event is emitted', async () => {
      const wrapper = createWrapper({ editable: true })

      // Open modal
      const img = wrapper.find('img')
      await img.trigger('click')
      await nextTick()

      const modal = wrapper.findComponent(BookCoverModal)
      expect(modal.props('isOpen')).toBe(true)

      // Close modal
      await modal.vm.$emit('close')
      await nextTick()

      expect(modal.props('isOpen')).toBe(false)
    })

    it('emits update event with cover data when modal saves', async () => {
      const wrapper = createWrapper({ editable: true })

      // Open modal
      const img = wrapper.find('img')
      await img.trigger('click')
      await nextTick()

      const modal = wrapper.findComponent(BookCoverModal)
      await modal.vm.$emit('save', {
        coverLink: 'https://example.com/new-cover.jpg',
        coverFile: null,
        customCover: false
      })
      await nextTick()

      expect(wrapper.emitted('update')).toBeTruthy()
      expect(wrapper.emitted('update')[0]).toEqual([{
        coverLink: 'https://example.com/new-cover.jpg',
        coverFile: null,
        customCover: false
      }])
    })

    it('emits update event with custom cover flag', async () => {
      const wrapper = createWrapper({ editable: true })

      const img = wrapper.find('img')
      await img.trigger('click')
      await nextTick()

      const modal = wrapper.findComponent(BookCoverModal)
      await modal.vm.$emit('save', {
        coverLink: null,
        coverFile: null,
        customCover: true
      })
      await nextTick()

      expect(wrapper.emitted('update')).toBeTruthy()
      expect(wrapper.emitted('update')[0]).toEqual([{
        coverLink: null,
        coverFile: null,
        customCover: true
      }])
    })

    it('emits update event with file upload', async () => {
      const wrapper = createWrapper({ editable: true })
      const mockFile = new File([''], 'cover.jpg', { type: 'image/jpeg' })

      const img = wrapper.find('img')
      await img.trigger('click')
      await nextTick()

      const modal = wrapper.findComponent(BookCoverModal)
      await modal.vm.$emit('save', {
        coverLink: 'https://example.com/uploaded.jpg',
        coverFile: mockFile,
        customCover: false
      })
      await nextTick()

      expect(wrapper.emitted('update')).toBeTruthy()
      expect(wrapper.emitted('update')[0][0].coverFile).toBe(mockFile)
    })

    it('closes modal after saving', async () => {
      const wrapper = createWrapper({ editable: true })

      const img = wrapper.find('img')
      await img.trigger('click')
      await nextTick()

      const modal = wrapper.findComponent(BookCoverModal)
      expect(modal.props('isOpen')).toBe(true)

      // Emit save event (simulating modal's saveCover behavior)
      modal.vm.$emit('save', {
        coverLink: 'https://example.com/new-cover.jpg',
        coverFile: null,
        customCover: false
      })

      // Real modal also emits close after save
      modal.vm.$emit('close')
      await nextTick()

      // Modal should now be closed
      expect(modal.props('isOpen')).toBe(false)
    })

    it('resets image error state when saving cover', async () => {
      const wrapper = createWrapper({
        editable: true,
        coverLink: 'https://example.com/broken.jpg',
        coverUrl: 'https://example.com/fallback.jpg'
      })

      // Trigger error to set error state
      const img = wrapper.find('img')
      await img.trigger('error')
      await nextTick()

      // Save new cover
      await img.trigger('click')
      await nextTick()

      const modal = wrapper.findComponent(BookCoverModal)
      await modal.vm.$emit('save', {
        coverLink: 'https://example.com/new-cover.jpg',
        coverFile: null,
        customCover: false
      })
      await nextTick()

      // Error state should be reset
      expect(img.attributes('src')).toBe('https://example.com/broken.jpg')
    })
  })

  describe('Score Overlay', () => {
    it('does not render BookScore when allowScoring is false', () => {
      const wrapper = createWrapper({ allowScoring: false })
      const bookScore = wrapper.findComponent(BookScore)

      expect(bookScore.exists()).toBe(false)
    })

    it('renders BookScore when allowScoring is true', () => {
      const wrapper = createWrapper({ allowScoring: true })
      const bookScore = wrapper.findComponent(BookScore)

      expect(bookScore.exists()).toBe(true)
    })

    it('passes correct props to BookScore', () => {
      const wrapper = createWrapper({
        allowScoring: true,
        score: 5,
        isScoreEditable: true
      })
      const bookScore = wrapper.findComponent(BookScore)

      expect(bookScore.props('score')).toBe(5)
      expect(bookScore.props('editable')).toBe(true)
      expect(bookScore.props('allowScoring')).toBe(true)
    })

    it('defaults score to 0 when null', () => {
      const wrapper = createWrapper({
        allowScoring: true,
        score: null
      })
      const bookScore = wrapper.findComponent(BookScore)

      expect(bookScore.props('score')).toBe(0)
    })

    it('emits update:score when BookScore emits update', async () => {
      const wrapper = createWrapper({
        allowScoring: true,
        isScoreEditable: true
      })

      const bookScore = wrapper.findComponent(BookScore)
      await bookScore.vm.$emit('update:score', 8)
      await nextTick()

      expect(wrapper.emitted('update:score')).toBeTruthy()
      expect(wrapper.emitted('update:score')[0]).toEqual([8])
    })

    it('positions BookScore overlay in bottom-right corner', () => {
      const wrapper = createWrapper({ allowScoring: true })
      const bookScore = wrapper.findComponent(BookScore)

      expect(bookScore.classes()).toContain('absolute')
      expect(bookScore.classes()).toContain('bottom-2')
      expect(bookScore.classes()).toContain('right-2')
      expect(bookScore.classes()).toContain('z-10')
    })
  })

  describe('Component Structure', () => {
    it('has correct aspect ratio container', () => {
      const wrapper = createWrapper()
      const container = wrapper.find('.aspect-\\[2\\/3\\]')

      expect(container.exists()).toBe(true)
    })

    it('applies gradient background', () => {
      const wrapper = createWrapper()
      const container = wrapper.find('.bg-gradient-to-br')

      expect(container.exists()).toBe(true)
      expect(container.classes()).toContain('from-gray-100')
      expect(container.classes()).toContain('to-gray-200')
    })

    it('has overflow hidden', () => {
      const wrapper = createWrapper()
      const container = wrapper.find('.overflow-hidden')

      expect(container.exists()).toBe(true)
    })

    it('image covers full container', () => {
      const wrapper = createWrapper()
      const img = wrapper.find('img')

      expect(img.classes()).toContain('w-full')
      expect(img.classes()).toContain('h-full')
      expect(img.classes()).toContain('object-cover')
    })
  })

  describe('Click Event Propagation', () => {
    it('stops propagation when cover is clicked in edit mode', async () => {
      const wrapper = createWrapper({ editable: true })
      const img = wrapper.find('img')

      const clickEvent = new Event('click', { bubbles: true })
      const stopPropagationSpy = vi.spyOn(clickEvent, 'stopPropagation')

      await img.element.dispatchEvent(clickEvent)

      expect(stopPropagationSpy).toHaveBeenCalled()
    })
  })

  describe('Props Validation', () => {
    it('uses default values for optional props', () => {
      const wrapper = mount(BookCover, {
        props: {},
        global: {
          stubs: {
            CustomBookCover: true,
            BookScore: true,
            BookCoverModal: true
          }
        }
      })

      expect(wrapper.find('img').exists()).toBe(false)
      expect(wrapper.find('svg').exists()).toBe(true) // Placeholder
    })

    it('handles missing bookAuthor gracefully', () => {
      const wrapper = createWrapper({
        useCustomCover: true,
        bookAuthor: null
      })
      const customCover = wrapper.findComponent(CustomBookCover)

      expect(customCover.props('author')).toBe(null)
    })
  })
})
