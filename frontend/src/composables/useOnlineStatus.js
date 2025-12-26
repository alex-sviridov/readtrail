/**
 * Online status composable
 * Provides reactive online/offline state across the application
 * Tracks both browser network status AND backend API availability
 */

import { ref, onMounted, onUnmounted } from 'vue'
import { logger } from '@/utils/logger'

// Shared reactive state across all component instances
const isOnline = ref(navigator.onLine)
const isApiAvailable = ref(true) // Separate tracking for API availability
const listeners = new Set()

/**
 * Handle online event
 */
function handleOnline() {
  isOnline.value = true
  logger.info('Connection restored (online)')

  // Notify all listeners (combined status)
  const combinedStatus = isOnline.value && isApiAvailable.value
  listeners.forEach(callback => callback(combinedStatus))
}

/**
 * Handle offline event
 */
function handleOffline() {
  isOnline.value = false
  logger.warn('Connection lost (offline)')

  // Notify all listeners (combined status)
  listeners.forEach(callback => callback(false))
}

/**
 * Set API availability status
 * @param {boolean} available - Whether API is available
 */
export function setApiAvailability(available) {
  const wasAvailable = isApiAvailable.value
  isApiAvailable.value = available

  // Only log and notify if status changed
  if (wasAvailable !== available) {
    if (available) {
      logger.info('API connection restored')
    } else {
      logger.warn('API connection lost')
    }

    // Notify all listeners (combined status)
    const combinedStatus = isOnline.value && isApiAvailable.value
    listeners.forEach(callback => callback(combinedStatus))
  }
}

// Set up global event listeners once
if (typeof window !== 'undefined') {
  window.addEventListener('online', handleOnline)
  window.addEventListener('offline', handleOffline)
}

/**
 * Composable for tracking online/offline status
 * Combines browser network status AND API availability
 * @param {Function} onChange - Optional callback when status changes
 * @returns {Object} Object with isOnline ref (combined status)
 */
export function useOnlineStatus(onChange = null) {
  // Register callback if provided
  if (onChange && typeof onChange === 'function') {
    // Check if we're in a component context (has onMounted)
    try {
      onMounted(() => {
        listeners.add(onChange)
      })

      onUnmounted(() => {
        listeners.delete(onChange)
      })
    } catch {
      // Not in component context (e.g., Pinia store), register directly
      listeners.add(onChange)
    }
  }

  // Return combined status: both network AND API must be available
  const combinedStatus = ref(true)

  // Watch both states and update combined status
  const updateCombinedStatus = () => {
    combinedStatus.value = isOnline.value && isApiAvailable.value
  }

  // Initial update
  updateCombinedStatus()

  // Add internal listener to keep combined status in sync
  const internalListener = () => updateCombinedStatus()

  // Try to use lifecycle hooks if in component context, otherwise register directly
  try {
    onMounted(() => {
      listeners.add(internalListener)

      onUnmounted(() => {
        listeners.delete(internalListener)
      })
    })
  } catch {
    // Not in component context (e.g., Pinia store), register directly
    // This listener will stay active for the lifetime of the store
    listeners.add(internalListener)
  }

  return {
    isOnline: combinedStatus,
    isNetworkOnline: isOnline,
    isApiAvailable
  }
}

/**
 * Get current online status (non-reactive)
 * @returns {boolean} True if both network and API are available
 */
export function getOnlineStatus() {
  return isOnline.value && isApiAvailable.value
}
