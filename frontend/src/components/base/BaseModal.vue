<template>
  <dialog
    ref="dialogRef"
    class="bg-white rounded-lg shadow-xl flex flex-col p-0 border-none"
    :class="[contentClass, maxHeightClass]"
    @click="handleDialogClick"
    @close="handleNativeClose"
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
    <div class="flex-1 overflow-y-auto" :class="bodyClass">
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
import { ref, onMounted, watch } from 'vue'
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
    default: 'max-w-2xl w-full'
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

// 4. Methods
function requestClose() {
  dialogRef.value?.close()
}

function handleDialogClick(event) {
  if (props.closeOnOverlayClick && event.target === dialogRef.value) {
    requestClose()
  }
}

function handleNativeClose() {
  emit('close')
  emit('update:isOpen', false)
}

// 5. Lifecycle - keep the <dialog>'s native open state in sync with isOpen
onMounted(() => {
  if (props.isOpen) {
    dialogRef.value.showModal()
  }
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
dialog {
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
