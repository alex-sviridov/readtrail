import { ref } from 'vue'
import { fetchImageAsFile } from '@/utils/imageFetcher'
import { useToast } from 'vue-toastification'

/**
 * Composable for image fetching state management
 * Handles toast notifications for file size errors
 * @returns {Object} Image fetch state and methods
 */
export function useImageFetch() {
  const isLoading = ref(false)
  const error = ref(null)
  const file = ref(null)
  const warning = ref(null)
  const toast = useToast()

  async function fetchImage(url, filename = 'cover') {
    if (!url) {
      reset()
      return
    }

    isLoading.value = true
    error.value = null
    warning.value = null

    const result = await fetchImageAsFile(url, filename)

    isLoading.value = false

    if (result.success) {
      file.value = result.file
      warning.value = result.warning || null
    } else {
      file.value = null
      error.value = result.error

      // Show toast notification if file is too large and fallback should be used
      if (result.useFallback && result.sizeInKB) {
        toast.warning(
          `Image file is too large (${result.sizeInKB}KB). Using URL link instead. Maximum file size: 512KB.`,
          { timeout: 5000 }
        )
      }
    }

    return result
  }

  function reset() {
    isLoading.value = false
    error.value = null
    file.value = null
    warning.value = null
  }

  return {
    isLoading,
    error,
    file,
    warning,
    fetchImage,
    reset
  }
}
