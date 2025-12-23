import { describe, it, expect } from 'vitest'
import { ApiError, adaptPocketBaseError } from '../errors'

describe('errors', () => {
  describe('ApiError', () => {
    it('should create an ApiError with message and status', () => {
      const error = new ApiError('Test error', 404)

      expect(error.message).toBe('Test error')
      expect(error.status).toBe(404)
      expect(error.name).toBe('ApiError')
      expect(error.data).toBeNull()
    })

    it('should create an ApiError with data', () => {
      const data = { field: 'username', error: 'already exists' }
      const error = new ApiError('Validation error', 400, data)

      expect(error.status).toBe(400)
      expect(error.data).toEqual(data)
    })

    it('should be an instance of Error', () => {
      const error = new ApiError('Test', 500)
      expect(error).toBeInstanceOf(Error)
      expect(error).toBeInstanceOf(ApiError)
    })

    describe('isNetworkError', () => {
      it('should return true for status 0', () => {
        const error = new ApiError('Network error', 0)
        expect(error.isNetworkError()).toBe(true)
      })

      it('should return false for non-zero status', () => {
        const error = new ApiError('Not found', 404)
        expect(error.isNetworkError()).toBe(false)
      })
    })

    describe('isUnauthorized', () => {
      it('should return true for status 401', () => {
        const error = new ApiError('Unauthorized', 401)
        expect(error.isUnauthorized()).toBe(true)
      })

      it('should return false for other statuses', () => {
        const error = new ApiError('Forbidden', 403)
        expect(error.isUnauthorized()).toBe(false)
      })
    })

    describe('isNotFound', () => {
      it('should return true for status 404', () => {
        const error = new ApiError('Not found', 404)
        expect(error.isNotFound()).toBe(true)
      })

      it('should return false for other statuses', () => {
        const error = new ApiError('Bad request', 400)
        expect(error.isNotFound()).toBe(false)
      })
    })

    describe('isConflict', () => {
      it('should return true for status 409', () => {
        const error = new ApiError('Conflict', 409)
        expect(error.isConflict()).toBe(true)
      })

      it('should return false for other statuses', () => {
        const error = new ApiError('Bad request', 400)
        expect(error.isConflict()).toBe(false)
      })
    })

    describe('isServerError', () => {
      it('should return true for 500 status', () => {
        const error = new ApiError('Internal server error', 500)
        expect(error.isServerError()).toBe(true)
      })

      it('should return true for 502 status', () => {
        const error = new ApiError('Bad gateway', 502)
        expect(error.isServerError()).toBe(true)
      })

      it('should return true for 503 status', () => {
        const error = new ApiError('Service unavailable', 503)
        expect(error.isServerError()).toBe(true)
      })

      it('should return false for 4xx statuses', () => {
        const error = new ApiError('Bad request', 400)
        expect(error.isServerError()).toBe(false)
      })

      it('should return false for 3xx statuses', () => {
        const error = new ApiError('Redirect', 301)
        expect(error.isServerError()).toBe(false)
      })
    })
  })

  describe('adaptPocketBaseError', () => {
    it('should return ApiError as-is if already ApiError', () => {
      const original = new ApiError('Test error', 404)
      const adapted = adaptPocketBaseError(original)

      expect(adapted).toBe(original)
      expect(adapted.message).toBe('Test error')
      expect(adapted.status).toBe(404)
    })

    it('should adapt PocketBase ClientResponseError', () => {
      const pbError = {
        name: 'ClientResponseError',
        status: 400,
        message: 'Validation failed',
        response: { field: 'email', error: 'invalid' }
      }

      const adapted = adaptPocketBaseError(pbError)

      expect(adapted).toBeInstanceOf(ApiError)
      expect(adapted.message).toBe('Validation failed')
      expect(adapted.status).toBe(400)
      expect(adapted.data).toEqual({ field: 'email', error: 'invalid' })
    })

    it('should handle ClientResponseError with data property', () => {
      const pbError = {
        name: 'ClientResponseError',
        status: 400,
        message: 'Error',
        data: { some: 'data' }
      }

      const adapted = adaptPocketBaseError(pbError)

      expect(adapted.data).toEqual({ some: 'data' })
    })

    it('should handle ClientResponseError without message', () => {
      const pbError = {
        name: 'ClientResponseError',
        status: 500
      }

      const adapted = adaptPocketBaseError(pbError)

      expect(adapted.message).toBe('Request failed with status 500')
      expect(adapted.status).toBe(500)
    })

    it('should handle ClientResponseError without status', () => {
      const pbError = {
        name: 'ClientResponseError',
        message: 'Unknown error'
      }

      const adapted = adaptPocketBaseError(pbError)

      expect(adapted.status).toBe(0)
      expect(adapted.message).toBe('Unknown error')
    })

    it('should detect "Failed to fetch" as network error', () => {
      const error = new Error('Failed to fetch')

      const adapted = adaptPocketBaseError(error)

      expect(adapted.message).toContain('Network error')
      expect(adapted.status).toBe(0)
      expect(adapted.isNetworkError()).toBe(true)
    })

    it('should detect "NetworkError" as network error', () => {
      const error = new Error('NetworkError when attempting to fetch resource')

      const adapted = adaptPocketBaseError(error)

      expect(adapted.message).toContain('Network error')
      expect(adapted.status).toBe(0)
    })

    it('should detect "Network request failed" as network error', () => {
      const error = new Error('Network request failed')

      const adapted = adaptPocketBaseError(error)

      expect(adapted.message).toContain('Network error')
      expect(adapted.status).toBe(0)
    })

    it('should detect timeout error by message', () => {
      const error = new Error('Request timeout after 30s')

      const adapted = adaptPocketBaseError(error)

      expect(adapted.message).toContain('timed out')
      expect(adapted.status).toBe(0)
    })

    it('should detect timeout error by name', () => {
      const error = new Error('Operation too slow')
      error.name = 'TimeoutError'

      const adapted = adaptPocketBaseError(error)

      expect(adapted.message).toContain('timed out')
      expect(adapted.status).toBe(0)
    })

    it('should detect AbortError', () => {
      const error = new Error('The operation was aborted')
      error.name = 'AbortError'

      const adapted = adaptPocketBaseError(error)

      expect(adapted.message).toBe('Request cancelled')
      expect(adapted.status).toBe(0)
    })

    it('should handle generic Error with message', () => {
      const error = new Error('Something went wrong')

      const adapted = adaptPocketBaseError(error)

      expect(adapted).toBeInstanceOf(ApiError)
      expect(adapted.message).toBe('Something went wrong')
      expect(adapted.status).toBe(0)
    })

    it('should handle Error without message', () => {
      const error = new Error()

      const adapted = adaptPocketBaseError(error)

      expect(adapted.message).toBe('An unexpected error occurred')
      expect(adapted.status).toBe(0)
    })

    it('should handle non-Error objects with message', () => {
      const error = { message: 'Custom error object' }

      const adapted = adaptPocketBaseError(error)

      expect(adapted.message).toBe('Custom error object')
      expect(adapted.status).toBe(0)
    })

    it('should handle errors without any message', () => {
      const error = {}

      const adapted = adaptPocketBaseError(error)

      expect(adapted.message).toBe('An unexpected error occurred')
      expect(adapted.status).toBe(0)
    })

    it('should preserve error classification after adaptation', () => {
      const pbError = {
        name: 'ClientResponseError',
        status: 401,
        message: 'Unauthorized'
      }

      const adapted = adaptPocketBaseError(pbError)

      expect(adapted.isUnauthorized()).toBe(true)
      expect(adapted.isNetworkError()).toBe(false)
      expect(adapted.isServerError()).toBe(false)
    })

    it('should classify server errors correctly after adaptation', () => {
      const pbError = {
        name: 'ClientResponseError',
        status: 503,
        message: 'Service unavailable'
      }

      const adapted = adaptPocketBaseError(pbError)

      expect(adapted.isServerError()).toBe(true)
    })
  })
})
