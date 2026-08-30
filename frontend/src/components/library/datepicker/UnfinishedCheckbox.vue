<template>
  <label class="select-none flex items-center gap-1 cursor-pointer text-xs whitespace-nowrap text-gray-700">
    <input
      type="checkbox"
      :checked="modelValue"
      @change="$emit('update:modelValue', $event.target.checked)"
      class="w-3.5 h-3.5 rounded border-gray-300 text-amber-600 focus:ring-amber-500"
    />
    <span>Unfinished</span>
  </label>
</template>

<script setup>
// 1. Imports
// (none required)

// 2. Props & Emits
defineProps({
  modelValue: {
    type: Boolean,
    required: true
  }
})

defineEmits(['update:modelValue'])
</script>
