<template>
  <div class="min-h-0 max-h-8 flex items-center overflow-hidden px-3">
    <p
      ref="elementRef"
      class="w-full max-h-8 leading-[1.3] break-words overflow-hidden text-sm text-gray-600 p-1 rounded"
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
import { watch } from 'vue'
import { TYPOGRAPHY, LAYOUT } from '@/constants'
import { useContentEditable } from '@/composables/useContentEditable'

const props = defineProps({
  author: {
    type: String,
    required: false,
    default: null
  },
  editable: {
    type: Boolean,
    required: false,
    default: false
  }
})

const emit = defineEmits(['update'])

// Use the contenteditable composable
const {
  isEditing,
  elementRef,
  fontSize,
  startEditing,
  stopEditingAndEmit,
  handleInput,
  updateContent
} = useContentEditable({
  maxHeight: LAYOUT.AUTHOR_MAX_HEIGHT,
  minFontSize: TYPOGRAPHY.MIN_FONT_SIZE,
  maxFontSize: TYPOGRAPHY.AUTHOR_MAX_FONT_SIZE,
  defaultFontSize: TYPOGRAPHY.AUTHOR_DEFAULT_SIZE,
  onUpdate: (newAuthor) => emit('update', newAuthor)
})

// Update element content if prop changes while not editing
watch(
  () => props.author,
  (newAuthor) => {
    updateContent(newAuthor)
  },
  { immediate: true }
)
</script>

