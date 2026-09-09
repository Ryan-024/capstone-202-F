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

interface Props {
  /** Card header text */
  title: string
  /** MDI icon name shown in the card header */
  icon: string
  /** Primary color for the icon, line, and points (hex or CSS color) */
  color: string
  /** X-axis labels (usually month labels) */
  labels: string[]
  /** Y-axis data points; must match labels length */
  data: number[]
  /** Legend/tooltip series label */
  datasetLabel: string
  /** Formatter used for the tooltip value and y-axis ticks */
  formatter?: (n: number) => string
  /** Render as filled area chart */
  fill?: boolean
  /** Background fill color when fill=true; defaults to a translucent version of `color` */
  fillColor?: string
  /** Zero-based index to emphasize (larger point + white border). Use -1 for none. */
  highlightIndex?: number
  /** Chart height in pixels */
  height?: number
}

const props = withDefaults(defineProps<Props>(), {
  formatter: (n: number) => n.toLocaleString('en-US'),
  fill: false,
  fillColor: undefined,
  highlightIndex: -1,
  height: 280,
})

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

const palette = {
  grid: 'rgba(255,255,255,0.06)',
  ticks: 'rgba(255,255,255,0.6)',
  highlight: '#ffffff',
}

// Derive a translucent background from `color` if no explicit fillColor was passed
function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace('#', '')
  const bigint = parseInt(
    clean.length === 3
      ? clean
          .split('')
          .map((c) => c + c)
          .join('')
      : clean,
    16,
  )
  const r = (bigint >> 16) & 255
  const g = (bigint >> 8) & 255
  const b = bigint & 255
  return `rgba(${r},${g},${b},${alpha})`
}

const resolvedFillColor = computed(
  () =>
    props.fillColor ??
    (props.color.startsWith('#')
      ? hexToRgba(props.color, 0.18)
      : 'rgba(255,255,255,0.15)'),
)

const pointRadius = (ctx: { dataIndex: number }) =>
  props.highlightIndex >= 0 && ctx.dataIndex === props.highlightIndex ? 7 : 3

const pointBorderColor = (ctx: { dataIndex: number }) =>
  props.highlightIndex >= 0 && ctx.dataIndex === props.highlightIndex
    ? palette.highlight
    : props.color

const chartData = computed<ChartData<'line'>>(() => ({
  labels: props.labels,
  datasets: [
    {
      label: props.datasetLabel,
      data: props.data,
      borderColor: props.color,
      backgroundColor: resolvedFillColor.value,
      pointBackgroundColor: props.color,
      pointBorderColor,
      pointRadius,
      pointHoverRadius: 8,
      tension: 0.35,
      borderWidth: 2,
      fill: props.fill,
    },
  ],
}))

const chartOptions = computed<ChartOptions<'line'>>(() => ({
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
          `${ctx.dataset.label}: ${props.formatter(Number(ctx.parsed.y ?? 0))}`,
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
        callback: (v) => props.formatter(Number(v)),
      },
    },
  },
}))
</script>

<template>
  <v-card color="surface" class="pa-5 h-100 dash-card">
    <div class="d-flex align-center mb-4">
      <v-icon :icon="icon" :color="color" class="mr-2" />
      <span class="text-subtitle-1 font-weight-medium">{{ title }}</span>
      <v-spacer />
      <slot name="actions" />
    </div>
    <div :style="{ height: `${height}px` }">
      <Line :data="chartData" :options="chartOptions" />
    </div>
  </v-card>
</template>

<style scoped>
.dash-card {
  border: 1px solid rgba(255, 255, 255, 0.05);
}
</style>
