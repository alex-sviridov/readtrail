
Comprehensive Vue Testing Plan for FlexLib
Overview

Add comprehensive, idiomatic Vue tests to maximize code coverage from ~30% to 80%+ across the FlexLib frontend application.

Testing Stack: Vitest 4.0.14, @vue/test-utils 2.4.6, jsdom 27.2.0

Current State: 5 test files (books store, BookCard, App, Home, main) Target State: 25 test files covering all stores, composables, and components

Phase 2: High-Priority Components (Week 2)

Priority: HIGH - User-facing critical paths
6. Settings View Tests

File: src/views/tests/Settings.spec.js Tests: 15 | Lines: ~200

Settings page integration:

    Rendering sections from settingsConfig
    Toggle switches for each setting
    Store integration with storeToRefs
    Router navigation (back to library)
    Accessibility (ARIA attributes)

Mock: Vue Router with memory history
7. BookSearch Component Tests

File: src/components/library/tests/BookSearch.spec.js Tests: 45 | Lines: ~600

Most complex component - API integration and multi-step flow:

Step 1: Search

    Search input (title, author)
    Debouncing (500ms via TIMINGS.SEARCH_DEBOUNCE)
    API requests to Open Library
    Error handling (400, 404, 429, 500, 503, timeout, network errors)
    Results display with cover images
    Manual add option

Step 2: Date Picker

    Transition to date picker after book selection
    Book info display
    Date selection and emission
    Back to search navigation

API Mocking:

global.fetch = vi.fn(() =>
  Promise.resolve({
    ok: true,
    json: async () => ({ docs: [] })
  })
)

Edge Cases:

    Request cancellation (AbortController)
    Timeout after 10 seconds (TIMINGS.API_TIMEOUT)
    Missing cover_i, author_name in API response
    Modal close during API request
    Rapid typing (debounce cancellation)

8. DatePicker Component Tests

File: src/components/library/tests/DatePicker.spec.js Tests: 22 | Lines: ~280

Orchestrator for 5 sub-components:

    Rendering all sub-components (YearNavigator, MonthGrid, etc.)
    Conditional rendering (allowUnfinished prop)
    Composable integration (useDatePicker)
    Sub-component orchestration (props/events)
    Props reactivity (selectedDate, yearRange, isUnfinished)
    Event emission ('date-select')

Pattern: Mock sub-components for isolation, test integration
9. BaseModal Component Tests

File: src/components/base/tests/BaseModal.spec.js Tests: 25 | Lines: ~320

Foundational modal component:

    Conditional rendering (isOpen prop)
    Teleport to document.body
    Transitions (enter/leave classes)
    Closing behavior (X button, overlay click, Escape key)
    Slots (default, title, footer)
    Customization (contentClass, maxHeightClass, etc.)
    Accessibility (ARIA labels, focus management)

Setup:

beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>'
})

Phase 3: Medium-Priority Components (Week 3)

Priority: MEDIUM - UI components and sub-components
10-11. BookTitle & BookAuthor Tests

Files:

    src/components/library/tests/BookTitle.spec.js (12 tests, ~150 lines)
    src/components/library/tests/BookAuthor.spec.js (12 tests, ~150 lines)

Content-editable integration:

    View mode rendering
    Edit mode activation
    useContentEditable integration
    Update emission
    Font size constants (TYPOGRAPHY)
    Enter key handling
    Empty/null content handling

12-13. BookCover & BookStatus Tests

Files:

    src/components/library/tests/BookCover.spec.js (10 tests, ~120 lines)
    src/components/library/tests/BookStatus.spec.js (15 tests, ~180 lines)

BookCover: Image display, placeholder icon, error handling, aspect ratio BookStatus: Date formatting, sentinel years (1900/1910), unfinished ribbon, badge styling
14-15. IconButton & LibraryHeader Tests

Files:

    src/components/library/tests/IconButton.spec.js (10 tests, ~120 lines)
    src/components/library/tests/LibraryHeader.spec.js (8 tests, ~100 lines)

Simple UI components with event emission and layout
16-20. DatePicker Sub-Components

Files:

    src/components/library/datepicker/tests/YearNavigator.spec.js (8 tests, ~100 lines)
    src/components/library/datepicker/tests/MonthGrid.spec.js (10 tests, ~130 lines)
    src/components/library/datepicker/tests/StatusToggleButtons.spec.js (8 tests, ~100 lines)
    src/components/library/datepicker/tests/UnfinishedCheckbox.spec.js (6 tests, ~80 lines)
    src/components/library/datepicker/tests/InProgressButton.spec.js (6 tests, ~80 lines)

Simple presentational components with event emission
Phase 4: Infrastructure (Week 4)

Priority: LOW - Tooling and sustainability
21. Coverage Reporting Setup

Update: vitest.config.js

Add coverage configuration:

coverage: {
  provider: 'v8',
  reporter: ['text', 'html', 'json', 'lcov'],
  exclude: [
    'src/main.js',
    'src/router/**',
    '**/*.spec.js',
    '**/__tests__/**'
  ],
  thresholds: {
    lines: 80,
    functions: 80,
    branches: 75,
    statements: 80
  }
}

Install: npm install -D @vitest/coverage-v8 @vitest/ui

Add scripts to package.json:

"test:coverage": "vitest run --coverage",
"test:ui": "vitest --ui"

22. Shared Test Utilities

Create: src/tests/test-utils.js

Shared helpers to reduce boilerplate:

    createTestPinia() - Fresh Pinia instance
    createTestRouter() - Mock router with routes
    waitForDebounce(ms) - Async helper for debounced operations
    createMockLocalStorage() - Mock with error simulation
    setupComponentTest() - Common mocks for component tests
    mockDate() - Consistent time-based testing
    mountWithDefaults() - Mount with common plugins

23. CI/CD Integration

Create: .github/workflows/frontend-tests.yml

Automate test execution on PRs:

    Run tests on Node 20 and 22
    Execute linter
    Generate coverage report
    Upload to Codecov
    Comment PR with coverage changes

Testing Patterns
Established Patterns (from existing tests)

Pinia Store:

import { setActivePinia, createPinia } from 'pinia'

beforeEach(() => {
  setActivePinia(createPinia())
  store = useMyStore()
  localStorage.clear()
})

Component Mounting:

const wrapper = mount(MyComponent, {
  props: { /* ... */ },
  global: {
    plugins: [pinia, router],
    components: { /* stubs */ }
  }
})

Async Handling:

await nextTick()
await waitForDebounce(350) // helper from test-utils

Cleanup:

afterEach(() => {
  localStorage.clear()
  vi.restoreAllMocks()
  wrapper?.unmount()
})

New Patterns to Introduce

Fetch Mocking:

global.fetch = vi.fn(() => Promise.resolve({
  ok: true,
  json: async () => ({ docs: [] })
}))

DOM API Mocking:

global.window.getSelection = vi.fn()
global.document.createRange = vi.fn()

Fake Timers:

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2024-06-15'))
})

afterEach(() => {
  vi.useRealTimers()
})

Coverage Targets
Overall

    Current: ~30% (5 test files)
    After Phase 1: ~45% (composables + stores)
    After Phase 2: ~70% (high-priority components)
    After Phase 3: ~85% (all components)
    Final Target: 80%+ sustained

Per Category

    Stores: 100% (books.js existing, settings.js new)
    Composables: 100% (all 4 composables)
    Critical Components: 90%+ (BookSearch, DatePicker, BaseModal, BookCard)
    Medium Components: 80%+ (BookTitle, BookAuthor, BookCover, BookStatus, etc.)
    Sub-Components: 75%+ (DatePicker children, IconButton)

Implementation Order
Week 1: Business Logic Foundation

    useDateHelpers.spec.js - Pure functions, easy wins
    settings.spec.js - Recently modified store
    useClickOutside.spec.js - Foundation for BaseModal
    useContentEditable.spec.js - Complex debouncing
    useDatePicker.spec.js - Most complex composable

Deliverable: 129 tests, ~1530 lines, +15% coverage
Week 2: Critical User Paths

    Settings.vue - Store integration
    BookSearch.vue - Most complex component (API, multi-step)
    DatePicker.vue - Composable orchestration
    BaseModal.vue - Foundation for modals

Deliverable: 107 tests, ~1400 lines, +25% coverage
Week 3: Complete Component Coverage

10-11. BookTitle + BookAuthor - Content editable 12-13. BookCover + BookStatus - Display logic 14-15. IconButton + LibraryHeader - Simple UI 16-20. DatePicker sub-components - Presentational

Deliverable: 105 tests, ~1310 lines, +20% coverage
Week 4: Infrastructure & Polish

    Coverage reporting (vitest.config.js, install deps)
    Test utilities (test-utils.js)
    CI/CD (GitHub Actions)
    Documentation and gap analysis

Deliverable: Infrastructure, 80%+ coverage sustained
Critical Files Reference

These existing files serve as templates:

    src/stores/tests/books.spec.js - Store testing patterns
    src/components/tests/BookCard.spec.js - Complex component patterns
    src/composables/useDatePicker.js - Most complex logic to test
    src/components/library/BookSearch.vue - Multi-step flow
    vitest.config.js - Configuration baseline

Success Criteria

Quantitative:

    80%+ overall code coverage
    100% coverage for stores and composables
    All tests pass in CI/CD
    Test execution time < 30 seconds

Qualitative:

    Tests are readable and maintainable
    Edge cases documented
    Consistent patterns across test files
    New developers can understand structure

Total Deliverables

    25 test files (20 new + 5 existing)
    ~341 total tests (341 new + existing)
    ~3,500+ lines of test code
    Coverage infrastructure (reporting, CI/CD)
    Test utilities and documentation
    80%+ code coverage

This plan transforms FlexLib from minimal to comprehensive test coverage using idiomatic Vue/Vitest patterns, prioritizing business logic and user-facing features.