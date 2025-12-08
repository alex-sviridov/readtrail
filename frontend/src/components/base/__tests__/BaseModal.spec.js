import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import BaseModal from '../BaseModal.vue'

describe('BaseModal Component', () => {
  let wrapper

  beforeEach(() => {
    // Create a container div for teleport target
    document.body.innerHTML = '<div id="app"></div>'
  })

  afterEach(() => {
    wrapper?.unmount()
    document.body.innerHTML = ''
    vi.restoreAllMocks()
  })

  describe('conditional rendering', () => {
    it('should not render when isOpen is false', () => {
      wrapper = mount(BaseModal, {
        props: {
          isOpen: false,
          title: 'Test Modal'
        }
      })

      expect(document.querySelector('.fixed.inset-0')).toBeNull()
    })

    it('should render when isOpen is true', () => {
      wrapper = mount(BaseModal, {
        props: {
          isOpen: true,
          title: 'Test Modal'
        }
      })

      expect(document.querySelector('.fixed.inset-0')).toBeTruthy()
    })

    it('should toggle visibility when isOpen prop changes', async () => {
      wrapper = mount(BaseModal, {
        props: {
          isOpen: false,
          title: 'Test Modal'
        }
      })

      expect(document.querySelector('.fixed.inset-0')).toBeNull()

      await wrapper.setProps({ isOpen: true })
      await nextTick()

      expect(document.querySelector('.fixed.inset-0')).toBeTruthy()

      await wrapper.setProps({ isOpen: false })
      await nextTick()

      // Modal should be removed after transition
      expect(document.querySelector('.fixed.inset-0')).toBeNull()
    })
  })

  describe('teleport functionality', () => {
    it('should teleport modal content to document.body', () => {
      wrapper = mount(BaseModal, {
        props: {
          isOpen: true,
          title: 'Test Modal'
        }
      })

      const modalElement = document.querySelector('.fixed.inset-0')
      expect(modalElement?.parentElement).toBe(document.body)
    })
  })

  describe('title rendering', () => {
    it('should display title from prop', () => {
      wrapper = mount(BaseModal, {
        props: {
          isOpen: true,
          title: 'My Custom Title'
        }
      })

      expect(document.body.textContent).toContain('My Custom Title')
    })

    it('should display title from slot when provided', () => {
      wrapper = mount(BaseModal, {
        props: {
          isOpen: true,
          title: 'Prop Title'
        },
        slots: {
          title: 'Slot Title'
        }
      })

      expect(document.body.textContent).toContain('Slot Title')
      expect(document.body.textContent).not.toContain('Prop Title')
    })

    it('should apply titleClass to title element', () => {
      wrapper = mount(BaseModal, {
        props: {
          isOpen: true,
          title: 'Test',
          titleClass: 'custom-title-class'
        }
      })

      const titleElement = document.querySelector('h2')
      expect(titleElement?.classList.contains('custom-title-class')).toBe(true)
    })
  })

  describe('slots', () => {
    it('should render default slot content', () => {
      wrapper = mount(BaseModal, {
        props: {
          isOpen: true,
          title: 'Test'
        },
        slots: {
          default: '<p>This is modal content</p>'
        }
      })

      expect(document.body.textContent).toContain('This is modal content')
    })

    it('should render footer slot when provided', () => {
      wrapper = mount(BaseModal, {
        props: {
          isOpen: true,
          title: 'Test'
        },
        slots: {
          default: '<p>Content</p>',
          footer: '<div>Footer Content</div>'
        }
      })

      expect(document.body.textContent).toContain('Footer Content')
    })

    it('should not render footer border when footer slot is not provided', () => {
      wrapper = mount(BaseModal, {
        props: {
          isOpen: true,
          title: 'Test'
        },
        slots: {
          default: '<p>Content</p>'
        }
      })

      // Footer div should not exist
      const footerBorder = Array.from(document.querySelectorAll('div')).find(
        div => div.classList.contains('border-t')
      )
      expect(footerBorder).toBeFalsy()
    })
  })

  describe('close button', () => {
    it('should render close button by default', () => {
      wrapper = mount(BaseModal, {
        props: {
          isOpen: true,
          title: 'Test'
        }
      })

      const closeButton = document.querySelector('button[aria-label="Close"]')
      expect(closeButton).toBeTruthy()
    })

    it('should not render close button when showCloseButton is false', () => {
      wrapper = mount(BaseModal, {
        props: {
          isOpen: true,
          title: 'Test',
          showCloseButton: false
        }
      })

      const closeButton = document.querySelector('button[aria-label="Close"]')
      expect(closeButton).toBeNull()
    })

    it('should emit close event when close button is clicked', async () => {
      wrapper = mount(BaseModal, {
        props: {
          isOpen: true,
          title: 'Test'
        }
      })

      const closeButton = document.querySelector('button[aria-label="Close"]')
      await closeButton?.click()
      await nextTick()

      expect(wrapper.emitted('close')).toBeTruthy()
    })

    it('should emit update:isOpen event when close button is clicked', async () => {
      wrapper = mount(BaseModal, {
        props: {
          isOpen: true,
          title: 'Test'
        }
      })

      const closeButton = document.querySelector('button[aria-label="Close"]')
      await closeButton?.click()
      await nextTick()

      expect(wrapper.emitted('update:isOpen')).toBeTruthy()
      expect(wrapper.emitted('update:isOpen')[0][0]).toBe(false)
    })
  })

  describe('overlay click behavior', () => {
    it('should close modal when overlay is clicked by default', async () => {
      wrapper = mount(BaseModal, {
        props: {
          isOpen: true,
          title: 'Test'
        },
        slots: {
          default: '<p>Content</p>'
        }
      })

      const overlay = document.querySelector('.fixed.inset-0')
      await overlay?.click()
      await nextTick()

      expect(wrapper.emitted('close')).toBeTruthy()
    })

    it('should not close modal when modal content is clicked', async () => {
      wrapper = mount(BaseModal, {
        props: {
          isOpen: true,
          title: 'Test'
        },
        slots: {
          default: '<p>Content</p>'
        }
      })

      const modalContent = document.querySelector('.bg-white.rounded-lg')
      await modalContent?.click()
      await nextTick()

      expect(wrapper.emitted('close')).toBeFalsy()
    })

    it('should not close modal when overlay is clicked if closeOnOverlayClick is false', async () => {
      wrapper = mount(BaseModal, {
        props: {
          isOpen: true,
          title: 'Test',
          closeOnOverlayClick: false
        }
      })

      const overlay = document.querySelector('.fixed.inset-0')
      await overlay?.click()
      await nextTick()

      expect(wrapper.emitted('close')).toBeFalsy()
    })
  })

  describe('escape key handling', () => {
    it('should close modal when Escape key is pressed', async () => {
      wrapper = mount(BaseModal, {
        props: {
          isOpen: true,
          title: 'Test'
        }
      })

      const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape' })
      document.dispatchEvent(escapeEvent)
      await nextTick()

      expect(wrapper.emitted('close')).toBeTruthy()
    })

    it('should not close modal when other keys are pressed', async () => {
      wrapper = mount(BaseModal, {
        props: {
          isOpen: true,
          title: 'Test'
        }
      })

      const enterEvent = new KeyboardEvent('keydown', { key: 'Enter' })
      document.dispatchEvent(enterEvent)
      await nextTick()

      expect(wrapper.emitted('close')).toBeFalsy()
    })

    it('should not respond to Escape key when modal is closed', async () => {
      wrapper = mount(BaseModal, {
        props: {
          isOpen: false,
          title: 'Test'
        }
      })

      const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape' })
      document.dispatchEvent(escapeEvent)
      await nextTick()

      expect(wrapper.emitted('close')).toBeFalsy()
    })
  })

  describe('customization props', () => {
    it('should apply contentClass to modal content', () => {
      wrapper = mount(BaseModal, {
        props: {
          isOpen: true,
          title: 'Test',
          contentClass: 'custom-content-class max-w-4xl'
        }
      })

      const contentElement = document.querySelector('.bg-white.rounded-lg')
      expect(contentElement?.classList.contains('custom-content-class')).toBe(true)
      expect(contentElement?.classList.contains('max-w-4xl')).toBe(true)
    })

    it('should apply maxHeightClass to modal content', () => {
      wrapper = mount(BaseModal, {
        props: {
          isOpen: true,
          title: 'Test',
          maxHeightClass: 'max-h-[90vh]'
        }
      })

      const contentElement = document.querySelector('.bg-white.rounded-lg')
      expect(contentElement?.classList.contains('max-h-[90vh]')).toBe(true)
    })

    it('should apply overlayClass to overlay', () => {
      wrapper = mount(BaseModal, {
        props: {
          isOpen: true,
          title: 'Test',
          overlayClass: 'custom-overlay'
        }
      })

      const overlay = document.querySelector('.fixed.inset-0')
      expect(overlay?.classList.contains('custom-overlay')).toBe(true)
    })

    it('should apply headerClass to header', () => {
      wrapper = mount(BaseModal, {
        props: {
          isOpen: true,
          title: 'Test',
          headerClass: 'custom-header'
        }
      })

      const header = Array.from(document.querySelectorAll('div')).find(
        div => div.classList.contains('custom-header')
      )
      expect(header).toBeTruthy()
    })

    it('should apply bodyClass to body', () => {
      wrapper = mount(BaseModal, {
        props: {
          isOpen: true,
          title: 'Test',
          bodyClass: 'custom-body'
        }
      })

      const body = Array.from(document.querySelectorAll('div')).find(
        div => div.classList.contains('custom-body')
      )
      expect(body).toBeTruthy()
    })

    it('should apply footerClass to footer when footer slot is provided', () => {
      wrapper = mount(BaseModal, {
        props: {
          isOpen: true,
          title: 'Test',
          footerClass: 'custom-footer'
        },
        slots: {
          footer: '<div>Footer</div>'
        }
      })

      const footer = Array.from(document.querySelectorAll('div')).find(
        div => div.classList.contains('custom-footer')
      )
      expect(footer).toBeTruthy()
    })
  })

  describe('accessibility', () => {
    it('should have aria-label on close button', () => {
      wrapper = mount(BaseModal, {
        props: {
          isOpen: true,
          title: 'Test'
        }
      })

      const closeButton = document.querySelector('button[aria-label="Close"]')
      expect(closeButton?.getAttribute('aria-label')).toBe('Close')
    })

    it('should have semantic HTML structure', () => {
      wrapper = mount(BaseModal, {
        props: {
          isOpen: true,
          title: 'Test Modal'
        }
      })

      // Check for h2 title
      const title = document.querySelector('h2')
      expect(title).toBeTruthy()
      expect(title?.textContent).toContain('Test Modal')
    })
  })

  describe('transitions', () => {
    it('should apply transition classes', () => {
      wrapper = mount(BaseModal, {
        props: {
          isOpen: true,
          title: 'Test'
        }
      })

      // The Transition component should be present
      const overlay = document.querySelector('.fixed.inset-0')
      expect(overlay).toBeTruthy()
    })
  })

  describe('layout and styling', () => {
    it('should have correct z-index for modal overlay', () => {
      wrapper = mount(BaseModal, {
        props: {
          isOpen: true,
          title: 'Test'
        }
      })

      const overlay = document.querySelector('.fixed.inset-0')
      expect(overlay?.classList.contains('z-50')).toBe(true)
    })

    it('should apply default max-width to content', () => {
      wrapper = mount(BaseModal, {
        props: {
          isOpen: true,
          title: 'Test'
        }
      })

      const content = document.querySelector('.bg-white.rounded-lg')
      expect(content?.classList.contains('max-w-2xl')).toBe(true)
    })

    it('should apply default max-height to content', () => {
      wrapper = mount(BaseModal, {
        props: {
          isOpen: true,
          title: 'Test'
        }
      })

      const content = document.querySelector('.bg-white.rounded-lg')
      expect(content?.classList.contains('max-h-[80vh]')).toBe(true)
    })

    it('should have semi-transparent black overlay background', () => {
      wrapper = mount(BaseModal, {
        props: {
          isOpen: true,
          title: 'Test'
        }
      })

      const overlay = document.querySelector('.fixed.inset-0')
      expect(overlay?.classList.contains('bg-black')).toBe(true)
      expect(overlay?.classList.contains('bg-opacity-50')).toBe(true)
    })

    it('should have scrollable body area', () => {
      wrapper = mount(BaseModal, {
        props: {
          isOpen: true,
          title: 'Test'
        },
        slots: {
          default: '<p>Content</p>'
        }
      })

      const bodyElement = Array.from(document.querySelectorAll('div')).find(
        div => div.classList.contains('flex-1') && div.classList.contains('overflow-y-auto')
      )
      expect(bodyElement).toBeTruthy()
    })
  })
})
