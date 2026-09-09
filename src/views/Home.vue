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
  type OpenException,
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

type CardKey = 'revenue' | 'shipments' | 'onTime' | 'exceptions'

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
  revenue: { title: 'Revenue', icon: 'mdi-cash-multiple', color: palette.revenue },
  shipments: {
    title: 'Total Shipments',
    icon: 'mdi-truck-fast-outline',
    color: palette.shipments,
  },
  onTime: {
    title: 'On-Time Delivery',
    icon: 'mdi-clock-check-outline',
    color: palette.onTime,
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
        key: 'revenue',
        ...cardMeta.revenue,
        value: fmtCurrency(yearRevenue.value),
        delta: null,
        deltaLabel: 'Total for 2025',
      },
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
    revenue: totalRevenue(cur),
    shipments: totalShipments(cur),
    onTime: cur.onTimeDeliveryRate,
    exceptions: cur.openExceptions.length,
  }
  const prevVals: Record<CardKey, number> | null = prev
    ? {
        revenue: totalRevenue(prev),
        shipments: totalShipments(prev),
        onTime: prev.onTimeDeliveryRate,
        exceptions: prev.openExceptions.length,
      }
    : null

  const formatters: Record<CardKey, (n: number) => string> = {
    revenue: fmtCurrency,
    shipments: fmtNumber,
    onTime: fmtPct,
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

const revenueChart = computed<ChartData<'line'>>(() => ({
  labels: labels.value,
  datasets: [
    {
      label: 'Revenue',
      data: metrics.map((m) => totalRevenue(m)),
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

const shipmentsChart = computed<ChartData<'line'>>(() => ({
  labels: labels.value,
  datasets: [
    {
      label: 'Total Shipments',
      data: metrics.map((m) => totalShipments(m)),
      borderColor: palette.shipments,
      backgroundColor: 'rgba(255,183,77,0.20)',
      pointBackgroundColor: palette.shipments,
      pointBorderColor: pointBorder(palette.shipments),
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
const onTimeOptions = computed(() => baseOptions(fmtPct))
const shipmentsOptions = computed(() => baseOptions(fmtNumber))

// Exceptions table shown either for the selected month or across the year
const exceptionsView = computed<
  Array<OpenException & { month: string }>
>(() => {
  const source = isAll.value
    ? metrics.flatMap((m) =>
        m.openExceptions.map((e) => ({ ...e, month: m.label })),
      )
    : selectedMetric.value
      ? selectedMetric.value.openExceptions.map((e) => ({
          ...e,
          month: selectedMetric.value!.label,
        }))
      : []
  return [...source].sort((a, b) => b.ageDays - a.ageDays)
})

const severityColor: Record<string, string> = {
  Low: 'grey',
  Medium: 'warning',
  High: 'orange-darken-2',
  Critical: 'error',
}

const statusColor: Record<string, string> = {
  Open: 'error',
  'In Review': 'warning',
  'Resolved Pending': 'success',
}

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

      <!-- Full-width shipment volume area chart -->
      <v-col cols="12">
        <v-card color="surface" class="pa-5 dash-card">
          <div class="d-flex align-center mb-4">
            <v-icon
              icon="mdi-truck-fast-outline"
              color="#ffb74d"
              class="mr-2"
            />
            <span class="text-subtitle-1 font-weight-medium">
              Shipment Volume Trend
            </span>
          </div>
          <div style="height: 280px">
            <Line :data="shipmentsChart" :options="shipmentsOptions" />
          </div>
        </v-card>
      </v-col>

      <!-- Regional performance -->
      <v-col cols="12" md="5">
        <v-card color="surface" class="pa-5 h-100 dash-card">
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

      <!-- Open exceptions -->
      <v-col cols="12" md="7">
        <v-card color="surface" class="pa-5 h-100 dash-card">
          <div class="d-flex align-center justify-space-between mb-4">
            <div class="d-flex align-center">
              <v-icon
                icon="mdi-alert-octagon-outline"
                color="#ef5350"
                class="mr-2"
              />
              <span class="text-subtitle-1 font-weight-medium">
                Open Exceptions
              </span>
            </div>
            <v-chip size="small" variant="tonal" color="error">
              {{ exceptionsView.length }} open
            </v-chip>
          </div>

          <v-table density="compact" class="bg-transparent exceptions-table">
            <thead>
              <tr>
                <th class="text-left">Shipment</th>
                <th class="text-left">Lane</th>
                <th class="text-left">Carrier</th>
                <th class="text-left">Issue</th>
                <th class="text-left">Severity</th>
                <th class="text-left">Status</th>
                <th class="text-right">Age</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="ex in exceptionsView"
                :key="ex.shipmentId"
              >
                <td class="font-weight-medium">{{ ex.shipmentId }}</td>
                <td class="text-medium-emphasis">
                  {{ ex.origin }} → {{ ex.destination }}
                </td>
                <td>{{ ex.carrier }}</td>
                <td>{{ ex.errorType }}</td>
                <td>
                  <v-chip
                    size="x-small"
                    variant="tonal"
                    :color="severityColor[ex.severity] || 'grey'"
                  >
                    {{ ex.severity }}
                  </v-chip>
                </td>
                <td>
                  <v-chip
                    size="x-small"
                    variant="tonal"
                    :color="statusColor[ex.status] || 'grey'"
                  >
                    {{ ex.status }}
                  </v-chip>
                </td>
                <td class="text-right">{{ ex.ageDays }}d</td>
              </tr>
              <tr v-if="exceptionsView.length === 0">
                <td colspan="7" class="text-center text-medium-emphasis py-4">
                  No open exceptions
                </td>
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
.exceptions-table :deep(th) {
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: rgba(255, 255, 255, 0.6);
}
.exceptions-table :deep(td),
.exceptions-table :deep(th) {
  white-space: nowrap;
}
</style>
