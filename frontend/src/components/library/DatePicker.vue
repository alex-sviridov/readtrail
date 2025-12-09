<template>
  <!-- Date Picker View -->
  <article class="flex flex-col h-full w-full picker-container">
    <!-- Top Section: Unfinished Toggle -->
    <section v-if="props.allowUnfinished" class="bg-gray-50 border-b border-gray-200 px-3 py-1.5 flex-shrink-0">
      <UnfinishedCheckbox v-model="isUnfinishedToggled" />
    </section>

    <!-- Header: Read Long Ago and Read Lately Buttons -->
    <header class="bg-white border-b border-gray-200 px-3 py-1 flex-shrink-0">
      <StatusToggleButtons
        :is-read-long-ago="props.isReadLongAgo"
        :is-read-lately="props.isReadLately"
        :button-base-classes="buttonBaseClasses"
        :get-toggle-button-classes="getToggleButtonClasses"
        @toggle-long-ago="handleReadLongAgo"
        @toggle-lately="handleReadLately"
      />
    </header>

    <!-- Main Picker Area -->
    <main class="flex-1 flex flex-col min-h-0 py-1 px-2 bg-white">
      <!-- Year Navigation -->
      <YearNavigator
        :current-year="currentYear"
        :can-decrement="canDecrementYear"
        :can-increment="canIncrementYear"
        @decrement="decrementYear"
        @increment="incrementYear"
      />

      <!-- Responsive Month Grid -->
      <MonthGrid
        :current-year="currentYear"
        :months="MONTHS"
        :compute-classes="computeMonthButtonClasses"
        :is-future-month="isFutureMonth"
        :is-selected-month="isSelectedMonth"
        @month-select="selectMonth"
      />
    </main>

    <!-- Footer: In Progress Button -->
    <footer class="bg-white border-t border-gray-200 px-3 py-1 flex-shrink-0">
      <InProgressButton
        :is-active="props.isInProgress"
        :get-toggle-button-classes="getToggleButtonClasses"
        @click="handleInProgress"
      />
    </footer>
  </article>
</template>

<script setup>
// 1. Imports
import { MONTHS } from '@/constants'
import { useDatePicker } from '@/composables/useDatePicker'
import UnfinishedCheckbox from './datepicker/UnfinishedCheckbox.vue'
import StatusToggleButtons from './datepicker/StatusToggleButtons.vue'
import YearNavigator from './datepicker/YearNavigator.vue'
import MonthGrid from './datepicker/MonthGrid.vue'
import InProgressButton from './datepicker/InProgressButton.vue'

// 2. Props & Emits
const props = defineProps({
  selectedDate: {
    type: Object,
    default: null
  },
  yearRange: {
    type: Array,
    required: true,
    default: () => []
  },
  isReadLongAgo: {
    type: Boolean,
    default: false
  },
  isReadLately: {
    type: Boolean,
    default: false
  },
  isInProgress: {
    type: Boolean,
    default: false
  },
  isUnfinished: {
    type: Boolean,
    default: false
  },
  allowUnfinished: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['date-select'])

// 3. Composable
const {
  currentYear,
  isUnfinishedToggled,
  canDecrementYear,
  canIncrementYear,
  buttonBaseClasses,
  incrementYear,
  decrementYear,
  selectMonth,
  isFutureMonth,
  isSelectedMonth,
  computeMonthButtonClasses,
  handleReadLongAgo,
  handleReadLately,
  handleInProgress,
  getToggleButtonClasses
} = useDatePicker(props, emit)
</script>

<style scoped>
/* Enable container queries for responsive grid */
.picker-container {
  container-type: inline-size;
  container-name: picker;
}
</style>
