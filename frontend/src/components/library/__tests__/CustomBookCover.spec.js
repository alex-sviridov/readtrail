import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import CustomBookCover from '../CustomBookCover.vue'
import { calculateOptimalFontSize } from '@/utils/fontSizing'
import { TYPOGRAPHY, LAYOUT } from '@/constants'

vi.mock('@/utils/fontSizing', () => ({
  calculateOptimalFontSize: vi.fn()
}))

describe('CustomBookCover', () => {
  beforeEach(() => {
    calculateOptimalFontSize.mockReset()
    calculateOptimalFontSize.mockImplementation((_el, _maxHeight, maxFontSize) => maxFontSize)
  })

  describe('default size (grid card)', () => {
    it('applies the card-sized padding and margins', () => {
      const wrapper = mount(CustomBookCover, { props: { title: 'Dune', author: 'Frank Herbert' } })

      expect(wrapper.classes()).toContain('p-4')
    })

    it('sizes itself by aspect ratio, matching its parent card slot', () => {
      const wrapper = mount(CustomBookCover, { props: { title: 'Dune', author: 'Frank Herbert' } })

      expect(wrapper.classes()).toContain('aspect-[2/3]')
      expect(wrapper.classes()).not.toContain('h-full')
    })

    it('fits the title using the card-sized max height and font range', async () => {
      mount(CustomBookCover, { props: { title: 'Dune', author: 'Frank Herbert' } })
      await nextTick()
      await nextTick()

      expect(calculateOptimalFontSize).toHaveBeenCalledWith(
        expect.anything(),
        LAYOUT.TITLE_MAX_HEIGHT,
        TYPOGRAPHY.TITLE_MAX_FONT_SIZE,
        TYPOGRAPHY.MIN_FONT_SIZE
      )
    })

    it('fits the author using the card-sized max height and font range', async () => {
      mount(CustomBookCover, { props: { title: 'Dune', author: 'Frank Herbert' } })
      await nextTick()
      await nextTick()

      expect(calculateOptimalFontSize).toHaveBeenCalledWith(
        expect.anything(),
        LAYOUT.AUTHOR_MAX_HEIGHT,
        TYPOGRAPHY.AUTHOR_MAX_FONT_SIZE,
        TYPOGRAPHY.MIN_FONT_SIZE
      )
    })
  })

  describe('compact size (table thumbnail)', () => {
    it('applies tighter padding and margins so text has more room in the small box', () => {
      const wrapper = mount(CustomBookCover, {
        props: { title: 'Dune', author: 'Frank Herbert', size: 'compact' }
      })

      expect(wrapper.classes()).not.toContain('p-4')
      expect(wrapper.classes()).toContain('p-1')
    })

    it('fills its fixed-size wrapper instead of computing height from aspect ratio', () => {
      // The table thumbnail wrapper (w-10 h-14) sets an explicit width AND
      // height; aspect-[2/3] on a w-full/no-height root would compute its own
      // height from the width (40px -> 60px) and get clipped by the wrapper's
      // overflow-hidden, cropping several px off the bottom-pinned author line.
      const wrapper = mount(CustomBookCover, {
        props: { title: 'Dune', author: 'Frank Herbert', size: 'compact' }
      })

      expect(wrapper.classes()).toContain('h-full')
      expect(wrapper.classes()).not.toContain('aspect-[2/3]')
    })

    it('fits the title using a smaller max height and font range so it can actually converge', async () => {
      mount(CustomBookCover, { props: { title: 'The Ballad of Songbirds and Snakes', size: 'compact' } })
      await nextTick()
      await nextTick()

      expect(calculateOptimalFontSize).toHaveBeenCalledWith(
        expect.anything(),
        LAYOUT.COMPACT_TITLE_MAX_HEIGHT,
        TYPOGRAPHY.COMPACT_TITLE_MAX_FONT_SIZE,
        TYPOGRAPHY.COMPACT_MIN_FONT_SIZE
      )
    })

    it('fits the author using a smaller max height and font range', async () => {
      mount(CustomBookCover, {
        props: { title: 'Dune', author: 'Frank Herbert', size: 'compact' }
      })
      await nextTick()
      await nextTick()

      expect(calculateOptimalFontSize).toHaveBeenCalledWith(
        expect.anything(),
        LAYOUT.COMPACT_AUTHOR_MAX_HEIGHT,
        TYPOGRAPHY.COMPACT_AUTHOR_MAX_FONT_SIZE,
        TYPOGRAPHY.COMPACT_MIN_FONT_SIZE
      )
    })
  })
})
