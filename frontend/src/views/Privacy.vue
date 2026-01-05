<template>
  <div class="max-w-4xl mx-auto px-4 py-8">
    <div class="bg-white shadow rounded-lg p-8">
      <h1 class="text-3xl font-bold text-gray-900 mb-6">Privacy Policy</h1>

      <div class="prose prose-sm max-w-none">
        <p class="text-gray-600 mb-6">
          <strong>Last Updated:</strong> {{ lastUpdated }}
        </p>

        <section class="mb-6">
          <h2 class="text-xl font-semibold text-gray-900 mb-3">What Information We Collect</h2>
          <p class="text-gray-700 mb-2">
            We collect only what's necessary to provide your reading tracking service:
          </p>
          <ul class="list-disc list-inside text-gray-700 space-y-1 ml-4">
            <li>Email address and securely hashed password</li>
            <li>Book titles, authors, read dates, and reading status</li>
            <li>Application preferences and settings</li>
            <li>Book cover images (URLs or uploads)</li>
          </ul>
        </section>

        <section class="mb-6">
          <h2 class="text-xl font-semibold text-gray-900 mb-3">How We Use Your Data</h2>
          <p class="text-gray-700">
            Your data powers your personal reading tracker. We use it to sync across devices,
            generate statistics, and personalize your experience. That's it—no tracking,
            no advertising, no third-party sharing.
          </p>
        </section>

        <section class="mb-6">
          <h2 class="text-xl font-semibold text-gray-900 mb-3">Security</h2>
          <p class="text-gray-700">
            Your data is protected with bcrypt password encryption, HTTPS transmission,
            and strict access controls. Only you can access your account data.
          </p>
        </section>

        <section class="mb-6">
          <h2 class="text-xl font-semibold text-gray-900 mb-3">Your Rights</h2>
          <p class="text-gray-700 mb-2">
            You have full control over your data:
          </p>
          <ul class="list-disc list-inside text-gray-700 space-y-1 ml-4">
            <li><strong>Access:</strong> View all your data anytime</li>
            <li><strong>Export:</strong> Download your complete data in JSON or CSV format</li>
            <li><strong>Delete:</strong> Permanently remove your account and all data</li>
            <li><strong>Correct:</strong> Update your information whenever needed</li>
          </ul>
          <p class="text-gray-700 mt-3">
            Exercise these rights in your
            <router-link to="/settings/account" class="text-blue-600 hover:text-blue-700 underline font-medium">
              Account Settings
            </router-link>.
          </p>
        </section>

        <section class="mb-6">
          <h2 class="text-xl font-semibold text-gray-900 mb-3">No Data Sharing</h2>
          <p class="text-gray-700">
            Your reading data is yours alone. We never sell, trade, or share it with third parties.
          </p>
        </section>

        <section class="mb-6">
          <h2 class="text-xl font-semibold text-gray-900 mb-3">Data Retention</h2>
          <p class="text-gray-700">
            We keep your data while your account is active. If you delete your account,
            all data is permanently removed within 30 days.
          </p>
        </section>

        <section class="mb-6">
          <h2 class="text-xl font-semibold text-gray-900 mb-3">Local Storage</h2>
          <p class="text-gray-700">
            We use browser local storage for offline access and faster performance.
            This data stays on your device and can be cleared through your browser settings.
          </p>
        </section>

        <section class="mb-6">
          <h2 class="text-xl font-semibold text-gray-900 mb-3">Policy Updates</h2>
          <p class="text-gray-700">
            We may update this policy occasionally. Changes will be reflected in the
            "Last Updated" date above.
          </p>
        </section>
      </div>

      <div class="mt-8 pt-6 border-t border-gray-200">
        <router-link
          to="/settings/account"
          class="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
        >
          Manage Your Data
        </router-link>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

defineOptions({
  name: 'PrivacyPage'
})

const lastUpdated = computed(() => {
  return new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
})
</script>

<style scoped>
.prose h2 {
  margin-top: 1.5rem;
  margin-bottom: 0.75rem;
}

.prose p {
  line-height: 1.625;
}
</style>
