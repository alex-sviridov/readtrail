<script setup>
import { storeToRefs } from 'pinia'
import { useBooksStore } from '@/stores/books'
import { useStatistics } from '@/composables/useStatistics'
import StatCard from '@/components/statistics/StatCard.vue'
import TimelineChart from '@/components/statistics/TimelineChart.vue'

defineOptions({
  name: 'StatisticsPage'
})

const { books } = storeToRefs(useBooksStore())
const stats = useStatistics(books)
</script>

<template>
  <div class="container mx-auto px-4 py-8 max-w-7xl">
    <div class="mb-8">
      <h1 class="text-3xl font-bold text-gray-900">Statistics</h1>
      <p class="text-gray-600 mt-2">Your reading insights and analytics</p>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <StatCard
        title="Total Books"
        :value="`${stats.totalBooks.value - stats.unfinishedBooks.value} read, ${stats.unfinishedBooks.value} dropped`"
      />
      <StatCard title="Books This Year" :value="stats.booksThisYear.value" />
      <StatCard title="In Progress" :value="stats.inProgressBooks.value" />
      <StatCard
        title="Like Ratio"
        :value="`${stats.likeRatio.value}%`"
        :subtitle="`${stats.likedBooks.value} liked, ${stats.dislikedBooks.value} disliked`"
      />
    </div>

    <TimelineChart :data="stats.timelineData.value" class="mt-8" />
  </div>
</template>
