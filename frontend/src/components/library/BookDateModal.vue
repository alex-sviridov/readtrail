<template>
  <BaseModal
    :is-open="isOpen"
    :title="`Edit Date - ${book.name}`"
    content-class="max-w-md w-[calc(100%-2rem)]"
    max-height-class="max-h-[90vh]"
    body-class="p-0"
    @close="emit('close')"
  >
    <DatePicker
      :selected-date="selectedDate"
      :year-range="yearRange"
      :is-read-long-ago="isReadLongAgo"
      :is-read-lately="isReadLately"
      :is-in-progress="isInProgress"
      :is-unfinished="book.attributes?.isUnfinished || false"
      :allow-unfinished="settings.settings.allowUnfinishedReading"
      @date-select="handleDateSelect"
    />
  </BaseModal>
</template>

<script setup>
import { computed } from 'vue'
import BaseModal from '@/components/base/BaseModal.vue'
import DatePicker from '@/components/library/DatePicker.vue'
import { BOOK_STATUS } from '@/constants'

const props = defineProps({
  isOpen: {
    type: Boolean,
    required: true
  },
  book: {
    type: Object,
    required: true
  },
  settings: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['close', 'save'])

// Compute date-related props for DatePicker
const selectedDate = computed(() => {
  if (props.book.year && props.book.month) {
    return {
      year: props.book.year,
      month: props.book.month - 1 // DatePicker uses 0-indexed months
    }
  }
  return null
})

const yearRange = computed(() => {
  const currentYear = new Date().getFullYear()
  const years = []
  for (let year = currentYear; year >= currentYear - 50; year--) {
    years.push(year)
  }
  return years
})

const isReadLongAgo = computed(() => BOOK_STATUS.isReadLongAgo(props.book.year))

const isReadLately = computed(() => BOOK_STATUS.isReadLately(props.book.year))

const isInProgress = computed(() => {
  return props.book.year === null && props.book.month === null
})

const handleDateSelect = (dateInfo) => {
  if (dateInfo === null) {
    // In Progress
    emit('save', {
      id: props.book.id,
      year: null,
      month: null,
      isUnfinished: false,
      score: 0
    })
  } else {
    const { year, month, isUnfinished } = dateInfo
    emit('save', {
      id: props.book.id,
      year,
      month: month + 1, // Convert back to 1-indexed
      isUnfinished,
      score: props.book.attributes?.score ?? null
    })
  }
  emit('close')
}
</script>
