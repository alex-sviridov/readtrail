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
import { ref, h } from 'vue'
import {
  useVueTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  FlexRender
} from '@tanstack/vue-table'
import { TrashIcon } from '@heroicons/vue/24/outline'
import BookCoverModal from './BookCoverModal.vue'
import BookDateModal from './BookDateModal.vue'
import CustomBookCover from './CustomBookCover.vue'
import BookStatus from './BookStatus.vue'
import BookScore from './BookScore.vue'
import EditableText from './EditableText.vue'
import { BOOK_STATUS } from '@/constants'

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
const columns = [
  {
    accessorKey: 'coverLink',
    header: 'Cover',
    cell: ({ row }) => {
      const book = row.original
      return h('div', {
        class: 'flex items-center cursor-pointer',
        onClick: () => openCoverModal(book)
      }, [
        // Show custom cover if enabled (check attributes.customCover)
        book.attributes?.customCover
          ? h('div', { class: 'w-10 h-14 rounded shadow-sm hover:shadow-md transition-shadow overflow-hidden' }, [
              h(CustomBookCover, {
                title: book.name,
                author: book.author
              })
            ])
          : book.coverLink
            ? h('img', {
                src: book.coverLink,
                alt: book.name,
                class: 'w-10 h-14 object-cover rounded shadow-sm hover:shadow-md transition-shadow'
              })
            : h('svg', {
                class: 'w-10 h-14 text-gray-400',
                fill: 'none',
                stroke: 'currentColor',
                viewBox: '0 0 24 24'
              }, [
                h('path', {
                  'stroke-linecap': 'round',
                  'stroke-linejoin': 'round',
                  'stroke-width': '2',
                  d: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253'
                })
              ])
      ])
    },
    enableSorting: false,
    size: 80
  },
  {
    accessorKey: 'name',
    header: 'Title',
    cell: ({ row }) => {
      const book = row.original
      return h('div', { class: 'max-w-xs', onClick: (e) => e.stopPropagation() }, [
        h(EditableText, {
          value: book.name,
          as: 'h3',
          variant: 'title',
          editable: true,
          onUpdate: (title) => emit('update-title', { id: book.id, title })
        })
      ])
    },
    size: 300
  },
  {
    accessorKey: 'author',
    header: 'Author',
    cell: ({ row }) => {
      const book = row.original
      return h('div', { class: 'max-w-xs', onClick: (e) => e.stopPropagation() }, [
        h(EditableText, {
          value: book.author,
          as: 'p',
          variant: 'author',
          editable: true,
          onUpdate: (author) => emit('update-author', { id: book.id, author })
        })
      ])
    },
    size: 200
  },
  {
    accessorKey: 'year',
    header: 'Date',
    cell: ({ row }) => {
      const book = row.original
      return h(BookStatus, {
        year: book.year,
        month: book.month,
        isDateEditable: true,
        onOpenPicker: () => openDateModal(book)
      })
    },
    size: 150
  },
  {
    accessorKey: 'attributes.score',
    header: 'Score',
    cell: ({ getValue, row }) => {
      const score = getValue()
      const book = row.original

      if (book.year === null && book.month === null) {
        return h('div', { class: 'text-gray-400' }, '-')
      }

      return h(BookScore, {
        score: score || 0,
        editable: false,
        allowScoring: true
      })
    },
    size: 150
  },
  {
    accessorKey: 'attributes.isUnfinished',
    header: 'Status',
    cell: ({ getValue }) => {
      const isUnfinished = getValue()
      if (isUnfinished) {
        return h('span', {
          class: 'px-2 py-1 text-xs font-medium text-orange-700 bg-orange-100 rounded-full'
        }, 'Unfinished')
      }
      return h('span', {
        class: 'px-2 py-1 text-xs font-medium text-green-700 bg-green-100 rounded-full'
      }, 'Complete')
    },
    size: 120
  },
  {
    id: 'actions',
    header: 'Actions',
    cell: ({ row }) => {
      const book = row.original
      return h('div', { class: 'flex items-center gap-2' }, [
        h('button', {
          class: 'p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors',
          title: 'Delete book',
          onClick: (e) => {
            e.stopPropagation()
            if (confirm(`Delete "${book.name}"?`)) {
              emit('delete', book.id)
            }
          }
        }, [
          h(TrashIcon, { class: 'w-4 h-4' })
        ])
      ])
    },
    enableSorting: false,
    size: 100
  }
]

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

      // Primary sort: Always maintain To Read → In Progress → Completed order
      const aToRead = BOOK_STATUS.isToRead(a.year)
      const bToRead = BOOK_STATUS.isToRead(b.year)

      // To Read books come first
      if (aToRead && !bToRead) return -1
      if (!aToRead && bToRead) return 1

      const aInProgress = a.year === null || a.month === null
      const bInProgress = b.year === null || b.month === null

      // In-progress books come after To Read but before completed
      if (aInProgress && !bInProgress) return -1
      if (!aInProgress && bInProgress) return 1

      // Secondary sort: Within same status group, sort by the column
      if (columnId === 'year') {
        // For year column: sort by createdAt for To Read/In Progress, year/month for completed
        if (aToRead && bToRead) {
          return new Date(b.createdAt) - new Date(a.createdAt)
        }
        if (aInProgress && bInProgress) {
          return new Date(b.createdAt) - new Date(a.createdAt)
        }
        // Both completed - sort by year and month (newest first)
        if (a.year !== b.year) {
          return b.year - a.year
        }
        return b.month - a.month
      }

      // For other columns: standard comparison
      const aValue = rowA.getValue(columnId)
      const bValue = rowB.getValue(columnId)
      return aValue > bValue ? 1 : aValue < bValue ? -1 : 0
    }
  }
})
</script>
