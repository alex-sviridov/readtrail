import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import App from '../App.vue'

describe('App', () => {
  let pinia
  let router
  let queryClient

  beforeEach(() => {
    pinia = createPinia()
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
    })
    router = createRouter({
      history: createMemoryHistory(),
      routes: [
        {
          path: '/',
          name: 'home',
          component: { template: '<div>Home View</div>' }
        }
      ]
    })
  })

  it('renders the app structure with header and main', () => {
    const wrapper = mount(App, {
      global: {
        plugins: [pinia, router, [VueQueryPlugin, { queryClient }]]
      }
    })

    expect(wrapper.find('header').exists()).toBe(true)
    expect(wrapper.find('main').exists()).toBe(true)
  })

  it('displays the readtrail title in header', () => {
    const wrapper = mount(App, {
      global: {
        plugins: [pinia, router, [VueQueryPlugin, { queryClient }]]
      }
    })

    const header = wrapper.find('header')
    expect(header.text()).toContain('readtrail')
  })

  it('renders RouterView component', () => {
    const wrapper = mount(App, {
      global: {
        plugins: [pinia, router, [VueQueryPlugin, { queryClient }]]
      }
    })

    expect(wrapper.findComponent({ name: 'RouterView' }).exists()).toBe(true)
  })

  it('applies correct CSS classes for layout', () => {
    const wrapper = mount(App, {
      global: {
        plugins: [pinia, router, [VueQueryPlugin, { queryClient }]]
      }
    })

    const rootDiv = wrapper.find('div')
    expect(rootDiv.classes()).toContain('min-h-screen')
    expect(rootDiv.classes()).toContain('bg-gray-50')
  })

  it('header has proper styling classes', () => {
    const wrapper = mount(App, {
      global: {
        plugins: [pinia, router, [VueQueryPlugin, { queryClient }]]
      }
    })

    const header = wrapper.find('header')
    expect(header.classes()).toContain('bg-white')
    expect(header.classes()).toContain('shadow-sm')
  })

  it('main content has proper container classes', () => {
    const wrapper = mount(App, {
      global: {
        plugins: [pinia, router, [VueQueryPlugin, { queryClient }]]
      }
    })

    const main = wrapper.find('main')
    // Main now delegates container classes to child components
    expect(main.exists()).toBe(true)
  })

  it('title has correct styling', () => {
    const wrapper = mount(App, {
      global: {
        plugins: [pinia, router, [VueQueryPlugin, { queryClient }]]
      }
    })

    const title = wrapper.find('a[href="/library"]')
    expect(title.classes()).toContain('text-2xl')
    expect(title.classes()).toContain('font-bold')
    expect(title.classes()).toContain('text-gray-900')
  })
})
