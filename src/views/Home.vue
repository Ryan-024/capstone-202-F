<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import LineChartCard from '../components/LineChartCard.vue'
import {
  useDashboardFilter,
  totalShipments,
  totalRevenue,
} from '../composables/useDashboardFilter'

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
const labels = computed(() => metrics.map((m) => m.label))
const onTimeData = computed(() => metrics.map((m) => m.onTimeDeliveryRate))
const exceptionsData = computed(() =>
  metrics.map((m) => m.openExceptions.length),
)

// Shipment volume period selector
type ShipmentPeriod = 'daily' | 'weekly' | 'monthly' | 'quarterly'

const shipmentPeriod = ref<ShipmentPeriod>('weekly')

const shipmentPeriodOptions: Array<{ label: string; value: ShipmentPeriod }> = [
  { label: 'Daily', value: 'daily' },
  { label: 'Weekly', value: 'weekly' },
  { label: 'Monthly', value: 'monthly' },
  { label: 'Quarterly', value: 'quarterly' },
]

// Daily view scrubs one month at a time; keep it in sync with the app-bar
// month picker when the user selects a specific month, otherwise remember
// whatever the user last scrolled to.
const dailyMonthIndex = ref(0)
watch(selectedIndex, (i) => {
  if (i >= 0) dailyMonthIndex.value = i
})

function shiftDailyMonth(delta: number) {
  const next = dailyMonthIndex.value + delta
  if (next < 0 || next > metrics.length - 1) return
  dailyMonthIndex.value = next
}

const canPrevDailyMonth = computed(() => dailyMonthIndex.value > 0)
const canNextDailyMonth = computed(
  () => dailyMonthIndex.value < metrics.length - 1,
)
const dailyMonthLabel = computed(
  () => `${metrics[dailyMonthIndex.value].label} 2025`,
)

// 2025 is not a leap year
const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]

interface Series {
  labels: string[]
  data: number[]
}

// Deterministic pseudo-random generator so daily/weekly values are stable
// between re-renders and view toggles, but still look naturally varied.
function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Distribute `total` across `parts` buckets with naturally varied weights.
 * Weekly weights lean slightly higher mid-month; daily weights include a
 * weekday/weekend cycle so weekends are lighter. Values are rounded and the
 * remainder is applied to the last bucket so the sum matches `total`.
 */
function distribute(
  total: number,
  parts: number,
  seed: number,
  pattern: 'week' | 'day',
): number[] {
  const rand = mulberry32(seed)
  const weights: number[] = []
  for (let i = 0; i < parts; i++) {
    if (pattern === 'day') {
      // Weekday/weekend rhythm: weekdays 1.0, weekends ~0.55
      // 2025-01-01 was a Wednesday, so start dayOfWeek at 2 for month index 0.
      // We use i alone since we only need a repeating pattern, not a real date.
      const dow = i % 7
      const base = dow === 5 || dow === 6 ? 0.55 : 1.0
      // ±15% jitter
      weights.push(base * (0.85 + rand() * 0.3))
    } else {
      // Weekly: gentle mid-month bump, ±20% jitter
      const mid = (parts - 1) / 2
      const bump = 1 - Math.abs(i - mid) / (parts * 2) // 0.75..1
      weights.push(bump * (0.8 + rand() * 0.4))
    }
  }
  const sum = weights.reduce((s, w) => s + w, 0)
  const raw = weights.map((w) => (w / sum) * total)
  const rounded = raw.map((v) => Math.round(v))
  // Correct rounding drift so the parts sum back to the original total
  const drift = total - rounded.reduce((s, v) => s + v, 0)
  rounded[rounded.length - 1] += drift
  return rounded
}

const shipmentSeries = computed<Series>(() => {
  const monthly = metrics.map((m) => totalShipments(m))

  if (shipmentPeriod.value === 'monthly') {
    return { labels: labels.value, data: monthly }
  }

  if (shipmentPeriod.value === 'quarterly') {
    return {
      labels: ['Q1', 'Q2', 'Q3', 'Q4'],
      data: [0, 1, 2, 3].map((q) =>
        monthly.slice(q * 3, q * 3 + 3).reduce((s, v) => s + v, 0),
      ),
    }
  }

  if (shipmentPeriod.value === 'weekly') {
    const wLabels: string[] = []
    const wData: number[] = []
    metrics.forEach((m, i) => {
      const weeks = Math.round(daysInMonth[i] / 7) // 4 or 5
      // Seed per month so each month has its own but stable variation
      const values = distribute(monthly[i], weeks, i * 1000 + 7, 'week')
      for (let w = 0; w < weeks; w++) {
        wLabels.push(`${m.label} W${w + 1}`)
        wData.push(values[w])
      }
    })
    return { labels: wLabels, data: wData }
  }

  // daily — one month at a time
  const i = dailyMonthIndex.value
  const values = distribute(monthly[i], daysInMonth[i], i * 1000 + 31, 'day')
  const dLabels: string[] = []
  const dData: number[] = []
  for (let d = 0; d < daysInMonth[i]; d++) {
    dLabels.push(String(d + 1))
    dData.push(values[d])
  }
  return { labels: dLabels, data: dData }
})

// Only highlight the point when we're on the monthly view and a month is selected
const shipmentsHighlightIndex = computed(() =>
  !isAll.value && shipmentPeriod.value === 'monthly' ? selectedIndex.value : -1,
)

const shipmentsChartTitle = computed(() => {
  const suffix =
    shipmentPeriod.value.charAt(0).toUpperCase() +
    shipmentPeriod.value.slice(1)
  if (shipmentPeriod.value === 'daily') {
    return `Daily Shipment Volume — ${dailyMonthLabel.value}`
  }
  return `${suffix} Shipment Volume`
})

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
        <LineChartCard
          :title="shipmentsChartTitle"
          icon="mdi-truck-fast-outline"
          :color="palette.shipments"
          dataset-label="Shipments"
          :labels="shipmentSeries.labels"
          :data="shipmentSeries.data"
          :formatter="fmtNumber"
          :highlight-index="shipmentsHighlightIndex"
        >
          <template #actions>
            <div class="d-flex align-center ga-2">
              <div
                v-if="shipmentPeriod === 'daily'"
                class="d-flex align-center ga-1"
              >
                <v-btn
                  icon="mdi-chevron-left"
                  size="x-small"
                  variant="text"
                  :disabled="!canPrevDailyMonth"
                  aria-label="Previous month"
                  @click="shiftDailyMonth(-1)"
                />
                <span
                  class="text-caption font-weight-medium"
                  style="min-width: 72px; text-align: center"
                >
                  {{ dailyMonthLabel }}
                </span>
                <v-btn
                  icon="mdi-chevron-right"
                  size="x-small"
                  variant="text"
                  :disabled="!canNextDailyMonth"
                  aria-label="Next month"
                  @click="shiftDailyMonth(1)"
                />
              </div>
              <v-btn-toggle
                v-model="shipmentPeriod"
                density="compact"
                variant="outlined"
                mandatory
                divided
                color="primary"
              >
                <v-btn
                  v-for="opt in shipmentPeriodOptions"
                  :key="opt.value"
                  :value="opt.value"
                  size="x-small"
                  class="text-caption"
                >
                  {{ opt.label }}
                </v-btn>
              </v-btn-toggle>
            </div>
          </template>
        </LineChartCard>
      </v-col>

      <!-- On-Time Delivery chart -->
      <v-col cols="12" md="6">
        <LineChartCard
          title="On-Time Delivery Rate"
          icon="mdi-clock-check-outline"
          :color="palette.onTime"
          dataset-label="On-Time Delivery Rate"
          :labels="labels"
          :data="onTimeData"
          :formatter="fmtPct"
          :highlight-index="isAll ? -1 : selectedIndex"
        />
      </v-col>

      <!-- Full-width open exceptions area chart -->
      <v-col cols="12">
        <LineChartCard
          title="Open Exceptions Trend"
          icon="mdi-alert-octagon-outline"
          :color="palette.exceptions"
          dataset-label="Open Exceptions"
          :labels="labels"
          :data="exceptionsData"
          :formatter="fmtNumber"
          fill
          :highlight-index="isAll ? -1 : selectedIndex"
        />
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
