<template>
  <div class="container mx-auto px-4 py-8 max-w-7xl">
    <LibraryHeader
      :view-mode="viewMode"
      :hide-unfinished="hideUnfinished"
      :hide-to-read="hideToRead"
      :search-query="searchQuery"
      @update:search-query="$emit('update:search-query', $event)"
      @set-view-mode="$emit('set-view-mode', $event)"
      @toggle-filter="$emit('toggle-filter')"
      @toggle-to-read-filter="$emit('toggle-to-read-filter')"
      @clear-all-filters="$emit('clear-all-filters')"
      @add-book="$emit('add-book')"
    />

    <slot></slot>

    <BookSearch
      :is-open="isSearchModalOpen"
      @close="$emit('close-search-modal')"
      @select="$emit('select-book', $event)"
    />
  </div>
</template>

<script setup>
import LibraryHeader from '@/components/library/LibraryHeader.vue'
import BookSearch from '@/components/library/BookSearch.vue'

defineProps({
  viewMode: {
    type: String,
    required: true
  },
  hideUnfinished: {
    type: Boolean,
    required: true
  },
  hideToRead: {
    type: Boolean,
    required: true
  },
  searchQuery: {
    type: String,
    required: false,
    default: ''
  },
  isSearchModalOpen: {
    type: Boolean,
    required: true
  }
})

defineEmits([
  'update:search-query',
  'set-view-mode',
  'toggle-filter',
  'toggle-to-read-filter',
  'clear-all-filters',
  'add-book',
  'close-search-modal',
  'select-book'
])
</script>
