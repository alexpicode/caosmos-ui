# 🌌 Caosmos Observer — Simplified Project Definition

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Technology Stack](#2-technology-stack)
3. [User Interface — Layout & Components](#3-user-interface--layout--components)
4. [Responsive Design & Breakpoints](#4-responsive-design--breakpoints)
5. [Visual Design Language](#5-visual-design-language)

---

## 1. Project Overview

**Caosmos Observer** is a real-time monitoring dashboard — a "God View" — for the Caosmos simulation engine. It enables developers and power users to:

- Visualise all entities (citizens, objects, zones) on an interactive 2D tactical map.
- Inspect individual citizen behaviour down to their LLM reasoning chain.
- Record session history client-side (the server is stateless) and replay trajectories.
- Analyse population-wide statistics through a dedicated analytics view.

### 1.1. Core Philosophy — "Client as Historian"

The Caosmos backend operates with **pure real-time state** — it has no queryable historical database. This design pushes all historical recording responsibility to the front-end. The web application maintains a **Circular Buffer** in browser memory that captures entity snapshots over time, enabling trajectory replay, trend charts, and session export — all from data the server has already "forgotten".

---

## 2. Technology Stack

| Layer | Technology | Version | Rationale |
|---|---|---|---|
| **Framework** | React | 19 | Concurrent rendering, Suspense boundaries for async data, new `use()` hook for streamlined data fetching |
| **Build Tool** | Vite | latest | Fast HMR, native ESM, optimised production builds |
| **Language** | TypeScript | 5.x | Type safety across the entire codebase, especially critical for API contract enforcement |
| **Styling** | Tailwind CSS | 4 | Utility-first approach for rapid iteration; extended with custom design tokens for the sci-fi theme |
| **State Mgmt** | Zustand | latest | Lightweight, non-opinionated, supports high-frequency updates without re-render storms |
| **Data Fetching** | TanStack Query | v5 | Manages REST polling lifecycle: caching, retry with exponential backoff, stale-while-revalidate |
| **2D Rendering** | PixiJS | v8 | WebGL/WebGPU hardware-accelerated rendering of thousands of entities at 60fps |
| **Charts** | Recharts or Nivo | latest | Composable React chart components for the analytics dashboard |
| **Routing** | React Router | v7 | Two main routes: `/` (Tactical Map) and `/analytics` (Dashboard) |
| **HTTP Client** | Native `fetch` | — | Wrapped in a thin client with interceptor pattern for API-key header injection and error normalisation |

### 2.1. Key Constraints

- **No WebSockets**: All data retrieval is REST polling. The app must handle this gracefully with interpolation and smart frequency adjustment.
- **No SSR**: This is a purely client-side SPA. SEO is irrelevant for a monitoring tool.
- **Browser Support**: Latest Chrome, Firefox, Edge. No IE11.

---

## 3. User Interface — Layout & Components

### 3.1. App Shell Layout

The layout is a CSS Grid with named areas:

```
┌─────────────────────────────────────────────────────────────┐
│                          HEADER                              │
├──────────┬──────────────────────────────────┬────────────────┤
│          │                                  │                │
│   LEFT   │            MAP CANVAS            │     RIGHT      │
│ SIDEBAR  │          (PixiJS view)           │    SIDEBAR     │
│          │                                  │                │
│  240px   │           flex-grow              │     320px      │
│          │                                  │                │
├──────────┴──────────────────────────────────┴────────────────┤
│                     BOTTOM DRAWER                            │
│               (collapsible: 48px / 320px)                    │
└─────────────────────────────────────────────────────────────┘
```

### 3.2. Header Bar

Fixed at the top. Height: 56px. Contains:

| Element | Position | Behaviour |
|---|---|---|
| **Simulation Clock** | Left | Displays: `Day {day}, {time}` and `Tick #{tick}`. Pulses gently on each tick update. |
| **Global Search** | Center | Text input with autocomplete. Searches citizen names and entity IDs client-side from the store. |
| **View Toggle** | Center-Right | Segmented button: "Tactical Map" / "Analytics". Switches `activeView` in UI store. |
| **Status Indicator** | Right | Shows network latency (green/yellow/red dot) and last successful poll timestamp. Shows ⚠ if desync detected. |

> **Note — Global Search**: This feature searches the **local store data only** (no dedicated API endpoint). The search filters through `citizens` and `entities` maps in `useWorldStore` by name/ID. This is a client-side filter, not a server query.

### 3.3. Left Sidebar — Macro Controls

Width: 240px, collapsible to icon-only (56px).

Sections (top to bottom):

1. **Homeostasis Dials** (3 gauges):
   - **Population**: Total tracked citizen count (from store).
   - **Average Vitality**: Mean of all citizens' `vitality` values.
   - **Active Workers**: Count of citizens with `state === 'WORKING'`.
   
   > **Note — No API endpoint**: These are computed client-side from stored citizen data. No dedicated `/api/v1/stats` endpoint exists.

2. **Layer Manager**: Toggle checkboxes for each rendering layer (Terrain, Zones, Entities, Citizens, Trails). Updates `useUIStore.visibleLayers`.

3. **Session Config**:
   - **Retention Slider**: Dropdown/slider to select history retention: 5, 15, 60, or 120 minutes.
   - **RAM Monitor**: Progress bar showing estimated buffer memory usage. Calculated from `(total history entries × ~64 bytes per entry)`. Shows warning colour above 80% of `ramLimitMB`.
   - **Purge Button**: Clears all history (keeps only `current` state).

### 3.4. Right Sidebar — Citizen Inspector

Width: 320px, collapsible.

Two sections:

#### Section A: Focus (Selected Citizen)

Shown when `selectedCitizenId` is set. Populated by `/api/v1/citizens/{uuid}` response.

- **Identity Header**: Name, traits as coloured chip badges, skills as a mini bar chart.
- **Status Gauges**: Four horizontal bars for Vitality, Hunger, Energy, Stress (0–100 each). Colour-coded (green → yellow → red).
- **Active Task**: Card showing `type`, `goal`, `target`, progress indicator if `completed`.
- **Equipment**: Two slots (Left Hand, Right Hand) with item name and tags.
- **Inventory**: Grid of items with quantity badges. Shows `usedSlots / maxSlots` with capacity status.
- **Reasoning Display**: Terminal-styled monospace text block showing `lastAction.reasoningWas`. Dark background, green text (sci-fi aesthetic).
- **Cognition Timeline**: Vertical timeline of last 10 `CognitionEntry` items from `/api/v1/citizens/{uuid}/cognition`. Each entry shows tick number, `thoughtProcess` excerpt, and `actionTarget`. Click to expand full text.
- **Biometrics Chart**: Sparkline chart showing vitality and energy over the last N `BiometricsEntry` records.

#### Section B: Pinned Citizens

Shown below the focus section (or as the only content when no citizen is selected).

- List of `CitizenCard` components, one per pinned citizen.
- Each card shows: name, mini vitality sparkline (from history), current goal text, state badge.
- Click a card to select that citizen (populates Section A).
- Unpin button (❌) on each card.

### 3.5. Bottom Drawer — Census Table

Collapsible from bottom. Two states:

- **Minimized** (48px): Shows a summary ticker: "N citizens in view | Avg vitality: X%".
- **Expanded** (up to 320px): Full `CensusTable` component.

**CensusTable** features:
- Columns: Name | State | Current Goal | Vitality | Position (x, z).
- Data source: citizens currently in viewport bounds (from `useWorldStore.citizens` filtered by `useUIStore.viewportBounds`).
- **Sortable**: Click column headers to sort ascending/descending.
- **Filterable**: Text input at the top for semantic filtering by any text column (e.g., typing "hungry" filters by state or goal containing that word).
- **Clickable rows**: Clicking a row selects the citizen and centres the camera on them.

### 3.6. Analytics View

Replaces the map canvas when `activeView === 'analytics'`. Full-screen dashboard layout (sidebars hidden).

Components arranged in a responsive grid:

| Component | Size | Description |
|---|---|---|
| **PopulationChart** | 1/2 width | Bar chart/histogram of citizen count by state |
| **VitalityScatter** | 1/2 width | Scatter plot: vitality vs energy for all tracked citizens |
| **ProfessionTreemap** | 1/2 width | Treemap showing population distribution by `currentGoal` categories |
| **MasterTable** | Full width | Sortable, searchable table of ALL tracked citizens (not just viewport). Includes export button. |
| **ExportButton** | Top-right | Downloads the entire circular buffer as JSON or CSV |

> **Note — Data Source**: All analytics data comes from the **client-side store**, not from dedicated analytics endpoints. Charts aggregate from `useWorldStore.citizens` and their history arrays.

---

## 4. Responsive Design & Breakpoints

| Breakpoint | Name | Width | Layout Changes |
|---|---|---|---|
| `sm` | Mobile | < 768px | Both sidebars hidden (hamburger menu). Map fills screen. Inspector opens as full-screen modal. Bottom drawer becomes a bottom sheet. |
| `md` | Tablet | 768px – 1279px | Left sidebar collapsed to icons only. Right sidebar visible. Bottom drawer available. |
| `lg` | Desktop | ≥ 1280px | All panels visible. Full layout as described in §3.1. |

### Mobile-Specific Adaptations

- Map touch targets (citizen sprites) increase by 20% in size.
- Pan via single-finger drag, zoom via pinch gesture.
- Inspector opens as a slide-up modal with a drag handle.
- Census table is rendered inside a bottom sheet.

---

## 5. Visual Design Language

### 5.1. Theme — "Neon Dark / Sci-Fi HUD"

The aesthetic is inspired by futuristic command centres: dark backgrounds, glowing accents, sharp data displays.

| Token | Value | Usage |
|---|---|---|
| `--bg-primary` | `slate-950` (`#020617`) | Main background |
| `--bg-surface` | `slate-900` (`#0f172a`) | Panels, cards, drawers |
| `--bg-elevated` | `slate-800` (`#1e293b`) | Hover states, active items |
| `--accent-primary` | `cyan-500` (`#06b6d4`) | Active citizens, selected elements, links |
| `--accent-secondary` | `violet-500` (`#8b5cf6`) | Zones, secondary UI elements |
| `--accent-warning` | `amber-500` (`#f59e0b`) | Low vitality, hunger warnings |
| `--accent-danger` | `red-500` (`#ef4444`) | Critical alerts, disconnection |
| `--accent-success` | `emerald-500` (`#10b981`) | Healthy state, successful actions |
| `--text-primary` | `slate-100` (`#f1f5f9`) | Main text |
| `--text-secondary` | `slate-400` (`#94a3b8`) | Labels, metadata |
| `--text-muted` | `slate-600` (`#475569`) | Disabled, placeholder text |

### 5.2. Typography

| Element | Font | Weight | Size |
|---|---|---|---|
| Headings | `Inter` or `Outfit` | 600–700 | 18–24px |
| Body | `Inter` | 400 | 14px |
| Data / Monospace | `JetBrains Mono` or `Fira Code` | 400 | 13px |
| Tick Counter | `JetBrains Mono` | 700 | 16px |

### 5.3. Effects

- **Glassmorphism**: All floating panels use `backdrop-blur-md` with `bg-opacity-80`.
- **Border glow**: Active/selected panels have a 1px border with `cyan-500/30` opacity.
- **Micro-animations**:
  - Sidebar collapse/expand: 200ms ease-out slide.
  - Drawer expand: 250ms spring animation.
  - Citizen selection: Ring pulse animation (0.3s ease-in-out infinite).
  - Data update flash: Brief 150ms background highlight on cells that changed value.
- **Hover effects**: Cards and table rows show `bg-elevated` on hover with 100ms transition.

---