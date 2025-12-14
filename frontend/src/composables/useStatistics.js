import { computed } from 'vue'

const SENTINEL_YEAR = 1900
const SENTINEL_YEAR_LATELY = 1910

export function useStatistics(books) {
  // Basic stats
  const totalBooks = computed(() => books.value.length)

  const unfinishedBooks = computed(() =>
    books.value.filter(book => book.attributes?.isUnfinished).length
  )

  const booksThisYear = computed(() => {
    const currentYear = new Date().getFullYear()
    return books.value.filter(book => book.year === currentYear).length
  })

  const inProgressBooks = computed(() =>
    books.value.filter(book => book.year === null).length
  )

  // Like/Dislike stats
  const likedBooks = computed(() =>
    books.value.filter(book => book.attributes?.score === 1).length
  )

  const dislikedBooks = computed(() =>
    books.value.filter(book => book.attributes?.score === -1).length
  )

  const likeRatio = computed(() => {
    const scored = likedBooks.value + dislikedBooks.value
    return scored === 0 ? 0 : Math.round((likedBooks.value / scored) * 100)
  })

  // Timeline data
  const timelineData = computed(() => {
    const grouped = {}

    // Group books by year-month
    books.value.forEach(book => {
      if (!book.year || !book.month) return
      if (book.year === SENTINEL_YEAR || book.year === SENTINEL_YEAR_LATELY) return

      const key = `${book.year}-${String(book.month).padStart(2, '0')}`

      if (!grouped[key]) {
        grouped[key] = { year: book.year, month: book.month, finished: 0, unfinished: 0, inProgress: 0 }
      }

      if (book.attributes?.isUnfinished) {
        grouped[key].unfinished++
      } else {
        grouped[key].finished++
      }
    })

    const entries = Object.values(grouped).sort((a, b) =>
      a.year !== b.year ? a.year - b.year : a.month - b.month
    )

    if (entries.length === 0) return []

    // Fill empty months
    const result = []
    const first = entries[0]
    const last = entries[entries.length - 1]
    let currentYear = first.year
    let currentMonth = first.month

    while (currentYear < last.year || (currentYear === last.year && currentMonth <= last.month)) {
      const key = `${currentYear}-${String(currentMonth).padStart(2, '0')}`
      const existing = grouped[key]

      result.push({
        year: currentYear,
        month: currentMonth,
        finished: existing?.finished || 0,
        unfinished: existing?.unfinished || 0,
        inProgress: existing?.inProgress || 0,
        total: existing
          ? existing.finished + existing.unfinished * 0.5 + (existing.inProgress || 0) * 0.5
          : 0
      })

      currentMonth++
      if (currentMonth > 12) {
        currentMonth = 1
        currentYear++
      }
    }

    return result
  })

  return {
    totalBooks,
    unfinishedBooks,
    booksThisYear,
    inProgressBooks,
    likedBooks,
    dislikedBooks,
    likeRatio,
    timelineData
  }
}
