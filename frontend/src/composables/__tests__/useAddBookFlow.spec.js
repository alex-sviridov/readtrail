import { describe, it, expect, vi } from 'vitest'
import { useAddBookFlow } from '../useAddBookFlow'

function createStore() {
  return { addBook: vi.fn() }
}

describe('useAddBookFlow', () => {
  it('starts with the search modal closed', () => {
    const { isSearchModalOpen } = useAddBookFlow(createStore())
    expect(isSearchModalOpen.value).toBe(false)
  })

  it('opens and closes the search modal', () => {
    const { isSearchModalOpen, openSearchModal, closeSearchModal } = useAddBookFlow(createStore())

    openSearchModal()
    expect(isSearchModalOpen.value).toBe(true)

    closeSearchModal()
    expect(isSearchModalOpen.value).toBe(false)
  })

  it('maps BookSearch payload (title) to the store shape (name)', () => {
    const store = createStore()
    const { handleBookSelect } = useAddBookFlow(store)

    handleBookSelect({
      title: '1984',
      author: 'George Orwell',
      year: 1949,
      month: 3,
      coverLink: 'https://covers.openlibrary.org/b/id/1-M.jpg',
      isUnfinished: false,
      score: 4
    })

    expect(store.addBook).toHaveBeenCalledWith({
      name: '1984',
      year: 1949,
      month: 3,
      author: 'George Orwell',
      coverLink: 'https://covers.openlibrary.org/b/id/1-M.jpg',
      isUnfinished: false,
      score: 4
    })
  })

  it('defaults isUnfinished to false and score to null when absent', () => {
    const store = createStore()
    const { handleBookSelect } = useAddBookFlow(store)

    handleBookSelect({ title: 'In Progress Book', author: null, year: null, month: null, coverLink: null })

    expect(store.addBook).toHaveBeenCalledWith({
      name: 'In Progress Book',
      year: null,
      month: null,
      author: null,
      coverLink: null,
      isUnfinished: false,
      score: null
    })
  })
})
