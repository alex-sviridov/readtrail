<template>
  <div class="flex justify-between items-center mb-6">
    <h1 class="text-3xl font-bold text-gray-900">My Library</h1>
    <div class="flex items-center gap-3">
      <BaseButton
        title="Hide Unfinished"
        @click="$emit('toggle-filter')"
        :class="[
          hideUnfinished
            ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-md hover:shadow-lg'
            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
        ]"
      >
        <template #icon>
          <FunnelIcon class="w-5 h-5" />
        </template>
      </BaseButton>
      <BaseButton
        title="Timeline"
        @click="$emit('toggle-timeline')"
        :class="[
          showTimeline
            ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-md hover:shadow-lg'
            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
        ]"
      >
        <template #icon>
          <CalendarIcon class="w-5 h-5" />
        </template>
      </BaseButton>
      <BaseButton
        title="Add Book"
        @click="$emit('add-book')"
      >
        <template #icon>
          <PlusIcon class="w-5 h-5" />
        </template>
      </BaseButton>
    </div>
  </div>
</template>

<script setup>
// 1. Imports
import { PlusIcon, CalendarIcon, FunnelIcon } from '@heroicons/vue/24/outline'
import BaseButton from '@/components/base/BaseButton.vue'

// 2. Props & Emits
defineProps({
  showTimeline: {
    type: Boolean,
    required: true,
    default: false
  },
  hideUnfinished: {
    type: Boolean,
    required: true,
    default: false
  }
})

defineEmits(['toggle-timeline', 'toggle-filter', 'add-book'])
</script>
