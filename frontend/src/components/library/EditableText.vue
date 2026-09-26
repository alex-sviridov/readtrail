<template>
  <div
    class="min-h-[1.5rem] flex items-center overflow-hidden px-2 py-1"
    :class="containerClasses"
  >
    <component
      :is="as"
      ref="elementRef"
      class="w-full leading-tight break-words overflow-hidden px-1 rounded"
      :class="textClasses"
      :style="{ fontSize: fontSize }"
      :contenteditable="isEditing"
      :data-placeholder="placeholderText"
      @click="props.editable && !isEditing && startEditing()"
      @keydown.enter.prevent="stopEditingAndEmit"
      @keydown.escape.prevent="cancelEditing"
      @blur="stopEditingAndEmit"
      @input="handleInput"
    >
      {{ props.value }}
    </component>
  </div>
</template>

<script setup>
import { watch, computed } from 'vue'
import { TYPOGRAPHY, LAYOUT } from '@/constants'
import { useContentEditable } from '@/composables/useContentEditable'

const props = defineProps({
  value: {
    type: String,
    required: false,
    default: null
  },
  as: {
    type: String,
    required: false,
    default: 'p',
    validator: (value) => ['h3', 'p'].includes(value)
  },
  variant: {
    type: String,
    required: false,
    default: 'author',
    validator: (value) => ['title', 'author'].includes(value)
  },
  editable: {
    type: Boolean,
    required: false,
    default: false
  }
})

const emit = defineEmits(['update'])

// Variant-specific configuration
const config = computed(() => {
  if (props.variant === 'title') {
    return {
      maxHeight: LAYOUT.TITLE_MAX_HEIGHT,
      maxFontSize: TYPOGRAPHY.TITLE_MAX_FONT_SIZE,
      defaultFontSize: TYPOGRAPHY.TITLE_DEFAULT_SIZE
    }
  }
  return {
    maxHeight: LAYOUT.AUTHOR_MAX_HEIGHT,
    maxFontSize: TYPOGRAPHY.AUTHOR_MAX_FONT_SIZE,
    defaultFontSize: TYPOGRAPHY.AUTHOR_DEFAULT_SIZE
  }
})

// Computed classes based on variant
const containerClasses = computed(() => {
  if (props.variant === 'title') {
    return 'max-h-16'
  }
  return 'max-h-8'
})

const textClasses = computed(() => {
  const baseClasses = {
    'hover:bg-gray-100 cursor-pointer': props.editable && !isEditing.value,
    'border-b border-blue-500 bg-blue-50': isEditing.value,
    'et-placeholder': props.editable
  }

  const variantClasses = props.variant === 'title'
    ? 'max-h-16 font-semibold text-gray-900'
    : 'max-h-8 leading-[1.3] text-sm text-gray-600'

  return [baseClasses, variantClasses]
})

const placeholderText = computed(() => (props.variant === 'title' ? 'Untitled' : 'Add author'))

// Use the contenteditable composable
const {
  isEditing,
  elementRef,
  fontSize,
  startEditing,
  stopEditingAndEmit,
  cancelEditing,
  handleInput,
  updateContent
} = useContentEditable({
  maxHeight: config.value.maxHeight,
  minFontSize: TYPOGRAPHY.MIN_FONT_SIZE,
  maxFontSize: config.value.maxFontSize,
  defaultFontSize: config.value.defaultFontSize,
  onUpdate: (newValue) => emit('update', newValue)
})

// Update element content if prop changes while not editing
watch(
  () => props.value,
  (newValue) => {
    updateContent(newValue)
  },
  { immediate: true }
)
</script>

<style scoped>
/* :empty (not props.value) so the placeholder disappears the instant the
   user types a real character, and reappears live if they clear it back out
   — both happen inside the contenteditable DOM before any prop round-trip. */
.et-placeholder:empty::before {
  content: attr(data-placeholder);
  color: #9ca3af;
  font-style: italic;
}
</style>
