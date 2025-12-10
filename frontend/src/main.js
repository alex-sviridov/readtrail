import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
import { useBooksStore } from './stores/books'
import { useSettingsStore } from './stores/settings'
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

    // Load stores in parallel
    await Promise.all([
      booksStore.loadBooks(),
      settingsStore.loadSettings()
    ])

    console.info('App initialized successfully')
  } catch (error) {
    console.error('Failed to initialize app:', error)
  }
}

initializeApp()
