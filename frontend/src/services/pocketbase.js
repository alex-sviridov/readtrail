import PocketBase from 'pocketbase'

// Initialize PocketBase client with base URL from environment
const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8090/api/'

// PocketBase expects the base URL without the /api/ suffix
// If VITE_API_BASE_URL includes /api/, remove it
const pbUrl = baseUrl.replace(/\/api\/?$/, '')

const pb = new PocketBase(pbUrl)

// Disable auto-cancellation to allow parallel requests
pb.autoCancellation(false)

// Note: Auth state change logging is handled in auth.js for better context

export { pb }
export default pb
