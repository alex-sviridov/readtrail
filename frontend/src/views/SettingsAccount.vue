<template>
  <div class="space-y-6">
    <!-- Guest Mode -->
    <div v-if="isGuest" class="space-y-4">
      <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <p class="text-sm text-yellow-800 mb-3">
          You're using guest mode. Your data is stored locally on this device only.
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
    </div>

    <!-- Authenticated -->
    <div v-else class="space-y-6">
      <!-- Account Information -->
      <div class="space-y-4">
        <div class="flex items-center justify-between py-3">
          <div>
            <h3 class="text-base font-medium text-gray-800">Email</h3>
            <p class="text-sm text-gray-600 mt-1">{{ userEmail }}</p>
          </div>
        </div>
        <div class="flex items-center justify-between py-3 border-t border-gray-200">
          <div>
            <h3 class="text-base font-medium text-gray-800">Account Status</h3>
            <p class="text-sm text-gray-600 mt-1">Signed in and syncing</p>
          </div>
        </div>
      </div>

      <!-- Change Password Section -->
      <div class="border-t border-gray-200 pt-6">
        <div class="flex items-center justify-between">
          <div>
            <h3 class="text-lg font-semibold text-gray-800">Change Password</h3>
            <p class="text-sm text-gray-600 mt-1">Update your account password</p>
          </div>
          <button
            @click="showPasswordModal = true"
            class="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
          >
            Change Password
          </button>
        </div>
      </div>

      <!-- Data & Privacy Section -->
      <div class="border-t border-gray-200 pt-6">
        <h3 class="text-lg font-semibold text-gray-800 mb-2">Data & Privacy</h3>
        <p class="text-sm text-gray-600 mb-4">
          Export your data or review our privacy policy
        </p>

        <div class="space-y-3">
          <!-- Export JSON -->
          <div class="flex items-center justify-between py-2">
            <div>
              <h4 class="text-sm font-medium text-gray-800">Export All Data (JSON)</h4>
              <p class="text-xs text-gray-600 mt-0.5">
                Download complete account data including books and settings
              </p>
            </div>
            <button
              @click="handleExportJSON"
              :disabled="isExporting"
              class="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ArrowDownTrayIcon class="w-4 h-4" />
              Export JSON
            </button>
          </div>

          <!-- Export CSV -->
          <div class="flex items-center justify-between py-2">
            <div>
              <h4 class="text-sm font-medium text-gray-800">Export Books (CSV)</h4>
              <p class="text-xs text-gray-600 mt-0.5">
                Download books list in spreadsheet format
              </p>
            </div>
            <button
              @click="handleExportCSV"
              :disabled="isExporting"
              class="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ArrowDownTrayIcon class="w-4 h-4" />
              Export CSV
            </button>
          </div>

          <!-- Privacy Policy Link -->
          <div class="flex items-center justify-between py-2">
            <div>
              <h4 class="text-sm font-medium text-gray-800">Privacy Policy</h4>
              <p class="text-xs text-gray-600 mt-0.5">
                Learn how we handle your data
              </p>
            </div>
            <router-link
              to="/privacy"
              class="px-3 py-2 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-50 transition-colors"
            >
              View Policy
            </router-link>
          </div>
        </div>
      </div>

      <!-- Books Backup Section -->
      <div class="border-t border-gray-200 pt-6">
        <h3 class="text-lg font-semibold text-gray-800 mb-2">Books Backup</h3>
        <p class="text-sm text-gray-600 mb-4">
          Export your books to a file you can re-import later, or into another account
        </p>

        <div class="space-y-3">
          <!-- Export Books -->
          <div class="flex items-center justify-between py-2">
            <div>
              <h4 class="text-sm font-medium text-gray-800">Export Books</h4>
              <p class="text-xs text-gray-600 mt-0.5">
                Download a re-importable snapshot of your books
              </p>
            </div>
            <button
              @click="handleExportBooks"
              :disabled="isExportingBooks"
              class="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ArrowDownTrayIcon class="w-4 h-4" />
              Export Books
            </button>
          </div>

          <!-- Import Books -->
          <div class="flex items-center justify-between py-2">
            <div>
              <h4 class="text-sm font-medium text-gray-800">Import Books</h4>
              <p class="text-xs text-gray-600 mt-0.5">
                Import books from a previously exported file. Existing books are skipped, not duplicated.
              </p>
            </div>
            <button
              @click="triggerImportFilePicker"
              :disabled="isImportingBooks"
              class="flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ArrowUpTrayIcon class="w-4 h-4" />
              Import Books
            </button>
            <input
              ref="importFileInputRef"
              type="file"
              accept="application/json"
              class="hidden"
              @change="handleImportFileSelected"
            />
          </div>
        </div>
      </div>

      <!-- Danger Zone Section -->
      <div class="border-t border-gray-200 pt-6">
        <div class="bg-red-50 border border-red-200 rounded-lg p-4">
          <div class="flex items-start">
            <ExclamationTriangleIcon class="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
            <div class="ml-3 flex-1">
              <h3 class="text-sm font-medium text-red-800">Danger Zone</h3>
              <p class="text-sm text-red-700 mt-1">
                Once you delete your account, there is no going back. This will permanently delete your account and all associated data.
              </p>
              <button
                @click="showDeleteModal = true"
                class="mt-3 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 transition-colors"
              >
                Delete Account
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Sign Out Section -->
      <div class="border-t border-gray-200 pt-6">
        <button
          @click="handleLogout"
          class="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 transition-colors"
        >
          Sign Out
        </button>
      </div>
    </div>

    <!-- Change Password Modal -->
    <ChangePasswordModal
      ref="passwordModalRef"
      :is-open="showPasswordModal"
      @close="showPasswordModal = false"
      @submit="handlePasswordChange"
    />

    <!-- Delete Account Modal -->
    <DeleteAccountModal
      ref="deleteModalRef"
      :is-open="showDeleteModal"
      :book-count="booksStore.books.length"
      @close="showDeleteModal = false"
      @confirm="handleDeleteAccount"
    />
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useToast } from 'vue-toastification'
import { useQueryClient } from '@tanstack/vue-query'
import { authManager } from '@/services/auth'
import pb from '@/services/pocketbase'
import { useBooksStore } from '@/stores/books'
import { useSettingsStore } from '@/stores/settings'
import { exportUserDataAsJSON, exportBooksAsCSV, downloadFile } from '@/services/dataExport'
import { BOOKS_QUERY_KEY } from '@/composables/useBooksQuery'
import ChangePasswordModal from '@/components/settings/ChangePasswordModal.vue'
import DeleteAccountModal from '@/components/settings/DeleteAccountModal.vue'
import { ArrowDownTrayIcon, ArrowUpTrayIcon, ExclamationTriangleIcon } from '@heroicons/vue/24/outline'

defineOptions({
  name: 'SettingsAccount'
})

const toast = useToast()
const queryClient = useQueryClient()

// Stores
const booksStore = useBooksStore()
const settingsStore = useSettingsStore()

// Auth state
const isGuest = computed(() => authManager.isGuestUser())
const userEmail = computed(() => authManager.getCurrentUser()?.email || null)

// Password change state
const showPasswordModal = ref(false)
const passwordModalRef = ref(null)

// Data export state
const isExporting = ref(false)

// Delete account state
const showDeleteModal = ref(false)
const deleteModalRef = ref(null)

// Books backup state
const isExportingBooks = ref(false)
const isImportingBooks = ref(false)
const importFileInputRef = ref(null)

const handlePasswordChange = async (passwordData) => {
  try {
    await authManager.changePassword(
      passwordData.oldPassword,
      passwordData.newPassword,
      passwordData.passwordConfirm
    )

    toast.success('Password changed successfully')
    passwordModalRef.value?.handleSuccess()
  } catch (error) {
    console.error('Password change error:', error)
    passwordModalRef.value?.setError(
      error.message || 'Failed to change password. Please check your current password and try again.'
    )
  }
}

const handleLogout = async () => {
  await authManager.logout()
  toast.success('Signed out successfully')
  // Small delay to show toast before redirect
  setTimeout(() => {
    window.location.href = '/login'
  }, 500)
}

const handleExportJSON = () => {
  try {
    isExporting.value = true
    exportUserDataAsJSON(booksStore.books, settingsStore.settings)
    toast.success('Data exported successfully')
  } catch (error) {
    console.error('Export error:', error)
    toast.error('Failed to export data. Please try again.')
  } finally {
    isExporting.value = false
  }
}

const handleExportCSV = () => {
  try {
    isExporting.value = true
    exportBooksAsCSV(booksStore.books)
    toast.success('Books exported successfully')
  } catch (error) {
    console.error('Export error:', error)
    toast.error('Failed to export books. Please try again.')
  } finally {
    isExporting.value = false
  }
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

function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(reader.error)
    reader.readAsText(file)
  })
}

const handleImportFileSelected = async (event) => {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file) return

  try {
    isImportingBooks.value = true

    let payload
    try {
      payload = JSON.parse(await readFileAsText(file))
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

const handleDeleteAccount = async () => {
  try {
    await authManager.deleteAccount()
    toast.success('Account deleted successfully')
    // User is already logged out and redirected by deleteAccount()
  } catch (error) {
    console.error('Delete account error:', error)
    deleteModalRef.value?.setError(
      error.message || 'Failed to delete account. Please try again.'
    )
  }
}
</script>
