import { describe, it, expect, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import BookDateModal from '../BookDateModal.vue'
import DatePicker from '../DatePicker.vue'

describe('BookDateModal', () => {
  let wrapper

  afterEach(() => {
    wrapper?.unmount()
    document.body.innerHTML = ''
  })

  function mountModal(book) {
    return mount(BookDateModal, {
      props: {
        isOpen: true,
        book,
        settings: { settings: { allowUnfinishedReading: true } }
      }
    })
  }

  it('does not flag an ordinary dated book read months ago as "Long Ago"', () => {
    wrapper = mountModal({ id: '1', name: 'Dune', year: 2020, month: 3, attributes: {} })

    const datePicker = wrapper.findComponent(DatePicker)
    expect(datePicker.props('isReadLongAgo')).toBe(false)
    expect(datePicker.props('isReadLately')).toBe(false)
  })

  it('flags the sentinel "Long Ago" year (1900) as Long Ago', () => {
    wrapper = mountModal({ id: '1', name: 'Old Book', year: 1900, month: 1, attributes: {} })

    const datePicker = wrapper.findComponent(DatePicker)
    expect(datePicker.props('isReadLongAgo')).toBe(true)
    expect(datePicker.props('isReadLately')).toBe(false)
  })

  it('flags the sentinel "Lately" year (1910) as Lately', () => {
    wrapper = mountModal({ id: '1', name: 'Recent Book', year: 1910, month: 1, attributes: {} })

    const datePicker = wrapper.findComponent(DatePicker)
    expect(datePicker.props('isReadLongAgo')).toBe(false)
    expect(datePicker.props('isReadLately')).toBe(true)
  })
})
