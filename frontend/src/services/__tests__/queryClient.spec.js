import { describe, it, expect, beforeEach, vi } from 'vitest'
import { QueryClient } from '@tanstack/vue-query'
import { queryClient, installQueryPersistence } from '../queryClient'

describe('queryClient', () => {
  beforeEach(() => {
    localStorage.clear()
    queryClient.clear()
  })

  it('exports a shared QueryClient instance', () => {
    expect(queryClient).toBeInstanceOf(QueryClient)
  })

  it('defaults reads to a couple of retries and mutations to no retry', () => {
    const defaults = queryClient.getDefaultOptions()
    expect(defaults.queries.retry).toBe(2)
    expect(defaults.mutations.retry).toBe(false)
  })

  it('persists query data to localStorage under the readtrail prefix', async () => {
    const unsubscribe = installQueryPersistence(queryClient)

    // Allow the persistence setup promise to resolve and set up subscription
    await new Promise((resolve) => setTimeout(resolve, 0))

    queryClient.setQueryData(['books'], [{ id: '1', name: 'Test' }])

    // persistQueryClient writes on the next microtask after a cache change
    await new Promise((resolve) => setTimeout(resolve, 0))

    const stored = Object.keys(localStorage).find((key) => key.startsWith('readtrail-query-cache'))
    expect(stored).toBeDefined()

    unsubscribe()
  })

  it('installQueryPersistence returns an unsubscribe function', () => {
    const unsubscribe = installQueryPersistence(queryClient)
    expect(typeof unsubscribe).toBe('function')
    unsubscribe()
  })
})
