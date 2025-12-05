import { createRouter, createWebHistory } from 'vue-router'
import Library from '../views/Library.vue'

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
    }
  ],
})

export default router
