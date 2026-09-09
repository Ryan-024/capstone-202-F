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
import {
  useDashboardFilter,
  totalShipments,
  totalRevenue,
} from '../composables/useDashboardFilter'

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
  onTime: '#4dd0e1',
  shipments: '#ffb74d',
  exceptions: '#ef5350',
  ltl: '#7c4dff',
  ftl: '#4dd0e1',
  parcel: '#ffb74d',
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
const yearRevenue = computed(() =>
  metrics.reduce((s, m) => s + totalRevenue(m), 0),
)
const yearShipments = computed(() =>
  metrics.reduce((s, m) => s + totalShipments(m), 0),
)
const yearExceptions = computed(() =>
  metrics.reduce((s, m) => s + m.openExceptions.length, 0),
)
const avgOnTime = computed(
  () =>
    metrics.reduce((s, m) => s + m.onTimeDeliveryRate, 0) / metrics.length,
)

function pctDelta(current: number, previous: number) {
  if (!previous) return 0
  return ((current - previous) / previous) * 100
}

type CardKey = 'shipments' | 'onTime' | 'regional' | 'exceptions'

interface SummaryCard {
  key: CardKey
  title: string
  icon: string
  color: string
  value: string
  delta: number | null
  deltaLabel: string
  // For "delta good when down" (like exceptions), invert coloring
  invertDelta?: boolean
}

const cardMeta: Record<
  CardKey,
  { title: string; icon: string; color: string; invertDelta?: boolean }
> = {
  shipments: {
    title: 'Shipment Volume',
    icon: 'mdi-truck-fast-outline',
    color: palette.shipments,
  },
  onTime: {
    title: 'On-Time Delivery',
    icon: 'mdi-clock-check-outline',
    color: palette.onTime,
  },
  regional: {
    title: 'Regional Performance',
    icon: 'mdi-map-outline',
    color: palette.revenue,
  },
  exceptions: {
    title: 'Open Exceptions',
    icon: 'mdi-alert-octagon-outline',
    color: palette.exceptions,
    invertDelta: true,
  },
}

const summaryCards = computed<SummaryCard[]>(() => {
  if (isAll.value) {
    return [
      {
        key: 'shipments',
        ...cardMeta.shipments,
        value: fmtNumber(yearShipments.value),
        delta: null,
        deltaLabel: 'Total for 2025',
      },
      {
        key: 'onTime',
        ...cardMeta.onTime,
        value: fmtPct(avgOnTime.value),
        delta: null,
        deltaLabel: 'Average for 2025',
      },
      {
        key: 'regional',
        ...cardMeta.regional,
        value: fmtCurrency(yearRevenue.value),
        delta: null,
        deltaLabel: 'Total regional revenue',
      },
      {
        key: 'exceptions',
        ...cardMeta.exceptions,
        value: fmtNumber(yearExceptions.value),
        delta: null,
        deltaLabel: 'Total for 2025',
      },
    ]
  }

  const cur = selectedMetric.value!
  const prev = previousMetric.value

  const curVals: Record<CardKey, number> = {
    shipments: totalShipments(cur),
    onTime: cur.onTimeDeliveryRate,
    regional: totalRevenue(cur),
    exceptions: cur.openExceptions.length,
  }
  const prevVals: Record<CardKey, number> | null = prev
    ? {
        shipments: totalShipments(prev),
        onTime: prev.onTimeDeliveryRate,
        regional: totalRevenue(prev),
        exceptions: prev.openExceptions.length,
      }
    : null

  const formatters: Record<CardKey, (n: number) => string> = {
    shipments: fmtNumber,
    onTime: fmtPct,
    regional: fmtCurrency,
    exceptions: fmtNumber,
  }

  return (Object.keys(cardMeta) as CardKey[]).map((key) => ({
    key,
    ...cardMeta[key],
    value: formatters[key](curVals[key]),
    delta: prevVals ? pctDelta(curVals[key], prevVals[key]) : null,
    deltaLabel: prevVals ? 'vs previous month' : 'First month',
  }))
})

// Highlight the selected month on the charts
const pointRadius = (ctx: { dataIndex: number }) =>
  !isAll.value && ctx.dataIndex === selectedIndex.value ? 7 : 3
const pointBorder = (color: string) => (ctx: { dataIndex: number }) =>
  !isAll.value && ctx.dataIndex === selectedIndex.value
    ? palette.highlight
    : color

const labels = computed(() => metrics.map((m) => m.label))

const shipmentsChart = computed<ChartData<'line'>>(() => ({
  labels: labels.value,
  datasets: [
    {
      label: 'Total Shipments',
      data: metrics.map((m) => totalShipments(m)),
      borderColor: palette.shipments,
      backgroundColor: 'rgba(255,183,77,0.15)',
      pointBackgroundColor: palette.shipments,
      pointBorderColor: pointBorder(palette.shipments),
      pointRadius,
      pointHoverRadius: 8,
      tension: 0.35,
      borderWidth: 2,
      fill: false,
    },
  ],
}))

const onTimeChart = computed<ChartData<'line'>>(() => ({
  labels: labels.value,
  datasets: [
    {
      label: 'On-Time Delivery Rate',
      data: metrics.map((m) => m.onTimeDeliveryRate),
      borderColor: palette.onTime,
      backgroundColor: 'rgba(77,208,225,0.15)',
      pointBackgroundColor: palette.onTime,
      pointBorderColor: pointBorder(palette.onTime),
      pointRadius,
      pointHoverRadius: 8,
      tension: 0.35,
      borderWidth: 2,
      fill: false,
    },
  ],
}))

const exceptionsChart = computed<ChartData<'line'>>(() => ({
  labels: labels.value,
  datasets: [
    {
      label: 'Open Exceptions',
      data: metrics.map((m) => m.openExceptions.length),
      borderColor: palette.exceptions,
      backgroundColor: 'rgba(239,83,80,0.20)',
      pointBackgroundColor: palette.exceptions,
      pointBorderColor: pointBorder(palette.exceptions),
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

const shipmentsOptions = computed(() => baseOptions(fmtNumber))
const onTimeOptions = computed(() => baseOptions(fmtPct))
const exceptionsOptions = computed(() => baseOptions(fmtNumber))

// Regional performance summary — averaged/summed across selection
interface RegionRow {
  region: string
  shipments: number
  onTimeRate: number
  revenue: number
}

const regionalView = computed<RegionRow[]>(() => {
  const source = isAll.value
    ? metrics
    : selectedMetric.value
      ? [selectedMetric.value]
      : []
  if (source.length === 0) return []
  const regions: Array<{ key: 'west' | 'central' | 'east'; label: string }> = [
    { key: 'west', label: 'West' },
    { key: 'central', label: 'Central' },
    { key: 'east', label: 'East' },
  ]
  return regions.map((r) => {
    const shipments = source.reduce(
      (s, m) => s + m.regionalPerformance[r.key].shipments,
      0,
    )
    const revenue = source.reduce(
      (s, m) => s + m.regionalPerformance[r.key].revenue,
      0,
    )
    const onTimeRate =
      source.reduce(
        (s, m) => s + m.regionalPerformance[r.key].onTimeRate,
        0,
      ) / source.length
    return {
      region: r.label,
      shipments,
      onTimeRate,
      revenue,
    }
  })
})
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
                :color="
                  (card.invertDelta ? card.delta <= 0 : card.delta >= 0)
                    ? 'success'
                    : 'error'
                "
                size="16"
                class="mr-1"
              />
              <span
                :class="
                  (card.invertDelta ? card.delta <= 0 : card.delta >= 0)
                    ? 'text-success'
                    : 'text-error'
                "
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

      <!-- Shipment volume chart -->
      <v-col cols="12" md="6">
        <v-card color="surface" class="pa-5 h-100 dash-card">
          <div class="d-flex align-center mb-4">
            <v-icon
              icon="mdi-truck-fast-outline"
              color="#ffb74d"
              class="mr-2"
            />
            <span class="text-subtitle-1 font-weight-medium">
              Monthly Shipment Volume
            </span>
          </div>
          <div style="height: 280px">
            <Line :data="shipmentsChart" :options="shipmentsOptions" />
          </div>
        </v-card>
      </v-col>

      <!-- On-Time Delivery chart -->
      <v-col cols="12" md="6">
        <v-card color="surface" class="pa-5 h-100 dash-card">
          <div class="d-flex align-center mb-4">
            <v-icon
              icon="mdi-clock-check-outline"
              color="#4dd0e1"
              class="mr-2"
            />
            <span class="text-subtitle-1 font-weight-medium">
              On-Time Delivery Rate
            </span>
          </div>
          <div style="height: 280px">
            <Line :data="onTimeChart" :options="onTimeOptions" />
          </div>
        </v-card>
      </v-col>

      <!-- Full-width open exceptions area chart -->
      <v-col cols="12">
        <v-card color="surface" class="pa-5 dash-card">
          <div class="d-flex align-center mb-4">
            <v-icon
              icon="mdi-alert-octagon-outline"
              color="#ef5350"
              class="mr-2"
            />
            <span class="text-subtitle-1 font-weight-medium">
              Open Exceptions Trend
            </span>
          </div>
          <div style="height: 280px">
            <Line :data="exceptionsChart" :options="exceptionsOptions" />
          </div>
        </v-card>
      </v-col>

      <!-- Full-width regional performance table -->
      <v-col cols="12">
        <v-card color="surface" class="pa-5 dash-card">
          <div class="d-flex align-center mb-4">
            <v-icon icon="mdi-map-outline" color="#81c784" class="mr-2" />
            <span class="text-subtitle-1 font-weight-medium">
              Regional Performance
            </span>
          </div>
          <v-table density="comfortable" class="bg-transparent">
            <thead>
              <tr>
                <th class="text-left">Region</th>
                <th class="text-right">Shipments</th>
                <th class="text-right">On-Time</th>
                <th class="text-right">Revenue</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in regionalView" :key="row.region">
                <td class="font-weight-medium">{{ row.region }}</td>
                <td class="text-right">{{ fmtNumber(row.shipments) }}</td>
                <td class="text-right">{{ fmtPct(row.onTimeRate) }}</td>
                <td class="text-right">{{ fmtCurrency(row.revenue) }}</td>
              </tr>
            </tbody>
          </v-table>
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
