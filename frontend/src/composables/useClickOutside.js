import { onMounted, onBeforeUnmount } from 'vue'

/**
 * Shared click-outside detection using true event delegation: one
 * document-level listener no matter how many components call this, each
 * registering an entry in a shared registry instead of its own listener.
 * With N components (e.g. one per book card), this keeps exactly one
 * 'click' listener on document instead of N.
 *
 * @param {Ref} elementRef - Vue ref to the element to detect clicks outside of
 * @param {Function} callback - Function to call when a click occurs outside the element
 * @returns {Function} Cleanup function to remove this registration
 */
export function useClickOutside(elementRef, callback) {
  const entry = { elementRef, callback }
  let timeoutId = null

  function unregister() {
    clearTimeout(timeoutId)
    clickRegistry.delete(entry)
    detachClickListenerIfUnused()
  }

  onMounted(() => {
    // Small delay to prevent immediate triggering on the same click that might have opened a modal
    timeoutId = setTimeout(() => {
      attachClickListener()
      clickRegistry.add(entry)
    }, 0)
  })

  onBeforeUnmount(unregister)

  return unregister
}

/**
 * Shared escape key detection using true event delegation: one
 * document-level listener no matter how many components call this, each
 * registering a callback in a shared registry instead of its own listener.
 *
 * @param {Function} callback - Function to call when Escape key is pressed
 * @returns {Function} Cleanup function to remove this registration
 */
export function useEscapeKey(callback) {
  function unregister() {
    escapeRegistry.delete(callback)
    detachKeydownListenerIfUnused()
  }

  onMounted(() => {
    attachKeydownListener()
    escapeRegistry.add(callback)
  })

  onBeforeUnmount(unregister)

  return unregister
}

// --- Shared delegation registries (module-level: one listener, many registrants) ---

const clickRegistry = new Set()
let clickListenerAttached = false

function handleDocumentClick(event) {
  for (const { elementRef, callback } of clickRegistry) {
    if (elementRef.value && !elementRef.value.contains(event.target)) {
      callback(event)
    }
  }
}

function attachClickListener() {
  if (!clickListenerAttached) {
    document.addEventListener('click', handleDocumentClick)
    clickListenerAttached = true
  }
}

function detachClickListenerIfUnused() {
  if (clickListenerAttached && clickRegistry.size === 0) {
    document.removeEventListener('click', handleDocumentClick)
    clickListenerAttached = false
  }
}

const escapeRegistry = new Set()
let keydownListenerAttached = false

function handleDocumentKeydown(event) {
  if (event.key !== 'Escape') return
  for (const callback of escapeRegistry) {
    callback(event)
  }
}

function attachKeydownListener() {
  if (!keydownListenerAttached) {
    document.addEventListener('keydown', handleDocumentKeydown)
    keydownListenerAttached = true
  }
}

function detachKeydownListenerIfUnused() {
  if (keydownListenerAttached && escapeRegistry.size === 0) {
    document.removeEventListener('keydown', handleDocumentKeydown)
    keydownListenerAttached = false
  }
}
