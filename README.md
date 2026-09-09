# FastForward Logistics — Dashboard

A single-page analytics dashboard for **FastForward Logistics**, a mid-size freight and supply-chain company. It visualizes 12 months of 2025 shipping metrics — shipment volume, on-time delivery, regional performance, and open exceptions — using Vue 3, TypeScript, Vuetify 3, and Chart.js.

## Features

- **Global month picker** in the app bar filters every card, chart, and table. Defaults to **All months** (full-year view).
- **Four summary cards** with month-over-month delta indicators (up/down arrow, red/green):
  - Shipment Volume
  - On-Time Delivery
  - Regional Performance (total revenue across the 3 regions)
  - Open Exceptions (uses inverted coloring — down is good)
- **Line charts** with a period toggle on both:
  - **Monthly Shipment Volume** — Daily · Weekly · Monthly · Quarterly (defaults to Weekly)
  - **On-Time Delivery Rate** — Daily · Weekly · Monthly · Quarterly (defaults to Weekly)
  - Daily view scopes to one month at a time with **‹ prev / next ›** month scrubbers.
- **Open Exceptions Trend** — full-width area chart of monthly exception counts.
- **Regional Performance** — full-width table of shipments / on-time % / revenue across West, Central, East.
- **Dark theme** by default with a cohesive violet-teal-amber palette.
- **Responsive grid** — cards stack on small screens.

### Synthetic sub-monthly variation

Underlying data is monthly, so Daily and Weekly views are derived at render-time:

- A seeded PRNG (`mulberry32`) produces stable values across re-renders and toggles.
- `distribute()` splits monthly shipment totals into buckets with weekday/weekend rhythm (weekends ≈ 55% of a weekday) and gentle mid-month bumps, then corrects rounding drift so buckets still sum to the true monthly total.
- `varyRate()` interpolates on-time rates toward the next month's rate for smooth transitions and applies a small weekend penalty.

## Tech stack

- [Vue 3](https://vuejs.org/) + [TypeScript](https://www.typescriptlang.org/) via [Vite](https://vitejs.dev/)
- [Vuetify 3](https://vuetifyjs.com/) (Material Design 3 components, MDI icons)
- [Chart.js](https://www.chartjs.org/) via [vue-chartjs](https://vue-chartjs.org/)
- [Vue Router](https://router.vuejs.org/) (single route — kept for extensibility)

## Getting started

```bash
npm install
npm run dev       # start the Vite dev server
npm run build     # type-check + production build
npm run preview   # preview the production build
```

The app runs at http://localhost:5173 by default.

## Project structure

```
src/
├── App.vue                        # App shell: v-app-bar (title + month picker) + router view
├── main.ts                        # App bootstrap: Vue, Vuetify, router
├── style.css
├── assets/
├── components/
│   ├── HelloWorld.vue
│   └── LineChartCard.vue          # Reusable line-chart card (props + #actions slot)
├── composables/
│   └── useDashboardFilter.ts      # Shared filter state + metric types + helpers
├── data/
│   └── metrics.json               # 12 months of fake logistics data
├── plugins/
│   └── vuetify.ts                 # Dark theme + palette + defaults
├── router/
│   └── index.ts
└── views/
    └── Home.vue                   # Dashboard layout: cards, charts, tables
```

## Data shape (`src/data/metrics.json`)

Array of 12 months. Each entry:

```ts
interface MonthMetric {
  month: string                    // e.g. "2025-03"
  label: string                    // e.g. "Mar"
  shipmentVolume: { ltl: number; ftl: number; parcel: number }
  onTimeDeliveryRate: number       // percentage
  regionalPerformance: {
    west:    { shipments: number; onTimeRate: number; revenue: number }
    central: { shipments: number; onTimeRate: number; revenue: number }
    east:    { shipments: number; onTimeRate: number; revenue: number }
  }
  openExceptions: Array<{
    shipmentId: string
    origin: string
    destination: string
    carrier: string
    errorType: string
    severity: 'Low' | 'Medium' | 'High' | 'Critical'
    status: 'Open' | 'In Review' | 'Resolved Pending'
    ageDays: number
  }>
}
```

Types and helpers (`totalShipments`, `totalRevenue`) are exported from [src/composables/useDashboardFilter.ts](src/composables/useDashboardFilter.ts).

## Reusable `LineChartCard`

The line-chart card is a self-contained component that owns Chart.js registration, tooltip/scale styling, and point-highlighting. Consumers only pass the variable data:

```vue
<LineChartCard
  title="Monthly Shipment Volume"
  icon="mdi-truck-fast-outline"
  :color="'#ffb74d'"
  dataset-label="Shipments"
  :labels="labels"
  :data="values"
  :formatter="fmtNumber"
  :highlight-index="selectedIndex"
  :fill="true"
>
  <template #actions>
    <!-- buttons, toggles, scrubbers, etc. -->
  </template>
</LineChartCard>
```

| Prop              | Type                       | Description                                           |
| ----------------- | -------------------------- | ----------------------------------------------------- |
| `title`           | `string`                   | Card header text                                      |
| `icon`            | `string`                   | MDI icon name in the header                           |
| `color`           | `string`                   | Line/point/icon color (hex or CSS color)              |
| `labels`          | `string[]`                 | X-axis labels                                         |
| `data`            | `number[]`                 | Y-axis values                                         |
| `datasetLabel`    | `string`                   | Series label used in tooltips                         |
| `formatter?`      | `(n: number) => string`    | Y-tick + tooltip formatter (default: `toLocaleString`)|
| `fill?`           | `boolean`                  | Toggle area-chart fill                                |
| `fillColor?`      | `string`                   | Override fill; auto-derived from `color` when hex     |
| `highlightIndex?` | `number`                   | Emphasize a data point (`-1` disables)                |
| `height?`         | `number`                   | Chart height in px (default `280`)                    |

Slot: `#actions` — right-aligned content in the card header (used for the Daily/Weekly/Monthly/Quarterly toggle and month scrubber).

## Design notes

- Palette lives in [src/plugins/vuetify.ts](src/plugins/vuetify.ts): background `#0f1115`, surface `#171a21`, primary violet `#7c4dff`, teal `#4dd0e1`, amber `#ffb74d`, green `#81c784`, red `#ef5350`.
- Cards are `variant="flat"` with a hairline border for a minimal look with lots of whitespace.
- No API calls — all data is local JSON.

