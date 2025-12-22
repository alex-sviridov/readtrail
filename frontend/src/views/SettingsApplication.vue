<template>
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
</template>

<script setup>
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useSettingsStore } from '@/stores/settings'

defineOptions({
  name: 'SettingsApplication'
})

const settingsStore = useSettingsStore()
const { settings } = storeToRefs(settingsStore)

// Settings configuration
const settingsConfig = computed(() => [
  {
    section: 'Display Settings',
    settings: [
      {
        key: 'showBookInfo',
        label: 'Show Book Information',
        description: 'Display book title and author on book cards in the library',
        type: 'toggle',
        value: settings.value.showBookInfo,
        toggle: () => settingsStore.updateSetting('showBookInfo', !settings.value.showBookInfo)
      },
      {
        key: 'allowUnfinishedReading',
        label: 'Allow Unfinished Reading',
        description: 'Enable marking books as unfinished when setting their completion date',
        type: 'toggle',
        value: settings.value.allowUnfinishedReading,
        toggle: () => settingsStore.updateSetting('allowUnfinishedReading', !settings.value.allowUnfinishedReading)
      },
      {
        key: 'allowScoring',
        label: 'Allow Book Scoring',
        description: 'Enable like/dislike functionality for books',
        type: 'toggle',
        value: settings.value.allowScoring,
        toggle: () => settingsStore.updateSetting('allowScoring', !settings.value.allowScoring)
      }
    ]
  }
])
</script>
