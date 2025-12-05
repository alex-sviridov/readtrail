<template>
  <div class="min-h-0 max-h-16 flex px-3 items-center overflow-hidden">
    <h3
      ref="titleRef"
      class="w-full max-h-16 leading-tight break-words overflow-hidden font-semibold text-gray-900 p-1 rounded"
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
      {{ props.title }}
    </h3>
  </div>
</template>

<script setup>
import { ref, watch, nextTick, onMounted } from 'vue'

const props = defineProps({
  title: { type: String, default: null },
  editable: { type: Boolean, default: false }
})

const emit = defineEmits(['update'])

// --- State ---
const isEditing = ref(false)
const titleRef = ref(null)
const fontSize = ref('12pt') // Default font size

// Container dimensions
const MAX_HEIGHT = 64 // Fixed height in pixels
const MIN_FONT_SIZE = 8 // Minimum font size in pt
const MAX_FONT_SIZE = 12 // Maximum font size in pt

// --- Methods ---

/**
 * Calculates and sets the appropriate font size to fit text within container
 */
const adjustFontSize = async () => {
  await nextTick()

  const element = titleRef.value
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
  if (titleRef.value) {
    titleRef.value.focus()

    // Move cursor to the end of the contenteditable element
    const range = document.createRange()
    const selection = window.getSelection()
    range.selectNodeContents(titleRef.value)
    range.collapse(false) // Collapse to end
    selection.removeAllRanges()
    selection.addRange(range)

    adjustFontSize()
  }
}

/**
 * Stops editing and emits the update if the title has changed.
 */
const stopEditingAndEmit = () => {
  // Prevent immediate re-entry if the blur event is somehow triggered multiple times
  if (!isEditing.value) return

  // 1. Get the text content from the contenteditable element
  const newTitle = titleRef.value ? titleRef.value.textContent.trim() : ''

  // 2. Check if the title has actually changed and is not empty
  if (newTitle !== props.title && newTitle.length > 0) {
    emit('update', newTitle)
  } else if (newTitle.length === 0) {
    // Reset to original title if empty
    if (titleRef.value) {
      titleRef.value.textContent = props.title
    }
  }

  // 3. Revert to display mode
  isEditing.value = false
}

// Adjust font size on mount and when title changes
onMounted(() => {
  adjustFontSize()
})

// Update element content if prop changes while not editing (e.g., parent update)
watch(
  () => props.title,
  (newTitle) => {
    if (!isEditing.value && titleRef.value) {
      titleRef.value.textContent = newTitle
      adjustFontSize()
    }
  }
)
</script>

