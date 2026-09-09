<script setup lang="ts">
import { computed, ref } from 'vue'
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

// 2025 is not a leap year
const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]

interface Series {
  labels: string[]
  data: number[]
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
      const perWeek = Math.round(monthly[i] / weeks)
      for (let w = 1; w <= weeks; w++) {
        wLabels.push(`${m.label} W${w}`)
        wData.push(perWeek)
      }
    })
    return { labels: wLabels, data: wData }
  }

  // daily
  const dLabels: string[] = []
  const dData: number[] = []
  metrics.forEach((m, i) => {
    const perDay = Math.round(monthly[i] / daysInMonth[i])
    for (let d = 1; d <= daysInMonth[i]; d++) {
      dLabels.push(`${m.label} ${d}`)
      dData.push(perDay)
    }
  })
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
