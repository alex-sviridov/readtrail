<template>
  <dialog
    ref="dialogRef"
    class="bg-white rounded-lg shadow-xl flex flex-col p-0 border-none"
    :class="[contentClass, maxHeightClass]"
    :style="viewportStyle"
    @click="handleDialogClick"
    @cancel="handleCancel"
  >
    <!-- Modal Header -->
    <div class="flex items-center justify-between p-6 border-b" :class="headerClass">
      <h2 class="text-2xl font-semibold text-gray-900" :class="titleClass">
        <slot name="title">{{ title }}</slot>
      </h2>
      <button
        v-if="showCloseButton"
        @click="requestClose"
        class="text-gray-400 hover:text-gray-600 transition-colors"
        aria-label="Close"
      >
        <XMarkIcon class="w-6 h-6" />
      </button>
    </div>

    <!-- Modal Body -->
    <div class="flex-auto overflow-y-auto" :class="bodyClass">
      <slot></slot>
    </div>

    <!-- Modal Footer (optional) -->
    <div v-if="$slots.footer" class="border-t" :class="footerClass">
      <slot name="footer"></slot>
    </div>
  </dialog>
</template>

<script setup>
// 1. Imports
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { XMarkIcon } from '@heroicons/vue/24/outline'

// 2. Props & Emits
const props = defineProps({
  isOpen: {
    type: Boolean,
    required: false,
    default: false
  },
  title: {
    type: String,
    required: false,
    default: ''
  },
  showCloseButton: {
    type: Boolean,
    required: false,
    default: true
  },
  closeOnOverlayClick: {
    type: Boolean,
    required: false,
    default: true
  },
  contentClass: {
    type: String,
    required: false,
    default: 'max-w-2xl w-[calc(100%-2rem)]'
  },
  maxHeightClass: {
    type: String,
    required: false,
    default: 'max-h-[80vh]'
  },
  headerClass: {
    type: String,
    required: false,
    default: ''
  },
  titleClass: {
    type: String,
    required: false,
    default: ''
  },
  bodyClass: {
    type: String,
    required: false,
    default: 'p-6'
  },
  footerClass: {
    type: String,
    required: false,
    default: 'p-6'
  }
})

const emit = defineEmits(['close', 'update:isOpen'])

// 3. Local State
const dialogRef = ref(null)
const viewportMaxHeight = ref(null)
const viewportTop = ref(null)

const viewportStyle = computed(() => (
  viewportMaxHeight.value
    ? { maxHeight: `${viewportMaxHeight.value}px`, top: `${viewportTop.value}px`, margin: '0 auto' }
    : {}
))

// 4. Methods
// The dialog's default `margin: auto` centers it against the layout
// viewport, which mobile browsers don't shrink when the on-screen keyboard
// opens -- only the visual viewport shrinks (and shifts down via
// offsetTop). Without correcting for that, a modal short enough to fit
// the visible area can still be positioned partly behind the keyboard.
// Anchoring `top` to the visual viewport keeps it fully on screen; with no
// keyboard open, offsetTop is 0 and this matches the normal centered look.
function updateViewportMaxHeight() {
  if (window.visualViewport) {
    const margin = 8
    viewportMaxHeight.value = Math.round(window.visualViewport.height - margin * 2)
    viewportTop.value = Math.round(window.visualViewport.offsetTop + margin)
  }
}
function requestClose() {
  emit('close')
  emit('update:isOpen', false)
}

function handleDialogClick(event) {
  if (props.closeOnOverlayClick && event.target === dialogRef.value) {
    requestClose()
  }
}

function handleCancel(event) {
  // Prevent the dialog from closing itself on Escape. Closing is a request
  // (requestClose) that the parent may veto by not updating isOpen (e.g.
  // ChangePasswordModal/DeleteAccountModal while an operation is in flight)
  // -- the watch below is the only thing that ever actually closes the dialog.
  event.preventDefault()
  requestClose()
}

// 5. Lifecycle - keep the <dialog>'s native open state in sync with isOpen
onMounted(() => {
  if (props.isOpen) {
    dialogRef.value.showModal()
  }
  updateViewportMaxHeight()
  window.visualViewport?.addEventListener('resize', updateViewportMaxHeight)
  window.visualViewport?.addEventListener('scroll', updateViewportMaxHeight)
})

onUnmounted(() => {
  window.visualViewport?.removeEventListener('resize', updateViewportMaxHeight)
  window.visualViewport?.removeEventListener('scroll', updateViewportMaxHeight)
})

watch(() => props.isOpen, (isOpen) => {
  if (isOpen) {
    if (!dialogRef.value.open) dialogRef.value.showModal()
  } else {
    dialogRef.value.close()
  }
})
</script>

<style scoped>
/* Tailwind's `flex` class on the <dialog> element (an author-origin rule)
   otherwise overrides the browser's built-in `dialog:not([open])` default,
   which would normally hide a closed dialog regardless of its class list. */
dialog:not([open]) {
  display: none;
}

dialog {
  /* Tailwind's Preflight reset sets margin: 0 on every element (also
     author CSS), overriding the browser's default dialog[open] centering
     (position: fixed; inset: 0; margin: auto). Restore it explicitly. */
  margin: auto;
  opacity: 0;
  transform: scale(0.95);
  transition: opacity 0.2s ease, transform 0.2s ease, overlay 0.2s allow-discrete, display 0.2s allow-discrete;
}

dialog[open] {
  opacity: 1;
  transform: scale(1);
}

@starting-style {
  dialog[open] {
    opacity: 0;
    transform: scale(0.95);
  }
}

dialog::backdrop {
  background: rgb(0 0 0 / 0.5);
  opacity: 0;
  transition: opacity 0.2s ease, overlay 0.2s allow-discrete, display 0.2s allow-discrete;
}

dialog[open]::backdrop {
  opacity: 1;
}

@starting-style {
  dialog[open]::backdrop {
    opacity: 0;
  }
}
</style>
