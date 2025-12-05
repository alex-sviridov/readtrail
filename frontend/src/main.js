import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
import { useBooksStore } from './stores/books'
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

// Initialize books store on startup
const booksStore = useBooksStore()
booksStore.loadBooks()
