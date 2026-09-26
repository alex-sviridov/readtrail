import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import EditableText from '../EditableText.vue'

describe('EditableText', () => {
  describe('empty value', () => {
    it('shows a placeholder and stays clickable when editable and empty', () => {
      const wrapper = mount(EditableText, {
        props: { value: null, variant: 'author', editable: true }
      })

      expect(wrapper.get('p').attributes('data-placeholder')).toBeTruthy()
      // A real min-height so the field never collapses to an invisible sliver
      expect(wrapper.find('.min-h-0').exists()).toBe(false)
    })

    it('does not show a placeholder hint when not editable', () => {
      const wrapper = mount(EditableText, {
        props: { value: null, variant: 'author', editable: false }
      })

      expect(wrapper.get('p').classes()).not.toContain('et-placeholder')
    })

    it('renders the actual value as real text content when present', () => {
      // The placeholder is shown via a CSS :empty selector (so it disappears
      // the instant a real character is typed, not on the next prop update),
      // which jsdom can't render — but we can confirm the element actually
      // holds real text content when a value is present, which is what makes
      // :empty stop matching in a real browser.
      const wrapper = mount(EditableText, {
        props: { value: 'Frank Herbert', variant: 'author', editable: true }
      })

      expect(wrapper.get('p').element.textContent).toBe('Frank Herbert')
    })
  })

  describe('clicking to add a value that was previously empty', () => {
    it('enters edit mode when clicking an empty editable field', async () => {
      const wrapper = mount(EditableText, {
        props: { value: null, variant: 'author', editable: true }
      })

      await wrapper.get('p').trigger('click')

      expect(wrapper.get('p').attributes('contenteditable')).toBe('true')
    })

    it('emits update with the typed value on blur', async () => {
      const wrapper = mount(EditableText, {
        props: { value: null, variant: 'author', editable: true }
      })

      await wrapper.get('p').trigger('click')
      wrapper.get('p').element.textContent = 'Frank Herbert'
      await wrapper.get('p').trigger('blur')

      expect(wrapper.emitted('update')).toEqual([['Frank Herbert']])
    })
  })

  describe('clearing a value to empty', () => {
    it('emits update with an empty string on blur', async () => {
      const wrapper = mount(EditableText, {
        props: { value: 'Frank Herbert', variant: 'author', editable: true }
      })

      await wrapper.get('p').trigger('click')
      wrapper.get('p').element.textContent = ''
      await wrapper.get('p').trigger('blur')

      expect(wrapper.emitted('update')).toEqual([['']])
    })
  })

  describe('Escape to cancel', () => {
    it('exits edit mode without emitting an update', async () => {
      const wrapper = mount(EditableText, {
        props: { value: null, variant: 'author', editable: true }
      })

      await wrapper.get('p').trigger('click')
      wrapper.get('p').element.textContent = 'Half-typed'
      await wrapper.get('p').trigger('keydown.escape')

      expect(wrapper.get('p').attributes('contenteditable')).toBe('false')
      expect(wrapper.emitted('update')).toBeUndefined()
    })
  })
})
