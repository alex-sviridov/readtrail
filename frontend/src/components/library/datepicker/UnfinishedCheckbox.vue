<template>
  <label class="select-none  flex items-center gap-2 cursor-pointer text-sm text-gray-700">
    <input
      type="checkbox"
      :checked="modelValue"
      @change="$emit('update:modelValue', $event.target.checked)"
      class="w-4 h-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500"
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
