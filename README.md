<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# AgriData Explorer

Comprehensive agricultural data analytics platform for exploring Indian crop production, yield, and cultivation trends. Built with React, Express, SQLite, and Gemini AI.

## Features

- **Dashboard** — KPI cards, production trendlines, crop distribution pie chart, and state-wise breakdowns
- **Crop Analysis** — Filter by state, crop, and year with interactive charts
- **Market Trends** — Macro-level shifts in agricultural output value
- **AI Insights** — Gemini-powered predictive analysis of crop data
- **Data Import** — Upload custom agricultural datasets (CSV/XLSX) in both narrow and wide formats
- **Dark Mode** — Full light/dark theme support

## Prerequisites

- **Node.js** v18 or later
- **Visual Studio Build Tools** (required for `better-sqlite3` native module on Windows)
  - Install via [Visual Studio Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) with the "Desktop development with C++" workload
- **Gemini API Key** (optional — needed only for AI insights feature)

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/umamagesh12776/AgriData-Explorer.git
cd AgriData-Explorer
```

### 2. Install dependencies

```bash
npm install
```

> **Windows note:** If `npm install` fails due to `better-sqlite3`, ensure Visual Studio Build Tools with C++ workload is installed, then retry.

### 3. Configure environment

Copy the example env file and add your API key:

```bash
copy .env.example .env.local
```

Edit `.env.local` and set your values:


### 4. Run the development server

```bash
npm run dev
```

The app will be available at **http://localhost:3000**.

### 5. Build for production

```bash
npm run build
npm start
```

## Data Upload

AgriData Explorer supports two CSV/XLSX formats for importing custom agricultural data:

### Narrow Format (Simple)

Each row represents one crop observation with explicit columns:

| State | District | Year | Crop | Area | Production | Yield |
|-------|----------|------|------|------|------------|-------|
| Punjab | Amritsar | 2023 | Wheat | 1200 | 5500 | 4.58 |

You can download a template from the Settings page in the app.

### Wide Format (District-level Agricultural Data)

Each row represents a district with per-crop columns, matching the format used by Indian government agricultural datasets:

| State Name | Dist Name | Year | RICE AREA (1000 ha) | RICE PRODUCTION (1000 tons) | RICE YIELD (Kg per ha) | WHEAT AREA (1000 ha) | ... |
|------------|-----------|------|---------------------|----------------------------|------------------------|----------------------|-----|
| Punjab | Amritsar | 2020 | 2800 | 12500 | 4464 | 1500 | ... |

The app automatically detects wide-format files and transforms them into the internal normalized structure. Supported column patterns:

- `{CROP} AREA (1000 ha)` — cultivated area
- `{CROP} PRODUCTION (1000 tons)` — total production
- `{CROP} YIELD (Kg per ha)` — yield per hectare

Crops with only area data (e.g., `FRUITS AREA`, `FODDER AREA`) are also supported.

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/states` | List distinct states |
| GET | `/api/crops` | List distinct crops |
| GET | `/api/analytics/summary` | Production/yield/area summary (supports `?state=&crop=&year=` filters) |
| GET | `/api/analytics/trends` | Year-over-year trends |
| GET | `/api/analytics/state-comparison` | State-wise production comparison |
| GET | `/api/analytics/crop-distribution` | Crop production distribution |
| POST | `/api/data/upload` | Upload dataset (`{ data, mode: "replace"|"merge" }`) |
| POST | `/api/data/reset` | Reset to default seed data |
| POST | `/api/insights/generate` | Generate AI insight (`{ dataSummary }`) |

## Tech Stack

- **Frontend:** React 19, Vite, Tailwind CSS v4, Recharts, Framer Motion, shadcn/ui
- **Backend:** Express, better-sqlite3
- **AI:** Google Gemini (via `@google/genai`)
- **Parsing:** PapaParse (CSV), SheetJS (XLSX)

## License

Private project. All rights reserved.
