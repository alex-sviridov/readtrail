import { ref } from 'vue'

/**
 * Shared "open search modal -> pick a book -> add it" flow used by both
 * the grid and table library views, so the title->name field mapping
 * between BookSearch's emitted payload and the store's book shape only
 * lives in one place.
 */
export function useAddBookFlow(booksStore) {
  const isSearchModalOpen = ref(false)

  function openSearchModal() {
    isSearchModalOpen.value = true
  }

  function closeSearchModal() {
    isSearchModalOpen.value = false
  }

  function handleBookSelect(bookData) {
    booksStore.addBook({
      name: bookData.title,
      year: bookData.year,
      month: bookData.month,
      author: bookData.author,
      coverLink: bookData.coverLink,
      isUnfinished: bookData.isUnfinished || false,
      score: bookData.score || null
    })
  }

  return {
    isSearchModalOpen,
    openSearchModal,
    closeSearchModal,
    handleBookSelect
  }
}
