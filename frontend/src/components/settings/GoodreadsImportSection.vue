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
      class="mt-4 flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800"
    >
      <span class="mt-0.5 h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-blue-300 border-t-blue-700" aria-hidden="true"></span>
      <p>Importing your books. Looking up covers can take a couple of minutes, so please keep this page open.</p>
    </div>

    <div
      v-else-if="result"
      role="status"
      class="mt-4 space-y-3"
    >
      <div class="bg-green-50 border border-green-200 rounded-lg p-4 text-sm text-green-800">
        <p class="font-medium">
          Imported {{ result.imported }} {{ result.imported === 1 ? 'book' : 'books' }}, skipped {{ result.skipped }} already in your library.
        </p>
        <p v-if="result.covers && result.imported > 0" class="mt-1">
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
import { ref } from 'vue'
import { useQueryClient } from '@tanstack/vue-query'
import { ArrowUpTrayIcon } from '@heroicons/vue/24/outline'
import pb from '@/services/pocketbase'
import { BOOKS_QUERY_KEY } from '@/composables/useBooksQuery'

defineOptions({
  name: 'GoodreadsImportSection'
})

const MAX_FILE_BYTES = 10 * 1024 * 1024

const queryClient = useQueryClient()

const fileInputRef = ref(null)
const isImporting = ref(false)
const result = ref(null)
const errorMessage = ref('')

const triggerFilePicker = () => {
  fileInputRef.value?.click()
}

function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(reader.error)
    reader.readAsText(file)
  })
}

function messageForError(error) {
  if (error?.status === 413) {
    return 'That file is too large (the limit is 10 MB).'
  }
  if (error?.status === 400 && error.response?.message) {
    return error.response.message
  }
  return 'Import failed. Please try again.'
}

const handleFileSelected = async (event) => {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file) return

  result.value = null
  errorMessage.value = ''

  if (!/\.csv$/i.test(file.name)) {
    errorMessage.value = 'Please choose the .csv file exported from Goodreads.'
    return
  }
  if (file.size > MAX_FILE_BYTES) {
    errorMessage.value = 'That file is too large (the limit is 10 MB).'
    return
  }

  try {
    isImporting.value = true
    const text = await readFileAsText(file)
    result.value = await pb.send('/api/books/import/goodreads', {
      method: 'POST',
      headers: { 'Content-Type': 'text/csv' },
      body: text
    })
    await queryClient.invalidateQueries({ queryKey: BOOKS_QUERY_KEY })
  } catch (error) {
    console.error('Goodreads import error:', error)
    errorMessage.value = messageForError(error)
  } finally {
    isImporting.value = false
  }
}
</script>
