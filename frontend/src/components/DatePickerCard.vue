<template>
  <div class="flex flex-col h-full w-full">
    <!-- Header: Read Long Ago Button -->
    <div class="bg-white border-b border-gray-200 px-3 py-1 flex-shrink-0">
      <button
        @click="$emit('mark-read-long-ago')"
        class="w-full text-sm px-4 py-2.5 rounded-lg font-semibold transition-all duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        :class="isReadLongAgo
          ? 'bg-blue-600 text-white shadow-md hover:bg-blue-700'
          : 'text-gray-700 hover:text-blue-600 hover:bg-gray-100'"
      >
        Read Long Ago
      </button>
    </div>

    <!-- VueDatePicker - fills remaining space -->
    <div class="flex-1 w-full flex items-stretch">
      <div class="w-full datepicker-wrapper">
        <VueDatePicker
          :model-value="selectedDate"
          month-picker
          inline
          auto-apply
          :enable-time-picker="false"
          :max-date="new Date()"
          :year-range="yearRange"
          @update:model-value="$emit('date-select', $event)"
        />
      </div>
    </div>

    <!-- Footer: In Progress Button -->
    <div class="bg-white border-t border-gray-200 px-3 py-1 flex-shrink-0">
      <button
        @click="$emit('mark-in-progress')"
        class="w-full text-sm px-4 py-2.5 rounded-lg font-semibold transition-all duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        :class="isInProgress
          ? 'bg-blue-600 text-white shadow-md hover:bg-blue-700'
          : 'text-gray-700 hover:text-blue-600 hover:bg-gray-100'"
      >
        In Progress
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { VueDatePicker } from '@vuepic/vue-datepicker'

const props = defineProps({
  selectedDate: {
    type: Object,
    default: null
  },
  yearRange: {
    type: Array,
    required: true
  },
  isReadLongAgo: {
    type: Boolean,
    default: false
  },
  isInProgress: {
    type: Boolean,
    default: false
  }
})

defineEmits(['date-select', 'mark-read-long-ago', 'mark-in-progress'])
</script>

<style scoped>
/* DatePicker wrapper fills the available space */
.datepicker-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}

/* Override VueDatePicker CSS variables to remove width constraints */
.datepicker-wrapper {
  --dp-menu-min-width: 100%;
  --dp-cell-size: 40px;
  --dp-common-padding: 8px;
}

/* Make all VueDatePicker containers fill the card width */
:deep(.dp__menu),
:deep(.dp__main),
:deep(.dp__instance_calendar),
:deep(.dp__overlay),
:deep(.dp__month_year_wrap),
:deep(.dp__month_year_row),
:deep(.dp__overlay_container) {
  width: 100% !important;
  min-width: 100% !important;
  max-width: 100% !important;
}

:deep(.dp__menu) {
  border: none !important;
  box-shadow: none !important;
  background: transparent !important;
}

/* Make month/year grid responsive */
:deep(.dp__overlay_row) {
  display: grid !important;
  grid-template-columns: repeat(3, 1fr) !important;
  gap: 0.5rem !important;
  width: 100% !important;
  margin: 0 !important;
  padding: 0.25rem 0.5rem !important;
}

:deep(.dp__overlay_col) {
  width: 100% !important;
  padding: 0 !important;
}

/* Make sure the month picker cells fill their grid cells */
:deep(.dp__overlay_cell) {
  width: 100% !important;
  padding: 0.75rem 0.5rem !important;
  box-sizing: border-box !important;
}

:deep(.dp__overlay_cell_pad) {
  padding: 0.5rem !important;
}

/* Year/month header navigation */
:deep(.dp__month_year_select) {
  flex: 1 !important;
}

:deep(.dp__inner_nav) {
  flex-shrink: 0 !important;
}
</style>
