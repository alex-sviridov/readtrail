import { ref } from 'vue'
import { fetchImageAsFile } from '@/utils/imageFetcher'

/**
 * Composable for image fetching state management
 * @returns {Object} Image fetch state and methods
 */
export function useImageFetch() {
  const isLoading = ref(false)
  const error = ref(null)
  const file = ref(null)
  const warning = ref(null)

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
