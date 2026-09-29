<template>
  <div class="space-y-6">
    <!-- Guest Mode -->
    <div v-if="isGuest" class="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
      <p class="text-sm text-yellow-800 mb-3">
        You're using guest mode. Your data is stored locally on this device only, so backup and import are available after you sign in.
      </p>
      <div class="flex gap-2">
        <router-link
          to="/login"
          class="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
        >
          Sign In
        </router-link>
        <router-link
          to="/login"
          class="px-4 py-2 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-50 transition-colors"
        >
          Create Account
        </router-link>
      </div>
    </div>

    <!-- Authenticated -->
    <div v-else class="space-y-6">
      <!-- Books Backup Section -->
      <div>
        <h3 class="text-lg font-semibold text-gray-800 mb-2">Books Backup</h3>
        <p class="text-sm text-gray-600 mb-4">
          Export your books to a file you can re-import later, or into another account
        </p>

        <div class="space-y-3">
          <!-- Export Books -->
          <div class="py-2">
            <div class="flex items-center justify-between gap-4">
              <h4 class="text-sm font-medium text-gray-800">Export Books</h4>
              <button
                @click="handleExportBooks"
                aria-label="Export Books"
                :disabled="isExportingBooks"
                class="flex items-center justify-center gap-2 w-28 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0 whitespace-nowrap"
              >
                <ArrowDownTrayIcon class="w-4 h-4" />
                Export
              </button>
            </div>
            <p class="text-xs text-gray-600 mt-0.5">
              Download a re-importable snapshot of your books
            </p>
          </div>

          <!-- Import Books -->
          <div class="py-2">
            <div class="flex items-center justify-between gap-4">
              <h4 class="text-sm font-medium text-gray-800">Import Books</h4>
              <button
                @click="triggerImportFilePicker"
                aria-label="Import Books"
                :disabled="isImportingBooks"
                class="flex items-center justify-center gap-2 w-28 px-4 py-2 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0 whitespace-nowrap"
              >
                <ArrowUpTrayIcon class="w-4 h-4" />
                Import
              </button>
              <input
                ref="importFileInputRef"
                type="file"
                accept="application/json"
                class="hidden"
                @change="handleImportFileSelected"
              />
            </div>
            <p class="text-xs text-gray-600 mt-0.5">
              Import books from a previously exported file. Existing books are skipped, not duplicated.
            </p>
          </div>
        </div>
      </div>

      <GoodreadsImportSection />
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useToast } from 'vue-toastification'
import { useQueryClient } from '@tanstack/vue-query'
import { authManager } from '@/services/auth'
import pb from '@/services/pocketbase'
import { BOOKS_QUERY_KEY } from '@/composables/useBooksQuery'
import GoodreadsImportSection from '@/components/settings/GoodreadsImportSection.vue'
import { ArrowDownTrayIcon, ArrowUpTrayIcon } from '@heroicons/vue/24/outline'

defineOptions({
  name: 'SettingsData'
})

const toast = useToast()
const queryClient = useQueryClient()

const isGuest = computed(() => authManager.isGuestUser())

const isExportingBooks = ref(false)
const isImportingBooks = ref(false)
const importFileInputRef = ref(null)

function downloadFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.style.display = 'none'

  document.body.appendChild(link)
  link.click()

  setTimeout(() => {
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }, 100)
}

const handleExportBooks = async () => {
  try {
    isExportingBooks.value = true
    const data = await pb.send('/api/books/export', { method: 'GET' })

    const timestamp = new Date().toISOString().split('T')[0]
    downloadFile(JSON.stringify(data, null, 2), `readtrail-books-backup-${timestamp}.json`, 'application/json')
    toast.success('Books exported successfully')
  } catch (error) {
    console.error('Books export error:', error)
    toast.error('Failed to export books. Please try again.')
  } finally {
    isExportingBooks.value = false
  }
}

const triggerImportFilePicker = () => {
  importFileInputRef.value?.click()
}

const handleImportFileSelected = async (event) => {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file) return

  try {
    isImportingBooks.value = true

    let payload
    try {
      payload = JSON.parse(await file.text())
    } catch {
      toast.error('That file is not valid JSON.')
      return
    }

    const result = await pb.send('/api/books/import', { method: 'POST', body: payload })

    toast.success(`Imported ${result.imported} book(s), skipped ${result.skipped} already in your library`)
    if (result.errors?.length) {
      toast.warning(`${result.errors.length} entr${result.errors.length === 1 ? 'y' : 'ies'} could not be imported`)
    }

    await queryClient.invalidateQueries({ queryKey: BOOKS_QUERY_KEY })
  } catch (error) {
    console.error('Books import error:', error)
    toast.error('Failed to import books. Please try again.')
  } finally {
    isImportingBooks.value = false
  }
}
</script>
