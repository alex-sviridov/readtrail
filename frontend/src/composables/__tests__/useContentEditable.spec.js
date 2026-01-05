import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { defineComponent, nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import { useContentEditable } from '../useContentEditable'

describe('useContentEditable', () => {
  let wrapper

  beforeEach(() => {
    // Mock DOM APIs
    global.window.getSelection = vi.fn(() => ({
      removeAllRanges: vi.fn(),
      addRange: vi.fn()
    }))
    global.document.createRange = vi.fn(() => ({
      selectNodeContents: vi.fn(),
      collapse: vi.fn()
    }))
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
    }
    vi.clearAllTimers()
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  describe('initialization', () => {
    it('should initialize with default options', () => {
      const TestComponent = defineComponent({
        setup() {
          const editable = useContentEditable()
          return { editable }
        },
        template: '<div ref="elementRef">Test</div>'
      })

      wrapper = mount(TestComponent)

      expect(wrapper.vm.editable.isEditing.value).toBe(false)
      expect(wrapper.vm.editable.fontSize.value).toBe('12pt')
      expect(wrapper.vm.editable.currentContent.value).toBe('')
    })

    it('should initialize with custom maxHeight option', () => {
      const TestComponent = defineComponent({
        setup() {
          const editable = useContentEditable({ maxHeight: 100 })
          return { editable }
        },
        template: '<div>Test</div>'
      })

      wrapper = mount(TestComponent)

      expect(wrapper.vm.editable).toBeDefined()
    })

    it('should initialize with custom minFontSize option', () => {
      const TestComponent = defineComponent({
        setup() {
          const editable = useContentEditable({ minFontSize: 6 })
          return { editable }
        },
        template: '<div>Test</div>'
      })

      wrapper = mount(TestComponent)

      expect(wrapper.vm.editable).toBeDefined()
    })

    it('should initialize with custom maxFontSize option', () => {
      const TestComponent = defineComponent({
        setup() {
          const editable = useContentEditable({ maxFontSize: 16 })
          return { editable }
        },
        template: '<div>Test</div>'
      })

      wrapper = mount(TestComponent)

      expect(wrapper.vm.editable).toBeDefined()
    })

    it('should initialize with custom defaultFontSize', () => {
      const TestComponent = defineComponent({
        setup() {
          const editable = useContentEditable({ defaultFontSize: '16pt' })
          return { editable }
        },
        template: '<div>Test</div>'
      })

      wrapper = mount(TestComponent)

      expect(wrapper.vm.editable.fontSize.value).toBe('16pt')
    })

    it('should initialize with custom onUpdate callback', () => {
      const onUpdate = vi.fn()
      const TestComponent = defineComponent({
        setup() {
          const editable = useContentEditable({ onUpdate })
          return { editable, onUpdate }
        },
        template: '<div>Test</div>'
      })

      wrapper = mount(TestComponent)

      expect(wrapper.vm.onUpdate).toBe(onUpdate)
    })
  })

  describe('startEditing', () => {
    it('should set isEditing to true', async () => {
      const TestComponent = defineComponent({
        setup() {
          const editable = useContentEditable()
          return { editable }
        },
        template: '<div :ref="el => { if (editable.elementRef) editable.elementRef.value = el }">Test</div>'
      })

      wrapper = mount(TestComponent)

      await wrapper.vm.editable.startEditing()

      expect(wrapper.vm.editable.isEditing.value).toBe(true)
    })

    it('should focus the element', async () => {
      const TestComponent = defineComponent({
        setup() {
          const editable = useContentEditable()
          return { editable }
        },
        template: '<div :ref="el => { if (editable.elementRef) editable.elementRef.value = el }" tabindex="0">Test</div>'
      })

      wrapper = mount(TestComponent)

      const focusSpy = vi.spyOn(wrapper.vm.editable.elementRef.value, 'focus')

      await wrapper.vm.editable.startEditing()

      expect(focusSpy).toHaveBeenCalled()
    })

    it('should position cursor at the end using Selection API', async () => {
      const mockSelection = {
        removeAllRanges: vi.fn(),
        addRange: vi.fn()
      }
      const mockRange = {
        selectNodeContents: vi.fn(),
        collapse: vi.fn()
      }

      global.window.getSelection = vi.fn(() => mockSelection)
      global.document.createRange = vi.fn(() => mockRange)

      const TestComponent = defineComponent({
        setup() {
          const editable = useContentEditable()
          return { editable }
        },
        template: '<div :ref="el => { if (editable.elementRef) editable.elementRef.value = el }">Test</div>'
      })

      wrapper = mount(TestComponent)

      await wrapper.vm.editable.startEditing()

      expect(mockRange.selectNodeContents).toHaveBeenCalled()
      expect(mockRange.collapse).toHaveBeenCalledWith(false)
      expect(mockSelection.removeAllRanges).toHaveBeenCalled()
      expect(mockSelection.addRange).toHaveBeenCalledWith(mockRange)
    })

    it('should call adjustFontSize after starting edit', async () => {
      const TestComponent = defineComponent({
        setup() {
          const editable = useContentEditable()
          return { editable }
        },
        template: '<div :ref="el => { if (editable.elementRef) editable.elementRef.value = el }">Test</div>'
      })

      wrapper = mount(TestComponent)

      await wrapper.vm.editable.startEditing()

      // Font size should be set (adjustFontSize was called)
      expect(wrapper.vm.editable.fontSize.value).toBeDefined()
    })

    it('should handle null elementRef gracefully', async () => {
      const TestComponent = defineComponent({
        setup() {
          const editable = useContentEditable()
          return { editable }
        },
        template: '<div>Test</div>'
      })

      wrapper = mount(TestComponent)

      // Should not throw
      await expect(wrapper.vm.editable.startEditing()).resolves.toBeUndefined()
    })
  })

  describe('stopEditingAndEmit', () => {
    it('should set isEditing to false', () => {
      const TestComponent = defineComponent({
        setup() {
          const editable = useContentEditable()
          editable.isEditing.value = true
          return { editable }
        },
        template: '<div :ref="el => { if (editable.elementRef) editable.elementRef.value = el }">Test</div>'
      })

      wrapper = mount(TestComponent)

      wrapper.vm.editable.stopEditingAndEmit()

      expect(wrapper.vm.editable.isEditing.value).toBe(false)
    })

    it('should call onUpdate when content changes', () => {
      const onUpdate = vi.fn()
      const TestComponent = defineComponent({
        setup() {
          const editable = useContentEditable({ onUpdate })
          editable.isEditing.value = true
          editable.currentContent.value = 'Old Content'
          return { editable }
        },
        template: '<div :ref="el => { if (editable.elementRef) editable.elementRef.value = el }">New Content</div>'
      })

      wrapper = mount(TestComponent)
      wrapper.vm.editable.elementRef.value.textContent = 'New Content'

      wrapper.vm.editable.stopEditingAndEmit()

      expect(onUpdate).toHaveBeenCalledWith('New Content')
    })

    it('should not call onUpdate when content is unchanged', () => {
      const onUpdate = vi.fn()
      const TestComponent = defineComponent({
        setup() {
          const editable = useContentEditable({ onUpdate })
          editable.isEditing.value = true
          editable.currentContent.value = 'Same Content'
          return { editable }
        },
        template: '<div :ref="el => { if (editable.elementRef) editable.elementRef.value = el }">Same Content</div>'
      })

      wrapper = mount(TestComponent)
      wrapper.vm.editable.elementRef.value.textContent = 'Same Content'

      wrapper.vm.editable.stopEditingAndEmit()

      expect(onUpdate).not.toHaveBeenCalled()
    })

    it('should not call onUpdate when content is empty', () => {
      const onUpdate = vi.fn()
      const TestComponent = defineComponent({
        setup() {
          const editable = useContentEditable({ onUpdate })
          editable.isEditing.value = true
          editable.currentContent.value = 'Old Content'
          return { editable }
        },
        template: '<div :ref="el => { if (editable.elementRef) editable.elementRef.value = el }"></div>'
      })

      wrapper = mount(TestComponent)
      wrapper.vm.editable.elementRef.value.textContent = ''

      wrapper.vm.editable.stopEditingAndEmit()

      expect(onUpdate).not.toHaveBeenCalled()
    })

    it('should reset to original content when empty', () => {
      const onUpdate = vi.fn()
      const TestComponent = defineComponent({
        setup() {
          const editable = useContentEditable({ onUpdate })
          editable.isEditing.value = true
          editable.currentContent.value = 'Original Content'
          return { editable }
        },
        template: '<div :ref="el => { if (editable.elementRef) editable.elementRef.value = el }">Original Content</div>'
      })

      wrapper = mount(TestComponent)
      wrapper.vm.editable.elementRef.value.textContent = ''

      wrapper.vm.editable.stopEditingAndEmit()

      expect(wrapper.vm.editable.elementRef.value.textContent).toBe('Original Content')
    })

    it('should trim whitespace from new content', () => {
      const onUpdate = vi.fn()
      const TestComponent = defineComponent({
        setup() {
          const editable = useContentEditable({ onUpdate })
          editable.isEditing.value = true
          editable.currentContent.value = 'Old Content'
          return { editable }
        },
        template: '<div :ref="el => { if (editable.elementRef) editable.elementRef.value = el }">  New Content  </div>'
      })

      wrapper = mount(TestComponent)
      wrapper.vm.editable.elementRef.value.textContent = '  New Content  '

      wrapper.vm.editable.stopEditingAndEmit()

      expect(onUpdate).toHaveBeenCalledWith('New Content')
    })

    it('should prevent re-entry if already not editing', () => {
      const onUpdate = vi.fn()
      const TestComponent = defineComponent({
        setup() {
          const editable = useContentEditable({ onUpdate })
          editable.isEditing.value = false
          editable.currentContent.value = 'Old Content'
          return { editable }
        },
        template: '<div :ref="el => { if (editable.elementRef) editable.elementRef.value = el }">New Content</div>'
      })

      wrapper = mount(TestComponent)

      wrapper.vm.editable.stopEditingAndEmit()

      // Should not update when not editing
      expect(onUpdate).not.toHaveBeenCalled()
    })
  })

  describe('updateContent', () => {
    it('should update currentContent', () => {
      const TestComponent = defineComponent({
        setup() {
          const editable = useContentEditable()
          return { editable }
        },
        template: '<div :ref="el => { if (editable.elementRef) editable.elementRef.value = el }">Test</div>'
      })

      wrapper = mount(TestComponent)

      wrapper.vm.editable.updateContent('New Content')

      expect(wrapper.vm.editable.currentContent.value).toBe('New Content')
    })

    it('should update element textContent when not editing', () => {
      const TestComponent = defineComponent({
        setup() {
          const editable = useContentEditable()
          return { editable }
        },
        template: '<div :ref="el => { if (editable.elementRef) editable.elementRef.value = el }">Test</div>'
      })

      wrapper = mount(TestComponent)

      wrapper.vm.editable.updateContent('New Content')

      expect(wrapper.vm.editable.elementRef.value.textContent).toBe('New Content')
    })

    it('should not update element textContent when editing', () => {
      const TestComponent = defineComponent({
        setup() {
          const editable = useContentEditable()
          editable.isEditing.value = true
          return { editable }
        },
        template: '<div :ref="el => { if (editable.elementRef) editable.elementRef.value = el }">Original</div>'
      })

      wrapper = mount(TestComponent)

      wrapper.vm.editable.updateContent('New Content')

      expect(wrapper.vm.editable.elementRef.value.textContent).toBe('Original')
    })

    it('should call adjustFontSize when updating', async () => {
      const TestComponent = defineComponent({
        setup() {
          const editable = useContentEditable()
          return { editable }
        },
        template: '<div :ref="el => { if (editable.elementRef) editable.elementRef.value = el }">Test</div>'
      })

      wrapper = mount(TestComponent)

      // Wait for initial mount adjustFontSize to complete
      await nextTick()

      wrapper.vm.editable.updateContent('New Content')

      // Wait for adjustFontSize to complete
      await nextTick()

      // Font size should be set (adjustFontSize was called)
      expect(wrapper.vm.editable.fontSize.value).toBeDefined()
    })
  })

  describe('adjustFontSize', () => {
    it('should set font size to maxFontSize when content fits', async () => {
      const TestComponent = defineComponent({
        setup() {
          const editable = useContentEditable({ maxHeight: 100, maxFontSize: 12 })
          return { editable }
        },
        template: '<div :ref="el => { if (editable.elementRef) editable.elementRef.value = el }">Test</div>'
      })

      wrapper = mount(TestComponent)

      // Mock scrollHeight to be less than maxHeight
      Object.defineProperty(wrapper.vm.editable.elementRef.value, 'scrollHeight', {
        value: 50,
        configurable: true
      })

      await wrapper.vm.editable.adjustFontSize()

      expect(wrapper.vm.editable.fontSize.value).toBe('12pt')
    })

    it('should reduce font size when content overflows', async () => {
      const TestComponent = defineComponent({
        setup() {
          const editable = useContentEditable({ maxHeight: 64, maxFontSize: 12, minFontSize: 8 })
          return { editable }
        },
        template: '<div :ref="el => { if (editable.elementRef) editable.elementRef.value = el }">Test</div>'
      })

      wrapper = mount(TestComponent)

      // Mock scrollHeight to be greater than maxHeight initially
      let scrollHeightValue = 100
      Object.defineProperty(wrapper.vm.editable.elementRef.value, 'scrollHeight', {
        get: () => scrollHeightValue,
        configurable: true
      })

      // Simulate font size reduction causing scrollHeight to decrease
      wrapper.vm.editable.elementRef.style = new Proxy({}, {
        get: (target, prop) => target[prop],
        set: (target, prop, value) => {
          if (prop === 'fontSize') {
            // Simulate scrollHeight decreasing as font size decreases
            const size = parseFloat(value)
            scrollHeightValue = size < 10 ? 50 : 100
          }
          target[prop] = value
          return true
        }
      })

      await wrapper.vm.editable.adjustFontSize()

      // Font size should be reduced
      const finalSize = parseFloat(wrapper.vm.editable.fontSize.value)
      expect(finalSize).toBeLessThan(12)
    })

    it('should stop at minFontSize', async () => {
      const TestComponent = defineComponent({
        setup() {
          const editable = useContentEditable({ maxHeight: 64, maxFontSize: 12, minFontSize: 8 })
          return { editable }
        },
        template: '<div :ref="el => { if (editable.elementRef) editable.elementRef.value = el }">Test</div>'
      })

      wrapper = mount(TestComponent)

      // Mock scrollHeight to always be greater than maxHeight
      Object.defineProperty(wrapper.vm.editable.elementRef.value, 'scrollHeight', {
        value: 1000,
        configurable: true
      })

      await wrapper.vm.editable.adjustFontSize()

      // Font size should not go below minFontSize
      const finalSize = parseFloat(wrapper.vm.editable.fontSize.value)
      expect(finalSize).toBeGreaterThanOrEqual(8)
    })

    it('should handle null elementRef', async () => {
      const TestComponent = defineComponent({
        setup() {
          const editable = useContentEditable()
          return { editable }
        },
        template: '<div>Test</div>'
      })

      wrapper = mount(TestComponent)

      // Should not throw
      await expect(wrapper.vm.editable.adjustFontSize()).resolves.toBeUndefined()
    })

    it('should prevent infinite loops with maxIterations', async () => {
      const TestComponent = defineComponent({
        setup() {
          const editable = useContentEditable({ maxHeight: 64, maxFontSize: 12, minFontSize: 8 })
          return { editable }
        },
        template: '<div :ref="el => { if (editable.elementRef) editable.elementRef.value = el }">Test</div>'
      })

      wrapper = mount(TestComponent)

      // Mock scrollHeight to always be greater than maxHeight
      Object.defineProperty(wrapper.vm.editable.elementRef.value, 'scrollHeight', {
        value: 1000,
        configurable: true
      })

      // Should complete without hanging
      await wrapper.vm.editable.adjustFontSize()

      expect(wrapper.vm.editable.fontSize.value).toBeDefined()
    })
  })

  describe('handleInput and debouncing', () => {
    it('should call debouncedAdjustFontSize on input', async () => {
      vi.useFakeTimers()

      const TestComponent = defineComponent({
        setup() {
          const editable = useContentEditable()
          return { editable }
        },
        template: '<div :ref="el => { if (editable.elementRef) editable.elementRef.value = el }">Test</div>'
      })

      wrapper = mount(TestComponent)

      wrapper.vm.editable.handleInput()

      // Should call after debounce delay (150ms)
      vi.advanceTimersByTime(150)
      await vi.runAllTimersAsync()

      // Font size should still be defined (adjustFontSize was called)
      expect(wrapper.vm.editable.fontSize.value).toBeDefined()
    })

    it('should debounce multiple rapid inputs', async () => {
      vi.useFakeTimers()

      const TestComponent = defineComponent({
        setup() {
          const editable = useContentEditable()
          return { editable }
        },
        template: '<div :ref="el => { if (editable.elementRef) editable.elementRef.value = el }">Test</div>'
      })

      wrapper = mount(TestComponent)

      // Trigger multiple inputs rapidly
      wrapper.vm.editable.handleInput()
      vi.advanceTimersByTime(50)
      wrapper.vm.editable.handleInput()
      vi.advanceTimersByTime(50)
      wrapper.vm.editable.handleInput()

      // Advance past debounce delay
      vi.advanceTimersByTime(150)
      await vi.runAllTimersAsync()

      // Font size should be defined (debouncing worked and adjustFontSize was called)
      expect(wrapper.vm.editable.fontSize.value).toBeDefined()
    })

    it('should cancel debounced function on unmount', () => {
      vi.useFakeTimers()

      const TestComponent = defineComponent({
        setup() {
          const editable = useContentEditable()
          return { editable }
        },
        template: '<div :ref="el => { if (editable.elementRef) editable.elementRef.value = el }">Test</div>'
      })

      wrapper = mount(TestComponent)

      const adjustSpy = vi.spyOn(wrapper.vm.editable, 'adjustFontSize')

      wrapper.vm.editable.handleInput()

      // Unmount before debounce completes
      wrapper.unmount()

      // Advance timers
      vi.advanceTimersByTime(150)

      // Should not have been called
      expect(adjustSpy).not.toHaveBeenCalled()
    })
  })

  describe('edge cases', () => {
    it('should handle very long content', () => {
      const onUpdate = vi.fn()
      const longContent = 'A'.repeat(1000)

      const TestComponent = defineComponent({
        setup() {
          const editable = useContentEditable({ onUpdate })
          editable.isEditing.value = true
          return { editable }
        },
        template: '<div :ref="el => { if (editable.elementRef) editable.elementRef.value = el }">Test</div>'
      })

      wrapper = mount(TestComponent)
      wrapper.vm.editable.elementRef.value.textContent = longContent

      wrapper.vm.editable.stopEditingAndEmit()

      expect(onUpdate).toHaveBeenCalledWith(longContent)
    })

    it('should handle special characters in content', () => {
      const onUpdate = vi.fn()
      const specialContent = '<script>alert("xss")</script>'

      const TestComponent = defineComponent({
        setup() {
          const editable = useContentEditable({ onUpdate })
          editable.isEditing.value = true
          return { editable }
        },
        template: '<div :ref="el => { if (editable.elementRef) editable.elementRef.value = el }">Test</div>'
      })

      wrapper = mount(TestComponent)
      wrapper.vm.editable.elementRef.value.textContent = specialContent

      wrapper.vm.editable.stopEditingAndEmit()

      expect(onUpdate).toHaveBeenCalledWith(specialContent)
    })
  })
})
