<script setup lang="ts">
import { computed } from 'vue'
import { Line } from 'vue-chartjs'
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Filler,
} from 'chart.js'
import type { ChartData, ChartOptions } from 'chart.js'
import { useDashboardFilter } from '../composables/useDashboardFilter'

ChartJS.register(
  Title,
  Tooltip,
  Legend,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Filler,
)

const {
  metrics,
  isAll,
  selectedIndex,
  selectedMetric,
  previousMetric,
} = useDashboardFilter()

// Cohesive palette
const palette = {
  revenue: '#7c4dff',
  visitors: '#4dd0e1',
  conversions: '#ffb74d',
  orders: '#81c784',
  grid: 'rgba(255,255,255,0.06)',
  ticks: 'rgba(255,255,255,0.6)',
  highlight: '#ffffff',
}

// Formatters
const fmtCurrency = (n: number) =>
  n.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  })
const fmtNumber = (n: number) => n.toLocaleString('en-US')
const fmtPct = (n: number) => `${n.toFixed(1)}%`

// Yearly aggregates
const yearRevenue = computed(() => metrics.reduce((s, m) => s + m.revenue, 0))
const yearVisitors = computed(() => metrics.reduce((s, m) => s + m.visitors, 0))
const yearOrders = computed(() => metrics.reduce((s, m) => s + m.orders, 0))
const avgConversions = computed(
  () => metrics.reduce((s, m) => s + m.conversions, 0) / metrics.length,
)

function pctDelta(current: number, previous: number) {
  if (!previous) return 0
  return ((current - previous) / previous) * 100
}

interface SummaryCard {
  key: 'revenue' | 'visitors' | 'conversions' | 'orders'
  title: string
  icon: string
  color: string
  value: string
  delta: number | null
  deltaLabel: string
}

const summaryCards = computed<SummaryCard[]>(() => {
  if (isAll.value) {
    return [
      {
        key: 'revenue',
        title: 'Revenue',
        icon: 'mdi-cash-multiple',
        color: palette.revenue,
        value: fmtCurrency(yearRevenue.value),
        delta: null,
        deltaLabel: 'Total for 2025',
      },
      {
        key: 'visitors',
        title: 'Visitors',
        icon: 'mdi-account-group-outline',
        color: palette.visitors,
        value: fmtNumber(yearVisitors.value),
        delta: null,
        deltaLabel: 'Total for 2025',
      },
      {
        key: 'conversions',
        title: 'Conversions',
        icon: 'mdi-swap-horizontal-bold',
        color: palette.conversions,
        value: fmtPct(avgConversions.value),
        delta: null,
        deltaLabel: 'Average for 2025',
      },
      {
        key: 'orders',
        title: 'Orders',
        icon: 'mdi-cart-outline',
        color: palette.orders,
        value: fmtNumber(yearOrders.value),
        delta: null,
        deltaLabel: 'Total for 2025',
      },
    ]
  }

  const cur = selectedMetric.value!
  const prev = previousMetric.value

  const build = (
    key: SummaryCard['key'],
    title: string,
    icon: string,
    color: string,
    value: string,
    curVal: number,
  ): SummaryCard => ({
    key,
    title,
    icon,
    color,
    value,
    delta: prev ? pctDelta(curVal, prev[key]) : null,
    deltaLabel: prev ? 'vs previous month' : 'First month',
  })

  return [
    build(
      'revenue',
      'Revenue',
      'mdi-cash-multiple',
      palette.revenue,
      fmtCurrency(cur.revenue),
      cur.revenue,
    ),
    build(
      'visitors',
      'Visitors',
      'mdi-account-group-outline',
      palette.visitors,
      fmtNumber(cur.visitors),
      cur.visitors,
    ),
    build(
      'conversions',
      'Conversions',
      'mdi-swap-horizontal-bold',
      palette.conversions,
      fmtPct(cur.conversions),
      cur.conversions,
    ),
    build(
      'orders',
      'Orders',
      'mdi-cart-outline',
      palette.orders,
      fmtNumber(cur.orders),
      cur.orders,
    ),
  ]
})

// Highlight the selected month on the charts
const pointRadius = (ctx: { dataIndex: number }) =>
  !isAll.value && ctx.dataIndex === selectedIndex.value ? 7 : 3
const pointBorder = (color: string) => (ctx: { dataIndex: number }) =>
  !isAll.value && ctx.dataIndex === selectedIndex.value
    ? palette.highlight
    : color

const labels = computed(() => metrics.map((m) => m.label))

const revenueChart = computed<ChartData<'line'>>(() => ({
  labels: labels.value,
  datasets: [
    {
      label: 'Revenue',
      data: metrics.map((m) => m.revenue),
      borderColor: palette.revenue,
      backgroundColor: 'rgba(124,77,255,0.15)',
      pointBackgroundColor: palette.revenue,
      pointBorderColor: pointBorder(palette.revenue),
      pointRadius,
      pointHoverRadius: 8,
      tension: 0.35,
      borderWidth: 2,
      fill: false,
    },
  ],
}))

const visitorsChart = computed<ChartData<'line'>>(() => ({
  labels: labels.value,
  datasets: [
    {
      label: 'Visitors',
      data: metrics.map((m) => m.visitors),
      borderColor: palette.visitors,
      backgroundColor: 'rgba(77,208,225,0.15)',
      pointBackgroundColor: palette.visitors,
      pointBorderColor: pointBorder(palette.visitors),
      pointRadius,
      pointHoverRadius: 8,
      tension: 0.35,
      borderWidth: 2,
      fill: false,
    },
  ],
}))

const conversionsChart = computed<ChartData<'line'>>(() => ({
  labels: labels.value,
  datasets: [
    {
      label: 'Conversions',
      data: metrics.map((m) => m.conversions),
      borderColor: palette.conversions,
      backgroundColor: 'rgba(255,183,77,0.20)',
      pointBackgroundColor: palette.conversions,
      pointBorderColor: pointBorder(palette.conversions),
      pointRadius,
      pointHoverRadius: 8,
      tension: 0.35,
      borderWidth: 2,
      fill: true,
    },
  ],
}))

function baseOptions(yFormatter: (v: number) => string): ChartOptions<'line'> {
  return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { intersect: false, mode: 'index' },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#1f2028',
        borderColor: 'rgba(255,255,255,0.1)',
        borderWidth: 1,
        callbacks: {
          label: (ctx) =>
            `${ctx.dataset.label}: ${yFormatter(Number(ctx.parsed.y ?? 0))}`,
        },
      },
    },
    scales: {
      x: {
        grid: { color: palette.grid },
        ticks: { color: palette.ticks },
      },
      y: {
        grid: { color: palette.grid },
        ticks: {
          color: palette.ticks,
          callback: (v) => yFormatter(Number(v)),
        },
      },
    },
  }
}

const revenueOptions = computed(() => baseOptions(fmtCurrency))
const visitorsOptions = computed(() => baseOptions(fmtNumber))
const conversionsOptions = computed(() => baseOptions(fmtPct))
</script>

<template>
  <v-container fluid class="pa-6 pa-md-8">
    <v-row>
      <!-- Summary cards -->
      <v-col
        v-for="card in summaryCards"
        :key="card.key"
        cols="12"
        sm="6"
        md="3"
      >
        <v-card color="surface" class="pa-5 h-100 dash-card">
          <div class="d-flex align-center justify-space-between mb-3">
            <span class="text-caption text-medium-emphasis text-uppercase">
              {{ card.title }}
            </span>
            <v-icon :color="card.color" :icon="card.icon" size="22" />
          </div>
          <div class="text-h4 font-weight-bold mb-2">{{ card.value }}</div>
          <div class="d-flex align-center text-caption text-medium-emphasis">
            <template v-if="card.delta !== null">
              <v-icon
                :icon="
                  card.delta >= 0
                    ? 'mdi-arrow-top-right'
                    : 'mdi-arrow-bottom-right'
                "
                :color="card.delta >= 0 ? 'success' : 'error'"
                size="16"
                class="mr-1"
              />
              <span
                :class="card.delta >= 0 ? 'text-success' : 'text-error'"
                class="font-weight-medium mr-1"
              >
                {{ card.delta >= 0 ? '+' : '' }}{{ card.delta.toFixed(1) }}%
              </span>
              <span>{{ card.deltaLabel }}</span>
            </template>
            <template v-else>
              <span>{{ card.deltaLabel }}</span>
            </template>
          </div>
        </v-card>
      </v-col>

      <!-- Revenue chart -->
      <v-col cols="12" md="6">
        <v-card color="surface" class="pa-5 h-100 dash-card">
          <div class="d-flex align-center mb-4">
            <v-icon icon="mdi-cash-multiple" color="#7c4dff" class="mr-2" />
            <span class="text-subtitle-1 font-weight-medium">
              Monthly Revenue
            </span>
          </div>
          <div style="height: 280px">
            <Line :data="revenueChart" :options="revenueOptions" />
          </div>
        </v-card>
      </v-col>

      <!-- Visitors chart -->
      <v-col cols="12" md="6">
        <v-card color="surface" class="pa-5 h-100 dash-card">
          <div class="d-flex align-center mb-4">
            <v-icon
              icon="mdi-account-group-outline"
              color="#4dd0e1"
              class="mr-2"
            />
            <span class="text-subtitle-1 font-weight-medium">
              Visitors Over Time
            </span>
          </div>
          <div style="height: 280px">
            <Line :data="visitorsChart" :options="visitorsOptions" />
          </div>
        </v-card>
      </v-col>

      <!-- Full-width conversions area chart -->
      <v-col cols="12">
        <v-card color="surface" class="pa-5 dash-card">
          <div class="d-flex align-center mb-4">
            <v-icon
              icon="mdi-swap-horizontal-bold"
              color="#ffb74d"
              class="mr-2"
            />
            <span class="text-subtitle-1 font-weight-medium">
              Conversions Trend
            </span>
          </div>
          <div style="height: 280px">
            <Line :data="conversionsChart" :options="conversionsOptions" />
          </div>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<style scoped>
.dash-card {
  border: 1px solid rgba(255, 255, 255, 0.05);
}
</style>
