import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { VueQueryPlugin } from '@tanstack/vue-query'
import Toast from 'vue-toastification'
import 'vue-toastification/dist/index.css'

import App from './App.vue'
import router from './router'
import { queryClient, installQueryPersistence } from './services/queryClient'
import { useBooksStore } from './stores/books'
import { useSettingsStore } from './stores/settings'
import { logger } from './utils/logger'
import './style.css'

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(VueQueryPlugin, { queryClient })
app.use(Toast, {
  position: 'top-right',
  timeout: 4000,
  pauseOnHover: true,
  closeOnClick: true,
  draggable: true
})

installQueryPersistence(queryClient)

// Instantiate stores to start their queries immediately at boot
app.runWithContext(() => {
  useBooksStore()
  useSettingsStore()
})

app.mount('#app')

logger.info('App mounted')
