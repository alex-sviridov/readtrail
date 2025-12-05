import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import BookCard from '../library/BookCard.vue'
import BaseButton from '../base/BaseButton.vue'
import DateSelector from '../DateSelector.vue'
import IconButton from '../library/IconButton.vue'

// Helper function to wait for debounced auto-save
const waitForAutoSave = () => new Promise(resolve => setTimeout(resolve, 350))

describe('BookCard', () => {
  const inProgressBook = {
    id: '1',
    name: 'In Progress Book',
    completedAt: null,
    createdAt: new Date('2024-01-01')
  }

  const completedBook = {
    id: '2',
    name: 'Completed Book',
    completedAt: new Date('2024-06-01'),
    createdAt: new Date('2024-01-01')
  }

  describe('View Mode', () => {
    it('renders book name', () => {
      const wrapper = mount(BookCard, {
        props: { book: inProgressBook },
        global: { components: { BaseButton, IconButton, DateSelector } }
      })
      expect(wrapper.text()).toContain('In Progress Book')
    })

    it('displays "In Progress" badge for uncompleted book', () => {
      const wrapper = mount(BookCard, {
        props: { book: inProgressBook },
        global: { components: { BaseButton, IconButton, DateSelector } }
      })
      expect(wrapper.text()).toContain('In Progress')
    })

    it('displays formatted completion date for completed book', () => {
      const wrapper = mount(BookCard, {
        props: { book: completedBook },
        global: { components: { BaseButton, IconButton, DateSelector } }
      })
      expect(wrapper.text()).toContain('June 2024')
    })

    it('renders image placeholder with book icon', () => {
      const wrapper = mount(BookCard, {
        props: { book: inProgressBook },
        global: { components: { BaseButton, IconButton, DateSelector } }
      })
      expect(wrapper.find('.aspect-\\[2\\/3\\]').exists()).toBe(true)
      expect(wrapper.find('svg').exists()).toBe(true)
    })

    it('renders Mark as Completed button for in-progress book', () => {
      const wrapper = mount(BookCard, {
        props: { book: inProgressBook },
        global: { components: { BaseButton, IconButton, DateSelector } }
      })
      const buttons = wrapper.findAllComponents(BaseButton)
      expect(buttons.some(b => b.text() === 'Mark as Completed')).toBe(true)
    })

    it('does not render Mark as Completed button for completed book', () => {
      const wrapper = mount(BookCard, {
        props: { book: completedBook },
        global: { components: { BaseButton, IconButton, DateSelector } }
      })
      const buttons = wrapper.findAllComponents(BaseButton)
      expect(buttons.some(b => b.text() === 'Mark as Completed')).toBe(false)
    })
  })

  describe('Edit Mode', () => {
    it('enters edit mode when Edit icon is clicked', async () => {
      const wrapper = mount(BookCard, {
        props: { book: inProgressBook },
        global: { components: { BaseButton, IconButton, DateSelector } }
      })

      const editIcon = wrapper.findAllComponents(IconButton).find(b => b.props('title') === 'Edit book')
      await editIcon.vm.$emit('click')
      await nextTick()

      expect(wrapper.find('input[type="text"]').exists()).toBe(true)
      expect(wrapper.findComponent(DateSelector).exists()).toBe(true)
    })

    it('pre-fills form with book data in edit mode', async () => {
      const wrapper = mount(BookCard, {
        props: { book: completedBook },
        global: { components: { BaseButton, IconButton, DateSelector } }
      })

      const editIcon = wrapper.findAllComponents(IconButton).find(b => b.props('title') === 'Edit book')
      await editIcon.vm.$emit('click')
      await nextTick()

      const nameInput = wrapper.find('input[type="text"]')
      expect(nameInput.element.value).toBe('Completed Book')

      const dateSelector = wrapper.findComponent(DateSelector)
      expect(dateSelector.props('modelValue')).toEqual({
        year: 2024,
        month: 6
      })
    })

    it('auto-saves when book name changes', async () => {
      const wrapper = mount(BookCard, {
        props: { book: inProgressBook },
        global: { components: { BaseButton, IconButton, DateSelector } }
      })

      const editIcon = wrapper.findAllComponents(IconButton).find(b => b.props('title') === 'Edit book')
      await editIcon.vm.$emit('click')
      await nextTick()

      const nameInput = wrapper.find('input[type="text"]')
      await nameInput.setValue('Updated Book Name')

      await waitForAutoSave()

      expect(wrapper.emitted('update')).toBeTruthy()
      expect(wrapper.emitted('update')[0][0]).toEqual({
        id: '1',
        name: 'Updated Book Name',
        year: null,
        month: null
      })
    })

    it('auto-saves when date changes', async () => {
      const wrapper = mount(BookCard, {
        props: { book: inProgressBook },
        global: { components: { BaseButton, IconButton, DateSelector } }
      })

      const editIcon = wrapper.findAllComponents(IconButton).find(b => b.props('title') === 'Edit book')
      await editIcon.vm.$emit('click')
      await nextTick()

      const dateSelector = wrapper.findComponent(DateSelector)
      await dateSelector.vm.$emit('update:modelValue', { year: 2024, month: 12 })
      await nextTick()

      await waitForAutoSave()

      expect(wrapper.emitted('update')).toBeTruthy()
      const lastUpdate = wrapper.emitted('update')[wrapper.emitted('update').length - 1][0]
      expect(lastUpdate.year).toBe(2024)
      expect(lastUpdate.month).toBe(12)
    })

    it('exits edit mode on click outside', async () => {
      const wrapper = mount(BookCard, {
        props: { book: inProgressBook },
        global: { components: { BaseButton, IconButton, DateSelector } },
        attachTo: document.body
      })

      const editIcon = wrapper.findAllComponents(IconButton).find(b => b.props('title') === 'Edit book')
      await editIcon.vm.$emit('click')
      await nextTick()

      expect(wrapper.find('input[type="text"]').exists()).toBe(true)

      // Click outside the card
      document.body.click()
      await nextTick()

      expect(wrapper.find('input[type="text"]').exists()).toBe(false)

      wrapper.unmount()
    })
  })

  describe('Mark as Completed Mode', () => {
    it('enters mark as completed mode when button is clicked', async () => {
      const wrapper = mount(BookCard, {
        props: { book: inProgressBook },
        global: { components: { BaseButton, IconButton, DateSelector } }
      })

      const markButton = wrapper.findAllComponents(BaseButton).find(b => b.text() === 'Mark as Completed')
      await markButton.trigger('click')

      expect(wrapper.findComponent(DateSelector).exists()).toBe(true)
      expect(wrapper.findComponent(DateSelector).props('requireMonth')).toBe(true)
    })

    it('pre-fills current date in mark as completed mode', async () => {
      const wrapper = mount(BookCard, {
        props: { book: inProgressBook },
        global: { components: { BaseButton, IconButton, DateSelector } }
      })

      const markButton = wrapper.findAllComponents(BaseButton).find(b => b.text() === 'Mark as Completed')
      await markButton.trigger('click')

      const currentDate = new Date()
      const dateSelector = wrapper.findComponent(DateSelector)

      expect(dateSelector.props('modelValue').year).toBe(currentDate.getFullYear())
      expect(dateSelector.props('modelValue').month).toBe(currentDate.getMonth() + 1)
    })

    it('auto-saves and closes when date is selected', async () => {
      const wrapper = mount(BookCard, {
        props: { book: inProgressBook },
        global: { components: { BaseButton, IconButton, DateSelector } }
      })

      const markButton = wrapper.findAllComponents(BaseButton).find(b => b.text() === 'Mark as Completed')
      await markButton.trigger('click')

      const dateSelector = wrapper.findComponent(DateSelector)
      await dateSelector.vm.$emit('update:modelValue', { year: 2024, month: 8 })
      await nextTick()

      await waitForAutoSave()

      expect(wrapper.emitted('markCompleted')).toBeTruthy()
      expect(wrapper.emitted('markCompleted')[0][0]).toEqual({
        id: '1',
        year: 2024,
        month: 8
      })

      // Mode should close after auto-save
      await nextTick()
      expect(wrapper.findComponent(DateSelector).exists()).toBe(false)
    })

    it('exits mark as completed mode on click outside', async () => {
      const wrapper = mount(BookCard, {
        props: { book: inProgressBook },
        global: { components: { BaseButton, IconButton, DateSelector } },
        attachTo: document.body
      })

      const markButton = wrapper.findAllComponents(BaseButton).find(b => b.text() === 'Mark as Completed')
      await markButton.trigger('click')

      expect(wrapper.findComponent(DateSelector).exists()).toBe(true)

      // Click outside the card
      document.body.click()
      await nextTick()

      expect(wrapper.findComponent(DateSelector).exists()).toBe(false)

      wrapper.unmount()
    })
  })

  describe('Delete', () => {
    it('emits delete event when Delete icon is clicked', async () => {
      const wrapper = mount(BookCard, {
        props: { book: inProgressBook },
        global: { components: { BaseButton, IconButton, DateSelector } }
      })

      const deleteIcon = wrapper.findAllComponents(IconButton).find(b => b.props('title') === 'Delete book')
      await deleteIcon.vm.$emit('click')
      await nextTick()

      // IconButton handles confirmation internally, so we just verify delete event
      expect(wrapper.emitted('delete')).toBeTruthy()
      expect(wrapper.emitted('delete')[0][0]).toBe('1')
    })
  })

  describe('Date Formatting', () => {
    const testCases = [
      { date: new Date('2024-01-01'), expected: 'January 2024' },
      { date: new Date('2024-06-01'), expected: 'June 2024' },
      { date: new Date('2024-12-01'), expected: 'December 2024' },
      { date: new Date('2023-03-01'), expected: 'March 2023' }
    ]

    testCases.forEach(({ date, expected }) => {
      it(`formats ${date.toISOString()} as "${expected}"`, () => {
        const wrapper = mount(BookCard, {
          props: {
            book: {
              ...completedBook,
              completedAt: date
            }
          },
          global: { components: { BaseButton, IconButton, DateSelector } }
        })
        expect(wrapper.text()).toContain(expected)
      })
    })
  })

  describe('Card Styling', () => {
    it('applies card styling classes', () => {
      const wrapper = mount(BookCard, {
        props: { book: inProgressBook },
        global: { components: { BaseButton, IconButton, DateSelector } }
      })

      expect(wrapper.find('.rounded-lg').exists()).toBe(true)
      expect(wrapper.find('.shadow-md').exists()).toBe(true)
      expect(wrapper.find('.hover\\:shadow-lg').exists()).toBe(true)
    })
  })
})
