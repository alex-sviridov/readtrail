<script setup>
import { HandThumbUpIcon, HandThumbDownIcon } from '@heroicons/vue/24/solid'

const props = defineProps({
  score: {
    type: Number,
    default: 0
  },
  editable: {
    type: Boolean,
    default: false
  },
  allowScoring: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:score'])

function handleScoreClick(value) {
  // Toggle: if clicking current score, set to 0
  if (props.score === value) {
    emit('update:score', 0)
  } else {
    emit('update:score', value)
  }
}

function scoreButtonClasses(value) {
  const isActive = props.score === value
  const baseClasses = 'w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200'

  if (value === -1) {
    return [
      baseClasses,
      isActive
        ? 'bg-red-500 text-white scale-110'
        : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-red-100 dark:hover:bg-red-900 hover:text-red-600 dark:hover:text-red-400'
    ]
  } else {
    return [
      baseClasses,
      isActive
        ? 'bg-green-500 text-white scale-110'
        : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-green-100 dark:hover:bg-green-900 hover:text-green-600 dark:hover:text-green-400'
    ]
  }
}
</script>

<template>
  <!-- Display Mode (editable=false) -->
  <div v-if="!editable && allowScoring && score !== 0" class="flex items-center gap-1">
    <!-- Show dislike if score === -1 -->
    <div v-if="score === -1" class="w-6 h-6 rounded-full bg-red-500 flex items-center justify-center shadow-md">
      <HandThumbDownIcon class="w-4 h-4 text-white" />
    </div>

    <!-- Show like if score === 1 -->
    <div v-if="score === 1" class="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center shadow-md">
      <HandThumbUpIcon class="w-4 h-4 text-white" />
    </div>
  </div>

  <!-- Edit Mode (editable=true) -->
  <div
    v-else-if="editable && allowScoring"
    class="flex items-center gap-2 p-1 bg-white dark:bg-gray-800 rounded-full shadow-lg"
  >
    <!-- Dislike button (left) -->
    <button
      @click.stop="handleScoreClick(-1)"
      :class="scoreButtonClasses(-1)"
      type="button"
      aria-label="Dislike"
    >
      <HandThumbDownIcon class="w-5 h-5" />
    </button>

    <!-- Like button (right) -->
    <button
      @click.stop="handleScoreClick(1)"
      :class="scoreButtonClasses(1)"
      type="button"
      aria-label="Like"
    >
      <HandThumbUpIcon class="w-5 h-5" />
    </button>
  </div>
</template>
