<template>
  <div class="w-full">
    <!-- Search/Filter Input -->
    <div class="mb-4">
      <input
        v-model="globalFilter"
        type="text"
        placeholder="Search by title, author, or year..."
        class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>

    <!-- Table -->
    <div class="overflow-x-auto bg-white rounded-lg shadow">
      <table class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
          <tr>
            <th
              v-for="header in table.getFlatHeaders()"
              :key="header.id"
              class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              :class="{ 'select-none': header.column.getCanSort() }"
              @click="header.column.getToggleSortingHandler()?.($event)"
            >
              <div class="flex items-center gap-2">
                <span>{{ header.column.columnDef.header }}</span>
                <span v-if="header.column.getIsSorted()" class="text-gray-700">
                  {{ header.column.getIsSorted() === 'asc' ? '↑' : '↓' }}
                </span>
              </div>
            </th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          <tr
            v-for="row in table.getRowModel().rows"
            :key="row.id"
            class="hover:bg-gray-50 transition-colors"
          >
            <td
              v-for="cell in row.getVisibleCells()"
              :key="cell.id"
              class="px-6 py-4 whitespace-nowrap"
            >
              <FlexRender
                :render="cell.column.columnDef.cell"
                :props="cell.getContext()"
              />
            </td>
          </tr>
        </tbody>
      </table>

      <!-- Empty State -->
      <div
        v-if="table.getRowModel().rows.length === 0"
        class="text-center py-12 text-gray-500"
      >
        No books found
      </div>
    </div>

    <!-- Pagination Info -->
    <div class="mt-4 text-sm text-gray-600 text-center">
      Showing {{ table.getRowModel().rows.length }} of {{ books.length }} books
    </div>

    <!-- Modals -->
    <BookCoverModal
      :is-open="coverModalOpen"
      :book="selectedBook || {}"
      @close="coverModalOpen = false"
      @save="handleCoverSave"
    />

    <BookDateModal
      :is-open="dateModalOpen"
      :book="selectedBook || {}"
      :settings="settings"
      @close="dateModalOpen = false"
      @save="handleDateSave"
    />
  </div>
</template>

<script setup>
import { ref } from 'vue'
import {
  useVueTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  FlexRender
} from '@tanstack/vue-table'
import BookCoverModal from './BookCoverModal.vue'
import BookDateModal from './BookDateModal.vue'
import { bookPriority, compareBooksByStatusAndDate } from '@/utils/bookSorting'
import { useBooksTableColumns } from '@/composables/useBooksTableColumns'

const props = defineProps({
  books: {
    type: Array,
    required: true
  },
  settings: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['delete', 'update-cover', 'update-title', 'update-author', 'update-status'])

// Global filter state
const globalFilter = ref('')

// Modal state
const coverModalOpen = ref(false)
const dateModalOpen = ref(false)
const selectedBook = ref(null)

// Open cover modal
const openCoverModal = (book) => {
  selectedBook.value = book
  coverModalOpen.value = true
}

// Open date modal
const openDateModal = (book) => {
  selectedBook.value = book
  dateModalOpen.value = true
}

// Handle cover save
const handleCoverSave = ({ id, coverLink, customCover }) => {
  emit('update-cover', { id, coverLink, customCover })
}

// Handle date save
const handleDateSave = (data) => {
  emit('update-status', data)
}

// Column definitions
const columns = useBooksTableColumns({ emit, openCoverModal, openDateModal })

// Create table instance
const table = useVueTable({
  get data() {
    return props.books
  },
  columns,
  getCoreRowModel: getCoreRowModel(),
  getSortedRowModel: getSortedRowModel(),
  getFilteredRowModel: getFilteredRowModel(),
  state: {
    get globalFilter() {
      return globalFilter.value
    }
  },
  onGlobalFilterChange: (value) => {
    globalFilter.value = value
  },
  globalFilterFn: (row, columnId, filterValue) => {
    const search = filterValue.toLowerCase()
    const name = row.original.name?.toLowerCase() || ''
    const author = row.original.author?.toLowerCase() || ''
    const year = row.original.year ? String(row.original.year) : ''
    return name.includes(search) || author.includes(search) || year.includes(search)
  },
  initialState: {
    sorting: [
      {
        id: 'year',
        desc: true
      }
    ]
  },
  sortingFns: {
    // Custom sort function that maintains To Read → In Progress → Completed priority
    auto: (rowA, rowB, columnId) => {
      const a = rowA.original
      const b = rowB.original

      // The 'year' column uses the app-wide default ordering directly.
      if (columnId === 'year') {
        return compareBooksByStatusAndDate(a, b)
      }

      // Other columns: still respect the To Read → In Progress → Completed
      // grouping, but break ties within a group by the column's own value.
      const priorityDiff = bookPriority(a) - bookPriority(b)
      if (priorityDiff !== 0) return priorityDiff

      const aValue = rowA.getValue(columnId)
      const bValue = rowB.getValue(columnId)
      return aValue > bValue ? 1 : aValue < bValue ? -1 : 0
    }
  }
})
</script>
