<script setup>
import { computed } from 'vue'

const props = defineProps({
  data: {
    type: Array,
    required: true
  }
})

const maxValue = computed(() => {
  if (props.data.length === 0) return 1
  return Math.max(...props.data.map(e => e.total))
})

const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
</script>

<template>
  <div class="bg-white rounded-lg shadow p-6">
    <div class="flex justify-between items-center mb-4">
      <h2 class="text-xl font-bold text-gray-900">Reading Timeline</h2>

      <!-- Legend -->
      <div class="flex items-center gap-4 text-xs text-gray-600">
        <div class="flex items-center gap-1">
          <div class="w-3 h-3 bg-green-500 rounded"></div>
          <span>Finished</span>
        </div>
        <div class="flex items-center gap-1">
          <div class="w-3 h-3 bg-amber-500 rounded"></div>
          <span>Dropped</span>
        </div>
        <div class="flex items-center gap-1">
          <div class="w-3 h-3 bg-blue-400 rounded"></div>
          <span>In Progress</span>
        </div>
      </div>
    </div>

    <div v-if="data.length === 0" class="text-center text-gray-500 py-8">
      No reading history yet
    </div>

    <div v-else class="overflow-x-auto">
      <div class="inline-flex items-end gap-2 min-w-full pb-4">
        <div
          v-for="entry in data"
          :key="`${entry.year}-${entry.month}`"
          class="flex flex-col items-center gap-1 min-w-[60px]"
        >
          <!-- Bar Container -->
          <div class="relative w-12 flex items-end justify-center" style="height: 150px;">
            <div
              class="w-full relative group flex flex-col-reverse"
              :style="{ height: `${Math.max(5, (entry.total / maxValue) * 100)}%` }"
            >
              <!-- Finished books -->
              <div
                v-if="entry.finished > 0"
                class="w-full bg-green-500 transition-colors"
                :class="{ 'rounded-t': entry.unfinished === 0 && entry.inProgress === 0 }"
                :style="{ height: `${(entry.finished / entry.total) * 100}%` }"
              ></div>

              <!-- Unfinished/dropped books -->
              <div
                v-if="entry.unfinished > 0"
                class="w-full bg-amber-500 transition-colors"
                :class="{ 'rounded-t': entry.inProgress === 0 }"
                :style="{ height: `${((entry.unfinished * 0.5) / entry.total) * 100}%` }"
              ></div>

              <!-- In-progress books -->
              <div
                v-if="entry.inProgress > 0"
                class="w-full bg-blue-400 rounded-t transition-colors"
                :style="{ height: `${((entry.inProgress * 0.5) / entry.total) * 100}%` }"
              ></div>

              <!-- Tooltip -->
              <div class="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs rounded py-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                <div v-if="entry.finished > 0">{{ entry.finished }} finished</div>
                <div v-if="entry.unfinished > 0">{{ entry.unfinished }} dropped</div>
                <div v-if="entry.inProgress > 0">{{ entry.inProgress }} in progress</div>
              </div>
            </div>
          </div>

          <!-- Label -->
          <div class="text-xs text-gray-600 text-center">
            <div>{{ monthNames[entry.month - 1] }}</div>
            <div class="text-gray-400">{{ entry.year }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
