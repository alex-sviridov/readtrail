import { watch, ref, onMounted, onUnmounted } from 'vue'
import { useToast } from 'vue-toastification'
import { useOnlineStatus } from './useOnlineStatus'
import { useBooksStore } from '@/stores/books'
import { useSettingsStore } from '@/stores/settings'
import { authManager } from '@/services/auth'
import { syncQueue } from '@/services/syncQueue'

export function useSyncNotifications() {
  const toast = useToast()
  const { isOnline } = useOnlineStatus()
  const booksStore = useBooksStore()
  const settingsStore = useSettingsStore()
  const wasOffline = ref(false)

  // Track when we go offline
  watch(isOnline, (online) => {
    if (!online) {
      wasOffline.value = true
    }
  })

  // Only notify on sync completion if we were offline (delayed sync)
  watch(() => booksStore.syncStatus, (status, oldStatus) => {
    if (authManager.isGuestUser()) return

    // Success after offline
    if (status === 'idle' && oldStatus === 'syncing' && wasOffline.value) {
      const pendingCount = syncQueue.getPendingCount()
      if (pendingCount === 0) {
        toast.success('All changes synced successfully')
        wasOffline.value = false
      }
    }

    // Error
    if (status === 'error' && oldStatus === 'syncing') {
      toast.error('Sync failed. Changes saved locally. Click the error badge to retry.', {
        timeout: 6000
      })
    }
  })

  // Settings sync errors
  watch(() => settingsStore.syncStatus, (status, oldStatus) => {
    if (authManager.isGuestUser()) return

    if (status === 'error' && oldStatus === 'syncing') {
      toast.error('Settings sync failed. Will retry automatically.')
    }
  })

  // Migration event listeners
  const handleMigrationSuccess = (event) => {
    const { count } = event.detail
    toast.success(`Migrated ${count} ${count === 1 ? 'book' : 'books'} to your account`, {
      timeout: 5000
    })
  }

  const handleMigrationError = () => {
    toast.error('Failed to sync local books. Please try again.', {
      timeout: 6000
    })
  }

  onMounted(() => {
    window.addEventListener('migration-success', handleMigrationSuccess)
    window.addEventListener('migration-error', handleMigrationError)
  })

  onUnmounted(() => {
    window.removeEventListener('migration-success', handleMigrationSuccess)
    window.removeEventListener('migration-error', handleMigrationError)
  })
}
