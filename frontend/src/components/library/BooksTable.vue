<template>
  <div class="w-full">
    <!-- Search/Filter Input -->
    <div class="mb-4">
      <input
        v-model="globalFilter"
        type="text"
        placeholder="Search books by title or author..."
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
import { TrashIcon, PencilIcon } from '@heroicons/vue/24/outline'
import BookCoverModal from './BookCoverModal.vue'
import BookDateModal from './BookDateModal.vue'
import CustomBookCover from './CustomBookCover.vue'

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

// Editing state
const editingCell = ref(null)
const editingValue = ref('')

// Start inline editing
const startEdit = (bookId, field, currentValue) => {
  editingCell.value = `${bookId}-${field}`
  editingValue.value = currentValue || ''
}

// Save inline edit
const saveEdit = (bookId, field) => {
  if (editingValue.value === '') return

  if (field === 'title') {
    emit('update-title', { id: bookId, title: editingValue.value })
  } else if (field === 'author') {
    emit('update-author', { id: bookId, author: editingValue.value })
  }

  editingCell.value = null
  editingValue.value = ''
}

// Cancel inline edit
const cancelEdit = () => {
  editingCell.value = null
  editingValue.value = ''
}

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
        // Show custom cover if enabled
        book.customCover
          ? h('div', { class: 'w-10 h-14 rounded shadow-sm hover:shadow-md transition-shadow overflow-hidden' }, [
              h(CustomBookCover, {
                title: book.name,
                author: book.author
              })
            ])
          : h('img', {
              src: book.coverLink || 'https://via.placeholder.com/40x60?text=No+Cover',
              alt: book.name,
              class: 'w-10 h-14 object-cover rounded shadow-sm hover:shadow-md transition-shadow',
              onerror: (e) => {
                e.target.src = 'https://via.placeholder.com/40x60?text=No+Cover'
              }
            })
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
      const cellId = `${book.id}-title`
      const isEditing = editingCell.value === cellId

      if (isEditing) {
        return h('input', {
          type: 'text',
          value: editingValue.value,
          class: 'w-full px-2 py-1 border border-blue-500 rounded focus:outline-none focus:ring-2 focus:ring-blue-500',
          onInput: (e) => { editingValue.value = e.target.value },
          onBlur: () => saveEdit(book.id, 'title'),
          onKeydown: (e) => {
            if (e.key === 'Enter') {
              saveEdit(book.id, 'title')
            } else if (e.key === 'Escape') {
              cancelEdit()
            }
          },
          onClick: (e) => e.stopPropagation()
        })
      }

      return h('div', {
        class: 'font-medium text-gray-900 max-w-xs truncate cursor-pointer hover:text-blue-600 group flex items-center gap-2',
        onClick: () => startEdit(book.id, 'title', book.name)
      }, [
        h('span', {}, book.name),
        h(PencilIcon, {
          class: 'w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity'
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
      const cellId = `${book.id}-author`
      const isEditing = editingCell.value === cellId

      if (isEditing) {
        return h('input', {
          type: 'text',
          value: editingValue.value,
          class: 'w-full px-2 py-1 border border-blue-500 rounded focus:outline-none focus:ring-2 focus:ring-blue-500',
          onInput: (e) => { editingValue.value = e.target.value },
          onBlur: () => saveEdit(book.id, 'author'),
          onKeydown: (e) => {
            if (e.key === 'Enter') {
              saveEdit(book.id, 'author')
            } else if (e.key === 'Escape') {
              cancelEdit()
            }
          },
          onClick: (e) => e.stopPropagation()
        })
      }

      return h('div', {
        class: 'text-gray-600 max-w-xs truncate cursor-pointer hover:text-blue-600 group flex items-center gap-2',
        onClick: () => startEdit(book.id, 'author', book.author)
      }, [
        h('span', {}, book.author || '-'),
        h(PencilIcon, {
          class: 'w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity'
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

      if (book.year === null && book.month === null) {
        return h('div', {
          class: 'text-gray-500 italic cursor-pointer hover:text-blue-600',
          onClick: () => openDateModal(book)
        }, 'In Progress')
      }

      const monthName = book.month ? new Date(2000, book.month - 1, 1).toLocaleString('default', { month: 'short' }) : ''
      const dateStr = `${monthName} ${book.year}`

      return h('div', {
        class: 'text-gray-700 cursor-pointer hover:text-blue-600 flex items-center gap-2 group',
        onClick: () => openDateModal(book)
      }, [
        h('span', {}, dateStr),
        h(PencilIcon, {
          class: 'w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity'
        })
      ])
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

      if (!score || score === null || score === 0) {
        return h('div', { class: 'text-gray-400' }, '')
      }

      // Thumb down (-1)
      if (score === -1) {
        return h('div', {
          class: 'w-6 h-6 rounded-full bg-red-500 flex items-center justify-center shadow-md',
          title: 'Dislike'
        }, [
          h('span', { class: 'text-white text-sm' }, '👎')
        ])
      }

      // Thumb up (+1)
      if (score === 1) {
        return h('div', {
          class: 'w-6 h-6 rounded-full bg-green-500 flex items-center justify-center shadow-md',
          title: 'Like'
        }, [
          h('span', { class: 'text-white text-sm' }, '👍')
        ])
      }

      return h('div', { class: 'text-gray-400' }, 'Not rated')
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
    return name.includes(search) || author.includes(search)
  },
  initialState: {
    sorting: [
      {
        id: 'year',
        desc: true
      }
    ]
  }
})
</script>
