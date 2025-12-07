import { createRouter, createWebHistory } from 'vue-router'
import Library from '../views/Library.vue'
import Settings from '../views/Settings.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      redirect: '/library'
    },
    {
      path: '/library',
      name: 'library',
      component: Library
    },
    {
      path: '/settings',
      name: 'settings',
      component: Settings
    }
  ],
})

export default router
