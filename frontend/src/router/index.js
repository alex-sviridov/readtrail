import { createRouter, createWebHistory } from 'vue-router'
import Library from '@/views/Library.vue'
import LibraryTable from '@/views/LibraryTable.vue'
import Statistics from '@/views/Statistics.vue'
import Settings from '@/views/Settings.vue'
import SettingsAccount from '@/views/SettingsAccount.vue'
import SettingsApplication from '@/views/SettingsApplication.vue'
import Login from '@/views/Login.vue'
import Register from '@/views/Register.vue'
import Privacy from '@/views/Privacy.vue'

/**
 * Get last used library view from localStorage
 * @returns {'grid' | 'timeline' | 'table'}
 */
function getLastLibraryView() {
  const VALID_VIEWS = ['grid', 'timeline', 'table']
  const DEFAULT_VIEW = 'timeline'

  try {
    const stored = localStorage.getItem('readtrail-settings')
    if (stored) {
      const settings = JSON.parse(stored)
      const lastView = settings.lastLibraryView
      if (lastView && VALID_VIEWS.includes(lastView)) {
        return lastView
      }
    }
  } catch (error) {
    console.warn('Failed to read lastLibraryView:', error)
  }

  return DEFAULT_VIEW
}

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      redirect: () => `/library/${getLastLibraryView()}`
    },
    {
      path: '/library',
      redirect: () => `/library/${getLastLibraryView()}`
    },
    {
      path: '/library/grid',
      name: 'library-grid',
      component: Library
    },
    {
      path: '/library/timeline',
      name: 'library-timeline',
      component: Library
    },
    {
      path: '/library/table',
      name: 'library-table',
      component: LibraryTable
    },
    {
      path: '/statistics',
      name: 'statistics',
      component: Statistics
    },
    {
      path: '/settings',
      component: Settings,
      redirect: '/settings/account',
      children: [
        {
          path: 'account',
          name: 'settings-account',
          component: SettingsAccount
        },
        {
          path: 'application',
          name: 'settings-application',
          component: SettingsApplication
        }
      ]
    },
    {
      path: '/login',
      name: 'login',
      component: Login
    },
    {
      path: '/register',
      name: 'register',
      component: Register
    },
    {
      path: '/privacy',
      name: 'privacy',
      component: Privacy
    }
  ],
})

export default router
