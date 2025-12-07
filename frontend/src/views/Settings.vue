<template>
  <div class="container mx-auto px-4 py-8 max-w-4xl">
    <div class="mb-8">
      <h1 class="text-3xl font-bold text-gray-800 mb-2">Settings</h1>
      <p class="text-gray-600">Manage your application preferences</p>
    </div>

    <div class="bg-white rounded-lg shadow-md p-6">
      <div class="space-y-6">
        <!-- Dynamically generated settings sections -->
        <div v-for="section in settingsConfig" :key="section.section">
          <h2 class="text-xl font-semibold text-gray-800 mb-4">{{ section.section }}</h2>

          <div class="space-y-4">
            <!-- Dynamically generated settings items -->
            <div
              v-for="setting in section.settings"
              :key="setting.key"
              class="flex items-center justify-between py-3 border-b border-gray-200"
            >
              <div>
                <h3 class="text-base font-medium text-gray-800">{{ setting.label }}</h3>
                <p class="text-sm text-gray-600 mt-1">{{ setting.description }}</p>
              </div>

              <!-- Toggle Switch -->
              <button
                v-if="setting.type === 'toggle'"
                @click="setting.toggle"
                :class="[
                  'relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
                  setting.value ? 'bg-blue-600' : 'bg-gray-300'
                ]"
                role="switch"
                :aria-checked="setting.value"
              >
                <span
                  :class="[
                    'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                    setting.value ? 'translate-x-6' : 'translate-x-1'
                  ]"
                />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Back to Library Button -->
    <div class="mt-6">
      <button
        @click="goToLibrary"
        class="px-4 py-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
      >
        &larr; Back to Library
      </button>
    </div>
  </div>
</template>

<script setup>
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'
import { useSettingsStore } from '@/stores/settings'

defineOptions({
  name: 'SettingsPage'
})

const router = useRouter()
const settingsStore = useSettingsStore()
const { settingsConfig } = storeToRefs(settingsStore)

const goToLibrary = () => {
  router.push('/library')
}
</script>
