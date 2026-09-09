# My Dashboard - Project Brief

## What is this?
A single-page analytics dashboard showing monthly shipping metrics.
FastForward Logistics is a mid-size freight and supply chain company.

## Data
Generate a fake dataset as a JSON file (src/datametrics.json).
12 months of data (Jan-Dec 2025), each month containing:
- Shipment Volume tracking (Less-Than-Truckload, Full Truckload shipping and Parcel)
- On-Time Delivery rates (% of on time delivery rates)
- Regional Performance (3 Regions: West, Central and East)
- Open Exceptions Tracking (Shipment ID, Origin, Destination, Carrier, Type of error, Severity, Status, Age)

## Layout (Vuetify)
- v-app-bar at the top with the dashboard title and a month picker
- The month picker should default to showing ALL months
- When a specific month is selected, all cards and charts 
    filter to the month. When "All" is selected, show the full year.
- Below the app bar: a row of 4 summary cards (v-card) showing
    the key metrics - shipment volume, on-time delivery rates, regional performance, open exceptions
- Below the cards: a row of 2 charts
    - Left: Line chart showing monthly shipment volume
    - Right: Line chart showing monthly on-time delivery rates
- Below that: one full-width area chart showing open exceptions data
- Below that: another full-width area table showing regional performance across the 3 different regions
- Use v-container, v-row, v-col for responsive grid layout

## Interactions
- Month picker in the app bar filters EVERYTHING - summary cards
    show that month's number, charts highlight or filter to that month
- When "All" is selected, summary cards show yearly totals/averages
    and charts show all 12 months
- Cards show show a small up/down arrow or color indicating 
    change from previous month

## Style
- Dark theme by default (Vuetify dark theme)
- Clean, minimal, lots of whitespace
- Charts should use a cohesive color palette - not rainbow
- Mobile responsive - cards stack on small screens

## Tech
- Vue 3 + TypeScript + Vuetify 3
- Chart.js via vue-chartjs for all charts
- Fake data from a local JSON file (no API calls)
- Single page - no routing needed for this app