<template>
  <button
    @click="$emit('click')"
    :class="[
      'w-full rounded-lg font-semibold min-h-[32px] transition-all duration-150',
      'ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500',
      getToggleButtonClasses(isActive)
    ]"
    aria-label="Mark as in progress"
  >
    In Progress
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
  getToggleButtonClasses: {
    type: Function,
    required: true
  }
})

defineEmits(['click'])
</script>
