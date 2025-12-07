<template>
  <div class="flex gap-2">
    <button
      @click="$emit('toggle-long-ago')"
      :class="[buttonBaseClasses, getToggleButtonClasses(isReadLongAgo)]"
      aria-label="Mark as read long ago"
    >
      Long Ago
    </button>
    <button
      @click="$emit('toggle-lately')"
      :class="[buttonBaseClasses, getToggleButtonClasses(isReadLately)]"
      aria-label="Mark as read lately"
    >
      Lately
    </button>
  </div>
</template>

<script setup>
// 1. Imports
// (none required)

// 2. Props & Emits
defineProps({
  isReadLongAgo: {
    type: Boolean,
    required: true
  },
  isReadLately: {
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

defineEmits(['toggle-long-ago', 'toggle-lately'])
</script>
