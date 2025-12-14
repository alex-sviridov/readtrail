import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
import { useBooksStore } from './stores/books'
import { useSettingsStore } from './stores/settings'
import { logger } from './utils/logger'
import './style.css'

const app = createApp(App)

app.use(createPinia())
app.use(router)

app.mount('#app')

// Initialize stores on startup (async)
async function initializeApp() {
  try {
    const booksStore = useBooksStore()
    const settingsStore = useSettingsStore()

    // Load settings and books in parallel
    await Promise.all([
      settingsStore.loadSettings(),
      booksStore.loadBooks()
    ])

    logger.info('App initialized successfully')
  } catch (error) {
    logger.error('Failed to initialize app:', error)
  }
}

initializeApp()
