import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { defineComponent, ref } from 'vue'
import { mount } from '@vue/test-utils'
import { useClickOutside, useEscapeKey } from '../useClickOutside'

describe('useClickOutside', () => {
  let element
  let callback
  let wrapper

  beforeEach(() => {
    callback = vi.fn()
    element = document.createElement('div')
    document.body.appendChild(element)
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
    }
    document.body.innerHTML = ''
    vi.clearAllTimers()
    vi.useRealTimers()
  })

  describe('click outside detection', () => {
    it('should call callback when clicking outside element', async () => {
      const TestComponent = defineComponent({
        setup() {
          const elementRef = ref(null)
          useClickOutside(elementRef, callback)
          return { elementRef }
        },
        template: '<div ref="elementRef">Inside</div>'
      })

      wrapper = mount(TestComponent)

      // Wait for setTimeout delay
      await new Promise(resolve => setTimeout(resolve, 10))

      // Click outside
      document.body.click()

      expect(callback).toHaveBeenCalledTimes(1)
    })

    it('should not call callback when clicking inside element', async () => {
      const TestComponent = defineComponent({
        setup() {
          const elementRef = ref(null)
          useClickOutside(elementRef, callback)
          return { elementRef }
        },
        template: '<div ref="elementRef">Inside</div>'
      })

      wrapper = mount(TestComponent)

      // Wait for setTimeout delay
      await new Promise(resolve => setTimeout(resolve, 10))

      // Click inside
      wrapper.element.click()

      expect(callback).not.toHaveBeenCalled()
    })

    it('should not call callback when clicking on child element', async () => {
      const TestComponent = defineComponent({
        setup() {
          const elementRef = ref(null)
          useClickOutside(elementRef, callback)
          return { elementRef }
        },
        template: '<div ref="elementRef"><button>Child</button></div>'
      })

      wrapper = mount(TestComponent)

      // Wait for setTimeout delay
      await new Promise(resolve => setTimeout(resolve, 10))

      // Click on child button
      wrapper.find('button').element.click()

      expect(callback).not.toHaveBeenCalled()
    })

    it('should pass event object to callback', async () => {
      const TestComponent = defineComponent({
        setup() {
          const elementRef = ref(null)
          useClickOutside(elementRef, callback)
          return { elementRef }
        },
        template: '<div ref="elementRef">Inside</div>'
      })

      wrapper = mount(TestComponent)

      // Wait for setTimeout delay
      await new Promise(resolve => setTimeout(resolve, 10))

      // Click outside
      const clickEvent = new MouseEvent('click', { bubbles: true })
      document.body.dispatchEvent(clickEvent)

      expect(callback).toHaveBeenCalledTimes(1)
      expect(callback).toHaveBeenCalledWith(expect.any(MouseEvent))
    })

    it('should handle element being null', async () => {
      const TestComponent = defineComponent({
        setup() {
          const elementRef = ref(null)
          useClickOutside(elementRef, callback)
          return { elementRef }
        },
        template: '<div>No ref</div>'
      })

      wrapper = mount(TestComponent)

      // Wait for setTimeout delay
      await new Promise(resolve => setTimeout(resolve, 10))

      // Click anywhere
      document.body.click()

      // Should not crash and should not call callback
      expect(callback).not.toHaveBeenCalled()
    })
  })

  describe('event delegation and cleanup', () => {
    it('should use setTimeout delay to prevent immediate triggering', () => {
      vi.useFakeTimers()

      const TestComponent = defineComponent({
        setup() {
          const elementRef = ref(null)
          useClickOutside(elementRef, callback)
          return { elementRef }
        },
        template: '<div ref="elementRef">Inside</div>'
      })

      wrapper = mount(TestComponent)

      // Click immediately (before setTimeout completes)
      document.body.click()
      expect(callback).not.toHaveBeenCalled()

      // Advance timers
      vi.runAllTimers()

      // Now click should work
      document.body.click()
      expect(callback).toHaveBeenCalledTimes(1)
    })

    it('should remove event listener on unmount', async () => {
      const TestComponent = defineComponent({
        setup() {
          const elementRef = ref(null)
          useClickOutside(elementRef, callback)
          return { elementRef }
        },
        template: '<div ref="elementRef">Inside</div>'
      })

      wrapper = mount(TestComponent)

      // Wait for setTimeout delay
      await new Promise(resolve => setTimeout(resolve, 10))

      // Unmount component
      wrapper.unmount()

      // Click outside
      document.body.click()

      // Callback should not be called after unmount
      expect(callback).not.toHaveBeenCalled()
    })

    it('should return cleanup function that removes listener', async () => {
      let cleanup

      const TestComponent = defineComponent({
        setup() {
          const elementRef = ref(null)
          cleanup = useClickOutside(elementRef, callback)
          return { elementRef }
        },
        template: '<div ref="elementRef">Inside</div>'
      })

      wrapper = mount(TestComponent)

      // Wait for setTimeout delay
      await new Promise(resolve => setTimeout(resolve, 10))

      // Call cleanup manually
      cleanup()

      // Click outside
      document.body.click()

      // Callback should not be called after cleanup
      expect(callback).not.toHaveBeenCalled()
    })
  })

  describe('multiple instances', () => {
    it('should handle multiple useClickOutside instances independently', async () => {
      const callback1 = vi.fn()
      const callback2 = vi.fn()

      const TestComponent = defineComponent({
        setup() {
          const elementRef1 = ref(null)
          const elementRef2 = ref(null)
          useClickOutside(elementRef1, callback1)
          useClickOutside(elementRef2, callback2)
          return { elementRef1, elementRef2 }
        },
        template: `
          <div>
            <div ref="elementRef1" id="el1">Element 1</div>
            <div ref="elementRef2" id="el2">Element 2</div>
          </div>
        `
      })

      wrapper = mount(TestComponent, { attachTo: document.body })

      // Wait for setTimeout delay
      await new Promise(resolve => setTimeout(resolve, 10))

      // Click on element 1 (outside element 2)
      // This uses the native click() method which automatically bubbles
      wrapper.find('#el1').element.click()

      expect(callback1).not.toHaveBeenCalled()
      expect(callback2).toHaveBeenCalledTimes(1)

      wrapper.unmount()
    })
  })
})

describe('useEscapeKey', () => {
  let callback
  let wrapper

  beforeEach(() => {
    callback = vi.fn()
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
    }
    document.body.innerHTML = ''
  })

  describe('escape key detection', () => {
    it('should call callback when Escape key is pressed', () => {
      const TestComponent = defineComponent({
        setup() {
          useEscapeKey(callback)
          return {}
        },
        template: '<div>Test</div>'
      })

      wrapper = mount(TestComponent)

      // Press Escape key
      const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
      document.dispatchEvent(escapeEvent)

      expect(callback).toHaveBeenCalledTimes(1)
    })

    it('should not call callback for other keys', () => {
      const TestComponent = defineComponent({
        setup() {
          useEscapeKey(callback)
          return {}
        },
        template: '<div>Test</div>'
      })

      wrapper = mount(TestComponent)

      // Press other keys
      const enterEvent = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })
      document.dispatchEvent(enterEvent)

      const spaceEvent = new KeyboardEvent('keydown', { key: ' ', bubbles: true })
      document.dispatchEvent(spaceEvent)

      expect(callback).not.toHaveBeenCalled()
    })

    it('should pass event object to callback', () => {
      const TestComponent = defineComponent({
        setup() {
          useEscapeKey(callback)
          return {}
        },
        template: '<div>Test</div>'
      })

      wrapper = mount(TestComponent)

      // Press Escape key
      const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
      document.dispatchEvent(escapeEvent)

      expect(callback).toHaveBeenCalledWith(expect.any(KeyboardEvent))
      expect(callback.mock.calls[0][0].key).toBe('Escape')
    })

    it('should remove event listener on unmount', () => {
      const TestComponent = defineComponent({
        setup() {
          useEscapeKey(callback)
          return {}
        },
        template: '<div>Test</div>'
      })

      wrapper = mount(TestComponent)

      // Unmount component
      wrapper.unmount()

      // Press Escape key
      const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
      document.dispatchEvent(escapeEvent)

      // Callback should not be called after unmount
      expect(callback).not.toHaveBeenCalled()
    })

    it('should return cleanup function that removes listener', () => {
      let cleanup

      const TestComponent = defineComponent({
        setup() {
          cleanup = useEscapeKey(callback)
          return {}
        },
        template: '<div>Test</div>'
      })

      wrapper = mount(TestComponent)

      // Call cleanup manually
      cleanup()

      // Press Escape key
      const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
      document.dispatchEvent(escapeEvent)

      // Callback should not be called after cleanup
      expect(callback).not.toHaveBeenCalled()
    })
  })

  describe('multiple instances', () => {
    it('should handle multiple useEscapeKey instances', () => {
      const callback1 = vi.fn()
      const callback2 = vi.fn()

      const TestComponent = defineComponent({
        setup() {
          useEscapeKey(callback1)
          useEscapeKey(callback2)
          return {}
        },
        template: '<div>Test</div>'
      })

      wrapper = mount(TestComponent)

      // Press Escape key
      const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
      document.dispatchEvent(escapeEvent)

      // Both callbacks should be called
      expect(callback1).toHaveBeenCalledTimes(1)
      expect(callback2).toHaveBeenCalledTimes(1)
    })
  })
})
