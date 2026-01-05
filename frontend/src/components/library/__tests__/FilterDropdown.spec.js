import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import FilterDropdown from '../FilterDropdown.vue'
import { nextTick } from 'vue'

describe('FilterDropdown', () => {
  const createWrapper = (props = {}) => {
    return mount(FilterDropdown, {
      props: {
        hideUnfinished: false,
        hideToRead: false,
        allowUnfinishedReading: true,
        ...props
      }
    })
  }

  beforeEach(() => {
    // Reset any state if needed
  })

  describe('Component Rendering', () => {
    it('renders the filter button', () => {
      const wrapper = createWrapper()
      const button = wrapper.find('button')

      expect(button.exists()).toBe(true)
      expect(button.text()).toContain('Filter')
    })

    it('does not show dropdown by default', () => {
      const wrapper = createWrapper()
      const dropdown = wrapper.find('[role="menu"]')

      expect(dropdown.exists()).toBe(false)
    })

    it('renders funnel icon', () => {
      const wrapper = createWrapper()
      const icon = wrapper.find('svg')

      expect(icon.exists()).toBe(true)
    })

    it('renders chevron icon', () => {
      const wrapper = createWrapper()
      const chevrons = wrapper.findAll('svg')

      expect(chevrons.length).toBeGreaterThan(1)
    })

    it('hides "Filter" text on small screens', () => {
      const wrapper = createWrapper()
      const span = wrapper.find('span.hidden.sm\\:inline')

      expect(span.exists()).toBe(true)
      expect(span.text()).toBe('Filter')
      expect(span.classes()).toContain('hidden')
      expect(span.classes()).toContain('sm:inline')
    })
  })

  describe('Button Styling', () => {
    it('applies inactive styling when no filters are active', () => {
      const wrapper = createWrapper({
        hideUnfinished: false,
        hideToRead: false
      })
      const button = wrapper.find('button')

      expect(button.classes()).toContain('bg-gray-200')
      expect(button.classes()).toContain('text-gray-700')
      expect(button.classes()).toContain('hover:bg-gray-300')
    })

    it('applies active styling when hideUnfinished is true', () => {
      const wrapper = createWrapper({
        hideUnfinished: true,
        hideToRead: false
      })
      const button = wrapper.find('button')

      expect(button.classes()).toContain('bg-blue-600')
      expect(button.classes()).toContain('text-white')
      expect(button.classes()).toContain('hover:bg-blue-700')
    })

    it('applies active styling when hideToRead is true', () => {
      const wrapper = createWrapper({
        hideUnfinished: false,
        hideToRead: true
      })
      const button = wrapper.find('button')

      expect(button.classes()).toContain('bg-blue-600')
      expect(button.classes()).toContain('text-white')
      expect(button.classes()).toContain('hover:bg-blue-700')
    })

    it('applies active styling when both filters are active', () => {
      const wrapper = createWrapper({
        hideUnfinished: true,
        hideToRead: true
      })
      const button = wrapper.find('button')

      expect(button.classes()).toContain('bg-blue-600')
      expect(button.classes()).toContain('text-white')
      expect(button.classes()).toContain('hover:bg-blue-700')
    })
  })

  describe('Active Filter Count Badge', () => {
    it('does not show badge when no filters are active', () => {
      const wrapper = createWrapper({
        hideUnfinished: false,
        hideToRead: false
      })
      const badge = wrapper.find('span.rounded-full')

      expect(badge.exists()).toBe(false)
    })

    it('shows badge with count 1 when one filter is active', () => {
      const wrapper = createWrapper({
        hideUnfinished: true,
        hideToRead: false
      })
      const badge = wrapper.find('span.rounded-full')

      expect(badge.exists()).toBe(true)
      expect(badge.text()).toBe('1')
    })

    it('shows badge with count 2 when both filters are active', () => {
      const wrapper = createWrapper({
        hideUnfinished: true,
        hideToRead: true
      })
      const badge = wrapper.find('span.rounded-full')

      expect(badge.exists()).toBe(true)
      expect(badge.text()).toBe('2')
    })

    it('applies correct badge styling when button is active', () => {
      const wrapper = createWrapper({
        hideUnfinished: true,
        hideToRead: false
      })
      const badge = wrapper.find('span.rounded-full')

      expect(badge.classes()).toContain('bg-white')
      expect(badge.classes()).toContain('text-blue-600')
    })

    it('applies correct badge styling when button is active (hideToRead=true)', () => {
      const wrapper = createWrapper({
        hideUnfinished: false,
        hideToRead: true
      })
      const badge = wrapper.find('span.rounded-full')

      // When hideToRead is true, button is active (blue), so badge is white with blue text
      expect(badge.classes()).toContain('bg-white')
      expect(badge.classes()).toContain('text-blue-600')
    })
  })

  describe('Dropdown Toggle', () => {
    it('opens dropdown when button is clicked', async () => {
      const wrapper = createWrapper()
      const button = wrapper.find('button')

      await button.trigger('click')
      await nextTick()

      const dropdown = wrapper.find('[role="menu"]')
      expect(dropdown.exists()).toBe(true)
    })

    it('closes dropdown when button is clicked again', async () => {
      const wrapper = createWrapper()
      const button = wrapper.find('button')

      await button.trigger('click')
      await nextTick()
      expect(wrapper.find('[role="menu"]').exists()).toBe(true)

      await button.trigger('click')
      await nextTick()
      expect(wrapper.find('[role="menu"]').exists()).toBe(false)
    })

    it('updates aria-expanded attribute when dropdown is opened', async () => {
      const wrapper = createWrapper()
      const button = wrapper.find('button')

      expect(button.attributes('aria-expanded')).toBe('false')

      await button.trigger('click')
      await nextTick()

      expect(button.attributes('aria-expanded')).toBe('true')
    })

    it('rotates chevron icon when dropdown is open', async () => {
      const wrapper = createWrapper()
      const button = wrapper.find('button')

      const chevron = wrapper.find('.transition-transform')
      expect(chevron.classes()).not.toContain('rotate-180')

      await button.trigger('click')
      await nextTick()

      expect(chevron.classes()).toContain('rotate-180')
    })
  })

  describe('Dropdown Content', () => {
    it('displays "Filters" header', async () => {
      const wrapper = createWrapper()
      await wrapper.find('button').trigger('click')
      await nextTick()

      const header = wrapper.find('.text-sm.font-semibold')
      expect(header.text()).toBe('Filters')
    })

    it('displays "Hide Unfinished" option', async () => {
      const wrapper = createWrapper()
      await wrapper.find('button').trigger('click')
      await nextTick()

      expect(wrapper.text()).toContain('Hide Unfinished')
    })

    it('displays "Hide Unread" option', async () => {
      const wrapper = createWrapper()
      await wrapper.find('button').trigger('click')
      await nextTick()

      expect(wrapper.text()).toContain('Hide Unread')
    })

    it('does not show "Clear all" button when no filters are active', async () => {
      const wrapper = createWrapper({
        hideUnfinished: false,
        hideToRead: false
      })
      await wrapper.find('button').trigger('click')
      await nextTick()

      const clearButton = wrapper.find('.text-blue-600')
      expect(clearButton.exists()).toBe(false)
    })

    it('shows "Clear all" button when filters are active', async () => {
      const wrapper = createWrapper({
        hideUnfinished: true,
        hideToRead: false
      })
      await wrapper.find('button').trigger('click')
      await nextTick()

      const buttons = wrapper.findAll('button')
      const clearButton = buttons.find(btn => btn.text().includes('Clear all'))
      expect(clearButton).toBeTruthy()
      expect(clearButton.text()).toBe('Clear all')
    })
  })

  describe('Filter Option Checkboxes', () => {
    it('shows unchecked checkbox for Hide Unfinished when inactive', async () => {
      const wrapper = createWrapper({
        hideUnfinished: false,
        hideToRead: false
      })
      await wrapper.find('button').trigger('click')
      await nextTick()

      const menuItems = wrapper.findAll('[role="menuitem"]')
      const hideUnfinishedCheckbox = menuItems[0].find('.w-5.h-5.rounded')

      expect(hideUnfinishedCheckbox.classes()).toContain('border-gray-300')
      expect(hideUnfinishedCheckbox.classes()).not.toContain('bg-blue-600')
      expect(hideUnfinishedCheckbox.find('svg').exists()).toBe(false)
    })

    it('shows checked checkbox for Hide Unfinished when active', async () => {
      const wrapper = createWrapper({
        hideUnfinished: true,
        hideToRead: false
      })
      await wrapper.find('button').trigger('click')
      await nextTick()

      const menuItems = wrapper.findAll('[role="menuitem"]')
      const hideUnfinishedCheckbox = menuItems[0].find('.w-5.h-5.rounded')

      expect(hideUnfinishedCheckbox.classes()).toContain('bg-blue-600')
      expect(hideUnfinishedCheckbox.classes()).toContain('border-blue-600')
      expect(hideUnfinishedCheckbox.find('svg').exists()).toBe(true)
    })

    it('shows unchecked checkbox for Hide Unread when inactive', async () => {
      const wrapper = createWrapper({
        hideUnfinished: false,
        hideToRead: false
      })
      await wrapper.find('button').trigger('click')
      await nextTick()

      const menuItems = wrapper.findAll('[role="menuitem"]')
      const hideToReadCheckbox = menuItems[1].find('.w-5.h-5.rounded')

      expect(hideToReadCheckbox.classes()).toContain('border-gray-300')
      expect(hideToReadCheckbox.classes()).not.toContain('bg-blue-600')
      expect(hideToReadCheckbox.find('svg').exists()).toBe(false)
    })

    it('shows checked checkbox for Hide Unread when active', async () => {
      const wrapper = createWrapper({
        hideUnfinished: false,
        hideToRead: true
      })
      await wrapper.find('button').trigger('click')
      await nextTick()

      const menuItems = wrapper.findAll('[role="menuitem"]')
      const hideToReadCheckbox = menuItems[1].find('.w-5.h-5.rounded')

      expect(hideToReadCheckbox.classes()).toContain('bg-blue-600')
      expect(hideToReadCheckbox.classes()).toContain('border-blue-600')
      expect(hideToReadCheckbox.find('svg').exists()).toBe(true)
    })
  })

  describe('Event Emissions', () => {
    it('emits toggle-hide-unfinished when Hide Unfinished is clicked', async () => {
      const wrapper = createWrapper()
      await wrapper.find('button').trigger('click')
      await nextTick()

      const menuItems = wrapper.findAll('[role="menuitem"]')
      await menuItems[0].trigger('click')

      expect(wrapper.emitted('toggle-hide-unfinished')).toBeTruthy()
      expect(wrapper.emitted('toggle-hide-unfinished')).toHaveLength(1)
    })

    it('emits toggle-hide-to-read when Hide Unread is clicked', async () => {
      const wrapper = createWrapper()
      await wrapper.find('button').trigger('click')
      await nextTick()

      const menuItems = wrapper.findAll('[role="menuitem"]')
      await menuItems[1].trigger('click')

      expect(wrapper.emitted('toggle-hide-to-read')).toBeTruthy()
      expect(wrapper.emitted('toggle-hide-to-read')).toHaveLength(1)
    })

    it('emits clear-all when Clear all button is clicked', async () => {
      const wrapper = createWrapper({
        hideUnfinished: true,
        hideToRead: true
      })
      await wrapper.find('button').trigger('click')
      await nextTick()

      const buttons = wrapper.findAll('button')
      const clearButton = buttons.find(btn => btn.text().includes('Clear all'))
      await clearButton.trigger('click')

      expect(wrapper.emitted('clear-all')).toBeTruthy()
      expect(wrapper.emitted('clear-all')).toHaveLength(1)
    })

    it('closes dropdown after Clear all is clicked', async () => {
      const wrapper = createWrapper({
        hideUnfinished: true,
        hideToRead: true
      })
      await wrapper.find('button').trigger('click')
      await nextTick()

      expect(wrapper.find('[role="menu"]').exists()).toBe(true)

      const buttons = wrapper.findAll('button')
      const clearButton = buttons.find(btn => btn.text().includes('Clear all'))
      await clearButton.trigger('click')
      await nextTick()

      expect(wrapper.find('[role="menu"]').exists()).toBe(false)
    })

    it('keeps dropdown open when filter option is clicked', async () => {
      const wrapper = createWrapper()
      await wrapper.find('button').trigger('click')
      await nextTick()

      const menuItems = wrapper.findAll('[role="menuitem"]')
      await menuItems[0].trigger('click')
      await nextTick()

      expect(wrapper.find('[role="menu"]').exists()).toBe(true)
    })
  })

  describe('Click Outside Behavior', () => {
    it('closes dropdown when clicking outside', async () => {
      const wrapper = createWrapper({
        attachTo: document.body
      })

      const button = wrapper.find('button')
      await button.trigger('click')
      await nextTick()

      expect(wrapper.find('[role="menu"]').exists()).toBe(true)

      // Simulate click outside - need to wait for event listener to be added
      await new Promise(resolve => setTimeout(resolve, 10))
      document.body.click()
      await nextTick()

      expect(wrapper.find('[role="menu"]').exists()).toBe(false)

      wrapper.unmount()
    })

    it('does not close dropdown when clicking inside dropdown', async () => {
      const wrapper = createWrapper({
        attachTo: document.body
      })

      const button = wrapper.find('button')
      await button.trigger('click')
      await nextTick()

      const dropdown = wrapper.find('[role="menu"]')
      dropdown.element.click()
      await nextTick()

      expect(wrapper.find('[role="menu"]').exists()).toBe(true)

      wrapper.unmount()
    })
  })

  describe('Escape Key Behavior', () => {
    it('closes dropdown when Escape key is pressed', async () => {
      const wrapper = createWrapper({
        attachTo: document.body
      })

      const button = wrapper.find('button')
      await button.trigger('click')
      await nextTick()

      expect(wrapper.find('[role="menu"]').exists()).toBe(true)

      // Simulate Escape key press
      const event = new KeyboardEvent('keydown', { key: 'Escape' })
      document.dispatchEvent(event)
      await nextTick()

      expect(wrapper.find('[role="menu"]').exists()).toBe(false)

      wrapper.unmount()
    })
  })

  describe('Accessibility', () => {
    it('has aria-haspopup attribute on button', () => {
      const wrapper = createWrapper()
      const button = wrapper.find('button')

      expect(button.attributes('aria-haspopup')).toBe('true')
    })

    it('has role="menu" on dropdown', async () => {
      const wrapper = createWrapper()
      await wrapper.find('button').trigger('click')
      await nextTick()

      const dropdown = wrapper.find('[role="menu"]')
      expect(dropdown.exists()).toBe(true)
    })

    it('has role="menuitem" on each filter option', async () => {
      const wrapper = createWrapper()
      await wrapper.find('button').trigger('click')
      await nextTick()

      const menuItems = wrapper.findAll('[role="menuitem"]')
      expect(menuItems.length).toBe(2)
    })

    it('has correct title when no filters are active', () => {
      const wrapper = createWrapper({
        hideUnfinished: false,
        hideToRead: false
      })
      const button = wrapper.find('button')

      expect(button.attributes('title')).toBe('No filters')
    })

    it('has correct title when filters are active', () => {
      const wrapper = createWrapper({
        hideUnfinished: true,
        hideToRead: false
      })
      const button = wrapper.find('button')

      expect(button.attributes('title')).toBe('Filters active')
    })
  })

  describe('Dropdown Positioning', () => {
    it('positions dropdown on the right side', async () => {
      const wrapper = createWrapper()
      await wrapper.find('button').trigger('click')
      await nextTick()

      const dropdown = wrapper.find('[role="menu"]')
      expect(dropdown.classes()).toContain('right-0')
    })

    it('has proper z-index for dropdown', async () => {
      const wrapper = createWrapper()
      await wrapper.find('button').trigger('click')
      await nextTick()

      const dropdown = wrapper.find('[role="menu"]')
      expect(dropdown.classes()).toContain('z-50')
    })

    it('positions dropdown absolutely', async () => {
      const wrapper = createWrapper()
      await wrapper.find('button').trigger('click')
      await nextTick()

      const dropdown = wrapper.find('[role="menu"]')
      expect(dropdown.classes()).toContain('absolute')
    })
  })

  describe('Responsive Behavior', () => {
    it('has responsive padding on button', () => {
      const wrapper = createWrapper()
      const button = wrapper.find('button')

      expect(button.classes()).toContain('px-3')
      expect(button.classes()).toContain('md:px-4')
    })

    it('hides "Filter" text on mobile and shows on larger screens', () => {
      const wrapper = createWrapper()
      const filterText = wrapper.find('span.hidden.sm\\:inline')

      expect(filterText.exists()).toBe(true)
      expect(filterText.text()).toBe('Filter')
    })
  })

  describe('Edge Cases', () => {
    it('handles rapid toggle clicks', async () => {
      const wrapper = createWrapper()
      const button = wrapper.find('button')

      await button.trigger('click')
      await button.trigger('click')
      await button.trigger('click')
      await nextTick()

      // Should end up closed (3 clicks = open, close, open -> actually ends open)
      expect(wrapper.find('[role="menu"]').exists()).toBe(true)
    })

    it('handles multiple filter option clicks', async () => {
      const wrapper = createWrapper()
      await wrapper.find('button').trigger('click')
      await nextTick()

      const menuItems = wrapper.findAll('[role="menuitem"]')
      await menuItems[0].trigger('click')
      await menuItems[1].trigger('click')
      await menuItems[0].trigger('click')

      expect(wrapper.emitted('toggle-hide-unfinished')).toHaveLength(2)
      expect(wrapper.emitted('toggle-hide-to-read')).toHaveLength(1)
    })

    it('maintains correct count badge through prop updates', async () => {
      const wrapper = createWrapper({
        hideUnfinished: false,
        hideToRead: false
      })

      expect(wrapper.find('span.rounded-full').exists()).toBe(false)

      await wrapper.setProps({ hideUnfinished: true })
      expect(wrapper.find('span.rounded-full').text()).toBe('1')

      await wrapper.setProps({ hideToRead: true })
      expect(wrapper.find('span.rounded-full').text()).toBe('2')

      await wrapper.setProps({ hideUnfinished: false })
      expect(wrapper.find('span.rounded-full').text()).toBe('1')

      await wrapper.setProps({ hideToRead: false })
      expect(wrapper.find('span.rounded-full').exists()).toBe(false)
    })
  })

  describe('Component Structure', () => {
    it('has relative positioning on container', () => {
      const wrapper = createWrapper()
      const container = wrapper.find('.relative')

      expect(container.exists()).toBe(true)
    })

    it('has proper button styling classes', () => {
      const wrapper = createWrapper()
      const button = wrapper.find('button')

      expect(button.classes()).toContain('flex')
      expect(button.classes()).toContain('items-center')
      expect(button.classes()).toContain('gap-2')
      expect(button.classes()).toContain('rounded-lg')
      expect(button.classes()).toContain('shadow-md')
      expect(button.classes()).toContain('hover:shadow-lg')
      expect(button.classes()).toContain('transition-all')
    })

    it('has proper dropdown styling', async () => {
      const wrapper = createWrapper()
      await wrapper.find('button').trigger('click')
      await nextTick()

      const dropdown = wrapper.find('[role="menu"]')
      expect(dropdown.classes()).toContain('bg-white')
      expect(dropdown.classes()).toContain('rounded-lg')
      expect(dropdown.classes()).toContain('shadow-lg')
      expect(dropdown.classes()).toContain('border')
      expect(dropdown.classes()).toContain('border-gray-200')
    })
  })

  describe('Allow Unfinished Reading Setting', () => {
    it('shows Hide Unfinished option when allowUnfinishedReading is true', async () => {
      const wrapper = createWrapper({
        allowUnfinishedReading: true
      })
      await wrapper.find('button').trigger('click')
      await nextTick()

      expect(wrapper.text()).toContain('Hide Unfinished')
    })

    it('hides Hide Unfinished option when allowUnfinishedReading is false', async () => {
      const wrapper = createWrapper({
        allowUnfinishedReading: false
      })
      await wrapper.find('button').trigger('click')
      await nextTick()

      expect(wrapper.text()).not.toContain('Hide Unfinished')
      expect(wrapper.text()).toContain('Hide Unread')
    })

    it('does not count hideUnfinished in active filters when allowUnfinishedReading is false', () => {
      const wrapper = createWrapper({
        hideUnfinished: true,
        hideToRead: false,
        allowUnfinishedReading: false
      })

      const badge = wrapper.find('span.rounded-full')
      expect(badge.exists()).toBe(false)
    })

    it('does not show active styling when only hideUnfinished is true and allowUnfinishedReading is false', () => {
      const wrapper = createWrapper({
        hideUnfinished: true,
        hideToRead: false,
        allowUnfinishedReading: false
      })
      const button = wrapper.find('button')

      expect(button.classes()).toContain('bg-gray-200')
      expect(button.classes()).not.toContain('bg-blue-600')
    })

    it('shows active styling when hideToRead is true even if allowUnfinishedReading is false', () => {
      const wrapper = createWrapper({
        hideUnfinished: false,
        hideToRead: true,
        allowUnfinishedReading: false
      })
      const button = wrapper.find('button')

      expect(button.classes()).toContain('bg-blue-600')
    })

    it('counts both filters when both are active and allowUnfinishedReading is true', () => {
      const wrapper = createWrapper({
        hideUnfinished: true,
        hideToRead: true,
        allowUnfinishedReading: true
      })

      const badge = wrapper.find('span.rounded-full')
      expect(badge.text()).toBe('2')
    })

    it('counts only hideToRead when both are active but allowUnfinishedReading is false', () => {
      const wrapper = createWrapper({
        hideUnfinished: true,
        hideToRead: true,
        allowUnfinishedReading: false
      })

      const badge = wrapper.find('span.rounded-full')
      expect(badge.text()).toBe('1')
    })

    it('has only one menu item when allowUnfinishedReading is false', async () => {
      const wrapper = createWrapper({
        allowUnfinishedReading: false
      })
      await wrapper.find('button').trigger('click')
      await nextTick()

      const menuItems = wrapper.findAll('[role="menuitem"]')
      expect(menuItems.length).toBe(1)
    })

    it('has two menu items when allowUnfinishedReading is true', async () => {
      const wrapper = createWrapper({
        allowUnfinishedReading: true
      })
      await wrapper.find('button').trigger('click')
      await nextTick()

      const menuItems = wrapper.findAll('[role="menuitem"]')
      expect(menuItems.length).toBe(2)
    })
  })
})
