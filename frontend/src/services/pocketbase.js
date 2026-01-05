import PocketBase from 'pocketbase'

// Initialize PocketBase client with base URL from environment
const baseUrl = (import.meta.env.VITE_API_BASE_URL || '/').trim()

const pb = new PocketBase(baseUrl)

// Disable auto-cancellation to allow parallel requests
pb.autoCancellation(false)

// Note: Auth state change logging is handled in auth.js for better context

export { pb }
export default pb
