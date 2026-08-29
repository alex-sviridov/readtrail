import { h } from 'vue'
import { TrashIcon } from '@heroicons/vue/24/outline'
import CustomBookCover from '@/components/library/CustomBookCover.vue'
import BookStatus from '@/components/library/BookStatus.vue'
import BookScore from '@/components/library/BookScore.vue'
import EditableText from '@/components/library/EditableText.vue'

/**
 * Column definitions for BooksTable's TanStack table instance. Kept
 * separate from the table's own state/modal wiring so the cell-rendering
 * detail doesn't crowd out that logic.
 */
export function useBooksTableColumns({ emit, openCoverModal, openDateModal }) {
  return [
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
}
