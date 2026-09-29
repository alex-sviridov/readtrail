<template>
  <div class="border-t border-gray-200 pt-6">
    <h3 class="text-lg font-semibold text-gray-800 mb-2">Import from Goodreads</h3>
    <p class="text-sm text-gray-600 mb-4">
      Export your library from Goodreads (My Books, then Import and export, then Export Library) and upload the CSV here.
      Books already in your library are skipped, and covers are looked up automatically.
    </p>

    <div class="flex items-center justify-between gap-4">
      <h4 class="text-sm font-medium text-gray-800">Goodreads CSV</h4>
      <button
        type="button"
        @click="triggerFilePicker"
        aria-label="Import Goodreads CSV"
        :disabled="isImporting"
        class="flex items-center justify-center gap-2 w-28 px-4 py-2 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0 whitespace-nowrap"
      >
        <ArrowUpTrayIcon class="w-4 h-4" />
        Import
      </button>
      <input
        ref="fileInputRef"
        type="file"
        accept=".csv,text/csv"
        class="hidden"
        data-testid="goodreads-file-input"
        @change="handleFileSelected"
      />
    </div>

    <div
      v-if="isImporting"
      role="status"
      class="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800"
    >
      <div class="flex items-center justify-between gap-4">
        <p>
          <template v-if="progress.total">Importing books: {{ progress.done }} of {{ progress.total }}.</template>
          <template v-else>Reading your file...</template>
          Looking up covers takes a while, so please keep this page open.
        </p>
        <button
          type="button"
          @click="cancel"
          class="shrink-0 px-3 py-1 bg-white border border-blue-300 text-blue-800 rounded-md hover:bg-blue-100 transition-colors"
        >
          Cancel
        </button>
      </div>
      <div class="mt-3 h-2 rounded-full bg-blue-200 overflow-hidden" aria-hidden="true">
        <div class="h-full bg-blue-600 transition-all" :style="{ width: `${progressPercent}%` }"></div>
      </div>
    </div>

    <div
      v-else-if="result"
      role="status"
      class="mt-4 space-y-3"
    >
      <div class="bg-green-50 border border-green-200 rounded-lg p-4 text-sm text-green-800">
        <p v-if="result.cancelled" class="font-medium mb-1">Import cancelled.</p>
        <p class="font-medium">
          Imported {{ result.imported }} {{ result.imported === 1 ? 'book' : 'books' }}, skipped {{ result.skipped }} already in your library.
        </p>
        <p v-if="result.imported > 0" class="mt-1">
          Found covers for {{ result.covers.found }} of {{ result.imported }}.
          <span v-if="result.covers.skipped > 0">
            Cover lookup stopped early, so {{ result.covers.skipped }} {{ result.covers.skipped === 1 ? 'book was' : 'books were' }} left without one.
          </span>
        </p>
      </div>

      <div v-if="result.errors?.length" class="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
        <p class="font-medium">
          {{ result.errors.length }} {{ result.errors.length === 1 ? 'row' : 'rows' }} could not be imported.
        </p>
        <details class="mt-2">
          <summary class="cursor-pointer">Show details</summary>
          <ul class="mt-2 list-disc pl-5 space-y-1">
            <li v-for="err in result.errors" :key="err.index">Row {{ err.index + 1 }}: {{ err.reason }}</li>
          </ul>
        </details>
      </div>
    </div>

    <div
      v-else-if="errorMessage"
      role="alert"
      class="mt-4 bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-800"
    >
      {{ errorMessage }}
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { ArrowUpTrayIcon } from '@heroicons/vue/24/outline'
import { useGoodreadsImport } from '@/composables/useGoodreadsImport'

defineOptions({
  name: 'GoodreadsImportSection'
})

const { importFile, cancel, isImporting, result, errorMessage, progress } = useGoodreadsImport()

const fileInputRef = ref(null)

const progressPercent = computed(() =>
  progress.value.total ? Math.round((progress.value.done / progress.value.total) * 100) : 0
)

const triggerFilePicker = () => {
  fileInputRef.value?.click()
}

const handleFileSelected = (event) => {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (file) importFile(file)
}
</script>
