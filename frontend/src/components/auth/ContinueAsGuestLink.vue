<template>
  <component
    :is="disabled ? 'button' : 'router-link'"
    :to="disabled ? undefined : '/library'"
    :disabled="disabled"
    class="group relative w-full flex justify-center py-2 px-4 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
  >
    Continue as Guest
  </component>
</template>

<script setup>
defineProps({
  disabled: {
    type: Boolean,
    required: false,
    default: false
  }
})
</script>
