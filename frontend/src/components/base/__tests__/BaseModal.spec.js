import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import BaseModal from '../BaseModal.vue'

describe('BaseModal Component', () => {
  let wrapper

  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    wrapper?.unmount()
    document.body.innerHTML = ''
    vi.restoreAllMocks()
  })

  function mountModal(props = {}) {
    return mount(BaseModal, {
      attachTo: document.body,
      props: { isOpen: true, title: 'Test Modal', ...props }
    })
  }

  describe('conditional rendering', () => {
    it('is not open when isOpen is false', () => {
      wrapper = mountModal({ isOpen: false })
      expect(wrapper.get('dialog').element.open).toBe(false)
    })

    it('is open when isOpen is true', () => {
      wrapper = mountModal({ isOpen: true })
      expect(wrapper.get('dialog').element.open).toBe(true)
    })

    it('toggles open state when isOpen prop changes', async () => {
      wrapper = mountModal({ isOpen: false })
      expect(wrapper.get('dialog').element.open).toBe(false)

      await wrapper.setProps({ isOpen: true })
      expect(wrapper.get('dialog').element.open).toBe(true)

      await wrapper.setProps({ isOpen: false })
      expect(wrapper.get('dialog').element.open).toBe(false)
    })
  })

  describe('title rendering', () => {
    it('should display title from prop', () => {
      wrapper = mountModal({ title: 'My Custom Title' })
      expect(wrapper.text()).toContain('My Custom Title')
    })

    it('should display title from slot when provided', () => {
      wrapper = mount(BaseModal, {
        attachTo: document.body,
        props: { isOpen: true, title: 'Prop Title' },
        slots: { title: 'Slot Title' }
      })
      expect(wrapper.text()).toContain('Slot Title')
      expect(wrapper.text()).not.toContain('Prop Title')
    })

    it('should apply titleClass to title element', () => {
      wrapper = mountModal({ titleClass: 'custom-title-class' })
      expect(wrapper.get('h2').classes()).toContain('custom-title-class')
    })
  })

  describe('slots', () => {
    it('should render default slot content', () => {
      wrapper = mount(BaseModal, {
        attachTo: document.body,
        props: { isOpen: true, title: 'Test' },
        slots: { default: '<p>This is modal content</p>' }
      })
      expect(wrapper.text()).toContain('This is modal content')
    })

    it('should render footer slot when provided', () => {
      wrapper = mount(BaseModal, {
        attachTo: document.body,
        props: { isOpen: true, title: 'Test' },
        slots: { default: '<p>Content</p>', footer: '<div>Footer Content</div>' }
      })
      expect(wrapper.text()).toContain('Footer Content')
    })

    it('should not render footer border when footer slot is not provided', () => {
      wrapper = mountModal()
      const footerBorder = wrapper.findAll('div').find(div => div.classes().includes('border-t'))
      expect(footerBorder).toBeFalsy()
    })
  })

  describe('close button', () => {
    it('should render close button by default', () => {
      wrapper = mountModal()
      expect(wrapper.find('button[aria-label="Close"]').exists()).toBe(true)
    })

    it('should not render close button when showCloseButton is false', () => {
      wrapper = mountModal({ showCloseButton: false })
      expect(wrapper.find('button[aria-label="Close"]').exists()).toBe(false)
    })

    it('should emit close and update:isOpen when close button is clicked', async () => {
      wrapper = mountModal()
      await wrapper.get('button[aria-label="Close"]').trigger('click')

      expect(wrapper.emitted('close')).toBeTruthy()
      expect(wrapper.emitted('update:isOpen')).toBeTruthy()
      expect(wrapper.emitted('update:isOpen')[0][0]).toBe(false)
    })

    it('closes the underlying dialog when the close button is clicked', async () => {
      wrapper = mountModal()
      await wrapper.get('button[aria-label="Close"]').trigger('click')
      expect(wrapper.get('dialog').element.open).toBe(false)
    })
  })

  describe('overlay click behavior', () => {
    it('should close modal when the dialog backdrop is clicked by default', async () => {
      wrapper = mountModal()
      await wrapper.get('dialog').trigger('click')
      expect(wrapper.emitted('close')).toBeTruthy()
    })

    it('should not close modal when modal content is clicked', async () => {
      wrapper = mount(BaseModal, {
        attachTo: document.body,
        props: { isOpen: true, title: 'Test' },
        slots: { default: '<p>Content</p>' }
      })
      await wrapper.get('p').trigger('click')
      expect(wrapper.emitted('close')).toBeFalsy()
    })

    it('should not close modal when overlay is clicked if closeOnOverlayClick is false', async () => {
      wrapper = mountModal({ closeOnOverlayClick: false })
      await wrapper.get('dialog').trigger('click')
      expect(wrapper.emitted('close')).toBeFalsy()
    })
  })

  describe('escape key handling', () => {
    it('should close modal when Escape key is pressed', async () => {
      wrapper = mountModal()
      wrapper.get('dialog').element.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
      wrapper.get('dialog').element.close()
      await nextTick()
      expect(wrapper.emitted('close')).toBeTruthy()
    })
  })

  describe('customization props', () => {
    it('should apply contentClass to the dialog element', () => {
      wrapper = mountModal({ contentClass: 'custom-content-class max-w-4xl' })
      const dialog = wrapper.get('dialog')
      expect(dialog.classes()).toContain('custom-content-class')
      expect(dialog.classes()).toContain('max-w-4xl')
    })

    it('should apply maxHeightClass to the dialog element', () => {
      wrapper = mountModal({ maxHeightClass: 'max-h-[90vh]' })
      expect(wrapper.get('dialog').classes()).toContain('max-h-[90vh]')
    })

    it('should apply headerClass to header', () => {
      wrapper = mountModal({ headerClass: 'custom-header' })
      const header = wrapper.findAll('div').find(div => div.classes().includes('custom-header'))
      expect(header).toBeTruthy()
    })

    it('should apply bodyClass to body', () => {
      wrapper = mountModal({ bodyClass: 'custom-body' })
      const body = wrapper.findAll('div').find(div => div.classes().includes('custom-body'))
      expect(body).toBeTruthy()
    })

    it('should apply footerClass to footer when footer slot is provided', () => {
      wrapper = mount(BaseModal, {
        attachTo: document.body,
        props: { isOpen: true, title: 'Test', footerClass: 'custom-footer' },
        slots: { footer: '<div>Footer</div>' }
      })
      const footer = wrapper.findAll('div').find(div => div.classes().includes('custom-footer'))
      expect(footer).toBeTruthy()
    })
  })

  describe('accessibility', () => {
    it('should have aria-label on close button', () => {
      wrapper = mountModal()
      expect(wrapper.get('button[aria-label="Close"]').attributes('aria-label')).toBe('Close')
    })

    it('should have a heading with the title', () => {
      wrapper = mountModal({ title: 'Test Modal' })
      const title = wrapper.get('h2')
      expect(title.text()).toContain('Test Modal')
    })
  })

  describe('layout and styling', () => {
    it('should apply default max-width to the dialog', () => {
      wrapper = mountModal()
      expect(wrapper.get('dialog').classes()).toContain('max-w-2xl')
    })

    it('should apply default max-height to the dialog', () => {
      wrapper = mountModal()
      expect(wrapper.get('dialog').classes()).toContain('max-h-[80vh]')
    })

    it('should have scrollable body area', () => {
      wrapper = mount(BaseModal, {
        attachTo: document.body,
        props: { isOpen: true, title: 'Test' },
        slots: { default: '<p>Content</p>' }
      })
      const bodyElement = wrapper.findAll('div').find(
        div => div.classes().includes('flex-1') && div.classes().includes('overflow-y-auto')
      )
      expect(bodyElement).toBeTruthy()
    })
  })
})
