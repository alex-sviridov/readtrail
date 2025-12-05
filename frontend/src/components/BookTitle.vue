<template>
  <div>
    <h3
      v-if="!isEditing"
      class="text-lg font-semibold text-gray-900 mb-2 hover:bg-gray-100 p-1 rounded cursor-pointer"
      @click="startEditing"
    >
      {{ props.title }}
    </h3>

    <input
      v-else
      ref="inputRef"
      v-model="editableTitle"
      type="text"
      class="text-lg font-semibold text-gray-900 mb-2 border-b border-blue-500 focus:outline-none bg-transparent w-full p-1 -m-1"
      :style="{ width: inputWidth }"
      @keyup.enter="stopEditingAndEmit"
      @blur="stopEditingAndEmit"
    />
  </div>
</template>

<script setup>
import { ref, watch, nextTick } from 'vue'

const props = defineProps({
  title: { type: String, default: null }
})

const emit = defineEmits(['update'])

// --- State ---
const isEditing = ref(false)
const editableTitle = ref(props.title)
const inputRef = ref(null)
const inputWidth = ref('auto')

// --- Methods ---

/**
 * Initializes the editing state, focuses the input, and calculates its width.
 */
const startEditing = async () => {
  // 1. Set the initial value from props.title
  editableTitle.value = props.title

  // 2. Switch to edit mode
  isEditing.value = true

  // 3. Wait for the input to appear in the DOM
  await nextTick()

  // 4. Focus the input element
  if (inputRef.value) {
    inputRef.value.focus()
    // Calculate width for consistent appearance (optional but helpful)
    updateInputWidth()
  }
}

/**
 * Stops editing and emits the update if the title has changed.
 */
const stopEditingAndEmit = () => {
  // Prevent immediate re-entry if the blur event is somehow triggered multiple times
  if (!isEditing.value) return

  // 1. Check if the title has actually changed and is not empty
  const newTitle = editableTitle.value.trim()
  if (newTitle !== props.title && newTitle.length > 0) {
    emit('update', newTitle)
  }

  // 2. Revert to display mode
  isEditing.value = false
}

/**
 * Dynamically adjusts the input width to match the text content.
 * This is an optional step to ensure the input visually matches the h3 well.
 */
const updateInputWidth = () => {
  // Use a temporary canvas or a hidden element to measure text width accurately
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')

  // Apply the same font styles as the h3/input for accurate measurement
  // text-lg font-semibold is roughly '1.125rem' (18px) and '600'
  context.font = '600 1.125rem sans-serif'

  const textMetrics = context.measureText(editableTitle.value || '')
  // Add some padding (e.g., 20px) to prevent scrollbar/tightness
  inputWidth.value = `${textMetrics.width + 20}px`
}

// Update local state if prop changes while not editing (e.g., parent update)
watch(
  () => props.title,
  (newTitle) => {
    if (!isEditing.value) {
      editableTitle.value = newTitle
    }
  }
)
</script>

<style scoped>
/* Optional: You can refine the width and look with CSS if needed,
   but Tailwind should handle most of it */
</style>
