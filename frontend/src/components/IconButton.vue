<template>
  <div :class="['inline-block transition-opacity duration-200', containerClasses]">
    <button
      @click="handleClick"
      :class="[
        'relative flex items-start transition-all duration-200',
        position === 'left' ? 'justify-start' : 'justify-end',
        isConfirming ? confirmingClasses : baseClasses
      ]"
      :title="isConfirming ? confirmTitle : title"
    >
      <component :is="icon" :class="[isConfirming ? 'w-5 h-5 m-1.5' : 'w-4 h-4 m-1', iconClasses]" />
    </button>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  icon: {
    type: [Object, Function],
    required: true
  },
  title: {
    type: String,
    required: true
  },
  variant: {
    type: String,
    default: 'default',
    validator: (value) => ['default', 'danger', 'primary'].includes(value)
  },
  position: {
    type: String,
    default: 'right',
    validator: (value) => ['left', 'right'].includes(value)
  },
  requireConfirmation: {
    type: Boolean,
    default: false
  },
  confirmTitle: {
    type: String,
    default: 'Click again to confirm'
  },
  confirmTimeout: {
    type: Number,
    default: 5000
  }
})

const emit = defineEmits(['click'])

const isConfirming = ref(false)
let confirmTimer = null

const containerClasses = computed(() => {
  // Keep button visible when confirming, even without hover
  return isConfirming.value ? 'opacity-100' : ''
})

const baseClasses = computed(() => {
  const cornerShape = 'w-10 h-10 shadow-md'
  const clipPath = props.position === 'left' ? 'clip-path-corner-left' : 'clip-path-corner'
  if (props.variant === 'danger') {
    return `${cornerShape} ${clipPath} bg-white/95 backdrop-blur-sm hover:bg-red-50 hover:w-12 hover:h-12`
  }
  return `${cornerShape} ${clipPath} bg-white/95 backdrop-blur-sm hover:bg-blue-50 hover:w-12 hover:h-12`
})

const confirmingClasses = computed(() => {
  const clipPath = props.position === 'left' ? 'clip-path-corner-left' : 'clip-path-corner'
  if (props.variant === 'danger') {
    return `w-14 h-14 ${clipPath} bg-red-500 animate-pulse opacity-100`
  }
  if (props.variant === 'primary') {
    return `w-14 h-14 ${clipPath} bg-blue-500 animate-pulse opacity-100`
  }
  return `w-14 h-14 ${clipPath} bg-blue-500 animate-pulse opacity-100`
})

const iconClasses = computed(() => {
  if (isConfirming.value) {
    return props.variant === 'danger' ? 'text-white font-bold' : 'text-white font-bold'
  }
  return props.variant === 'danger'
    ? 'text-gray-700 hover:text-red-600'
    : 'text-gray-700 hover:text-blue-600'
})

const handleClick = () => {
  if (!props.requireConfirmation) {
    emit('click')
    return
  }

  if (isConfirming.value) {
    // Second click - confirm action
    clearTimeout(confirmTimer)
    isConfirming.value = false
    emit('click')
  } else {
    // First click - enter confirmation state
    isConfirming.value = true
    confirmTimer = setTimeout(() => {
      isConfirming.value = false
    }, props.confirmTimeout)
  }
}
</script>

<style scoped>
.clip-path-corner {
  clip-path: polygon(0 0, 100% 0, 100% 100%);
}

.clip-path-corner-left {
  clip-path: polygon(0 0, 100% 0, 0 100%);
}
</style>
