<template>
  <button
    @click="$emit('click')"
    :class="[buttonBaseClasses, getToggleButtonClasses(isActive)]"
    aria-label="Mark as to read"
  >
    To Read
  </button>
</template>

<script setup>
// 1. Imports
// (none required)

// 2. Props & Emits
defineProps({
  isActive: {
    type: Boolean,
    required: true
  },
  buttonBaseClasses: {
    type: String,
    required: true
  },
  getToggleButtonClasses: {
    type: Function,
    required: true
  }
})

defineEmits(['click'])
</script>
