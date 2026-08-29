# Native UI primitives: dialog/popover migration + layout cleanup

## Context

An audit of the frontend layout and CSS surfaced three independent problems, all addressable together as a mechanism-swap refactor (no visual redesign):

1. **Duplicated interaction plumbing.** The app has three separate implementations of "close this UI element when the user clicks outside or presses Escape": the shared `useClickOutside`/`useEscapeKey` composable (used by `BookCard` and `FilterDropdown`), and a fourth-wall duplicate of the same idea as a local Vue directive inside `UserMenu.vue`. `BaseModal.vue` separately hand-rolls its own overlay-click and Escape handling via `Teleport` + `@click.self` + `useEscapeKey`.
2. **Duplicated page layout.** `Library.vue` and `LibraryTable.vue` both repeat the `container mx-auto px-4 py-8 max-w-7xl` wrapper and the `LibraryHeader` + `BookSearch` modal wiring verbatim. `Library.vue` additionally repeats its grid classes (`grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6`) at two call sites (grid view, timeline view).
3. **Non-native primitives where native ones now exist.** `<dialog>` and the Popover API (Baseline ~2024) provide backdrop, top-layer stacking, focus handling, Escape-to-close, and (for popovers) light-dismiss for free — removing the custom JS in (1) and the manual `z-20`/`z-30`/`z-50` stacking currently spread across `BookCard`, `FilterDropdown`, `BaseModal`, and `UserMenu`.

This app has no `browserslist` config restricting old browsers, and is a personal reading tracker with no legacy-browser requirement, so targeting modern evergreen browsers only is acceptable.

A blocking constraint discovered during investigation: **jsdom 27.2 (the project's test environment) does not implement `HTMLDialogElement.prototype.showModal`/`close` or `Element.prototype.showPopover`/`hidePopover`** — both are `undefined` and throw if called. It does already recognize the `popover` attribute and the `:popover-open` pseudo-class. This means adopting these APIs requires a small polyfill in the test setup (see Testing).

## Non-goals

- **List virtualization.** Grid, timeline, and table views render every book with no windowing. Deferred — current library sizes don't warrant the added complexity. Revisit if a user's library grows into the range where scroll/render performance is user-visible (rough trigger: low thousands of books).
- **`BookCard`'s in-place date-picker overlay.** Its "backdrop" (`Teleport` to `<body>`, used only to catch outside clicks) supports content that swaps in place within the card, not a floating/centered panel — it isn't modal-shaped, so native `<dialog>` doesn't fit. Left as-is; only inherits any z-index constant cleanup from the broader migration, not a behavioral change.
- **Visual redesign.** Colors, spacing, copy, and overall look stay identical. This is a mechanism swap.

## Component changes

### `BaseModal.vue` → native `<dialog>`

Replace the `Teleport` + `Transition` + `fixed inset-0` overlay div with a `<dialog>` element:

- A `watch(() => props.isOpen)` calls `dialogRef.value.showModal()` / `.close()`.
- The dialog's native `close` event (fired on Escape or programmatic `.close()`) emits this component's existing `close`/`update:isOpen` events, replacing the current `useEscapeKey` call.
- Overlay-click-to-close: check `event.target === dialogRef.value` on the dialog's own `click` handler (a click on the backdrop lands on the `<dialog>` element itself, never its content div) — replaces `@click.self`. Skip attaching this check when `closeOnOverlayClick` is `false`, preserving that prop's current behavior.
- The `::backdrop` pseudo-element gets a small scoped-CSS rule for the dim background (Tailwind utilities can't target `::backdrop`).
- Open/close animation moves to CSS `@starting-style` + `transition` with `transition-behavior: allow-discrete` (so the `display: none ↔ block` toggle animates), replacing the current `<Transition name="modal">` block and its keyframe classes.
- External prop/slot API (`isOpen`, `title`, `showCloseButton`, `closeOnOverlayClick`, all the `*Class` props, `title`/default/`footer` slots) stays unchanged, so all five consumers — `BookCoverModal`, `BookDateModal`, `ChangePasswordModal`, `DeleteAccountModal`, `BookSearch` — need no changes.

### `FilterDropdown.vue` and `UserMenu.vue` → Popover API

- Toggle button gets `popovertarget="<menu-id>"`; the menu div gets `popover` (type `auto`) and a matching `id`.
- Remove `useClickOutside`/`useEscapeKey` calls from `FilterDropdown`. Delete `UserMenu`'s local `vClickOutside` directive entirely — the popover replaces its only reason to exist.
- Both menus already sit inside a `relative` wrapper. Popovers default to `position: fixed` via the UA stylesheet; override to `position: absolute` in scoped CSS so the menu stays anchored under its trigger exactly as today (this resolves against the existing `relative` ancestor — no CSS anchor positioning needed).
- The existing `Transition` enter/leave classes are replaced by the same `@starting-style`-driven approach as the modal, keyed off `:popover-open`.

### Grid CSS (`Library.vue`)

Both `grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6` occurrences become one Tailwind arbitrary-value utility, e.g. `grid gap-6 grid-cols-[repeat(auto-fill,minmax(9rem,1fr))]` (tune the `minmax` floor in the browser to match the current mobile card width — see Testing). One declaration, no breakpoints, used at both call sites (grid view and timeline view).

### Layout de-duplication

Extract a `LibraryPageLayout.vue` wrapper carrying the `container mx-auto px-4 py-8 max-w-7xl` div, `LibraryHeader`, and `BookSearch` modal wiring out of `Library.vue`/`LibraryTable.vue`. It takes view-specific content via the default slot and forwards the `LibraryHeader`/`BookSearch` props/events each page needs.

## Testing

- Add `vitest.config.js` → `test.setupFiles: ['./src/test-setup.js']` (new file). It polyfills, before any test runs:
  - `HTMLDialogElement.prototype.showModal` → sets `this.open = true`
  - `HTMLDialogElement.prototype.close` → sets `this.open = false`, dispatches a `close` event
  - `Element.prototype.showPopover` / `hidePopover` / `togglePopover` → toggle the popover-open state (jsdom already reflects the `popover` attribute and `:popover-open`; only the imperative methods are missing)
  - These are minimal behavioral stubs, not full spec compliance — just enough for `BookCard.spec.js` and `BookSearch.spec.js` to keep asserting open/closed state and event emissions without throwing.
- This refactor changes *how* existing behavior is implemented, not the behavior itself, so the TDD loop is: confirm the suite fails without the polyfill (methods undefined) → add the polyfill, confirm green with no component changes yet → migrate one component at a time, keeping the suite green throughout.
- Grid CSS and the layout-wrapper extraction are structural/visual only — covered by existing component tests; no new tests needed, but requires a manual browser check (per repo convention for UI changes) since an arbitrary-value `minmax` floor that's too large will silently collapse the mobile grid to one column.

## Migration order

Each step leaves the app in a working, fully-tested state:

1. Add the jsdom polyfill setup file; confirm the existing suite is green with zero component changes.
2. Migrate `BaseModal` to `<dialog>` — highest consumer count (5) and the most isolated interface (props/slots don't change), so it validates the polyfill approach before anything else moves.
3. Migrate `FilterDropdown`, then `UserMenu`, to the Popover API.
4. Grid CSS swap and `LibraryPageLayout` extraction — independent of steps 2–3, can land in any order relative to them.

## Edge cases

- **Nested/stacked modals**: not a case that exists today (no two `BaseModal`s are ever open simultaneously) — native top-layer stacking removes the need for the current manual `z-50` reasoning, but there's nothing to explicitly test here.
- **Popover light-dismiss** (`type="auto"`) closes on any outside click, matching current `useClickOutside` behavior — no behavior change expected.
- **Focus handling**: native `<dialog>` auto-focuses the first focusable element and traps focus inside, which is *stricter* than today's overlay (no trapping at all). This is a behavior improvement, not just a refactor — needs a manual check that modal content (e.g. `BookSearch`'s input) still receives sensible initial focus, since existing modals weren't designed with trapping in mind.
