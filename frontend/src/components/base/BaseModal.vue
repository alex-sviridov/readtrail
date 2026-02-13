<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="isOpen"
        class="fixed inset-0 z-50 flex items-start sm:items-center justify-center pt-4 sm:pt-0 p-4 bg-black bg-opacity-50"
        :class="overlayClass"
        @click.self="handleOverlayClick"
      >
        <div
          role="dialog"
          class="bg-white rounded-lg shadow-xl flex flex-col"
          :class="[contentClass, maxHeightClass]"
        >
          <!-- Modal Header -->
          <div class="flex items-center justify-between p-6 border-b" :class="headerClass">
            <h2 class="text-2xl font-semibold text-gray-900" :class="titleClass">
              <slot name="title">{{ title }}</slot>
            </h2>
            <button
              v-if="showCloseButton"
              @click="close"
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
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
// 1. Imports
import { XMarkIcon } from '@heroicons/vue/24/outline'
import { useEscapeKey } from '@/composables/useClickOutside'

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
  overlayClass: {
    type: String,
    required: false,
    default: ''
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

// 3. Methods
function close() {
  emit('close')
  emit('update:isOpen', false)
}

function handleOverlayClick() {
  if (props.closeOnOverlayClick) {
    close()
  }
}

// 4. Lifecycle - Composables with side effects
useEscapeKey(() => {
  if (props.isOpen) {
    close()
  }
})
</script>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-active .bg-white,
.modal-leave-active .bg-white {
  transition: transform 0.2s ease;
}

.modal-enter-from .bg-white,
.modal-leave-to .bg-white {
  transform: scale(0.95);
}
</style>
