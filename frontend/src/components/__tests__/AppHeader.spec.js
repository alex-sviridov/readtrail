import { describe, it, expect, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createWebHistory } from 'vue-router'
import AppHeader from '../AppHeader.vue'

async function mountWithRouter() {
  const router = createRouter({
    history: createWebHistory(),
    routes: [
      { path: '/', component: { template: '<div />' } },
      { path: '/library', component: { template: '<div />' } },
      { path: '/statistics', component: { template: '<div />' } }
    ]
  })
  router.push('/library')
  await router.isReady()
  return mount(AppHeader, {
    global: {
      plugins: [router],
      stubs: { SyncStatusIndicator: true }
    }
  })
}

describe('AppHeader mobile menu', () => {
  let wrapper

  afterEach(() => {
    wrapper?.unmount()
  })

  it('overlays page content instead of pushing it down when opened', async () => {
    wrapper = await mountWithRouter()

    await wrapper.get('button[aria-label="Toggle menu"]').trigger('click')

    const panel = wrapper.findAll('div').find(div => div.classes().includes('md:hidden') && div.classes().includes('border-t'))
    expect(panel.classes()).toContain('absolute')
  })
})
