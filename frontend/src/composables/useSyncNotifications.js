import { watch, ref, onMounted, onUnmounted } from 'vue'
import { useToast } from 'vue-toastification'
import { useOnline } from '@vueuse/core'
import { authManager } from '@/services/auth'

/**
 * Toast notifications for guest→account migration and for the
 * offline→online transition. There is no sync queue to report on
 * anymore: a failed write surfaces its own error where it happens.
 */
export function useSyncNotifications() {
  const toast = useToast()
  const isOnline = useOnline()
  const wasOffline = ref(false)

  watch(isOnline, (online) => {
    if (authManager.isGuestUser()) return

    if (!online) {
      wasOffline.value = true
    } else if (wasOffline.value) {
      toast.success('Back online')
      wasOffline.value = false
    }
  })

  const handleMigrationSuccess = (event) => {
    const { count } = event.detail
    toast.success(`Migrated ${count} ${count === 1 ? 'book' : 'books'} to your account`, { timeout: 5000 })
  }

  const handleMigrationError = () => {
    toast.error('Failed to sync local books. Please try again.', { timeout: 6000 })
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
