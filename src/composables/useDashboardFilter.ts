import { computed, ref } from 'vue'
import metricsData from '../data/metrics.json'

export type Region = 'west' | 'central' | 'east'

export interface RegionStats {
  shipments: number
  onTimeRate: number
  revenue: number
}

export interface OpenException {
  shipmentId: string
  origin: string
  destination: string
  carrier: string
  errorType: string
  severity: 'Low' | 'Medium' | 'High' | 'Critical' | string
  status: string
  ageDays: number
}

export interface MonthMetric {
  month: string
  label: string
  shipmentVolume: {
    ltl: number
    ftl: number
    parcel: number
  }
  onTimeDeliveryRate: number
  regionalPerformance: Record<Region, RegionStats>
  openExceptions: OpenException[]
}

export const metrics = metricsData as MonthMetric[]

// Derived per-month helpers
export function totalShipments(m: MonthMetric): number {
  return m.shipmentVolume.ltl + m.shipmentVolume.ftl + m.shipmentVolume.parcel
}

export function totalRevenue(m: MonthMetric): number {
  const r = m.regionalPerformance
  return r.west.revenue + r.central.revenue + r.east.revenue
}

// null = "All months"
const selectedMonth = ref<string | null>(null)

export function useDashboardFilter() {
  const monthOptions = computed(() => [
    { title: 'All months', value: null as string | null },
    ...metrics.map((m) => ({
      title: `${m.label} 2025`,
      value: m.month,
    })),
  ])

  const isAll = computed(() => selectedMonth.value === null)

  const selectedIndex = computed(() =>
    selectedMonth.value === null
      ? -1
      : metrics.findIndex((m) => m.month === selectedMonth.value),
  )

  const selectedMetric = computed<MonthMetric | null>(() =>
    selectedIndex.value >= 0 ? metrics[selectedIndex.value] : null,
  )

  const previousMetric = computed<MonthMetric | null>(() =>
    selectedIndex.value > 0 ? metrics[selectedIndex.value - 1] : null,
  )

  return {
    metrics,
    selectedMonth,
    monthOptions,
    isAll,
    selectedIndex,
    selectedMetric,
    previousMetric,
  }
}
