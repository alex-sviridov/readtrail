import { ref, onMounted, watch, nextTick, onBeforeUnmount } from 'vue'
import { calculateOptimalFontSize } from '@/utils/fontSizing'

/**
 * Creates a debounced version of a function
 * @param {Function} fn - The function to debounce
 * @param {number} delay - The delay in milliseconds
 * @returns {Function} Debounced function
 */
function debounce(fn, delay) {
  let timeoutId = null

  const debounced = function(...args) {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }
    timeoutId = setTimeout(() => {
      fn.apply(this, args)
      timeoutId = null
    }, delay)
  }

  // Allow cleanup of pending timeout
  debounced.cancel = () => {
    if (timeoutId) {
      clearTimeout(timeoutId)
      timeoutId = null
    }
  }

  return debounced
}

/**
 * Composable for managing contenteditable elements with auto-sizing font
 *
 * @param {Object} options - Configuration options
 * @param {number} options.maxHeight - Maximum height for the container in pixels
 * @param {number} options.minFontSize - Minimum font size in points
 * @param {number} options.maxFontSize - Maximum font size in points
 * @param {string} options.defaultFontSize - Default font size (e.g., '12pt')
 * @param {Function} options.onUpdate - Callback when content is updated
 * @returns {Object} Composable state and methods
 */
export function useContentEditable(options = {}) {
  const {
    maxHeight = 64,
    minFontSize = 8,
    maxFontSize = 12,
    defaultFontSize = '12pt',
    onUpdate = () => {}
  } = options

  // State
  const isEditing = ref(false)
  const elementRef = ref(null)
  const fontSize = ref(defaultFontSize)
  const currentContent = ref('')

  /**
   * Calculates and sets the appropriate font size to fit text within container
   */
  const adjustFontSize = async () => {
    await nextTick()

    const element = elementRef.value
    if (!element) return

    // Wait for layout to settle
    await nextTick()

    // Use shared utility to calculate optimal font size
    const optimalSize = calculateOptimalFontSize(element, maxHeight, maxFontSize, minFontSize)
    fontSize.value = `${optimalSize}pt`
  }

  /**
   * Debounced version of adjustFontSize to reduce DOM operations during typing
   * Delays font size recalculation by 150ms after the last input event
   */
  const debouncedAdjustFontSize = debounce(adjustFontSize, 150)

  /**
   * Handles input events on contenteditable element
   */
  const handleInput = () => {
    debouncedAdjustFontSize()
  }

  /**
   * Cleanup debounced function on component unmount
   */
  onBeforeUnmount(() => {
    debouncedAdjustFontSize.cancel()
  })

  /**
   * Initializes the editing state, focuses the element, and positions cursor at the end
   */
  const startEditing = async () => {
    // 1. Switch to edit mode
    isEditing.value = true

    // 2. Wait for the contenteditable to be enabled
    await nextTick()

    // 3. Focus the element and move cursor to the end
    if (elementRef.value) {
      elementRef.value.focus()

      // Move cursor to the end of the contenteditable element
      const range = document.createRange()
      const selection = window.getSelection()
      range.selectNodeContents(elementRef.value)
      range.collapse(false) // Collapse to end
      selection.removeAllRanges()
      selection.addRange(range)

      adjustFontSize()
    }
  }

  /**
   * Stops editing and emits the update if the content has changed
   */
  const stopEditingAndEmit = () => {
    // Prevent immediate re-entry if the blur event is somehow triggered multiple times
    if (!isEditing.value) return

    // 1. Get the text content from the contenteditable element
    const newContent = elementRef.value ? elementRef.value.textContent.trim() : ''

    // 2. Check if the content has actually changed and is not empty
    if (newContent !== currentContent.value && newContent.length > 0) {
      onUpdate(newContent)
    } else if (newContent.length === 0) {
      // Reset to original content if empty
      if (elementRef.value) {
        elementRef.value.textContent = currentContent.value
      }
    }

    // 3. Revert to display mode
    isEditing.value = false
  }

  /**
   * Updates the content and adjusts font size
   */
  const updateContent = (newContent) => {
    currentContent.value = newContent
    if (!isEditing.value && elementRef.value) {
      elementRef.value.textContent = newContent
      adjustFontSize()
    }
  }

  // Adjust font size on mount
  onMounted(() => {
    adjustFontSize()
  })

  return {
    // State
    isEditing,
    elementRef,
    fontSize,
    currentContent,

    // Methods
    startEditing,
    stopEditingAndEmit,
    handleInput,
    adjustFontSize,
    updateContent
  }
}
