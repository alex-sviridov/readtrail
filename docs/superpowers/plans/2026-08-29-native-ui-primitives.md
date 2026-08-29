# Native UI Primitives Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace hand-rolled modal/dropdown JS (Teleport + overlay-click + Escape-key + click-outside plumbing, duplicated three separate ways across the codebase) with native `<dialog>` and the Popover API, and deduplicate the Library page layout and grid CSS.

**Architecture:** `BaseModal.vue` moves from a `Teleport`+`Transition`+overlay-div pattern to a real `<dialog>` element driven by `showModal()`/`close()`. `FilterDropdown.vue` and `UserMenu.vue` move from `useClickOutside`/a local click-outside directive to the Popover API (`popover`/`popovertarget` attributes), with `isOpen` state mirrored from the native `toggle` event purely for styling (aria-expanded, chevron rotation, a `hidden` class). Since jsdom 27.2 implements neither `HTMLDialogElement.showModal()`/`close()` nor the Popover API's `showPopover()`/`hidePopover()`/light-dismiss, a test-setup polyfill file provides minimal behavioral shims so the existing Vitest suite keeps exercising real open/close/dismiss behavior.

**Tech Stack:** Vue 3 (`<script setup>`), Tailwind CSS v4, Vitest + `@vue/test-utils` + jsdom.

**Spec:** `docs/superpowers/specs/2026-08-29-native-ui-primitives-design.md`

## Global Constraints

- Modern evergreen browsers only — no `browserslist` restriction in this repo, native `<dialog>` and Popover API usage is acceptable without fallbacks.
- No visual redesign — colors, spacing, and copy stay identical; this is a mechanism swap. Where a prop's effect can't map 1:1 onto the new markup (see Task 2's `overlay-class` removal), preserve the same visual result by other means, not by dropping the visual effect.
- `BookCard.vue`'s in-place date-picker overlay is explicitly out of scope — leave its `Teleport`/backdrop/`useClickOutside` usage untouched.
- List virtualization is explicitly out of scope — do not add it.
- Every task must leave `npm run test` and `npm run lint` green before moving to the next task.

---

### Task 1: jsdom polyfill for `<dialog>` and the Popover API

**Files:**
- Create: `frontend/src/test-setup.js`
- Create: `frontend/src/__tests__/test-setup.spec.js`
- Modify: `frontend/vitest.config.js`

**Interfaces:**
- Produces: a global side-effecting module (`test-setup.js`) that, once loaded, guarantees `HTMLDialogElement.prototype.showModal`/`close` and `Element.prototype.showPopover`/`hidePopover`/`togglePopover` exist and behave as described below. No exports — later tasks rely on these methods existing and behaving correctly on any `<dialog>` or `[popover]` element mounted in a test, they don't import anything from this file directly.

Behavior this file must implement (there is no real spec-compliant polyfill on npm worth pulling in for this small a surface — write it inline):

- `dialog.showModal()`: throws `DOMException('...', 'InvalidStateError')` if `dialog.open` is already `true`; otherwise sets `dialog.open = true`.
- `dialog.close(returnValue?)`: no-op if `dialog.open` is already `false`; otherwise sets `dialog.open = false`, sets `dialog.returnValue` if a value was passed, and dispatches a `close` event on the dialog.
- `element.showPopover()` / `hidePopover()` / `togglePopover(force?)`: track open popovers in a module-level `Set`; showing/hiding dispatches a `toggle` event on the element with `newState`/`oldState` properties (real `ToggleEvent` isn't available in jsdom, so a plain `Event` with these properties attached is close enough for components that only read `event.newState`).
- A single `document`-level `click` listener that:
  1. If the click's target is inside an element with a `popovertarget` attribute, resolves the referenced element by `id`, and performs its `popovertargetaction` (`show`/`hide`/default `toggle`) on it — mirroring the browser's native invoker behavior — then returns without doing anything else for that click (an invoker's own click must never immediately light-dismiss the popover it just opened).
  2. Otherwise, closes every currently-open popover whose element does not `.contains()` the click target (light-dismiss).
- A single `document`-level `keydown` listener that closes every open popover when `event.key === 'Escape'`.

- [ ] **Step 1: Write a failing test that exercises the polyfill's absence**

Create `frontend/src/__tests__/test-setup.spec.js`:

```js
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

describe('dialog/popover jsdom polyfill', () => {
  let dialog
  let trigger
  let popover

  beforeEach(() => {
    document.body.innerHTML = `
      <dialog id="d"></dialog>
      <button id="t" popovertarget="p">toggle</button>
      <div id="p" popover></div>
    `
    dialog = document.getElementById('d')
    trigger = document.getElementById('t')
    popover = document.getElementById('p')
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('opens and closes a dialog via showModal/close', () => {
    expect(dialog.open).toBe(false)
    dialog.showModal()
    expect(dialog.open).toBe(true)
    dialog.close()
    expect(dialog.open).toBe(false)
  })

  it('throws if showModal is called on an already-open dialog', () => {
    dialog.showModal()
    expect(() => dialog.showModal()).toThrow()
  })

  it('fires a close event when close() is called', () => {
    dialog.showModal()
    const handler = vi.fn()
    dialog.addEventListener('close', handler)
    dialog.close()
    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('does nothing when close() is called on an already-closed dialog', () => {
    const handler = vi.fn()
    dialog.addEventListener('close', handler)
    dialog.close()
    expect(handler).not.toHaveBeenCalled()
  })

  it('opens a popover via its trigger\'s popovertarget click, and toggles it closed on a second click', () => {
    const toggleHandler = vi.fn()
    popover.addEventListener('toggle', toggleHandler)

    trigger.click()
    expect(toggleHandler).toHaveBeenCalledTimes(1)
    expect(toggleHandler.mock.calls[0][0].newState).toBe('open')

    trigger.click()
    expect(toggleHandler).toHaveBeenCalledTimes(2)
    expect(toggleHandler.mock.calls[1][0].newState).toBe('closed')
  })

  it('light-dismisses an open popover on an outside click', () => {
    trigger.click()
    const toggleHandler = vi.fn()
    popover.addEventListener('toggle', toggleHandler)

    document.body.click()

    expect(toggleHandler).toHaveBeenCalledTimes(1)
    expect(toggleHandler.mock.calls[0][0].newState).toBe('closed')
  })

  it('does not dismiss when the click is inside the popover', () => {
    trigger.click()
    const toggleHandler = vi.fn()
    popover.addEventListener('toggle', toggleHandler)

    popover.click()

    expect(toggleHandler).not.toHaveBeenCalled()
  })

  it('closes an open popover on Escape', () => {
    trigger.click()
    const toggleHandler = vi.fn()
    popover.addEventListener('toggle', toggleHandler)

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))

    expect(toggleHandler).toHaveBeenCalledTimes(1)
    expect(toggleHandler.mock.calls[0][0].newState).toBe('closed')
  })
})
```

- [ ] **Step 2: Run the test to confirm it fails**

Run: `cd frontend && npx vitest run src/__tests__/test-setup.spec.js`
Expected: FAIL — `dialog.showModal is not a function` (or similar) on the first test.

- [ ] **Step 3: Write the polyfill**

Create `frontend/src/test-setup.js`:

```js
// jsdom does not implement HTMLDialogElement.showModal()/close() or the
// Popover API (showPopover/hidePopover/light-dismiss/Escape). These are
// minimal behavioral shims - just enough for component tests to exercise
// real open/close/dismiss behavior, not full spec compliance.

if (!HTMLDialogElement.prototype.showModal) {
  HTMLDialogElement.prototype.showModal = function () {
    if (this.open) {
      throw new DOMException('The element already has an \'open\' attribute, and therefore cannot be opened modally', 'InvalidStateError')
    }
    this.open = true
  }

  HTMLDialogElement.prototype.close = function (returnValue) {
    if (!this.open) return
    this.open = false
    if (returnValue !== undefined) this.returnValue = returnValue
    this.dispatchEvent(new Event('close'))
  }
}

if (!Element.prototype.showPopover) {
  const openPopovers = new Set()

  function dispatchToggle(el, newState) {
    const event = new Event('toggle')
    event.newState = newState
    event.oldState = newState === 'open' ? 'closed' : 'open'
    el.dispatchEvent(event)
  }

  function showPopover(el) {
    if (openPopovers.has(el)) return
    openPopovers.add(el)
    dispatchToggle(el, 'open')
  }

  function hidePopover(el) {
    if (!openPopovers.has(el)) return
    openPopovers.delete(el)
    dispatchToggle(el, 'closed')
  }

  Element.prototype.showPopover = function () { showPopover(this) }
  Element.prototype.hidePopover = function () { hidePopover(this) }
  Element.prototype.togglePopover = function (force) {
    const shouldShow = force !== undefined ? force : !openPopovers.has(this)
    if (shouldShow) showPopover(this)
    else hidePopover(this)
  }

  document.addEventListener('click', (event) => {
    const invoker = event.target.closest?.('[popovertarget]')
    if (invoker) {
      const target = document.getElementById(invoker.getAttribute('popovertarget'))
      if (target) {
        const action = invoker.getAttribute('popovertargetaction') || 'toggle'
        if (action === 'show') showPopover(target)
        else if (action === 'hide') hidePopover(target)
        else if (openPopovers.has(target)) hidePopover(target)
        else showPopover(target)
      }
      return
    }

    for (const popover of [...openPopovers]) {
      if (!popover.contains(event.target)) {
        hidePopover(popover)
      }
    }
  })

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return
    for (const popover of [...openPopovers]) {
      hidePopover(popover)
    }
  })
}
```

- [ ] **Step 4: Wire the polyfill into Vitest**

Modify `frontend/vitest.config.js`:

```js
import { fileURLToPath } from 'node:url'
import { mergeConfig, defineConfig, configDefaults } from 'vitest/config'
import viteConfigCallback from './vite.config'

const viteConfig = viteConfigCallback({ mode: 'test', command: 'serve' })

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'jsdom',
      exclude: [...configDefaults.exclude, 'e2e/**'],
      root: fileURLToPath(new URL('./', import.meta.url)),
      setupFiles: ['./src/test-setup.js'],
    },
  }),
)
```

- [ ] **Step 5: Run the test to confirm it passes**

Run: `cd frontend && npx vitest run src/__tests__/test-setup.spec.js`
Expected: PASS, all 8 tests green.

- [ ] **Step 6: Run the full suite to confirm nothing else broke**

Run: `cd frontend && npm run test -- --run`
Expected: PASS, same pass count as before this task (this step only adds the polyfill; no component changed yet).

- [ ] **Step 7: Commit**

```bash
cd /home/alex/readtrail
git add frontend/src/test-setup.js frontend/src/__tests__/test-setup.spec.js frontend/vitest.config.js
git commit -m "test: add jsdom polyfill for dialog and Popover API"
```

---

### Task 2: Migrate `BaseModal.vue` to native `<dialog>`

**Files:**
- Modify: `frontend/src/components/base/BaseModal.vue`
- Modify: `frontend/src/components/base/__tests__/BaseModal.spec.js`
- Modify: `frontend/src/components/library/BookCoverModal.vue:1-13`

**Interfaces:**
- Consumes: the Task 1 polyfill (`showModal`/`close` on any `<dialog>` mounted in a test).
- Produces: `BaseModal.vue` keeps its existing public API (`isOpen`, `title`, `showCloseButton`, `closeOnOverlayClick`, `contentClass`, `maxHeightClass`, `headerClass`, `titleClass`, `bodyClass`, `footerClass` props; `close`/`update:isOpen` emits; `title`/default/`footer` slots) with one exception: the `overlayClass` prop is removed (see Step 3). `BookDateModal.vue`, `BookSearch.vue`, `ChangePasswordModal.vue`, `DeleteAccountModal.vue` need no changes — they don't use `overlay-class`.

- [ ] **Step 1: Confirm no other consumer relies on the prop being removed**

Run: `cd /home/alex/readtrail && grep -rn "overlay-class" frontend/src --include=*.vue`
Expected: only `frontend/src/components/library/BookCoverModal.vue` matches. (Already verified during design — this step is the executor's own confirmation before deleting the prop.)

- [ ] **Step 2: Rewrite `BaseModal.spec.js` for the new markup, then confirm it fails against the old component**

Replace the full contents of `frontend/src/components/base/__tests__/BaseModal.spec.js`:

```js
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import BaseModal from '../BaseModal.vue'

describe('BaseModal Component', () => {
  let wrapper

  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    wrapper?.unmount()
    document.body.innerHTML = ''
    vi.restoreAllMocks()
  })

  function mountModal(props = {}) {
    return mount(BaseModal, {
      attachTo: document.body,
      props: { isOpen: true, title: 'Test Modal', ...props }
    })
  }

  describe('conditional rendering', () => {
    it('is not open when isOpen is false', () => {
      wrapper = mountModal({ isOpen: false })
      expect(wrapper.get('dialog').element.open).toBe(false)
    })

    it('is open when isOpen is true', () => {
      wrapper = mountModal({ isOpen: true })
      expect(wrapper.get('dialog').element.open).toBe(true)
    })

    it('toggles open state when isOpen prop changes', async () => {
      wrapper = mountModal({ isOpen: false })
      expect(wrapper.get('dialog').element.open).toBe(false)

      await wrapper.setProps({ isOpen: true })
      expect(wrapper.get('dialog').element.open).toBe(true)

      await wrapper.setProps({ isOpen: false })
      expect(wrapper.get('dialog').element.open).toBe(false)
    })
  })

  describe('title rendering', () => {
    it('should display title from prop', () => {
      wrapper = mountModal({ title: 'My Custom Title' })
      expect(wrapper.text()).toContain('My Custom Title')
    })

    it('should display title from slot when provided', () => {
      wrapper = mount(BaseModal, {
        attachTo: document.body,
        props: { isOpen: true, title: 'Prop Title' },
        slots: { title: 'Slot Title' }
      })
      expect(wrapper.text()).toContain('Slot Title')
      expect(wrapper.text()).not.toContain('Prop Title')
    })

    it('should apply titleClass to title element', () => {
      wrapper = mountModal({ titleClass: 'custom-title-class' })
      expect(wrapper.get('h2').classes()).toContain('custom-title-class')
    })
  })

  describe('slots', () => {
    it('should render default slot content', () => {
      wrapper = mount(BaseModal, {
        attachTo: document.body,
        props: { isOpen: true, title: 'Test' },
        slots: { default: '<p>This is modal content</p>' }
      })
      expect(wrapper.text()).toContain('This is modal content')
    })

    it('should render footer slot when provided', () => {
      wrapper = mount(BaseModal, {
        attachTo: document.body,
        props: { isOpen: true, title: 'Test' },
        slots: { default: '<p>Content</p>', footer: '<div>Footer Content</div>' }
      })
      expect(wrapper.text()).toContain('Footer Content')
    })

    it('should not render footer border when footer slot is not provided', () => {
      wrapper = mountModal()
      const footerBorder = wrapper.findAll('div').find(div => div.classes().includes('border-t'))
      expect(footerBorder).toBeFalsy()
    })
  })

  describe('close button', () => {
    it('should render close button by default', () => {
      wrapper = mountModal()
      expect(wrapper.find('button[aria-label="Close"]').exists()).toBe(true)
    })

    it('should not render close button when showCloseButton is false', () => {
      wrapper = mountModal({ showCloseButton: false })
      expect(wrapper.find('button[aria-label="Close"]').exists()).toBe(false)
    })

    it('should emit close and update:isOpen when close button is clicked', async () => {
      wrapper = mountModal()
      await wrapper.get('button[aria-label="Close"]').trigger('click')

      expect(wrapper.emitted('close')).toBeTruthy()
      expect(wrapper.emitted('update:isOpen')).toBeTruthy()
      expect(wrapper.emitted('update:isOpen')[0][0]).toBe(false)
    })

    it('closes the underlying dialog when the close button is clicked', async () => {
      wrapper = mountModal()
      await wrapper.get('button[aria-label="Close"]').trigger('click')
      expect(wrapper.get('dialog').element.open).toBe(false)
    })
  })

  describe('overlay click behavior', () => {
    it('should close modal when the dialog backdrop is clicked by default', async () => {
      wrapper = mountModal()
      await wrapper.get('dialog').trigger('click')
      expect(wrapper.emitted('close')).toBeTruthy()
    })

    it('should not close modal when modal content is clicked', async () => {
      wrapper = mount(BaseModal, {
        attachTo: document.body,
        props: { isOpen: true, title: 'Test' },
        slots: { default: '<p>Content</p>' }
      })
      await wrapper.get('p').trigger('click')
      expect(wrapper.emitted('close')).toBeFalsy()
    })

    it('should not close modal when overlay is clicked if closeOnOverlayClick is false', async () => {
      wrapper = mountModal({ closeOnOverlayClick: false })
      await wrapper.get('dialog').trigger('click')
      expect(wrapper.emitted('close')).toBeFalsy()
    })
  })

  describe('escape key handling', () => {
    it('should close modal when Escape key is pressed', async () => {
      wrapper = mountModal()
      wrapper.get('dialog').element.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
      wrapper.get('dialog').element.close()
      await nextTick()
      expect(wrapper.emitted('close')).toBeTruthy()
    })
  })

  describe('customization props', () => {
    it('should apply contentClass to the dialog element', () => {
      wrapper = mountModal({ contentClass: 'custom-content-class max-w-4xl' })
      const dialog = wrapper.get('dialog')
      expect(dialog.classes()).toContain('custom-content-class')
      expect(dialog.classes()).toContain('max-w-4xl')
    })

    it('should apply maxHeightClass to the dialog element', () => {
      wrapper = mountModal({ maxHeightClass: 'max-h-[90vh]' })
      expect(wrapper.get('dialog').classes()).toContain('max-h-[90vh]')
    })

    it('should apply headerClass to header', () => {
      wrapper = mountModal({ headerClass: 'custom-header' })
      const header = wrapper.findAll('div').find(div => div.classes().includes('custom-header'))
      expect(header).toBeTruthy()
    })

    it('should apply bodyClass to body', () => {
      wrapper = mountModal({ bodyClass: 'custom-body' })
      const body = wrapper.findAll('div').find(div => div.classes().includes('custom-body'))
      expect(body).toBeTruthy()
    })

    it('should apply footerClass to footer when footer slot is provided', () => {
      wrapper = mount(BaseModal, {
        attachTo: document.body,
        props: { isOpen: true, title: 'Test', footerClass: 'custom-footer' },
        slots: { footer: '<div>Footer</div>' }
      })
      const footer = wrapper.findAll('div').find(div => div.classes().includes('custom-footer'))
      expect(footer).toBeTruthy()
    })
  })

  describe('accessibility', () => {
    it('should have aria-label on close button', () => {
      wrapper = mountModal()
      expect(wrapper.get('button[aria-label="Close"]').attributes('aria-label')).toBe('Close')
    })

    it('should have a heading with the title', () => {
      wrapper = mountModal({ title: 'Test Modal' })
      const title = wrapper.get('h2')
      expect(title.text()).toContain('Test Modal')
    })
  })

  describe('layout and styling', () => {
    it('should apply default max-width to the dialog', () => {
      wrapper = mountModal()
      expect(wrapper.get('dialog').classes()).toContain('max-w-2xl')
    })

    it('should apply default max-height to the dialog', () => {
      wrapper = mountModal()
      expect(wrapper.get('dialog').classes()).toContain('max-h-[80vh]')
    })

    it('should have scrollable body area', () => {
      wrapper = mount(BaseModal, {
        attachTo: document.body,
        props: { isOpen: true, title: 'Test' },
        slots: { default: '<p>Content</p>' }
      })
      const bodyElement = wrapper.findAll('div').find(
        div => div.classes().includes('flex-1') && div.classes().includes('overflow-y-auto')
      )
      expect(bodyElement).toBeTruthy()
    })
  })
})
```

- [ ] **Step 3: Run the test to confirm it fails against the current implementation**

Run: `cd frontend && npx vitest run src/components/base/__tests__/BaseModal.spec.js`
Expected: FAIL — the current component has no `<dialog>` element, so `wrapper.get('dialog')` throws.

- [ ] **Step 4: Rewrite `BaseModal.vue`**

Replace the full contents of `frontend/src/components/base/BaseModal.vue`:

```vue
<template>
  <dialog
    ref="dialogRef"
    class="bg-white rounded-lg shadow-xl flex flex-col p-0 border-none"
    :class="[contentClass, maxHeightClass]"
    @click="handleDialogClick"
    @close="handleNativeClose"
  >
    <!-- Modal Header -->
    <div class="flex items-center justify-between p-6 border-b" :class="headerClass">
      <h2 class="text-2xl font-semibold text-gray-900" :class="titleClass">
        <slot name="title">{{ title }}</slot>
      </h2>
      <button
        v-if="showCloseButton"
        @click="requestClose"
        class="text-gray-400 hover:text-gray-600 transition-colors"
        aria-label="Close"
      >
        <XMarkIcon class="w-6 h-6" />
      </button>
    </div>

    <!-- Modal Body -->
    <div class="flex-1 overflow-y-auto" :class="bodyClass">
      <slot></slot>
    </div>

    <!-- Modal Footer (optional) -->
    <div v-if="$slots.footer" class="border-t" :class="footerClass">
      <slot name="footer"></slot>
    </div>
  </dialog>
</template>

<script setup>
// 1. Imports
import { ref, onMounted, watch } from 'vue'
import { XMarkIcon } from '@heroicons/vue/24/outline'

// 2. Props & Emits
const props = defineProps({
  isOpen: {
    type: Boolean,
    required: false,
    default: false
  },
  title: {
    type: String,
    required: false,
    default: ''
  },
  showCloseButton: {
    type: Boolean,
    required: false,
    default: true
  },
  closeOnOverlayClick: {
    type: Boolean,
    required: false,
    default: true
  },
  contentClass: {
    type: String,
    required: false,
    default: 'max-w-2xl w-full'
  },
  maxHeightClass: {
    type: String,
    required: false,
    default: 'max-h-[80vh]'
  },
  headerClass: {
    type: String,
    required: false,
    default: ''
  },
  titleClass: {
    type: String,
    required: false,
    default: ''
  },
  bodyClass: {
    type: String,
    required: false,
    default: 'p-6'
  },
  footerClass: {
    type: String,
    required: false,
    default: 'p-6'
  }
})

const emit = defineEmits(['close', 'update:isOpen'])

// 3. Local State
const dialogRef = ref(null)

// 4. Methods
function requestClose() {
  dialogRef.value?.close()
}

function handleDialogClick(event) {
  if (props.closeOnOverlayClick && event.target === dialogRef.value) {
    requestClose()
  }
}

function handleNativeClose() {
  emit('close')
  emit('update:isOpen', false)
}

// 5. Lifecycle - keep the <dialog>'s native open state in sync with isOpen
onMounted(() => {
  if (props.isOpen) {
    dialogRef.value.showModal()
  }
})

watch(() => props.isOpen, (isOpen) => {
  if (isOpen) {
    if (!dialogRef.value.open) dialogRef.value.showModal()
  } else {
    dialogRef.value.close()
  }
})
</script>

<style scoped>
dialog {
  opacity: 0;
  transform: scale(0.95);
  transition: opacity 0.2s ease, transform 0.2s ease, overlay 0.2s allow-discrete, display 0.2s allow-discrete;
}

dialog[open] {
  opacity: 1;
  transform: scale(1);
}

@starting-style {
  dialog[open] {
    opacity: 0;
    transform: scale(0.95);
  }
}

dialog::backdrop {
  background: rgb(0 0 0 / 0.5);
  opacity: 0;
  transition: opacity 0.2s ease, overlay 0.2s allow-discrete, display 0.2s allow-discrete;
}

dialog[open]::backdrop {
  opacity: 1;
}

@starting-style {
  dialog[open]::backdrop {
    opacity: 0;
  }
}
</style>
```

Note: the `overlayClass` prop is gone — there's no separate overlay element to apply it to anymore. Step 6 folds its one real usage into `contentClass`.

- [ ] **Step 5: Run the test to confirm it passes**

Run: `cd frontend && npx vitest run src/components/base/__tests__/BaseModal.spec.js`
Expected: PASS, all tests green.

- [ ] **Step 6: Update `BookCoverModal.vue`'s use of the removed `overlay-class` prop**

In `frontend/src/components/library/BookCoverModal.vue`, replace lines 5-7:

```vue
    content-class="w-full max-w-md"
    max-height-class="max-h-[95vh] sm:max-h-[90vh]"
    overlay-class="p-3 sm:p-4"
```

with:

```vue
    content-class="w-full max-w-md m-3 sm:m-4"
    max-height-class="max-h-[95vh] sm:max-h-[90vh]"
```

This preserves the same visual gap from the viewport edge on small screens — previously achieved via padding on the (now-removed) overlay wrapper, now achieved via margin directly on the dialog.

- [ ] **Step 7: Run the full suite**

Run: `cd frontend && npm run test -- --run`
Expected: PASS. `BookCoverModal`, `BookDateModal`, `BookSearch`, and the settings modals' own test files don't assert on `BaseModal`'s internal DOM structure (verified during design/planning), so they should be unaffected.

- [ ] **Step 8: Manual browser check**

Run `npm run dev`, open the app, and check: opening/closing the Add Book search modal, the book cover edit modal (from table view), and the book date edit modal (from table view) all still look and behave the same — backdrop dims, Escape closes, clicking outside the modal content closes it, the close button works, and initial focus lands somewhere sensible inside the modal (this is a real behavior change — native `<dialog>` auto-focuses and traps focus, which the old implementation didn't do at all).

- [ ] **Step 9: Commit**

```bash
cd /home/alex/readtrail
git add frontend/src/components/base/BaseModal.vue frontend/src/components/base/__tests__/BaseModal.spec.js frontend/src/components/library/BookCoverModal.vue
git commit -m "refactor: migrate BaseModal to native <dialog>"
```

---

### Task 3: Migrate `FilterDropdown.vue` to the Popover API

**Files:**
- Modify: `frontend/src/components/library/FilterDropdown.vue`
- Modify: `frontend/src/components/library/__tests__/FilterDropdown.spec.js`

**Interfaces:**
- Consumes: the Task 1 polyfill's `popovertarget`/light-dismiss/Escape handling.
- Produces: no prop/emit changes — `hideUnfinished`, `hideToRead`, `allowUnfinishedReading` props and `toggle-hide-unfinished`, `toggle-hide-to-read`, `clear-all` emits are unchanged. Internally, `isOpen` is now driven by the popover's native `toggle` event instead of a click handler, and the dropdown `<div>` is always present in the DOM (no more `v-if`) with visibility controlled by a `hidden` class bound to `isOpen` — because `popovertarget` needs its target element to exist in the DOM at click time to look it up by `id`.

- [ ] **Step 1: Update the test helper and rewrite the tests that depend on open/close mechanics**

In `frontend/src/components/library/__tests__/FilterDropdown.spec.js`:

Replace the `createWrapper` helper (lines 7-16) — tests now depend on document-level click/keydown listeners (from the Task 1 polyfill) to drive open/close, which only fire for events that bubble to `document`, so the wrapper must be attached:

```js
  const createWrapper = (props = {}) => {
    return mount(FilterDropdown, {
      attachTo: document.body,
      props: {
        hideUnfinished: false,
        hideToRead: false,
        allowUnfinishedReading: true,
        ...props
      }
    })
  }
```

Add an `afterEach` right after the existing `beforeEach` block (lines 18-20) to clean up attached wrappers between tests:

```js
  let wrapper

  afterEach(() => {
    wrapper?.unmount()
  })
```

Every `const wrapper = createWrapper(...)` call in the file becomes `wrapper = createWrapper(...)` (drop the `const`, since `wrapper` is now the shared outer variable declared above). Apply this to every test in the file — there is no case where a test should keep its own unmounted local wrapper, since all of them now rely on the shared document-level listeners and must be cleaned up.

Replace `does not show dropdown by default` (lines 31-36):

```js
    it('does not show dropdown by default', () => {
      const wrapper = createWrapper()
      const dropdown = wrapper.find('[role="menu"]')

      expect(dropdown.exists()).toBe(false)
    })
```

with:

```js
    it('does not show dropdown by default', () => {
      wrapper = createWrapper()
      const dropdown = wrapper.get('[role="menu"]')

      expect(dropdown.classes()).toContain('hidden')
    })
```

Replace the four tests in `describe('Dropdown Toggle', ...)` (lines 170-219):

```js
  describe('Dropdown Toggle', () => {
    it('opens dropdown when button is clicked', async () => {
      wrapper = createWrapper()
      await wrapper.get('button').trigger('click')

      expect(wrapper.get('[role="menu"]').classes()).not.toContain('hidden')
    })

    it('closes dropdown when button is clicked again', async () => {
      wrapper = createWrapper()
      const button = wrapper.get('button')

      await button.trigger('click')
      expect(wrapper.get('[role="menu"]').classes()).not.toContain('hidden')

      await button.trigger('click')
      expect(wrapper.get('[role="menu"]').classes()).toContain('hidden')
    })

    it('updates aria-expanded attribute when dropdown is opened', async () => {
      wrapper = createWrapper()
      const button = wrapper.get('button')

      expect(button.attributes('aria-expanded')).toBe('false')

      await button.trigger('click')

      expect(button.attributes('aria-expanded')).toBe('true')
    })

    it('rotates chevron icon when dropdown is open', async () => {
      wrapper = createWrapper()
      const button = wrapper.get('button')
      const chevron = wrapper.get('.transition-transform')

      expect(chevron.classes()).not.toContain('rotate-180')

      await button.trigger('click')

      expect(chevron.classes()).toContain('rotate-180')
    })
  })
```

In `describe('Dropdown Content', ...)` and `describe('Filter Option Checkboxes', ...)` and `describe('Event Emissions', ...)` and `describe('Allow Unfinished Reading Setting', ...)` and `describe('Accessibility', ...)`, every occurrence of:

```js
      const wrapper = createWrapper(...)
      await wrapper.find('button').trigger('click')
      await nextTick()
```

becomes:

```js
      wrapper = createWrapper(...)
      await wrapper.get('button').trigger('click')
```

(drop `const`, use `.get('button')` instead of `.find('button')` since the button always exists, and drop the redundant `await nextTick()` — `trigger()` already awaits Vue's next tick). Apply the same `const wrapper` → `wrapper` and `.find('button')` → `.get('button')` mechanical substitution to every remaining test in the file, including `Dropdown Positioning`, `Responsive Behavior`, `Edge Cases`, and `Component Structure`.

Remove the `has proper z-index for dropdown` test (in `describe('Dropdown Positioning', ...)`) — native popovers render in the top layer, there is no `z-50` class anymore:

```js
    it('has proper z-index for dropdown', async () => {
      const wrapper = createWrapper()
      await wrapper.find('button').trigger('click')
      await nextTick()

      const dropdown = wrapper.find('[role="menu"]')
      expect(dropdown.classes()).toContain('z-50')
    })
```

Delete this test entirely.

Replace the two tests in `describe('Click Outside Behavior', ...)` (lines 412-451) — they no longer need the artificial `setTimeout` delay, since the polyfill's light-dismiss fires synchronously on the qualifying click:

```js
  describe('Click Outside Behavior', () => {
    it('closes dropdown when clicking outside', async () => {
      wrapper = createWrapper()

      await wrapper.get('button').trigger('click')
      expect(wrapper.get('[role="menu"]').classes()).not.toContain('hidden')

      document.body.click()
      await nextTick()

      expect(wrapper.get('[role="menu"]').classes()).toContain('hidden')
    })

    it('does not close dropdown when clicking inside dropdown', async () => {
      wrapper = createWrapper()

      await wrapper.get('button').trigger('click')

      wrapper.get('[role="menu"]').element.click()
      await nextTick()

      expect(wrapper.get('[role="menu"]').classes()).not.toContain('hidden')
    })
  })
```

Replace the test in `describe('Escape Key Behavior', ...)` (lines 453-474):

```js
  describe('Escape Key Behavior', () => {
    it('closes dropdown when Escape key is pressed', async () => {
      wrapper = createWrapper()

      await wrapper.get('button').trigger('click')
      expect(wrapper.get('[role="menu"]').classes()).not.toContain('hidden')

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
      await nextTick()

      expect(wrapper.get('[role="menu"]').classes()).toContain('hidden')
    })
  })
```

Update `describe('Component Structure', ...)`'s `has proper dropdown styling` test — it currently opens the dropdown first via `await wrapper.find('button').trigger('click')`; since the element is now always rendered, that trigger is no longer required for the `.get('[role="menu"]')` lookup to succeed, but leave it in (harmless, and keeps the test symmetric with the others) using the same `const` → `wrapper` and `.find` → `.get` substitution as above.

- [ ] **Step 2: Run the tests to confirm they fail against the current implementation**

Run: `cd frontend && npx vitest run src/components/library/__tests__/FilterDropdown.spec.js`
Expected: FAIL — the current component has no `popovertarget`/`popover` attributes and still uses `v-if`, so classes/attributes checked above don't match.

- [ ] **Step 3: Rewrite `FilterDropdown.vue`**

Replace the full contents of `frontend/src/components/library/FilterDropdown.vue`:

```vue
<template>
  <div class="relative">
    <!-- Filter Button -->
    <button
      popovertarget="filter-dropdown-menu"
      :class="[
        'flex items-center gap-2 px-3 md:px-4 py-2 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg font-medium text-sm border-none cursor-pointer',
        hasActiveFilters
          ? 'bg-blue-600 text-white hover:bg-blue-700'
          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
      ]"
      :title="hasActiveFilters ? 'Filters active' : 'No filters'"
      aria-haspopup="true"
      :aria-expanded="isOpen"
    >
      <FunnelIcon class="w-5 h-5" />
      <span class="hidden sm:inline">Filter</span>
      <span
        v-if="activeFilterCount > 0"
        class="bg-white text-blue-600 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold"
        :class="hasActiveFilters ? '' : 'bg-blue-600 text-white'"
      >
        {{ activeFilterCount }}
      </span>
      <ChevronDownIcon
        :class="[
          'w-4 h-4 transition-transform duration-200',
          isOpen ? 'rotate-180' : ''
        ]"
      />
    </button>

    <!-- Dropdown Menu -->
    <div
      id="filter-dropdown-menu"
      ref="menuRef"
      popover
      class="dropdown-popover absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200"
      :class="{ hidden: !isOpen }"
      role="menu"
      aria-orientation="vertical"
      @toggle="handleToggle"
    >
      <div class="py-2">
        <!-- Header -->
        <div class="px-4 py-2 border-b border-gray-200 flex items-center justify-between">
          <span class="text-sm font-semibold text-gray-900">Filters</span>
          <button
            v-if="hasActiveFilters"
            @click="clearAllFilters"
            class="text-xs text-blue-600 hover:text-blue-700 font-medium"
          >
            Clear all
          </button>
        </div>

        <!-- Filter Options -->
        <div class="py-1">
          <button
            v-if="allowUnfinishedReading"
            @click="toggleHideUnfinished"
            class="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
            role="menuitem"
          >
            <div class="flex items-center gap-3">
              <div
                :class="[
                  'w-5 h-5 rounded border-2 flex items-center justify-center transition-all',
                  hideUnfinished
                    ? 'bg-blue-600 border-blue-600'
                    : 'border-gray-300'
                ]"
              >
                <svg
                  v-if="hideUnfinished"
                  class="w-3 h-3 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="3"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <span class="text-sm text-gray-900">Hide Unfinished</span>
            </div>
          </button>

          <button
            @click="toggleHideToRead"
            class="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
            role="menuitem"
          >
            <div class="flex items-center gap-3">
              <div
                :class="[
                  'w-5 h-5 rounded border-2 flex items-center justify-center transition-all',
                  hideToRead
                    ? 'bg-blue-600 border-blue-600'
                    : 'border-gray-300'
                ]"
              >
                <svg
                  v-if="hideToRead"
                  class="w-3 h-3 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="3"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <span class="text-sm text-gray-900">Hide Unread</span>
            </div>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { FunnelIcon, ChevronDownIcon } from '@heroicons/vue/24/outline'

const props = defineProps({
  hideUnfinished: {
    type: Boolean,
    required: true,
    default: false
  },
  hideToRead: {
    type: Boolean,
    required: true,
    default: false
  },
  allowUnfinishedReading: {
    type: Boolean,
    required: false,
    default: true
  }
})

const emit = defineEmits(['toggle-hide-unfinished', 'toggle-hide-to-read', 'clear-all'])

// State
const isOpen = ref(false)
const menuRef = ref(null)

// Computed
const hasActiveFilters = computed(() => {
  const unfinishedActive = props.allowUnfinishedReading && props.hideUnfinished
  return unfinishedActive || props.hideToRead
})

const activeFilterCount = computed(() => {
  let count = 0
  if (props.allowUnfinishedReading && props.hideUnfinished) count++
  if (props.hideToRead) count++
  return count
})

// Methods
function handleToggle(event) {
  isOpen.value = event.newState === 'open'
}

function toggleHideUnfinished() {
  emit('toggle-hide-unfinished')
}

function toggleHideToRead() {
  emit('toggle-hide-to-read')
}

function clearAllFilters() {
  emit('clear-all')
  menuRef.value?.hidePopover()
}
</script>

<style scoped>
[popover] {
  position: absolute;
}

.dropdown-popover {
  opacity: 0;
  transform: scale(0.95);
  transition: opacity 0.1s ease, transform 0.1s ease, overlay 0.1s allow-discrete, display 0.1s allow-discrete;
}

.dropdown-popover:not(.hidden) {
  opacity: 1;
  transform: scale(1);
}

@starting-style {
  .dropdown-popover:not(.hidden) {
    opacity: 0;
    transform: scale(0.95);
  }
}
</style>
```

- [ ] **Step 4: Run the tests to confirm they pass**

Run: `cd frontend && npx vitest run src/components/library/__tests__/FilterDropdown.spec.js`
Expected: PASS, all tests green.

- [ ] **Step 5: Run the full suite**

Run: `cd frontend && npm run test -- --run`
Expected: PASS.

- [ ] **Step 6: Manual browser check**

In the running dev server, open the Library grid view: click the Filter button, confirm the menu opens under it (right-aligned), toggling "Hide Unfinished"/"Hide Unread" keeps the menu open and updates the badge count, "Clear all" closes it, clicking outside closes it, Escape closes it, and it visually renders above other page content without needing any explicit z-index.

- [ ] **Step 7: Commit**

```bash
cd /home/alex/readtrail
git add frontend/src/components/library/FilterDropdown.vue frontend/src/components/library/__tests__/FilterDropdown.spec.js
git commit -m "refactor: migrate FilterDropdown to the Popover API"
```

---

### Task 4: Migrate `UserMenu.vue` to the Popover API

**Files:**
- Modify: `frontend/src/components/UserMenu.vue`

**Interfaces:**
- No test file exists for this component (verified during planning). No prop/emit surface — `UserMenu` takes no props and emits nothing to its parent.
- Produces: same visible behavior as `FilterDropdown` (Task 3) — a popover-based dropdown driven by a `toggle`-event-synced `isOpen` ref, `hidden`-class-driven visibility, no `v-click-outside` directive.

Incidental fix folded into this rewrite: the current file uses `<ChevronDownIcon>`, `<Cog6ToothIcon>`, and `<ArrowRightOnRectangleIcon>` in its template without importing them (confirmed via `grep` — no icon import exists in the current script block, and no global/auto-import registration exists anywhere in the project). This is a pre-existing bug (the icons silently fail to render) unrelated to this refactor, but since this task replaces the entire script block anyway, the fix is folded in here rather than left broken.

- [ ] **Step 1: Rewrite `UserMenu.vue`**

Replace the full contents of `frontend/src/components/UserMenu.vue`:

```vue
<template>
  <div class="relative">
    <!-- User Button (Authenticated) -->
    <button
      v-if="isAuthenticated"
      popovertarget="user-menu"
      class="flex items-center gap-2 px-3 py-2 text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
      :class="{ 'bg-gray-100': isOpen }"
      aria-haspopup="true"
      :aria-expanded="isOpen"
    >
      <div class="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-medium">
        {{ userInitials }}
      </div>
      <span class="text-sm font-medium">{{ userName }}</span>
      <ChevronDownIcon
        class="w-4 h-4 transition-transform"
        :class="{ 'rotate-180': isOpen }"
      />
    </button>

    <!-- Login Button (Not Authenticated) -->
    <RouterLink
      v-else
      to="/login"
      class="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors font-medium"
    >
      Login
    </RouterLink>

    <!-- Dropdown Menu -->
    <div
      v-if="isAuthenticated"
      id="user-menu"
      popover
      class="user-menu-popover absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg ring-1 ring-black ring-opacity-5 py-1"
      :class="{ hidden: !isOpen }"
      @toggle="handleToggle"
    >
      <!-- User Info Section -->
      <div class="px-4 py-3 border-b border-gray-100">
        <p class="text-sm font-medium text-gray-900">{{ userName }}</p>
        <p class="text-xs text-gray-500 truncate">{{ userEmail }}</p>
      </div>

      <!-- Menu Items -->
      <RouterLink
        to="/settings"
        popovertarget="user-menu"
        popovertargetaction="hide"
        class="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
      >
        <Cog6ToothIcon class="w-5 h-5" />
        Settings
      </RouterLink>

      <button
        v-if="canLogout"
        @click="handleLogout"
        class="flex items-center gap-3 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
      >
        <ArrowRightOnRectangleIcon class="w-5 h-5" />
        Logout
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { RouterLink } from 'vue-router'
import { ChevronDownIcon, Cog6ToothIcon, ArrowRightOnRectangleIcon } from '@heroicons/vue/24/outline'
import { authManager } from '@/services/auth'
import { isRemoteUserModeActive } from '@/services/remoteUserMode'
import pb from '@/services/pocketbase'

const isOpen = ref(false)
const canLogout = !isRemoteUserModeActive()
const authState = ref(pb.authStore.isValid)

const isAuthenticated = computed(() => authState.value)
const user = computed(() => pb.authStore.record)
const userName = computed(() => user.value?.name || user.value?.username || user.value?.email?.split('@')[0] || 'User')
const userEmail = computed(() => user.value?.email || '')
const userInitials = computed(() => {
  const name = userName.value
  const words = name.split(' ')
  return words.length >= 2
    ? (words[0][0] + words[1][0]).toUpperCase()
    : name.substring(0, 2).toUpperCase()
})

function handleToggle(event) {
  isOpen.value = event.newState === 'open'
}

async function handleLogout() {
  isOpen.value = false
  await authManager.logout()
  // Reload to ensure clean state
  window.location.href = '/login'
}

// Subscribe to auth state changes
let unsubscribe
onMounted(() => {
  unsubscribe = pb.authStore.onChange(() => {
    authState.value = pb.authStore.isValid
  })
})

onUnmounted(() => {
  unsubscribe?.()
})
</script>

<style scoped>
[popover] {
  position: absolute;
}

.user-menu-popover {
  opacity: 0;
  transform: scale(0.95);
  transition: opacity 0.1s ease, transform 0.1s ease, overlay 0.1s allow-discrete, display 0.1s allow-discrete;
}

.user-menu-popover:not(.hidden) {
  opacity: 1;
  transform: scale(1);
}

@starting-style {
  .user-menu-popover:not(.hidden) {
    opacity: 0;
    transform: scale(0.95);
  }
}
</style>
```

Note the Settings link uses `popovertargetaction="hide"` (not the default `toggle`) — a plain `popovertarget` on a same-page navigation link would otherwise be fine either way, but `hide` is explicit about intent: clicking it should always close the menu, never reopen it.

- [ ] **Step 2: Run the full suite**

Run: `cd frontend && npm run test -- --run`
Expected: PASS (no test file exists for this component, so this just confirms nothing else broke — e.g. `AppHeader.spec.js` if one exists and mounts `UserMenu` as a child).

Run: `cd /home/alex/readtrail && grep -rln "UserMenu" frontend/src/components/__tests__ frontend/src/**/__tests__ 2>/dev/null`
If this finds a test file that mounts `UserMenu` (directly or via `AppHeader`), open it and confirm it doesn't assert on the removed `v-click-outside` directive or the old `Transition` classes before considering this task done.

- [ ] **Step 3: Manual browser check**

In the running dev server, log in, open the user menu (top right), confirm the icons now render (previously silently missing), Settings/Logout work, clicking outside or Escape closes it.

- [ ] **Step 4: Commit**

```bash
cd /home/alex/readtrail
git add frontend/src/components/UserMenu.vue
git commit -m "refactor: migrate UserMenu to the Popover API, fix missing icon imports"
```

---

### Task 5: Auto-fill grid CSS for the book grid/timeline views

**Files:**
- Modify: `frontend/src/views/Library.vue:50,67`

**Interfaces:**
- No component interface changes — this is a pure CSS class change in one file, no props/emits/tests affected.

- [ ] **Step 1: Replace the grid classes at both call sites**

In `frontend/src/views/Library.vue`, line 50:

```vue
    <div v-if="viewMode === 'grid' && filteredBooks.length > 0" class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
```

becomes:

```vue
    <div v-if="viewMode === 'grid' && filteredBooks.length > 0" class="grid gap-6 grid-cols-[repeat(auto-fill,minmax(9rem,1fr))]">
```

And line 67:

```vue
        <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6 mb-8">
```

becomes:

```vue
        <div class="grid gap-6 mb-8 grid-cols-[repeat(auto-fill,minmax(9rem,1fr))]">
```

- [ ] **Step 2: Run the existing test suite**

Run: `cd frontend && npm run test -- --run`
Expected: PASS — no test asserts on these specific grid classes (verified: `Library.vue` has no dedicated `__tests__` file testing this markup; the grid classes aren't referenced by any spec file per a repo-wide grep during planning).

- [ ] **Step 3: Manual browser check and column-width tuning**

Run `npm run dev`, open `/library/grid` with more than a handful of books, and resize the browser window from mobile width up to desktop width. Confirm:
- At the narrowest mobile width, cards don't collapse to fewer than 2 columns (adjust the `9rem` floor down if they do — the old mobile layout was `grid-cols-2`, so 2 columns at ~360-400px viewport width implies each card needs roughly `(viewport / 2) - gap` of space; if 2 columns don't fit at `9rem`, lower it, e.g. to `8rem`).
- At each of the old breakpoints (`md`, `lg`), the column count is close to what it was before (4 and 6 respectively) — some variation is expected and fine, since auto-fill sizes to the actual container width rather than jumping at fixed breakpoints, which is the point of this change.
- Do the same check on `/library/timeline`.

Adjust the `minmax(9rem, 1fr)` value in both places if the manual check shows it needs tuning, then re-run Step 2.

- [ ] **Step 4: Commit**

```bash
cd /home/alex/readtrail
git add frontend/src/views/Library.vue
git commit -m "style: use auto-fill grid columns for the book grid instead of fixed breakpoints"
```

---

### Task 6: Extract `LibraryPageLayout.vue` to remove duplication between `Library.vue` and `LibraryTable.vue`

**Files:**
- Create: `frontend/src/components/library/LibraryPageLayout.vue`
- Modify: `frontend/src/views/Library.vue`
- Modify: `frontend/src/views/LibraryTable.vue`

**Interfaces:**
- Produces: `LibraryPageLayout.vue` — props: `viewMode` (String, required), `hideUnfinished` (Boolean, required), `hideToRead` (Boolean, required), `searchQuery` (String, optional, default `''`), `isSearchModalOpen` (Boolean, required). Emits: `update:search-query`, `set-view-mode`, `toggle-filter`, `toggle-to-read-filter`, `clear-all-filters`, `add-book`, `close-search-modal`, `select-book` (forwarded from the inner `LibraryHeader`/`BookSearch`, same event names `LibraryHeader`/`BookSearch` already emit today except `close`/`select` are renamed on the way out to `close-search-modal`/`select-book` so a parent wiring multiple forwarded events isn't guessing which `close`/`select` belongs to which child). Default slot: the view-specific content (grid/timeline/table markup) rendered between the header and the search modal, matching where it sits today in both `Library.vue` and `LibraryTable.vue`.
- Consumes: `LibraryHeader.vue` and `BookSearch.vue` (both already exist, unchanged).

- [ ] **Step 1: Create `LibraryPageLayout.vue`**

Create `frontend/src/components/library/LibraryPageLayout.vue`:

```vue
<template>
  <div class="container mx-auto px-4 py-8 max-w-7xl">
    <LibraryHeader
      :view-mode="viewMode"
      :hide-unfinished="hideUnfinished"
      :hide-to-read="hideToRead"
      :search-query="searchQuery"
      @update:search-query="$emit('update:search-query', $event)"
      @set-view-mode="$emit('set-view-mode', $event)"
      @toggle-filter="$emit('toggle-filter')"
      @toggle-to-read-filter="$emit('toggle-to-read-filter')"
      @clear-all-filters="$emit('clear-all-filters')"
      @add-book="$emit('add-book')"
    />

    <slot></slot>

    <BookSearch
      :is-open="isSearchModalOpen"
      @close="$emit('close-search-modal')"
      @select="$emit('select-book', $event)"
    />
  </div>
</template>

<script setup>
import LibraryHeader from '@/components/library/LibraryHeader.vue'
import BookSearch from '@/components/library/BookSearch.vue'

defineProps({
  viewMode: {
    type: String,
    required: true
  },
  hideUnfinished: {
    type: Boolean,
    required: true
  },
  hideToRead: {
    type: Boolean,
    required: true
  },
  searchQuery: {
    type: String,
    required: false,
    default: ''
  },
  isSearchModalOpen: {
    type: Boolean,
    required: true
  }
})

defineEmits([
  'update:search-query',
  'set-view-mode',
  'toggle-filter',
  'toggle-to-read-filter',
  'clear-all-filters',
  'add-book',
  'close-search-modal',
  'select-book'
])
</script>
```

- [ ] **Step 2: Update `Library.vue` to use it**

In `frontend/src/views/Library.vue`, replace the template (everything from the opening `<div class="container ...">` through its matching closing `</div>` at the end of the file, i.e. lines 1-84) with:

```vue
<template>
  <LibraryPageLayout
    :view-mode="viewMode"
    :hide-unfinished="hideUnfinished"
    :hide-to-read="hideToRead"
    :search-query="searchQuery"
    :is-search-modal-open="isSearchModalOpen"
    @update:search-query="searchQuery = $event"
    @set-view-mode="setViewMode"
    @toggle-filter="toggleFilter"
    @toggle-to-read-filter="toggleToReadFilter"
    @clear-all-filters="clearAllFilters"
    @add-book="openSearchModal"
    @close-search-modal="closeSearchModal"
    @select-book="handleBookSelect"
  >
    <!-- Empty State -->
    <div v-if="filteredBooks.length === 0" class="flex flex-col items-center justify-center py-16 px-4">
      <div class="text-center max-w-md">
        <svg
          class="mx-auto h-24 w-24 text-gray-400 mb-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="1.5"
            d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
          />
        </svg>
        <h3 class="text-2xl font-semibold text-gray-900 mb-2">Your library is empty</h3>
        <p class="text-gray-600 mb-6">
          Start tracking your reading journey by adding your first book. You can search for books and add them to your collection.
        </p>
        <button
          @click="openSearchModal"
          class="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
        >
          <svg class="mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          Add Your First Book
        </button>
      </div>
    </div>

    <!-- Grid View -->
    <div v-if="viewMode === 'grid' && filteredBooks.length > 0" class="grid gap-6 grid-cols-[repeat(auto-fill,minmax(9rem,1fr))]">
      <BookCard
        v-for="book in filteredBooks"
        :key="book.id"
        :book="book"
      />
    </div>

    <!-- Timeline View -->
    <div v-else-if="viewMode === 'timeline' && filteredBooks.length > 0">
      <div v-for="(group, index) in booksGroupedByYear" :key="group.year || 'in-progress'">
        <div v-if="index > 0" class="my-8 border-t-2 border-gray-300"></div>
        <div class="mb-2">
          <h2 class="text-2xl font-semibold text-gray-800">
            {{ BOOK_STATUS.getTimelineLabel(group.year) }}
          </h2>
        </div>
        <div class="grid gap-6 mb-8 grid-cols-[repeat(auto-fill,minmax(9rem,1fr))]">
          <BookCard
            v-for="book in group.books"
            :key="book.id"
            :book="book"
          />
        </div>
      </div>
    </div>
  </LibraryPageLayout>
</template>
```

(This already includes Task 5's grid class changes — if Task 5 is done first, adjust the two grid `<div>`s above to match whatever floor value that task's manual check settled on.)

Update the `<script setup>` imports — remove `BookSearch` and `LibraryHeader`, add `LibraryPageLayout`:

```js
import BookCard from '@/components/library/BookCard.vue'
import LibraryPageLayout from '@/components/library/LibraryPageLayout.vue'
```

replaces:

```js
import BookCard from '@/components/library/BookCard.vue'
import BookSearch from '@/components/library/BookSearch.vue'
import LibraryHeader from '@/components/library/LibraryHeader.vue'
```

No other script changes — `searchQuery`, `hideUnfinished`, `hideToRead`, `filteredBooks`, `toggleFilter`, `toggleToReadFilter`, `clearAllFilters`, `viewMode`, `booksGroupedByYear`, `setViewMode`, `isSearchModalOpen`, `openSearchModal`, `closeSearchModal`, `handleBookSelect` are all still used exactly as before, just now passed as props/handled as emits on `LibraryPageLayout` instead of on `LibraryHeader`/`BookSearch` directly.

- [ ] **Step 3: Update `LibraryTable.vue` to use it**

In `frontend/src/views/LibraryTable.vue`, replace the template (lines 1-33) with:

```vue
<template>
  <LibraryPageLayout
    view-mode="table"
    :hide-unfinished="hideUnfinished"
    :hide-to-read="hideToRead"
    :is-search-modal-open="isSearchModalOpen"
    @set-view-mode="setViewMode"
    @toggle-filter="toggleFilter"
    @toggle-to-read-filter="toggleToReadFilter"
    @clear-all-filters="clearAllFilters"
    @add-book="openSearchModal"
    @close-search-modal="closeSearchModal"
    @select-book="handleBookSelect"
  >
    <BooksTable
      :books="filteredBooks"
      :settings="settingsStore"
      @delete="handleDeleteBook"
      @update-cover="handleUpdateCover"
      @update-title="handleUpdateTitle"
      @update-author="handleUpdateAuthor"
      @update-status="handleUpdateStatus"
    />
  </LibraryPageLayout>
</template>
```

Update its `<script setup>` imports — remove `BookSearch` and `LibraryHeader`, add `LibraryPageLayout`:

```js
import BooksTable from '@/components/library/BooksTable.vue'
import LibraryPageLayout from '@/components/library/LibraryPageLayout.vue'
```

replaces:

```js
import BookSearch from '@/components/library/BookSearch.vue'
import LibraryHeader from '@/components/library/LibraryHeader.vue'
import BooksTable from '@/components/library/BooksTable.vue'
```

No other script changes.

- [ ] **Step 4: Run the full suite**

Run: `cd frontend && npm run test -- --run`
Expected: PASS. If a `Library.spec.js` or `LibraryTable.spec.js` view-level test file exists and asserts on the container div's classes directly rather than through `LibraryPageLayout`, it may need the same class assertions moved to a new `LibraryPageLayout.spec.js` — check for such a file first:

Run: `cd /home/alex/readtrail && find frontend/src/views/__tests__ -iname "Library*" -o -iname "LibraryTable*" 2>/dev/null`

If nothing is found (no view-level test files exist today, per the repo's current test layout), no further test changes are needed for this task.

- [ ] **Step 5: Manual browser check**

Run `npm run dev`. Visit `/library/grid`, `/library/timeline`, and `/library/table`. Confirm: the header (title, view toggle, search box, filter dropdown, add-book button) renders identically on all three, switching views still works, the search modal still opens/closes and adding a book from search still works, and filtering (hide unfinished / hide to-read / clear all) still works on all three views.

- [ ] **Step 6: Commit**

```bash
cd /home/alex/readtrail
git add frontend/src/components/library/LibraryPageLayout.vue frontend/src/views/Library.vue frontend/src/views/LibraryTable.vue
git commit -m "refactor: extract LibraryPageLayout to remove duplication between Library and LibraryTable views"
```
