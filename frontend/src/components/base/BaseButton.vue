<template>
  <button
    class="flex items-center gap-2 px-3 md:px-4 py-2 bg-blue-600 text-white rounded-lg transition-colors duration-200 shadow-md hover:shadow-lg font-medium text-sm border-none cursor-pointer"
    v-bind="$attrs"
  >
    <slot name="icon"></slot>
    <span v-if="title" class="hidden md:inline">{{ title }}</span>
  </button>
</template>

<script setup>
defineOptions({
  name: 'BaseButton',
  inheritAttrs: false
})

defineProps({
  title: {
    type: String,
    required: false,
    default: ''
  }
})
</script>
