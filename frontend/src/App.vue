<script setup>
import { computed } from 'vue'
import { RouterView, useRoute } from 'vue-router'
import { useSyncNotifications } from '@/composables/useSyncNotifications'
import AppHeader from '@/components/AppHeader.vue'

useSyncNotifications()

const route = useRoute()

const shouldShowHeader = computed(() => {
  return route.path !== '/login' && route.path !== '/register'
})
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <AppHeader v-if="shouldShowHeader" />
    <main>
      <RouterView />
    </main>
  </div>
</template>

<style scoped></style>
