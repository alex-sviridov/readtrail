<template>
  <div class="min-h-0 max-h-16 flex px-3 items-center overflow-hidden">
    <h3
      ref="elementRef"
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
import { watch } from 'vue'
import { TYPOGRAPHY, LAYOUT } from '@/constants'
import { useContentEditable } from '@/composables/useContentEditable'

const props = defineProps({
  title: {
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
  maxHeight: LAYOUT.TITLE_MAX_HEIGHT,
  minFontSize: TYPOGRAPHY.MIN_FONT_SIZE,
  maxFontSize: TYPOGRAPHY.TITLE_MAX_FONT_SIZE,
  defaultFontSize: TYPOGRAPHY.TITLE_DEFAULT_SIZE,
  onUpdate: (newTitle) => emit('update', newTitle)
})

// Update element content if prop changes while not editing
watch(
  () => props.title,
  (newTitle) => {
    updateContent(newTitle)
  },
  { immediate: true }
)
</script>

