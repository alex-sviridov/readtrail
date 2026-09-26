import { describe, it, expect, vi } from 'vitest'
import { useBooksTableColumns } from '../useBooksTableColumns'
import CustomBookCover from '@/components/library/CustomBookCover.vue'

describe('useBooksTableColumns', () => {
  const book = {
    id: '1',
    name: 'The Ballad of Songbirds and Snakes',
    author: 'Suzanne Collins',
    attributes: { customCover: true }
  }

  function makeColumns() {
    return useBooksTableColumns({ emit: vi.fn(), openCoverModal: vi.fn(), openDateModal: vi.fn() })
  }

  it('renders the generated cover in compact size for the row thumbnail', () => {
    const coverColumn = makeColumns().find((c) => c.accessorKey === 'coverLink')

    const vnode = coverColumn.cell({ row: { original: book } })
    const thumbnailWrapper = vnode.children[0]
    const coverVNode = thumbnailWrapper.children[0]

    expect(coverVNode.type).toBe(CustomBookCover)
    expect(coverVNode.props.size).toBe('compact')
    expect(coverVNode.props.title).toBe(book.name)
    expect(coverVNode.props.author).toBe(book.author)
  })
})
