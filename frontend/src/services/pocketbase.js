import PocketBase from 'pocketbase'

// The API is always reached same-origin (through the bundled nginx in the
// all-in-one image, or through the shared ingress in k8s), so the SDK's
// base URL is always the relative root — it appends `api/...` itself.
const pb = new PocketBase('/')

// Disable auto-cancellation to allow parallel requests
pb.autoCancellation(false)

// Note: Auth state change logging is handled in auth.js for better context

export { pb }
export default pb
