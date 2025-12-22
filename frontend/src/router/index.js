import { createRouter, createWebHistory } from 'vue-router'
import Library from '@/views/Library.vue'
import LibraryTable from '@/views/LibraryTable.vue'
import Statistics from '@/views/Statistics.vue'
import Settings from '@/views/Settings.vue'
import SettingsAccount from '@/views/SettingsAccount.vue'
import SettingsApplication from '@/views/SettingsApplication.vue'
import Login from '@/views/Login.vue'
import Register from '@/views/Register.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      redirect: '/library/timeline'
    },
    {
      path: '/library',
      name: 'library',
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
    }
  ],
})

export default router
