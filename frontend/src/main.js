import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
import { useBooksStore } from './stores/books'
import { useSettingsStore } from './stores/settings'
import './style.css'

// Import VueDatePicker
import { VueDatePicker } from '@vuepic/vue-datepicker'
import '@vuepic/vue-datepicker/dist/main.css'

const app = createApp(App)

// Register VueDatePicker globally
app.component('VueDatePicker', VueDatePicker)

app.use(createPinia())
app.use(router)

app.mount('#app')

// Initialize stores on startup
const booksStore = useBooksStore()
booksStore.loadBooks()

const settingsStore = useSettingsStore()
settingsStore.loadSettings()
