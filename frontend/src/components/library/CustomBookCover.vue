<template>
  <div
    class="relative w-full aspect-[2/3] bg-gradient-to-br from-blue-500 to-purple-600 rounded-t-lg overflow-hidden flex flex-col items-center justify-center text-white"
    :class="isCompact ? 'p-1' : 'p-4'"
    :style="coverStyle"
  >
    <!-- Book Title -->
    <div class="text-center mb-auto" :class="isCompact ? 'mt-0.5' : 'mt-4'">
      <h3
        ref="titleRef"
        class="font-bold leading-tight break-words"
        :style="titleStyle"
      >
        {{ title }}
      </h3>
    </div>

    <!-- Author Name -->
    <div v-if="author" class="text-center mt-auto" :class="isCompact ? 'mb-0.5' : 'mb-4'">
      <p
        ref="authorRef"
        class="font-medium opacity-90 break-words"
        :style="authorStyle"
      >
        {{ author }}
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { TYPOGRAPHY, LAYOUT } from '@/constants'
import { calculateOptimalFontSize } from '@/utils/fontSizing'

const props = defineProps({
  title: {
    type: String,
    required: true,
    default: 'Untitled'
  },
  author: {
    type: String,
    default: null
  },
  gradientColors: {
    type: Array,
    default: () => ['#3b82f6', '#9333ea'] // blue-500 to purple-600
  },
  // 'default' is sized for the grid card; 'compact' is for the small table-row
  // thumbnail, which needs a much smaller font range/max height to converge.
  size: {
    type: String,
    default: 'default',
    validator: (value) => ['default', 'compact'].includes(value)
  }
})

const isCompact = computed(() => props.size === 'compact')

const titleMaxFontSize = computed(() => (isCompact.value ? TYPOGRAPHY.COMPACT_TITLE_MAX_FONT_SIZE : TYPOGRAPHY.TITLE_MAX_FONT_SIZE))
const authorMaxFontSize = computed(() => (isCompact.value ? TYPOGRAPHY.COMPACT_AUTHOR_MAX_FONT_SIZE : TYPOGRAPHY.AUTHOR_MAX_FONT_SIZE))
const minFontSize = computed(() => (isCompact.value ? TYPOGRAPHY.COMPACT_MIN_FONT_SIZE : TYPOGRAPHY.MIN_FONT_SIZE))
const titleMaxHeight = computed(() => (isCompact.value ? LAYOUT.COMPACT_TITLE_MAX_HEIGHT : LAYOUT.TITLE_MAX_HEIGHT))
const authorMaxHeight = computed(() => (isCompact.value ? LAYOUT.COMPACT_AUTHOR_MAX_HEIGHT : LAYOUT.AUTHOR_MAX_HEIGHT))

const titleRef = ref(null)
const authorRef = ref(null)
const titleFontSize = ref(titleMaxFontSize.value)
const authorFontSize = ref(authorMaxFontSize.value)

const coverStyle = computed(() => ({
  background: `linear-gradient(135deg, ${props.gradientColors[0]}, ${props.gradientColors[1]})`
}))

const titleStyle = computed(() => ({
  fontSize: `${titleFontSize.value}pt`
}))

const authorStyle = computed(() => ({
  fontSize: `${authorFontSize.value}pt`
}))

function adjustTextSizes() {
  nextTick(() => {
    if (titleRef.value) {
      titleFontSize.value = calculateOptimalFontSize(
        titleRef.value,
        titleMaxHeight.value,
        titleMaxFontSize.value,
        minFontSize.value
      )
    }

    if (authorRef.value && props.author) {
      authorFontSize.value = calculateOptimalFontSize(
        authorRef.value,
        authorMaxHeight.value,
        authorMaxFontSize.value,
        minFontSize.value
      )
    }
  })
}

// Adjust sizes on mount and when props change
onMounted(() => {
  adjustTextSizes()
})

watch([() => props.title, () => props.author, () => props.size], () => {
  adjustTextSizes()
})
</script>

<style scoped>
/* Ensure text doesn't overflow */
h3, p {
  overflow-wrap: break-word;
  word-wrap: break-word;
  hyphens: auto;
}
</style>
