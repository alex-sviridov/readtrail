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
import { bootstrapRemoteUser, isRemoteUserModeMisconfigured } from './services/remoteUserMode'
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

async function bootstrap() {
  // Must resolve before the stores below are instantiated: they gate their
  // very first query on isGuestMode() (pb.authStore.isValid), which needs
  // the auto-login from bootstrapRemoteUser() to have already happened,
  // otherwise that first query runs against local guest data and nothing
  // later re-fetches it against the now-authenticated backend.
  await bootstrapRemoteUser()

  if (isRemoteUserModeMisconfigured()) {
    // Remote-user auth is enabled server-side but the required proxy header
    // was missing — password login is disabled entirely in this mode, so a
    // login form would be a dead end. Show a static message instead of
    // mounting the app.
    document.getElementById('app').innerHTML = `
      <div class="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div class="max-w-md text-center">
          <h1 class="text-xl font-semibold text-gray-900">Authentication proxy misconfigured</h1>
          <p class="mt-2 text-gray-600">
            This deployment requires a trusted header from the reverse proxy, which was not present.
            Contact your administrator.
          </p>
        </div>
      </div>
    `
    logger.error('App not mounted: remote-user auth misconfigured')
    return
  }

  // Instantiate stores to start their queries immediately at boot
  app.runWithContext(() => {
    useBooksStore()
    useSettingsStore()
  })

  app.mount('#app')
  logger.info('App mounted')
}

bootstrap()
