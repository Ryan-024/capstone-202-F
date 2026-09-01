import { computed, ref } from 'vue'
import metricsData from '../data/metrics.json'

export interface MonthMetric {
  month: string
  label: string
  revenue: number
  visitors: number
  conversions: number
  orders: number
}

export const metrics = metricsData as MonthMetric[]

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
