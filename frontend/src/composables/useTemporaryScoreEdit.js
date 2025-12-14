import { ref, onUnmounted } from 'vue'

/**
 * Composable for managing temporary score edit mode with auto-timeout
 * @param {number} duration - Duration in milliseconds before auto-disabling (default: 5000)
 * @returns {Object} - { isEditing, start, stop }
 */
export function useTemporaryScoreEdit(duration = 5000) {
  const isEditing = ref(false)
  let timer = null

  const start = () => {
    // Clear any existing timer
    if (timer) {
      clearTimeout(timer)
    }

    isEditing.value = true
    timer = setTimeout(() => {
      isEditing.value = false
      timer = null
    }, duration)
  }

  const stop = () => {
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
    isEditing.value = false
  }

  // Cleanup on unmount
  onUnmounted(() => {
    if (timer) {
      clearTimeout(timer)
    }
  })

  return {
    isEditing,
    start,
    stop
  }
}
