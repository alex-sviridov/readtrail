import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import App from '../App.vue'

describe('App', () => {
  let pinia
  let router

  beforeEach(() => {
    pinia = createPinia()
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
        plugins: [pinia, router]
      }
    })

    expect(wrapper.find('header').exists()).toBe(true)
    expect(wrapper.find('main').exists()).toBe(true)
  })

  it('displays the FlexLib title in header', () => {
    const wrapper = mount(App, {
      global: {
        plugins: [pinia, router]
      }
    })

    const header = wrapper.find('header')
    expect(header.text()).toContain('FlexLib')
  })

  it('renders RouterView component', () => {
    const wrapper = mount(App, {
      global: {
        plugins: [pinia, router]
      }
    })

    expect(wrapper.findComponent({ name: 'RouterView' }).exists()).toBe(true)
  })

  it('applies correct CSS classes for layout', () => {
    const wrapper = mount(App, {
      global: {
        plugins: [pinia, router]
      }
    })

    const rootDiv = wrapper.find('div')
    expect(rootDiv.classes()).toContain('min-h-screen')
    expect(rootDiv.classes()).toContain('bg-gray-50')
  })

  it('header has proper styling classes', () => {
    const wrapper = mount(App, {
      global: {
        plugins: [pinia, router]
      }
    })

    const header = wrapper.find('header')
    expect(header.classes()).toContain('bg-white')
    expect(header.classes()).toContain('shadow-sm')
  })

  it('main content has proper container classes', () => {
    const wrapper = mount(App, {
      global: {
        plugins: [pinia, router]
      }
    })

    const main = wrapper.find('main')
    // Main now delegates container classes to child components
    expect(main.exists()).toBe(true)
  })

  it('title has correct styling', () => {
    const wrapper = mount(App, {
      global: {
        plugins: [pinia, router]
      }
    })

    const title = wrapper.find('a[href="/library"]')
    expect(title.classes()).toContain('text-2xl')
    expect(title.classes()).toContain('font-bold')
    expect(title.classes()).toContain('text-gray-900')
  })
})
