<script setup lang="ts">
import { useDashboardFilter } from './composables/useDashboardFilter'

const { selectedMonth, monthOptions } = useDashboardFilter()
</script>

<template>
  <v-app>
    <v-app-bar color="surface" flat density="comfortable" class="border-b">
      <v-container class="d-flex align-center py-0 px-6 px-md-8" fluid>
        <v-app-bar-title class="font-weight-medium">
          <v-icon icon="mdi-view-dashboard-outline" class="mr-2 text-primary" />
          My Dashboard
        </v-app-bar-title>
        <v-spacer />
        <v-select
          v-model="selectedMonth"
          :items="monthOptions"
          item-title="title"
          item-value="value"
          density="compact"
          variant="outlined"
          hide-details
          prepend-inner-icon="mdi-calendar-month-outline"
          style="max-width: 220px"
        />
      </v-container>
    </v-app-bar>

    <v-main class="bg-background">
      <router-view />
    </v-main>
  </v-app>
</template>

<style scoped>
.border-b {
  border-bottom: 1px solid rgba(255, 255, 255, 0.06) !important;
}
</style>
