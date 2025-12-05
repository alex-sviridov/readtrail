<template>
  <div class="container mx-auto px-4 py-8 max-w-7xl">
    <!-- Book Grid -->
    <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
      <!-- Book Cards -->
      <BookCard
        v-for="book in sortedBooks"
        :key="book.id"
        :book="book"
        @delete="handleDeleteBook"
        @update-title="handleUpdateTitle"
        @update-status="handleUpdateStatus"
      />
    </div>
  </div>
</template>

<script setup>
import { storeToRefs } from 'pinia'
import { useBooksStore } from '../stores/books'
import BookCard from '../components/BookCard.vue'

defineOptions({
  name: 'HomePage'
})

// Initialize the books store
const booksStore = useBooksStore()
const { sortedBooks } = storeToRefs(booksStore)

// Handle deleting a book
const handleDeleteBook = (id) => {
  booksStore.deleteBook(id)
}

// Handle updating book title
const handleUpdateTitle = ({ id, title }) => {
  const success = booksStore.updateBookTitle(id, title)

  if (!success) {
    console.error('Failed to update book title:', id)
  }
}

// Handle updating book status
const handleUpdateStatus = ({ id, year, month }) => {
  const success = booksStore.updateBookStatus(id, year, month)

  if (!success) {
    console.error('Failed to update book status for book:', id)
  }
}
</script>
