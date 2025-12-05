<template>
  <div class="author-container">
    <p
      ref="authorRef"
      class="author-text text-sm text-gray-600 p-1 rounded"
      :class="{
        'hover:bg-gray-100 cursor-pointer': props.editable && !isEditing,
        'border-b border-blue-500 bg-blue-50': isEditing
      }"
      :style="{ fontSize: fontSize }"
      :contenteditable="isEditing"
      @click="props.editable && !isEditing && startEditing()"
      @keydown.enter.prevent="stopEditingAndEmit"
      @blur="stopEditingAndEmit"
      @input="handleInput"
    >
      {{ props.author }}
    </p>
  </div>
</template>

<script setup>
import { ref, watch, nextTick, onMounted } from 'vue'

const props = defineProps({
  author: { type: String, default: null },
  editable: { type: Boolean, default: false }
})

const emit = defineEmits(['update'])

// --- State ---
const isEditing = ref(false)
const authorRef = ref(null)
const fontSize = ref('10pt') // Default font size for author (slightly smaller than title)

// Container dimensions
const MAX_HEIGHT = 48 // Fixed height in pixels (smaller than title)
const MIN_FONT_SIZE = 8 // Minimum font size in pt
const MAX_FONT_SIZE = 10 // Maximum font size in pt (smaller than title)

// --- Methods ---

/**
 * Calculates and sets the appropriate font size to fit text within container
 */
const adjustFontSize = async () => {
  await nextTick()

  const element = authorRef.value
  if (!element) return

  // Start from current font size to avoid jumping
  let currentSize = MAX_FONT_SIZE

  // Reset to max size first
  element.style.fontSize = `${currentSize}pt`

  // Wait for layout to settle
  await nextTick()

  // Reduce font size until content fits
  let iterations = 0
  const maxIterations = 100 // Prevent infinite loops

  while (element.scrollHeight > MAX_HEIGHT && currentSize > MIN_FONT_SIZE && iterations < maxIterations) {
    currentSize -= 0.5
    element.style.fontSize = `${currentSize}pt`
    iterations++
  }

  fontSize.value = `${currentSize}pt`
}

/**
 * Handles input events on contenteditable element
 */
const handleInput = () => {
  adjustFontSize()
}

/**
 * Initializes the editing state, focuses the element, and calculates font size.
 */
const startEditing = async () => {
  // 1. Switch to edit mode
  isEditing.value = true

  // 2. Wait for the contenteditable to be enabled
  await nextTick()

  // 3. Focus the element and move cursor to the end
  if (authorRef.value) {
    authorRef.value.focus()

    // Move cursor to the end of the contenteditable element
    const range = document.createRange()
    const selection = window.getSelection()
    range.selectNodeContents(authorRef.value)
    range.collapse(false) // Collapse to end
    selection.removeAllRanges()
    selection.addRange(range)

    adjustFontSize()
  }
}

/**
 * Stops editing and emits the update if the author has changed.
 */
const stopEditingAndEmit = () => {
  // Prevent immediate re-entry if the blur event is somehow triggered multiple times
  if (!isEditing.value) return

  // 1. Get the text content from the contenteditable element
  const newAuthor = authorRef.value ? authorRef.value.textContent.trim() : ''

  // 2. Check if the author has actually changed and is not empty
  if (newAuthor !== props.author && newAuthor.length > 0) {
    emit('update', newAuthor)
  } else if (newAuthor.length === 0) {
    // Reset to original author if empty
    if (authorRef.value) {
      authorRef.value.textContent = props.author
    }
  }

  // 3. Revert to display mode
  isEditing.value = false
}

// Adjust font size on mount and when author changes
onMounted(() => {
  adjustFontSize()
})

// Update element content if prop changes while not editing (e.g., parent update)
watch(
  () => props.author,
  (newAuthor) => {
    if (!isEditing.value && authorRef.value) {
      authorRef.value.textContent = newAuthor
      adjustFontSize()
    }
  }
)
</script>

<style scoped>
.author-container {
  height: 48px;
  max-height: 48px;
  display: flex;
  align-items: center;
  overflow: hidden;
}

.author-text {
  width: 100%;
  max-height: 48px;
  line-height: 1.3;
  word-wrap: break-word;
  overflow-wrap: break-word;
  overflow: hidden;
}
</style>
