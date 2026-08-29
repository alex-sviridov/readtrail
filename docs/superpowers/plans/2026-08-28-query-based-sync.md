# Query-Based Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the frontend's hand-rolled offline-sync engine (localStorage cache + retry queue + id-remapping) with TanStack Query (`@tanstack/vue-query`), cutting the sync-related code roughly in half while keeping guest mode and the guest→account migration working.

**Architecture:** `booksApi`/`settingsApi` stay the PocketBase-facing data layer, extended so their existing `isGuestMode()` branches read/write a new local-only `guestStore` instead of returning empty/null. New composables (`useBooksQuery`, `useSettingsQuery`) wrap these APIs in `useQuery`/`useMutation` with optimistic updates. `stores/books.js`/`stores/settings.js` shrink to thin Pinia facades over those composables, keeping their existing public API so views don't change. The hand-rolled queue, retry/backoff, and online-status merging are deleted outright — offline writes just fail with a toast; VueUse's `useOnline()` covers network status.

**Tech Stack:** Vue 3 (Composition API, `<script setup>`), Pinia, `@tanstack/vue-query` (new), `@vueuse/core` (already a dependency, `useOnline` currently unused), PocketBase JS SDK, Vitest + `@vue/test-utils`.

**Spec:** `docs/superpowers/specs/2026-08-28-query-based-sync-design.md`

## Global Constraints

- No offline write queue, retry-with-backoff, or optimistic id-remapping across reloads (spec Non-goals).
- No PocketBase realtime subscriptions (spec Non-goals).
- No changes to the PocketBase schema/backend, and no domain-field changes to books/settings (spec Goals).
- Guest mode's localStorage key for books stays `readtrail-books` and the settings key stays `readtrail-settings` — `views/Login.vue` and `views/Register.vue` remove these keys directly by name after migration, and `router/index.js` reads `readtrail-settings` synchronously before the app mounts; both must keep working unmodified.
- Public API of `useBooksStore()` / `useSettingsStore()` (state and action names) stays the same — consuming views (`Library.vue`, `LibraryTable.vue`, `LibraryHeader.vue`, `SettingsApplication.vue`, `SettingsAccount.vue`, `Login.vue`, `Register.vue`, `Statistics.vue`, `main.js`, `auth.js`) are not part of this plan and must not need edits.
- All new/changed code follows the existing project conventions: named exports, `logger` from `@/utils/logger` for logging, JSDoc comments matching the surrounding style.

---

### Task 1: Add TanStack Query and a shared QueryClient

**Files:**
- Modify: `frontend/package.json` (add dependency)
- Create: `frontend/src/services/queryClient.js`
- Modify: `frontend/src/main.js`
- Test: `frontend/src/services/__tests__/queryClient.spec.js`

**Interfaces:**
- Produces: `queryClient` (a `QueryClient` instance, importable singleton), `installQueryPersistence(client)` (function, wires up localStorage persistence for the given client, returns the unsubscribe function from `persistQueryClient`).

- [ ] **Step 1: Install the dependency**

Run: `cd frontend && npm install @tanstack/vue-query@^5 @tanstack/query-sync-storage-persister@^5 @tanstack/query-persist-client-core@^5`

Expected: `frontend/package.json` gains the three packages under `dependencies`; `frontend/package-lock.json` updates.

- [ ] **Step 2: Write the failing test for `queryClient.js`**

```js
// frontend/src/services/__tests__/queryClient.spec.js
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { QueryClient } from '@tanstack/vue-query'
import { queryClient, installQueryPersistence } from '../queryClient'

describe('queryClient', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('exports a shared QueryClient instance', () => {
    expect(queryClient).toBeInstanceOf(QueryClient)
  })

  it('defaults reads to a couple of retries and mutations to no retry', () => {
    const defaults = queryClient.getDefaultOptions()
    expect(defaults.queries.retry).toBe(2)
    expect(defaults.mutations.retry).toBe(false)
  })

  it('persists query data to localStorage under the readtrail prefix', async () => {
    queryClient.setQueryData(['books'], [{ id: '1', name: 'Test' }])

    const unsubscribe = installQueryPersistence(queryClient)
    // persistQueryClient writes on the next microtask after a cache change
    await new Promise((resolve) => setTimeout(resolve, 0))

    const stored = Object.keys(localStorage).find((key) => key.startsWith('readtrail-query-cache'))
    expect(stored).toBeDefined()

    unsubscribe()
  })

  it('installQueryPersistence returns an unsubscribe function', () => {
    const unsubscribe = installQueryPersistence(queryClient)
    expect(typeof unsubscribe).toBe('function')
    unsubscribe()
  })
})
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `cd frontend && npx vitest run src/services/__tests__/queryClient.spec.js`
Expected: FAIL — `Cannot find module '../queryClient'` (or similar).

- [ ] **Step 4: Implement `queryClient.js`**

```js
// frontend/src/services/queryClient.js
/**
 * Shared TanStack Query client and localStorage persistence.
 * Reads are cached and revalidated in the background; mutations do not
 * retry automatically (offline writes fail fast and surface a toast).
 */
import { QueryClient } from '@tanstack/vue-query'
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister'
import { persistQueryClient } from '@tanstack/query-persist-client-core'

const PERSIST_KEY = 'readtrail-query-cache'
const MAX_CACHE_AGE_MS = 1000 * 60 * 60 * 24 * 7 // 1 week

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 30_000
    },
    mutations: {
      retry: false
    }
  }
})

/**
 * Restore the query cache from localStorage and keep it in sync going
 * forward. Safe to call once at app startup.
 * @param {QueryClient} client
 * @returns {() => void} Unsubscribe function
 */
export function installQueryPersistence(client) {
  const persister = createSyncStoragePersister({
    storage: window.localStorage,
    key: PERSIST_KEY
  })

  const [unsubscribe] = persistQueryClient({
    queryClient: client,
    persister,
    maxAge: MAX_CACHE_AGE_MS
  })

  return unsubscribe
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `cd frontend && npx vitest run src/services/__tests__/queryClient.spec.js`
Expected: PASS (4 tests)

- [ ] **Step 6: Wire into `main.js`**

Replace the current contents of `frontend/src/main.js` with:

```js
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { VueQueryPlugin } from '@tanstack/vue-query'
import Toast from 'vue-toastification'
import 'vue-toastification/dist/index.css'

import App from './App.vue'
import router from './router'
import { queryClient, installQueryPersistence } from './services/queryClient'
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

app.mount('#app')

logger.info('App mounted')
```

This drops the old `initializeApp()` gate that awaited `loadBooks`/`loadSettings` before mounting: the persisted cache renders instantly, and each store's query fetches in the background the moment a component first uses it (Task 7/8 make the stores set up their queries in `defineStore(...)`'s `setup` function, so this happens as soon as any component calls `useBooksStore()`/`useSettingsStore()`, which happens during the very first render).

- [ ] **Step 7: Run the full frontend test suite**

Run: `cd frontend && npm test -- --run`
Expected: Existing suite still passes (some `stores/books.spec.js`/`stores/settings.spec.js` failures are expected until Tasks 7–8 — note which files fail here so you can confirm they're gone by Task 8, but don't fix them yet).

- [ ] **Step 8: Commit**

```bash
git add frontend/package.json frontend/package-lock.json frontend/src/services/queryClient.js frontend/src/services/__tests__/queryClient.spec.js frontend/src/main.js
git commit -m "Add TanStack Query client with localStorage persistence"
```

---

### Task 2: Guest-mode local store

**Files:**
- Modify: `frontend/src/constants/index.js` (add `DEFAULT_SETTINGS`)
- Create: `frontend/src/services/guestStore.js`
- Test: `frontend/src/services/__tests__/guestStore.spec.js`

**Interfaces:**
- Consumes: `DEFAULT_BOOK_ATTRIBUTES` from `@/utils/bookSchema`, `serializeBook`/`deserializeBook` from `@/utils/bookSerialization`, `handleStorageError` from `@/utils/storageErrors`, `logger` from `@/utils/logger`.
- Produces: `getGuestBooks()`, `createGuestBook(bookInput)`, `updateGuestBook(id, updates)`, `deleteGuestBook(id)`, `getGuestSettings()`, `updateGuestSettings(partial)`, `clearGuestData()` — all synchronous functions (books/settings are the same shape the rest of the app already uses).

- [ ] **Step 1: Move `DEFAULT_SETTINGS` to constants**

In `frontend/src/constants/index.js`, add (near the other exported config objects):

```js
// Default application settings (used for guests and as a merge base for backend settings)
export const DEFAULT_SETTINGS = {
  showBookInfo: true,
  allowUnfinishedReading: true,
  allowScoring: true,
  lastLibraryView: 'timeline',
  hideUnfinished: true,
  hideToRead: true
}
```

In `frontend/src/services/settingsApi.js`, replace the local `DEFAULT_SETTINGS` declaration (lines 13-20) with:

```js
import { DEFAULT_SETTINGS } from '@/constants'

export { DEFAULT_SETTINGS }
```

(Keep the existing `import pb from './pocketbase'` etc. above it; this just changes where `DEFAULT_SETTINGS` is defined, not its shape or its export from `settingsApi.js`.)

- [ ] **Step 2: Write the failing test for `guestStore.js`**

```js
// frontend/src/services/__tests__/guestStore.spec.js
import { describe, it, expect, beforeEach } from 'vitest'
import {
  getGuestBooks,
  createGuestBook,
  updateGuestBook,
  deleteGuestBook,
  getGuestSettings,
  updateGuestSettings,
  clearGuestData
} from '../guestStore'

describe('guestStore', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  describe('books', () => {
    it('returns an empty array when nothing is stored', () => {
      expect(getGuestBooks()).toEqual([])
    })

    it('creates a book with a generated id and persists it', () => {
      const book = createGuestBook({ name: '1984', author: 'George Orwell', year: 2024, month: 3 })

      expect(book.id).toBeDefined()
      expect(book.name).toBe('1984')
      expect(book.attributes).toEqual({ isUnfinished: false, customCover: false, score: null })
      expect(getGuestBooks()).toHaveLength(1)
      expect(getGuestBooks()[0].id).toBe(book.id)
    })

    it('updates an existing book by id', () => {
      const book = createGuestBook({ name: 'Dune' })
      const updated = updateGuestBook(book.id, { name: 'Dune Messiah' })

      expect(updated.name).toBe('Dune Messiah')
      expect(getGuestBooks()[0].name).toBe('Dune Messiah')
    })

    it('returns null when updating a missing book', () => {
      expect(updateGuestBook('missing-id', { name: 'x' })).toBeNull()
    })

    it('deletes a book by id', () => {
      const book = createGuestBook({ name: 'Dune' })
      const result = deleteGuestBook(book.id)

      expect(result).toBe(true)
      expect(getGuestBooks()).toHaveLength(0)
    })

    it('returns false when deleting a missing book', () => {
      expect(deleteGuestBook('missing-id')).toBe(false)
    })
  })

  describe('settings', () => {
    it('returns defaults when nothing is stored', () => {
      expect(getGuestSettings()).toEqual({
        showBookInfo: true,
        allowUnfinishedReading: true,
        allowScoring: true,
        lastLibraryView: 'timeline',
        hideUnfinished: true,
        hideToRead: true
      })
    })

    it('merges partial updates over the current settings and persists them', () => {
      const updated = updateGuestSettings({ hideUnfinished: false })

      expect(updated.hideUnfinished).toBe(false)
      expect(updated.showBookInfo).toBe(true)
      expect(getGuestSettings().hideUnfinished).toBe(false)
    })
  })

  describe('clearGuestData', () => {
    it('removes stored books and settings', () => {
      createGuestBook({ name: 'Dune' })
      updateGuestSettings({ hideUnfinished: false })

      clearGuestData()

      expect(getGuestBooks()).toEqual([])
      expect(getGuestSettings().hideUnfinished).toBe(true)
    })
  })
})
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `cd frontend && npx vitest run src/services/__tests__/guestStore.spec.js`
Expected: FAIL — `Cannot find module '../guestStore'`

- [ ] **Step 4: Implement `guestStore.js`**

```js
// frontend/src/services/guestStore.js
/**
 * Local-only data store for guest mode (no backend account).
 * Books and settings live entirely in localStorage; there is no sync
 * queue because there is nothing to reconcile with a server.
 */
import { logger } from '@/utils/logger'
import { handleStorageError } from '@/utils/storageErrors'
import { serializeBook, deserializeBook } from '@/utils/bookSerialization'
import { DEFAULT_BOOK_ATTRIBUTES } from '@/utils/bookSchema'
import { DEFAULT_SETTINGS } from '@/constants'

const BOOKS_KEY = 'readtrail-books'
const SETTINGS_KEY = 'readtrail-settings'

let guestIdCounter = 0

function generateGuestId() {
  return `guest-${Date.now()}-${guestIdCounter++}`
}

function readBooks() {
  try {
    const stored = localStorage.getItem(BOOKS_KEY)
    if (!stored) return []
    return JSON.parse(stored).map(deserializeBook)
  } catch (error) {
    handleStorageError(error, { operation: 'load' })
    return []
  }
}

function writeBooks(books) {
  try {
    localStorage.setItem(BOOKS_KEY, JSON.stringify(books.map(serializeBook)))
  } catch (error) {
    const sizeKB = Math.round(JSON.stringify(books).length / 1024)
    handleStorageError(error, { operation: 'save', itemCount: books.length, sizeKB })
  }
}

/**
 * @returns {Array} All guest books, newest first is not guaranteed — callers sort as needed.
 */
export function getGuestBooks() {
  return readBooks()
}

/**
 * @param {Object} bookInput - Same shape as `stores/books.js#addBook` builds.
 * @returns {Object} The created book, including its generated id.
 */
export function createGuestBook(bookInput) {
  const books = readBooks()
  const book = {
    id: generateGuestId(),
    name: bookInput.name,
    author: bookInput.author ?? null,
    coverLink: bookInput.coverLink ?? null,
    coverDisplayLink: bookInput.coverDisplayLink ?? bookInput.coverLink ?? null,
    year: bookInput.year ?? null,
    month: bookInput.month ?? null,
    attributes: { ...DEFAULT_BOOK_ATTRIBUTES, ...bookInput.attributes },
    createdAt: new Date()
  }

  books.push(book)
  writeBooks(books)
  logger.debug('[GuestStore] Created book:', book.id)

  return book
}

/**
 * @param {string} id
 * @param {Object} updates - Partial book fields; `attributes` is merged, not replaced.
 * @returns {Object|null} The updated book, or null if no book matched.
 */
export function updateGuestBook(id, updates) {
  const books = readBooks()
  const book = books.find((b) => b.id === id)
  if (!book) return null

  const { attributes, ...rest } = updates
  Object.assign(book, rest)
  if (attributes) {
    book.attributes = { ...book.attributes, ...attributes }
  }
  if (updates.coverLink !== undefined && !updates.coverDisplayLink) {
    book.coverDisplayLink = updates.coverLink
  }

  writeBooks(books)
  logger.debug('[GuestStore] Updated book:', id)

  return book
}

/**
 * @param {string} id
 * @returns {boolean} True if a book was removed.
 */
export function deleteGuestBook(id) {
  const books = readBooks()
  const index = books.findIndex((b) => b.id === id)
  if (index === -1) return false

  books.splice(index, 1)
  writeBooks(books)
  logger.debug('[GuestStore] Deleted book:', id)

  return true
}

/**
 * @returns {Object} Current guest settings, merged over defaults.
 */
export function getGuestSettings() {
  try {
    const stored = localStorage.getItem(SETTINGS_KEY)
    if (!stored) return { ...DEFAULT_SETTINGS }
    return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) }
  } catch (error) {
    handleStorageError(error, { operation: 'load' })
    return { ...DEFAULT_SETTINGS }
  }
}

/**
 * @param {Object} partial - Settings fields to merge and persist.
 * @returns {Object} The full settings object after merging.
 */
export function updateGuestSettings(partial) {
  const settings = { ...getGuestSettings(), ...partial }
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
  } catch (error) {
    handleStorageError(error, { operation: 'save' })
  }
  return settings
}

/**
 * Remove all guest data (books and settings). Used after migrating to an
 * authenticated account and on logout.
 */
export function clearGuestData() {
  localStorage.removeItem(BOOKS_KEY)
  localStorage.removeItem(SETTINGS_KEY)
  logger.debug('[GuestStore] Cleared guest data')
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `cd frontend && npx vitest run src/services/__tests__/guestStore.spec.js src/services/__tests__/settingsApi.spec.js`
Expected: PASS for `guestStore.spec.js`; `settingsApi.spec.js` should still pass unchanged since `DEFAULT_SETTINGS`'s value and export path didn't change, only its source file.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/constants/index.js frontend/src/services/settingsApi.js frontend/src/services/guestStore.js frontend/src/services/__tests__/guestStore.spec.js
git commit -m "Add guest-mode local store, move DEFAULT_SETTINGS to constants"
```

---

### Task 3: Route `booksApi` guest-mode calls through `guestStore`

**Files:**
- Modify: `frontend/src/services/booksApi.js`
- Modify: `frontend/src/services/__tests__/booksApi.spec.js`

**Interfaces:**
- Consumes: `getGuestBooks`, `createGuestBook`, `updateGuestBook`, `deleteGuestBook` from `@/services/guestStore` (Task 2).
- Produces: `booksApi.getBooks()`, `.createBook(book)`, `.updateBook(id, book)`, `.deleteBook(id)` all now fully functional for guests (previously `getBooks` returned `[]` and the others threw via `requireAuth`).

- [ ] **Step 1: Write the failing tests**

Add to `frontend/src/services/__tests__/booksApi.spec.js` (alongside the existing `describe('BooksApi', ...)` block — check the existing mock setup for `isGuestMode`/`pb` at the top of the file and reuse it):

```js
import { getGuestBooks, createGuestBook, updateGuestBook, deleteGuestBook } from '../guestStore'

// ... inside the existing describe('BooksApi', () => { ... }) block:

describe('guest mode', () => {
  beforeEach(() => {
    isGuestMode.mockReturnValue(true)
    localStorage.clear()
  })

  it('getBooks reads from the guest store', async () => {
    createGuestBook({ name: 'Guest Book' })

    const books = await booksApi.getBooks()

    expect(books).toHaveLength(1)
    expect(books[0].name).toBe('Guest Book')
  })

  it('createBook writes to the guest store', async () => {
    const created = await booksApi.createBook({ name: 'New Guest Book', year: 2024, month: 1 })

    expect(created.name).toBe('New Guest Book')
    expect(getGuestBooks()).toHaveLength(1)
  })

  it('updateBook writes to the guest store', async () => {
    const book = createGuestBook({ name: 'Original' })

    const updated = await booksApi.updateBook(book.id, { name: 'Renamed' })

    expect(updated.name).toBe('Renamed')
  })

  it('deleteBook removes from the guest store', async () => {
    const book = createGuestBook({ name: 'To delete' })

    await booksApi.deleteBook(book.id)

    expect(getGuestBooks()).toHaveLength(0)
  })
})
```

Note: `updateGuestBook`/`deleteGuestBook` are imported above for symmetry with the file's existing style even if not directly asserted on — remove the unused ones if lint complains, keeping only what's used.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd frontend && npx vitest run src/services/__tests__/booksApi.spec.js`
Expected: FAIL — guest `createBook`/`updateBook`/`deleteBook` currently throw `Cannot create books in guest mode` (via `requireAuth`).

- [ ] **Step 3: Implement the guest branches in `booksApi.js`**

At the top of `frontend/src/services/booksApi.js`, add the import:

```js
import { getGuestBooks, createGuestBook, updateGuestBook, deleteGuestBook } from './guestStore'
```

Replace the `getBooks` method body:

```js
  async getBooks() {
    if (isGuestMode()) {
      return getGuestBooks()
    }

    try {
      const result = await pb.collection('books').getList(1, 500, {
        sort: '-created'
      })

      return result.items.map(transformBookFromPocketBase)
    } catch (error) {
      if (error.status === 404 || error.status === 0) {
        return []
      }
      throw adaptPocketBaseError(error)
    }
  }
```

Replace the `createBook` method body:

```js
  async createBook(book) {
    if (isGuestMode()) {
      return createGuestBook(book)
    }

    try {
      const pbData = transformBookToPocketBase(book)
      const record = await pb.collection('books').create(pbData)
      return transformBookFromPocketBase(record)
    } catch (error) {
      throw adaptPocketBaseError(error)
    }
  }
```

Replace the `updateBook` method body:

```js
  async updateBook(id, book) {
    if (isGuestMode()) {
      const updated = updateGuestBook(id, book)
      if (!updated) throw new Error(`Guest book not found: ${id}`)
      return updated
    }

    try {
      const pbData = transformBookToPocketBase(book)
      const record = await pb.collection('books').update(id, pbData)
      return transformBookFromPocketBase(record)
    } catch (error) {
      throw adaptPocketBaseError(error)
    }
  }
```

Replace the `deleteBook` method body:

```js
  async deleteBook(id) {
    if (isGuestMode()) {
      deleteGuestBook(id)
      return
    }

    try {
      await pb.collection('books').delete(id)
    } catch (error) {
      throw adaptPocketBaseError(error)
    }
  }
```

Leave `getBook`, `batchCreateBooks`, and `getSyncHandlers` untouched — `getBook`/`batchCreateBooks` are only ever called for authenticated users (`requireAuth` guard stays correct for them), and `getSyncHandlers` is deleted in Task 11 along with `syncQueue.js`.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd frontend && npx vitest run src/services/__tests__/booksApi.spec.js`
Expected: PASS (all tests, including the pre-existing authenticated-mode ones)

- [ ] **Step 5: Commit**

```bash
git add frontend/src/services/booksApi.js frontend/src/services/__tests__/booksApi.spec.js
git commit -m "Route booksApi guest-mode CRUD through guestStore"
```

---

### Task 4: Route `settingsApi` guest-mode calls through `guestStore`

**Files:**
- Modify: `frontend/src/services/settingsApi.js`
- Modify: `frontend/src/services/__tests__/settingsApi.spec.js`

**Interfaces:**
- Consumes: `getGuestSettings`, `updateGuestSettings` from `@/services/guestStore` (Task 2).
- Produces: `settingsApi.getSettings()` now returns the guest settings object (previously `null`) when in guest mode; `.updateSettings(settings)` now works for guests (previously threw via `requireAuth`).

- [ ] **Step 1: Write the failing tests**

Add to `frontend/src/services/__tests__/settingsApi.spec.js`:

```js
import { getGuestSettings } from '../guestStore'

// ... inside the existing describe('SettingsApi', () => { ... }) block:

describe('guest mode', () => {
  beforeEach(() => {
    isGuestMode.mockReturnValue(true)
    localStorage.clear()
  })

  it('getSettings returns guest settings instead of null', async () => {
    const settings = await settingsApi.getSettings()

    expect(settings.showBookInfo).toBe(true)
    expect(settings.lastLibraryView).toBe('timeline')
  })

  it('updateSettings persists to the guest store', async () => {
    const updated = await settingsApi.updateSettings({ hideUnfinished: false })

    expect(updated.hideUnfinished).toBe(false)
    expect(getGuestSettings().hideUnfinished).toBe(false)
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd frontend && npx vitest run src/services/__tests__/settingsApi.spec.js`
Expected: FAIL — `getSettings` currently returns `null` for guests, `updateSettings` throws.

- [ ] **Step 3: Implement the guest branches in `settingsApi.js`**

Add the import at the top:

```js
import { getGuestSettings, updateGuestSettings } from './guestStore'
```

Replace the `getSettings` method body:

```js
  async getSettings() {
    if (isGuestMode()) {
      return getGuestSettings()
    }

    try {
      const userId = pb.authStore.record?.id
      if (!userId) {
        throw new Error('No authenticated user')
      }

      const user = await pb.collection('users').getOne(userId)
      return transformSettingsFromPocketBase(user)
    } catch (error) {
      if (error.status === 404 || error.status === 403 || error.status === 0) {
        return null
      }
      throw adaptPocketBaseError(error)
    }
  }
```

Replace the `updateSettings` method body:

```js
  async updateSettings(settings) {
    if (isGuestMode()) {
      return updateGuestSettings(settings)
    }

    try {
      const userId = pb.authStore.record?.id
      if (!userId) {
        throw new Error('No authenticated user')
      }

      const user = await pb.collection('users').update(userId, { settings })
      return transformSettingsFromPocketBase(user)
    } catch (error) {
      throw adaptPocketBaseError(error)
    }
  }
```

Leave `getSyncHandlers` in place for now — it's deleted in Task 11 with `syncQueue.js`.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd frontend && npx vitest run src/services/__tests__/settingsApi.spec.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/services/settingsApi.js frontend/src/services/__tests__/settingsApi.spec.js
git commit -m "Route settingsApi guest-mode CRUD through guestStore"
```

---

### Task 5: `useBooksQuery` composable

**Files:**
- Create: `frontend/src/composables/useBooksQuery.js`
- Test: `frontend/src/composables/__tests__/useBooksQuery.spec.js`

**Interfaces:**
- Consumes: `booksApi` from `@/services/booksApi` (Task 3).
- Produces: `BOOKS_QUERY_KEY` (array constant `['books']`), `useBooksQuery()` (returns the `useQuery` result: `{ data, isLoading, isError, error, refetch, ... }`), `useCreateBook()`, `useUpdateBook()`, `useDeleteBook()` (each returns a `useMutation` result: `{ mutate, mutateAsync, isPending, ... }`).

- [ ] **Step 1: Write the failing tests**

```js
// frontend/src/composables/__tests__/useBooksQuery.spec.js
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { defineComponent } from 'vue'
import { mount } from '@vue/test-utils'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { booksApi } from '@/services/booksApi'
import { useBooksQuery, useCreateBook, useUpdateBook, useDeleteBook, BOOKS_QUERY_KEY } from '../useBooksQuery'

vi.mock('@/services/booksApi')

function mountWithQuery(setup) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
  })

  let result
  const TestComponent = defineComponent({
    setup() {
      result = setup()
      return () => null
    }
  })

  const wrapper = mount(TestComponent, {
    global: { plugins: [[VueQueryPlugin, { queueClient: queryClient, queryClient }]] }
  })

  return { wrapper, queryClient, get result() { return result } }
}

describe('useBooksQuery', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetches books via booksApi.getBooks', async () => {
    booksApi.getBooks.mockResolvedValue([{ id: '1', name: 'Dune' }])

    const { result } = mountWithQuery(() => useBooksQuery())
    await vi.waitUntil(() => !result.isLoading.value)

    expect(booksApi.getBooks).toHaveBeenCalled()
    expect(result.data.value).toEqual([{ id: '1', name: 'Dune' }])
  })

  describe('useCreateBook', () => {
    it('optimistically adds the book to the cache, then replaces it with the server result', async () => {
      booksApi.createBook.mockResolvedValue({ id: 'real-1', name: 'Dune' })

      const { queryClient, result } = mountWithQuery(() => useCreateBook())
      queryClient.setQueryData(BOOKS_QUERY_KEY, [])

      const mutationPromise = result.mutateAsync({ tempId: 'temp-1', book: { name: 'Dune' } })

      // Optimistic update happens synchronously within mutate/mutateAsync
      expect(queryClient.getQueryData(BOOKS_QUERY_KEY)).toEqual([{ id: 'temp-1', name: 'Dune' }])

      await mutationPromise

      expect(queryClient.getQueryData(BOOKS_QUERY_KEY)).toEqual([{ id: 'real-1', name: 'Dune' }])
    })

    it('rolls back the optimistic entry on failure', async () => {
      booksApi.createBook.mockRejectedValue(new Error('network error'))

      const { queryClient, result } = mountWithQuery(() => useCreateBook())
      queryClient.setQueryData(BOOKS_QUERY_KEY, [])

      await expect(
        result.mutateAsync({ tempId: 'temp-1', book: { name: 'Dune' } })
      ).rejects.toThrow('network error')

      expect(queryClient.getQueryData(BOOKS_QUERY_KEY)).toEqual([])
    })
  })

  describe('useUpdateBook', () => {
    it('optimistically applies the update, keeping it on success', async () => {
      booksApi.updateBook.mockResolvedValue({ id: '1', name: 'Dune Messiah' })

      const { queryClient, result } = mountWithQuery(() => useUpdateBook())
      queryClient.setQueryData(BOOKS_QUERY_KEY, [{ id: '1', name: 'Dune' }])

      await result.mutateAsync({ id: '1', updates: { name: 'Dune Messiah' } })

      expect(queryClient.getQueryData(BOOKS_QUERY_KEY)).toEqual([{ id: '1', name: 'Dune Messiah' }])
    })
  })

  describe('useDeleteBook', () => {
    it('optimistically removes the book, keeping it removed on success', async () => {
      booksApi.deleteBook.mockResolvedValue(undefined)

      const { queryClient, result } = mountWithQuery(() => useDeleteBook())
      queryClient.setQueryData(BOOKS_QUERY_KEY, [{ id: '1', name: 'Dune' }])

      await result.mutateAsync({ id: '1' })

      expect(queryClient.getQueryData(BOOKS_QUERY_KEY)).toEqual([])
    })

    it('restores the book on failure', async () => {
      booksApi.deleteBook.mockRejectedValue(new Error('network error'))

      const { queryClient, result } = mountWithQuery(() => useDeleteBook())
      queryClient.setQueryData(BOOKS_QUERY_KEY, [{ id: '1', name: 'Dune' }])

      await expect(result.mutateAsync({ id: '1' })).rejects.toThrow()

      expect(queryClient.getQueryData(BOOKS_QUERY_KEY)).toEqual([{ id: '1', name: 'Dune' }])
    })
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd frontend && npx vitest run src/composables/__tests__/useBooksQuery.spec.js`
Expected: FAIL — `Cannot find module '../useBooksQuery'`

- [ ] **Step 3: Implement `useBooksQuery.js`**

```js
// frontend/src/composables/useBooksQuery.js
/**
 * TanStack Query composables for books: one query, three mutations.
 * Mutations use optimistic updates against the ['books'] cache entry and
 * roll back on failure — there is no retry queue, a failed write just
 * surfaces an error to the caller.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import { booksApi } from '@/services/booksApi'
import { logger } from '@/utils/logger'

export const BOOKS_QUERY_KEY = ['books']

export function useBooksQuery() {
  return useQuery({
    queryKey: BOOKS_QUERY_KEY,
    queryFn: () => booksApi.getBooks()
  })
}

export function useCreateBook() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ book }) => booksApi.createBook(book),
    onMutate: async ({ tempId, book }) => {
      await queryClient.cancelQueries({ queryKey: BOOKS_QUERY_KEY })
      const previousBooks = queryClient.getQueryData(BOOKS_QUERY_KEY) ?? []
      const { coverFile, ...optimisticFields } = book
      void coverFile
      const optimisticBook = { ...optimisticFields, id: tempId }

      queryClient.setQueryData(BOOKS_QUERY_KEY, [...previousBooks, optimisticBook])

      return { previousBooks, tempId }
    },
    onError: (error, _variables, context) => {
      logger.error('[useCreateBook] Create failed:', error)
      if (context?.previousBooks) {
        queryClient.setQueryData(BOOKS_QUERY_KEY, context.previousBooks)
      }
    },
    onSuccess: (createdBook, _variables, context) => {
      const current = queryClient.getQueryData(BOOKS_QUERY_KEY) ?? []
      queryClient.setQueryData(
        BOOKS_QUERY_KEY,
        current.map((book) => (book.id === context.tempId ? createdBook : book))
      )
    }
  })
}

export function useUpdateBook() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, updates }) => booksApi.updateBook(id, updates),
    onMutate: async ({ id, updates }) => {
      await queryClient.cancelQueries({ queryKey: BOOKS_QUERY_KEY })
      const previousBooks = queryClient.getQueryData(BOOKS_QUERY_KEY) ?? []
      const { attributes, coverFile, ...rest } = updates
      void coverFile

      queryClient.setQueryData(
        BOOKS_QUERY_KEY,
        previousBooks.map((book) =>
          book.id === id
            ? { ...book, ...rest, ...(attributes ? { attributes: { ...book.attributes, ...attributes } } : {}) }
            : book
        )
      )

      return { previousBooks }
    },
    onError: (error, _variables, context) => {
      logger.error('[useUpdateBook] Update failed:', error)
      if (context?.previousBooks) {
        queryClient.setQueryData(BOOKS_QUERY_KEY, context.previousBooks)
      }
    },
    onSuccess: (updatedBook) => {
      const current = queryClient.getQueryData(BOOKS_QUERY_KEY) ?? []
      queryClient.setQueryData(
        BOOKS_QUERY_KEY,
        current.map((book) => (book.id === updatedBook.id ? updatedBook : book))
      )
    }
  })
}

export function useDeleteBook() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id }) => booksApi.deleteBook(id),
    onMutate: async ({ id }) => {
      await queryClient.cancelQueries({ queryKey: BOOKS_QUERY_KEY })
      const previousBooks = queryClient.getQueryData(BOOKS_QUERY_KEY) ?? []

      queryClient.setQueryData(
        BOOKS_QUERY_KEY,
        previousBooks.filter((book) => book.id !== id)
      )

      return { previousBooks }
    },
    onError: (error, _variables, context) => {
      logger.error('[useDeleteBook] Delete failed:', error)
      if (context?.previousBooks) {
        queryClient.setQueryData(BOOKS_QUERY_KEY, context.previousBooks)
      }
    }
  })
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd frontend && npx vitest run src/composables/__tests__/useBooksQuery.spec.js`
Expected: PASS (7 tests)

- [ ] **Step 5: Commit**

```bash
git add frontend/src/composables/useBooksQuery.js frontend/src/composables/__tests__/useBooksQuery.spec.js
git commit -m "Add useBooksQuery composable with optimistic mutations"
```

---

### Task 6: `useSettingsQuery` composable

**Files:**
- Create: `frontend/src/composables/useSettingsQuery.js`
- Test: `frontend/src/composables/__tests__/useSettingsQuery.spec.js`

**Interfaces:**
- Consumes: `settingsApi`, `DEFAULT_SETTINGS` from `@/services/settingsApi` (Task 4).
- Produces: `SETTINGS_QUERY_KEY` (array constant `['settings']`), `useSettingsQuery()` (`useQuery` result), `useUpdateSetting()` (`useMutation` result whose `mutate`/`mutateAsync` takes `{ key, value }`).

**Note:** `router/index.js` reads `localStorage.getItem('readtrail-settings')` synchronously *before* the Vue app (and therefore Query's persister) exists, to pick the initial route. `useUpdateSetting`'s `onSuccess` must keep writing the plain settings object to that same `readtrail-settings` key (in addition to whatever the Query persister does for the `['settings']` cache entry) so that fast-path keeps working. For guests this is already true because `guestStore.updateGuestSettings` (Task 2) writes to `readtrail-settings` directly; this task adds the equivalent mirror write for authenticated users.

- [ ] **Step 1: Write the failing tests**

```js
// frontend/src/composables/__tests__/useSettingsQuery.spec.js
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { defineComponent } from 'vue'
import { mount } from '@vue/test-utils'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { settingsApi, DEFAULT_SETTINGS } from '@/services/settingsApi'
import { useSettingsQuery, useUpdateSetting, SETTINGS_QUERY_KEY } from '../useSettingsQuery'

vi.mock('@/services/settingsApi', async () => {
  const actual = await vi.importActual('@/services/settingsApi')
  return { ...actual, settingsApi: { getSettings: vi.fn(), updateSettings: vi.fn() } }
})

function mountWithQuery(setup) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
  })

  let result
  const TestComponent = defineComponent({
    setup() {
      result = setup()
      return () => null
    }
  })

  mount(TestComponent, {
    global: { plugins: [[VueQueryPlugin, { queryClient }]] }
  })

  return { queryClient, get result() { return result } }
}

describe('useSettingsQuery', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  it('fetches settings via settingsApi.getSettings', async () => {
    settingsApi.getSettings.mockResolvedValue({ ...DEFAULT_SETTINGS, hideUnfinished: false })

    const { result } = mountWithQuery(() => useSettingsQuery())
    await vi.waitUntil(() => !result.isLoading.value)

    expect(result.data.value.hideUnfinished).toBe(false)
  })

  describe('useUpdateSetting', () => {
    it('optimistically applies the change and mirrors it to the legacy localStorage key', async () => {
      settingsApi.updateSettings.mockResolvedValue({ ...DEFAULT_SETTINGS, hideUnfinished: false })

      const { queryClient, result } = mountWithQuery(() => useUpdateSetting())
      queryClient.setQueryData(SETTINGS_QUERY_KEY, { ...DEFAULT_SETTINGS })

      await result.mutateAsync({ key: 'hideUnfinished', value: false })

      expect(queryClient.getQueryData(SETTINGS_QUERY_KEY).hideUnfinished).toBe(false)
      expect(JSON.parse(localStorage.getItem('readtrail-settings')).hideUnfinished).toBe(false)
    })

    it('rolls back on failure', async () => {
      settingsApi.updateSettings.mockRejectedValue(new Error('network error'))

      const { queryClient, result } = mountWithQuery(() => useUpdateSetting())
      queryClient.setQueryData(SETTINGS_QUERY_KEY, { ...DEFAULT_SETTINGS })

      await expect(result.mutateAsync({ key: 'hideUnfinished', value: false })).rejects.toThrow()

      expect(queryClient.getQueryData(SETTINGS_QUERY_KEY).hideUnfinished).toBe(true)
    })
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd frontend && npx vitest run src/composables/__tests__/useSettingsQuery.spec.js`
Expected: FAIL — `Cannot find module '../useSettingsQuery'`

- [ ] **Step 3: Implement `useSettingsQuery.js`**

```js
// frontend/src/composables/useSettingsQuery.js
/**
 * TanStack Query composables for the singular settings object.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import { settingsApi, DEFAULT_SETTINGS } from '@/services/settingsApi'
import { logger } from '@/utils/logger'

export const SETTINGS_QUERY_KEY = ['settings']
const LEGACY_SETTINGS_KEY = 'readtrail-settings'

export function useSettingsQuery() {
  return useQuery({
    queryKey: SETTINGS_QUERY_KEY,
    queryFn: async () => (await settingsApi.getSettings()) ?? { ...DEFAULT_SETTINGS },
    initialData: () => ({ ...DEFAULT_SETTINGS })
  })
}

/**
 * Mirror settings to the plain `readtrail-settings` localStorage key so
 * `router/index.js` can read `lastLibraryView` synchronously before the
 * app (and Query's persister) exists.
 */
function mirrorToLegacyKey(settings) {
  try {
    localStorage.setItem(LEGACY_SETTINGS_KEY, JSON.stringify(settings))
  } catch (error) {
    logger.warn('[useSettingsQuery] Failed to mirror settings to legacy key:', error)
  }
}

export function useUpdateSetting() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ key, value }) => {
      const current = queryClient.getQueryData(SETTINGS_QUERY_KEY) ?? { ...DEFAULT_SETTINGS }
      return settingsApi.updateSettings({ ...current, [key]: value })
    },
    onMutate: async ({ key, value }) => {
      await queryClient.cancelQueries({ queryKey: SETTINGS_QUERY_KEY })
      const previousSettings = queryClient.getQueryData(SETTINGS_QUERY_KEY) ?? { ...DEFAULT_SETTINGS }
      const optimisticSettings = { ...previousSettings, [key]: value }

      queryClient.setQueryData(SETTINGS_QUERY_KEY, optimisticSettings)
      mirrorToLegacyKey(optimisticSettings)

      return { previousSettings }
    },
    onError: (error, _variables, context) => {
      logger.error('[useUpdateSetting] Update failed:', error)
      if (context?.previousSettings) {
        queryClient.setQueryData(SETTINGS_QUERY_KEY, context.previousSettings)
        mirrorToLegacyKey(context.previousSettings)
      }
    },
    onSuccess: (updatedSettings) => {
      queryClient.setQueryData(SETTINGS_QUERY_KEY, updatedSettings)
      mirrorToLegacyKey(updatedSettings)
    }
  })
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd frontend && npx vitest run src/composables/__tests__/useSettingsQuery.spec.js`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add frontend/src/composables/useSettingsQuery.js frontend/src/composables/__tests__/useSettingsQuery.spec.js
git commit -m "Add useSettingsQuery composable with legacy-key mirroring for the router"
```

---

### Task 7: Rewrite `stores/books.js` as a thin facade

**Files:**
- Modify: `frontend/src/stores/books.js`
- Modify: `frontend/src/stores/__tests__/books.spec.js`
- Modify: `frontend/src/services/migration.js` (remove the now-unused flag helpers)
- Modify: `frontend/src/services/__tests__/migration.spec.js`

**Interfaces:**
- Consumes: `useBooksQuery`, `useCreateBook`, `useUpdateBook`, `useDeleteBook`, `BOOKS_QUERY_KEY` from `@/composables/useBooksQuery` (Task 5); `getGuestBooks`, `clearGuestData` from `@/services/guestStore` (Task 2); `migrateLocalDataToBackend` from `@/services/migration`; `isGuestMode` from `@/services/guestMode`; `sortBooks` from `@/utils/bookSorting`; VueUse `useOnline`.
- Produces (unchanged public API — must match what `Library.vue`, `LibraryTable.vue`, `LibraryHeader.vue`, `SettingsAccount.vue`, `Login.vue`, `Register.vue`, `main.js`, `auth.js` already call): `books`, `lastError`, `booksLoading`, `isOnline`, `sortedBooks`, `inProgressBooks`, `completedBooks`, `loadBooks()`, `addBook(name, year, month, author, coverLink, coverFile, isUnfinished, score)`, `updateBook(id, name, year, month, author, coverLink)`, `updateBookStatus(id, year, month, isUnfinished, score)`, `updateBookFields(id, updates)`, `deleteBook(id)`, `findBookById(id)`, `performMigration()`, `$reset()`.

**Note on scope:** `syncStatus`/`lastSyncTime`/`syncWithBackend` are dropped from the public API — Task 9 rewrites the only two consumers (`SyncStatusIndicator.vue`, `useSyncNotifications.js`) to stop depending on them, so this is safe to do now even though Task 9 hasn't run yet (the app will build and the two files just reference store fields that no longer exist until Task 9 lands — acceptable mid-plan state; do not skip ahead and edit them here).

- [ ] **Step 1: Simplify `migration.js`**

`migrateLocalDataToBackend` itself is unchanged — its guard `if (isGuestMode()) return { success: false, reason: 'guest' }` is still correct: it's called by the books store *after* login succeeds, at which point `isGuestMode()` is already `false`. Remove the now-unused flag helpers (`needsMigration`, `markForMigration`, `clearMigrationFlag`, `MIGRATION_FLAG_KEY`) since nothing calls them once Step 3 below removes the auto-migration-on-load path from `stores/books.js`:

In `frontend/src/services/migration.js`, delete:
- The `const MIGRATION_FLAG_KEY = 'readtrail-needs-migration'` line
- The `needsMigration`, `markForMigration`, `clearMigrationFlag` function exports
- The `localStorage.removeItem(MIGRATION_FLAG_KEY)` calls inside `migrateLocalDataToBackend` (both occurrences — the function's return value already communicates success/failure to its caller, which owns cleanup)

`migration.js` should now export only `migrateLocalDataToBackend`.

- [ ] **Step 2: Update `migration.spec.js`**

In `frontend/src/services/__tests__/migration.spec.js`, delete the `describe('needsMigration', ...)`, `describe('markForMigration', ...)`, and `describe('clearMigrationFlag', ...)` blocks and their now-unused imports (`needsMigration`, `markForMigration`, `clearMigrationFlag`). Also remove any assertions inside `describe('migrateLocalDataToBackend', ...)` tests that check `localStorage.getItem('readtrail-needs-migration')` is cleared — keep the rest of those tests (they test the actual migration/matching logic, which is unchanged).

Run: `cd frontend && npx vitest run src/services/__tests__/migration.spec.js`
Expected: PASS

- [ ] **Step 3: Write the new `books.spec.js`**

Pinia setup stores created via `setActivePinia`/`useBooksStore()` call `useBooksQuery()` internally, which reads the `QueryClient` via `inject()` — that only works inside a mounted component's context, not a bare test function call. So each test mounts a tiny host component that creates the store, the same way `useBooksQuery.spec.js` (Task 5) does for the composables directly.

Replace `frontend/src/stores/__tests__/books.spec.js` entirely:

```js
// frontend/src/stores/__tests__/books.spec.js
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { defineComponent } from 'vue'
import { mount } from '@vue/test-utils'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { useBooksStore } from '../books'
import { booksApi } from '@/services/booksApi'
import { isGuestMode } from '@/services/guestMode'

vi.mock('@/services/booksApi')
vi.mock('@/services/guestMode')

describe('useBooksStore', () => {
  let queryClient

  beforeEach(() => {
    vi.clearAllMocks()
    isGuestMode.mockReturnValue(false)
    localStorage.clear()
    setActivePinia(createPinia())
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
    })
  })

  function mountStore() {
    let store
    const TestComponent = defineComponent({
      setup() {
        store = useBooksStore()
        return () => null
      }
    })
    mount(TestComponent, { global: { plugins: [[VueQueryPlugin, { queryClient }]] } })
    return store
  }

  it('starts with an empty books array before the query resolves', () => {
    booksApi.getBooks.mockResolvedValue([])
    const store = mountStore()
    expect(store.books).toEqual([])
  })

  it('addBook returns the new book synchronously and adds it to the list', async () => {
    booksApi.getBooks.mockResolvedValue([])
    booksApi.createBook.mockResolvedValue({ id: 'real-1', name: 'The Great Gatsby' })

    const store = mountStore()
    const book = store.addBook('The Great Gatsby')

    expect(book.name).toBe('The Great Gatsby')
    expect(book.id).toBeDefined()
    expect(store.books).toHaveLength(1)
  })

  it('updateBookFields updates the matching book', () => {
    booksApi.getBooks.mockResolvedValue([])
    const store = mountStore()
    const book = store.addBook('1984', 2024, 3)

    const result = store.updateBookFields(book.id, { name: '1984 (revised)' })

    expect(result).toBe(true)
    expect(store.findBookById(book.id).name).toBe('1984 (revised)')
  })

  it('deleteBook removes the matching book', () => {
    booksApi.getBooks.mockResolvedValue([])
    const store = mountStore()
    const book = store.addBook('1984')

    const result = store.deleteBook(book.id)

    expect(result).toBe(true)
    expect(store.books).toHaveLength(0)
  })

  it('sortedBooks/inProgressBooks/completedBooks derive from books', () => {
    booksApi.getBooks.mockResolvedValue([])
    const store = mountStore()
    store.addBook('In progress')
    store.addBook('Done', 2024, 1)

    expect(store.inProgressBooks).toHaveLength(1)
    expect(store.completedBooks).toHaveLength(1)
    expect(store.sortedBooks).toHaveLength(2)
  })

  describe('performMigration', () => {
    it('migrates guest books to the backend and clears guest data', async () => {
      localStorage.setItem('readtrail-books', JSON.stringify([
        { id: 'guest-1', name: 'Guest Book', author: null, coverLink: null, year: null, month: null, attributes: { isUnfinished: false, customCover: false, score: null }, createdAt: new Date().toISOString() }
      ]))
      booksApi.getBooks.mockResolvedValue([])
      booksApi.batchCreateBooks.mockResolvedValue([
        { id: 'real-1', name: 'Guest Book', createdAt: new Date(), updatedAt: new Date() }
      ])

      const store = mountStore()
      const result = await store.performMigration()

      expect(result.success).toBe(true)
      expect(booksApi.batchCreateBooks).toHaveBeenCalled()
      expect(localStorage.getItem('readtrail-books')).toBeNull()
    })
  })

  it('$reset clears local state', () => {
    booksApi.getBooks.mockResolvedValue([])
    const store = mountStore()
    store.addBook('1984')

    store.$reset()

    expect(store.lastError).toBeNull()
    expect(store.booksLoading).toBe(false)
  })
})
```

- [ ] **Step 4: Run the test to verify it fails**

Run: `cd frontend && npx vitest run src/stores/__tests__/books.spec.js`
Expected: FAIL — `stores/books.js` hasn't been rewritten yet (still imports `syncQueue`/`useOnlineStatus` and doesn't expose this shape).

- [ ] **Step 5: Rewrite `stores/books.js`**

```js
// frontend/src/stores/books.js
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { useOnline } from '@vueuse/core'
import {
  useBooksQuery,
  useCreateBook,
  useUpdateBook,
  useDeleteBook
} from '@/composables/useBooksQuery'
import { isGuestMode } from '@/services/guestMode'
import { getGuestBooks, clearGuestData } from '@/services/guestStore'
import { booksApi } from '@/services/booksApi'
import { migrateLocalDataToBackend } from '@/services/migration'
import { logger } from '@/utils/logger'
import { sortBooks } from '@/utils/bookSorting'

let idCounter = 0

export const useBooksStore = defineStore('books', () => {
  const booksQuery = useBooksQuery()
  const createBookMutation = useCreateBook()
  const updateBookMutation = useUpdateBook()
  const deleteBookMutation = useDeleteBook()

  const books = computed(() => booksQuery.data.value ?? [])
  const booksLoading = computed(() => booksQuery.isLoading.value)
  const lastError = ref(null)
  const isOnline = useOnline()

  const sortedBooks = computed(() => sortBooks(books.value))
  const inProgressBooks = computed(() => books.value.filter((book) => !book.year && !book.month))
  const completedBooks = computed(() => books.value.filter((book) => book.year && book.month))

  function generateTempId() {
    return `temp-${Date.now()}-${idCounter++}`
  }

  /** Re-trigger the books query (kept for API compatibility with main.js). */
  function loadBooks() {
    return booksQuery.refetch()
  }

  function addBook(name, year = null, month = null, author = null, coverLink = null, coverFile = null, isUnfinished = false, score = null) {
    const tempId = generateTempId()
    const book = {
      id: tempId,
      name,
      author,
      coverLink,
      coverDisplayLink: coverLink,
      year,
      month,
      attributes: { isUnfinished, score: score ?? null },
      createdAt: new Date()
    }

    createBookMutation.mutate(
      { tempId, book: { ...book, coverFile } },
      { onError: () => { lastError.value = 'Failed to save book' } }
    )

    return book
  }

  function updateBookFields(id, updates) {
    if (!books.value.some((book) => book.id === id)) return false

    updateBookMutation.mutate(
      { id, updates },
      { onError: () => { lastError.value = 'Failed to update book' } }
    )

    return true
  }

  function updateBook(id, name, year = null, month = null, author = null, coverLink = null) {
    return updateBookFields(id, { name, author, coverLink, year, month })
  }

  function updateBookStatus(id, year = null, month = null, isUnfinished = false, score = null) {
    const finalScore = (year === null && month === null) ? 0 : score

    return updateBookFields(id, {
      year,
      month,
      attributes: { isUnfinished, score: finalScore }
    })
  }

  function deleteBook(id) {
    if (!books.value.some((book) => book.id === id)) return false

    deleteBookMutation.mutate(
      { id },
      { onError: () => { lastError.value = 'Failed to delete book' } }
    )

    return true
  }

  function findBookById(id) {
    return books.value.find((book) => book.id === id)
  }

  /**
   * Migrate guest-mode books to the backend. Called right after a
   * successful login/register, while `books.value` may still be stale —
   * reads the guest data directly instead.
   */
  async function performMigration() {
    const guestBooks = getGuestBooks()
    const result = await migrateLocalDataToBackend(guestBooks, isOnline.value, () => {})

    if (result.success) {
      clearGuestData()
      if (result.migratedCount > 0) {
        window.dispatchEvent(new CustomEvent('migration-success', { detail: { count: result.migratedCount } }))
      }
    } else if (result.reason === 'error') {
      lastError.value = 'Failed to migrate data to backend'
      window.dispatchEvent(new CustomEvent('migration-error', { detail: { error: result.error } }))
      logger.error('[BooksStore] Migration failed:', result.error)
    }

    return result
  }

  function $reset() {
    lastError.value = null
  }

  return {
    books,
    lastError,
    booksLoading,
    isOnline,
    sortedBooks,
    inProgressBooks,
    completedBooks,
    loadBooks,
    addBook,
    updateBook,
    updateBookStatus,
    updateBookFields,
    deleteBook,
    findBookById,
    performMigration,
    $reset
  }
})
```

Note: `booksApi` is imported but unused directly in this file (queries/mutations go through the composables) — remove that import if lint flags it as unused.

- [ ] **Step 6: Run the test to verify it passes**

Run: `cd frontend && npx vitest run src/stores/__tests__/books.spec.js`
Expected: PASS. If mutation assertions race the mutation's async resolution (e.g. `updateBookFields`'s optimistic update not yet visible), add `await vi.waitUntil(() => !updateBookMutation.isPending.value)`-style waits as needed — TanStack Query's `onMutate` runs synchronously so this should not be necessary for the cache state itself, only for asserting the final server-confirmed value.

- [ ] **Step 7: Run the full test suite**

Run: `cd frontend && npm test -- --run`
Expected: All tests pass except `stores/__tests__/settings.spec.js` (Task 8) and anything still referencing `syncStatus`/`useOnlineStatus` (Tasks 8–9/11) — confirm the failures are limited to those.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/stores/books.js frontend/src/stores/__tests__/books.spec.js frontend/src/services/migration.js frontend/src/services/__tests__/migration.spec.js
git commit -m "Rewrite books store as a thin facade over useBooksQuery"
```

---

### Task 8: Rewrite `stores/settings.js` as a thin facade

**Files:**
- Modify: `frontend/src/stores/settings.js`
- Modify: `frontend/src/stores/__tests__/settings.spec.js`

**Interfaces:**
- Consumes: `useSettingsQuery`, `useUpdateSetting` from `@/composables/useSettingsQuery` (Task 6).
- Produces (unchanged public API — matches `Library.vue`, `LibraryTable.vue`, `LibraryHeader.vue`, `SettingsApplication.vue`, `SettingsAccount.vue`, `main.js`, `auth.js`): `settings`, `settingsLoading`, `lastError`, `loadSettings()`, `updateSetting(key, value)`, `$reset()`.

**Note on scope:** `syncStatus`/`isOnline`/`syncWithBackend`/`migrateLocalDataToBackend` are dropped from this store's public API. `isOnline` was not used by any consumer of `useSettingsStore` (only `useBooksStore().isOnline` and `SyncStatusIndicator`/`useSyncNotifications` — Task 9 — used online status); `syncWithBackend`/`migrateLocalDataToBackend` on the settings store had no external callers either (grep confirms only `books` store's `performMigration` and `Login.vue`/`Register.vue` reference migration, and they call the *books* store's `performMigration`, not settings').

- [ ] **Step 1: Write the new `settings.spec.js`**

Replace `frontend/src/stores/__tests__/settings.spec.js` entirely:

```js
// frontend/src/stores/__tests__/settings.spec.js
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { defineComponent } from 'vue'
import { mount } from '@vue/test-utils'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { useSettingsStore } from '../settings'
import { settingsApi, DEFAULT_SETTINGS } from '@/services/settingsApi'
import { isGuestMode } from '@/services/guestMode'

vi.mock('@/services/settingsApi', async () => {
  const actual = await vi.importActual('@/services/settingsApi')
  return { ...actual, settingsApi: { getSettings: vi.fn(), updateSettings: vi.fn() } }
})
vi.mock('@/services/guestMode')

describe('useSettingsStore', () => {
  let queryClient

  beforeEach(() => {
    vi.clearAllMocks()
    isGuestMode.mockReturnValue(false)
    localStorage.clear()
    setActivePinia(createPinia())
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
    })
  })

  function mountStore() {
    let store
    const TestComponent = defineComponent({
      setup() {
        store = useSettingsStore()
        return () => null
      }
    })
    mount(TestComponent, { global: { plugins: [[VueQueryPlugin, { queryClient }]] } })
    return store
  }

  it('starts with default settings before the query resolves', () => {
    settingsApi.getSettings.mockResolvedValue({ ...DEFAULT_SETTINGS })
    const store = mountStore()
    expect(store.settings).toEqual(DEFAULT_SETTINGS)
  })

  it('updateSetting updates a single field', async () => {
    settingsApi.getSettings.mockResolvedValue({ ...DEFAULT_SETTINGS })
    settingsApi.updateSettings.mockResolvedValue({ ...DEFAULT_SETTINGS, hideUnfinished: false })

    const store = mountStore()
    store.updateSetting('hideUnfinished', false)

    expect(store.settings.hideUnfinished).toBe(false)
  })

  it('$reset clears local error state', () => {
    settingsApi.getSettings.mockResolvedValue({ ...DEFAULT_SETTINGS })
    const store = mountStore()

    store.$reset()

    expect(store.lastError).toBeNull()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd frontend && npx vitest run src/stores/__tests__/settings.spec.js`
Expected: FAIL (current `stores/settings.js` doesn't use `useSettingsQuery`)

- [ ] **Step 3: Rewrite `stores/settings.js`**

```js
// frontend/src/stores/settings.js
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { useSettingsQuery, useUpdateSetting } from '@/composables/useSettingsQuery'
import { DEFAULT_SETTINGS } from '@/services/settingsApi'

export const useSettingsStore = defineStore('settings', () => {
  const settingsQuery = useSettingsQuery()
  const updateSettingMutation = useUpdateSetting()

  const settings = computed(() => settingsQuery.data.value ?? DEFAULT_SETTINGS)
  const settingsLoading = computed(() => settingsQuery.isLoading.value)
  const lastError = ref(null)

  /** Re-trigger the settings query (kept for API compatibility with main.js). */
  function loadSettings() {
    return settingsQuery.refetch()
  }

  function updateSetting(key, value) {
    if (!(key in DEFAULT_SETTINGS)) {
      return
    }

    updateSettingMutation.mutate(
      { key, value },
      { onError: () => { lastError.value = 'Failed to update settings' } }
    )
  }

  function $reset() {
    lastError.value = null
  }

  return {
    settings,
    settingsLoading,
    lastError,
    loadSettings,
    updateSetting,
    $reset
  }
})
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd frontend && npx vitest run src/stores/__tests__/settings.spec.js`
Expected: PASS

- [ ] **Step 5: Run the full test suite**

Run: `cd frontend && npm test -- --run`
Expected: All tests pass except anything still referencing `useOnlineStatus`/`syncQueue` (Tasks 9 and 11 haven't run yet) — confirm the remaining failures are limited to `SyncStatusIndicator`/`useSyncNotifications`-related files and `syncQueue.spec.js`/`useOnlineStatus`-adjacent tests, if any exist.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/stores/settings.js frontend/src/stores/__tests__/settings.spec.js
git commit -m "Rewrite settings store as a thin facade over useSettingsQuery"
```

---

### Task 9: Replace `useOnlineStatus` usages with VueUse's `useOnline`, simplify sync UI

**Files:**
- Modify: `frontend/src/components/library/BookCoverModal.vue`
- Modify: `frontend/src/components/SyncStatusIndicator.vue`
- Modify: `frontend/src/composables/useSyncNotifications.js`

**Interfaces:**
- Consumes: `useOnline` from `@vueuse/core`; `useIsFetching`, `useIsMutating` from `@tanstack/vue-query`; `authManager` from `@/services/auth`.
- Produces: no change to any component's external behavior/props — `SyncStatusIndicator` still shows offline/syncing/error pill states; `useSyncNotifications` still toasts on migration success/error and now also toasts on any failed mutation while previously online.

- [ ] **Step 1: Update `BookCoverModal.vue`**

In `frontend/src/components/library/BookCoverModal.vue`, replace:

```js
import { useOnlineStatus } from '@/composables/useOnlineStatus'
```
```js
const { isOnline } = useOnlineStatus()
```

with:

```js
import { useOnline } from '@vueuse/core'
```
```js
const isOnline = useOnline()
```

No other line in that file references `isOnline` differently (it's already used as a plain boolean ref in the template/logic), so this swap is drop-in.

- [ ] **Step 2: Rewrite `SyncStatusIndicator.vue`**

Replace `frontend/src/components/SyncStatusIndicator.vue` entirely:

```vue
<script setup>
import { computed } from 'vue'
import { useOnline } from '@vueuse/core'
import { useIsMutating } from '@tanstack/vue-query'
import { authManager } from '@/services/auth'
import { useBooksStore } from '@/stores/books'
import { useSettingsStore } from '@/stores/settings'
import { WifiIcon, ArrowPathIcon, ExclamationTriangleIcon } from '@heroicons/vue/24/outline'

const isOnline = useOnline()
const isMutating = useIsMutating()
const booksStore = useBooksStore()
const settingsStore = useSettingsStore()

const isGuest = computed(() => authManager.isGuestUser())
const hasError = computed(() => !!booksStore.lastError || !!settingsStore.lastError)

const state = computed(() => {
  if (!isOnline.value) return 'offline'
  if (hasError.value) return 'error'
  if (isMutating.value > 0) return 'syncing'
  return 'idle'
})
</script>

<template>
  <div
    v-if="!isGuest && state !== 'idle'"
    class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md"
    :class="{
      'bg-amber-50 text-amber-700 border border-amber-200': state === 'offline',
      'bg-blue-50 text-blue-700 border border-blue-200': state === 'syncing',
      'bg-red-50 text-red-700 border border-red-200': state === 'error'
    }"
  >
    <WifiIcon v-if="state === 'offline'" class="w-4 h-4" />
    <ArrowPathIcon v-if="state === 'syncing'" class="w-4 h-4 animate-spin" />
    <ExclamationTriangleIcon v-if="state === 'error'" class="w-4 h-4" />

    <span class="text-xs font-medium">
      {{ state === 'offline' ? 'Offline' : state === 'syncing' ? 'Syncing' : 'Sync error' }}
    </span>
  </div>
</template>
```

Note: the old "click error badge to retry" affordance is dropped along with it, since there's no longer a queue to replay — the user just retries the edit itself, which the "Sync error" pill signals.

- [ ] **Step 3: Rewrite `useSyncNotifications.js`**

Replace `frontend/src/composables/useSyncNotifications.js` entirely:

```js
import { watch, ref, onMounted, onUnmounted } from 'vue'
import { useToast } from 'vue-toastification'
import { useOnline } from '@vueuse/core'
import { authManager } from '@/services/auth'

/**
 * Toast notifications for guest→account migration and for the
 * offline→online transition. There is no sync queue to report on
 * anymore: a failed write surfaces its own error where it happens.
 */
export function useSyncNotifications() {
  const toast = useToast()
  const isOnline = useOnline()
  const wasOffline = ref(false)

  watch(isOnline, (online) => {
    if (authManager.isGuestUser()) return

    if (!online) {
      wasOffline.value = true
    } else if (wasOffline.value) {
      toast.success('Back online')
      wasOffline.value = false
    }
  })

  const handleMigrationSuccess = (event) => {
    const { count } = event.detail
    toast.success(`Migrated ${count} ${count === 1 ? 'book' : 'books'} to your account`, { timeout: 5000 })
  }

  const handleMigrationError = () => {
    toast.error('Failed to sync local books. Please try again.', { timeout: 6000 })
  }

  onMounted(() => {
    window.addEventListener('migration-success', handleMigrationSuccess)
    window.addEventListener('migration-error', handleMigrationError)
  })

  onUnmounted(() => {
    window.removeEventListener('migration-success', handleMigrationSuccess)
    window.removeEventListener('migration-error', handleMigrationError)
  })
}
```

- [ ] **Step 4: Run the full test suite**

Run: `cd frontend && npm test -- --run`
Expected: All tests pass except anything still referencing `syncQueue.js` directly (`services/__tests__/syncQueue.spec.js`, deleted in Task 11) — confirm that's the only remaining failure category.

- [ ] **Step 5: Manually smoke-test the sync indicator**

Run: `cd frontend && npm run dev`, open the app in a browser while logged in, then use devtools' network throttling to go offline and back online. Confirm the "Offline" pill appears/disappears and no console errors reference `syncQueue` or `useOnlineStatus`. This is a manual check — report the result rather than assuming it passed.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/library/BookCoverModal.vue frontend/src/components/SyncStatusIndicator.vue frontend/src/composables/useSyncNotifications.js
git commit -m "Replace useOnlineStatus with VueUse useOnline; simplify sync status UI"
```

---

### Task 10: Clear the query cache on logout

**Files:**
- Modify: `frontend/src/services/auth.js`

**Interfaces:**
- Consumes: `queryClient` from `@/services/queryClient` (Task 1).
- Produces: `authManager.logout()` behavior unchanged from the caller's perspective, now additionally clears in-memory Query cache (previously only `localStorage` and Pinia state were cleared, which was already correct for the old design but leaves stale in-memory query data in the new one).

- [ ] **Step 1: Update `logout()` in `auth.js`**

Add the import at the top of `frontend/src/services/auth.js`:

```js
import { queryClient } from './queryClient'
```

In the `logout()` method, after the existing `Object.keys(localStorage)...forEach(...)` block and before the dynamic `useBooksStore`/`useSettingsStore` imports, add:

```js
    // Clear the in-memory query cache — localStorage is already wiped above,
    // but TanStack Query keeps its own in-memory copy that must be dropped too.
    queryClient.clear()
```

The rest of `logout()` (resetting the Pinia stores) stays as-is; `$reset()` on both stores (Tasks 7–8) already just clears `lastError`, since `books`/`settings` are now derived from the query cache that `queryClient.clear()` just emptied.

- [ ] **Step 2: Update `auth.spec.js` if it asserts on logout internals**

Read `frontend/src/services/__tests__/auth.spec.js`'s `describe('logout', ...)` block. If it mocks `@/stores/books`/`@/stores/settings` (it does, per the dynamic `import()` in `logout()`), add a mock for `@/services/queryClient` alongside them:

```js
vi.mock('@/services/queryClient', () => ({ queryClient: { clear: vi.fn() } }))
```

and, in the logout test, assert `queryClient.clear` was called:

```js
import { queryClient } from '@/services/queryClient'
// ...
it('clears the query cache', async () => {
  await authManager.logout()
  expect(queryClient.clear).toHaveBeenCalled()
})
```

- [ ] **Step 3: Run the test**

Run: `cd frontend && npx vitest run src/services/__tests__/auth.spec.js`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add frontend/src/services/auth.js frontend/src/services/__tests__/auth.spec.js
git commit -m "Clear the TanStack Query cache on logout"
```

---

### Task 11: Delete `syncQueue.js` and `useOnlineStatus.js`, final verification

**Files:**
- Delete: `frontend/src/services/syncQueue.js`
- Delete: `frontend/src/services/__tests__/syncQueue.spec.js`
- Delete: `frontend/src/composables/useOnlineStatus.js`
- Modify: `frontend/src/services/booksApi.js` (remove `getSyncHandlers`)
- Modify: `frontend/src/services/settingsApi.js` (remove `getSyncHandlers`)
- Modify: `frontend/src/services/__tests__/booksApi.spec.js` / `settingsApi.spec.js` (remove `getSyncHandlers` tests, if present)

**Interfaces:** None — this task only removes now-dead code. Nothing after Task 9 imports `syncQueue.js` or `useOnlineStatus.js`.

- [ ] **Step 1: Confirm nothing still references the files being deleted**

Run: `cd frontend && grep -rln "syncQueue\|useOnlineStatus" src --include=*.js --include=*.vue`
Expected: Only `src/services/syncQueue.js`, `src/services/__tests__/syncQueue.spec.js`, `src/composables/useOnlineStatus.js`, and the `getSyncHandlers` methods in `booksApi.js`/`settingsApi.js` remain. If anything else shows up, stop and fix it before continuing — it means an earlier task missed a reference.

- [ ] **Step 2: Remove `getSyncHandlers` from `booksApi.js` and `settingsApi.js`**

Delete the `getSyncHandlers(replaceTempId) { ... }` method from the `BooksApi` class in `frontend/src/services/booksApi.js`, and the `getSyncHandlers() { ... }` method from the `SettingsApi` class in `frontend/src/services/settingsApi.js`. If either test file has a `describe('getSyncHandlers', ...)` block, delete it too.

- [ ] **Step 3: Delete the files**

```bash
rm frontend/src/services/syncQueue.js
rm frontend/src/services/__tests__/syncQueue.spec.js
rm frontend/src/composables/useOnlineStatus.js
```

- [ ] **Step 4: Run the full test suite**

Run: `cd frontend && npm test -- --run`
Expected: PASS, no failures.

- [ ] **Step 5: Run the linter**

Run: `cd frontend && npm run lint`
Expected: No errors (no unused imports left behind from the deletions/rewrites across Tasks 1–11).

- [ ] **Step 6: Manual end-to-end smoke test**

Run: `cd frontend && npm run dev` and, in a browser:
1. As a guest: add a book, edit it, delete it, toggle a setting in Settings → Application, reload the page and confirm the book list and setting persist.
2. Register a new account while guest books exist: confirm the "Migrated N books" toast appears and the books show up under the account after the redirect.
3. Log out and back in: confirm books/settings load correctly and the query cache doesn't leak the previous guest's data (should be empty/backend-only after `queryClient.clear()` from Task 10).
4. Throttle the network to offline in devtools, try adding a book: confirm it fails visibly (toast / `lastError`) rather than silently queuing.

Report the outcome of each of these four checks — this is a manual verification step, not one you can mark passing without actually running the app.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "Remove syncQueue and useOnlineStatus (superseded by TanStack Query + VueUse)"
```

---

## Self-review notes

- **Spec coverage:** New dependency (Task 1) ✓; guest mode kept (Tasks 2–4, 7) ✓; no realtime subscriptions (never introduced) ✓; optimistic updates replacing tempId/queue dance (Task 5) ✓; persistence via localStorage persister (Task 1) ✓; `useIsFetching`/`useIsMutating`/`useOnline` replacing hand-tracked sync state (Tasks 7–9) ✓; migration kept, simplified (Task 7) ✓; deletions of `syncQueue.js`/`useOnlineStatus.js` (Task 11) ✓; testing guidance (guest store branch, optimistic/rollback paths, manual checks) ✓ (Tasks 2–11).
- **Router compatibility:** explicitly handled via the legacy-key mirror in Task 6 and called out in Global Constraints.
- **Type/signature consistency:** `useBooksStore()`/`useSettingsStore()` public API is pinned once in Global Constraints and re-stated per task's Interfaces block; mutation variable shapes (`{ tempId, book }`, `{ id, updates }`, `{ id }`, `{ key, value }`) are defined in Tasks 5–6 and used identically in Tasks 7–8.
