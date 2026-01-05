<template>
  <div
    class="relative w-full aspect-[2/3] bg-gradient-to-br from-blue-500 to-purple-600 rounded-t-lg overflow-hidden flex flex-col items-center justify-center p-4 text-white"
    :style="coverStyle"
  >
    <!-- Book Title -->
    <div class="text-center mb-auto mt-4">
      <h3
        ref="titleRef"
        class="font-bold leading-tight break-words"
        :style="titleStyle"
      >
        {{ title }}
      </h3>
    </div>

    <!-- Author Name -->
    <div v-if="author" class="text-center mt-auto mb-4">
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
  }
})

const titleRef = ref(null)
const authorRef = ref(null)
const titleFontSize = ref(TYPOGRAPHY.TITLE_MAX_FONT_SIZE)
const authorFontSize = ref(TYPOGRAPHY.AUTHOR_MAX_FONT_SIZE)

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
        LAYOUT.TITLE_MAX_HEIGHT,
        TYPOGRAPHY.TITLE_MAX_FONT_SIZE,
        TYPOGRAPHY.MIN_FONT_SIZE
      )
    }

    if (authorRef.value && props.author) {
      authorFontSize.value = calculateOptimalFontSize(
        authorRef.value,
        LAYOUT.AUTHOR_MAX_HEIGHT,
        TYPOGRAPHY.AUTHOR_MAX_FONT_SIZE,
        TYPOGRAPHY.MIN_FONT_SIZE
      )
    }
  })
}

// Adjust sizes on mount and when props change
onMounted(() => {
  adjustTextSizes()
})

watch([() => props.title, () => props.author], () => {
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
