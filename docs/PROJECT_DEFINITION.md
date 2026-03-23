# 🌌 Caosmos Observer — Complete Project Definition

> **Purpose of this document**: This is the single source of truth that an AI coding assistant (or human developer) must follow to implement the Caosmos Observer front-end from scratch. Every section is designed to be directly actionable — no ambiguity, no placeholders.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Technology Stack](#2-technology-stack)
3. [Architecture](#3-architecture)
4. [Folder Structure](#4-folder-structure)
5. [API Contract](#5-api-contract)
6. [Domain Model](#6-domain-model)
7. [State Management](#7-state-management)
8. [Data Synchronization Pipeline](#8-data-synchronization-pipeline)
9. [Rendering Engine (PixiJS)](#9-rendering-engine-pixijs)
10. [User Interface — Layout & Components](#10-user-interface--layout--components)
11. [Responsive Design & Breakpoints](#11-responsive-design--breakpoints)
12. [Visual Design Language](#12-visual-design-language)
13. [Feature–Endpoint Matrix & Gaps](#13-featureendpoint-matrix--gaps)
14. [Quality Assurance & Resilience](#14-quality-assurance--resilience)
15. [Implementation Guidelines for AI Assistants](#15-implementation-guidelines-for-ai-assistants)

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

## 3. Architecture

The project follows **Clean Architecture** principles adapted for a React SPA:

```
┌─────────────────────────────────────────────────────┐
│                   Presentation                       │
│  React Components, PixiJS Canvas, Views, Layout      │
│  ─────────────────────────────────────────────────   │
│  Depends on: Store (read state), Use Cases (actions) │
├─────────────────────────────────────────────────────┤
│                      Store                           │
│  Zustand stores (World, UI, Config)                  │
│  ─────────────────────────────────────────────────   │
│  Depends on: Domain entities                         │
├─────────────────────────────────────────────────────┤
│                    Use Cases                         │
│  SyncWorldState, TrackCitizen, CalculateMetrics      │
│  ─────────────────────────────────────────────────   │
│  Depends on: Interfaces (ports), Domain entities     │
├─────────────────────────────────────────────────────┤
│                      Domain                          │
│  Entities, Value Objects, Interfaces (ports)         │
│  ─────────────────────────────────────────────────   │
│  ZERO external dependencies                          │
├─────────────────────────────────────────────────────┤
│                   Data / Infra                       │
│  API Clients, Mappers (DTO → Domain), Repositories   │
│  ─────────────────────────────────────────────────   │
│  Implements Domain interfaces                        │
└─────────────────────────────────────────────────────┘
```

### 3.1. Dependency Rule

Dependencies flow **inward only**. The Domain layer has no imports from React, PixiJS, or any external library. Use Cases orchestrate business logic by calling Repository interfaces that are implemented by the Data layer.

### 3.2. Data Flow Summary

```
[Polling Timer / Camera Move]
       │
       ▼
[TanStack Query Hook] ── fetch → [REST API]
       │
       ▼ response
[Mapper] ── DTO → Domain Entity
       │
       ▼
[Zustand Store] ── merge, buffer, prune
       │
       ▼
[React Components / PixiJS] ── render
```

---

## 4. Folder Structure

```
src/
├── core/                           # Pure domain logic — NO framework imports
│   ├── entities/                   # Domain models
│   │   ├── Citizen.ts              # Citizen, CitizenSummary, CitizenDetail
│   │   ├── WorldEntity.ts          # WorldEntity, WorldEntitySummary
│   │   ├── Zone.ts                 # Zone with dimensions
│   │   ├── Chunk.ts                # ChunkInfo
│   │   ├── Environment.ts          # WorldEnvironment, WorldDate
│   │   ├── Cognition.ts            # CognitionEntry
│   │   └── Snapshot.ts             # Aggregated world snapshot
│   ├── use-cases/                  # Application business logic
│   │   ├── SyncWorldState.ts       # Merge API response into store
│   │   ├── TrackCitizen.ts         # Pin/unpin citizen tracking
│   │   ├── PruneHistory.ts         # Time/size-based buffer cleanup
│   │   ├── InterpolatePosition.ts  # Lerp between known positions
│   │   └── CalculateMetrics.ts     # Aggregate stats for analytics
│   └── interfaces/                 # Port definitions (contracts)
│       ├── WorldRepository.ts      # getEntities, getChunks, getZones, etc.
│       ├── CitizenRepository.ts    # getCitizens, getCitizenDetail, getCognition
│       └── EnvironmentRepository.ts
│
├── data/                           # Infrastructure — implements core interfaces
│   ├── api/                        
│   │   ├── httpClient.ts           # Configured fetch wrapper with interceptors
│   │   ├── worldApi.ts             # REST calls for /api/v1/world/*
│   │   └── citizenApi.ts           # REST calls for /api/v1/citizens/*
│   ├── mappers/                    
│   │   ├── citizenMapper.ts        # DTO → Domain (null-safe, default values)
│   │   ├── worldEntityMapper.ts    
│   │   └── environmentMapper.ts    
│   └── repositories/               
│       ├── WorldRepositoryImpl.ts  
│       ├── CitizenRepositoryImpl.ts
│       └── EnvironmentRepositoryImpl.ts
│
├── store/                          # Zustand state management
│   ├── useWorldStore.ts            # Entity history buffer, tick tracking
│   ├── useCitizenStore.ts          # Pinned citizens, selected citizen
│   ├── useUIStore.ts               # Viewport bounds, selected layers, zoom level, active view
│   └── useConfigStore.ts           # User preferences: retention time, polling rates, RAM limit
│
├── presentation/                   # Visual layer — React + PixiJS
│   ├── layout/                     # App shell
│   │   ├── AppShell.tsx            # Grid layout: header + sidebars + map + drawer
│   │   ├── Header.tsx              # Simulation clock, search, view toggle, status
│   │   ├── LeftSidebar.tsx         # Homeostasis dials, layer manager, config
│   │   ├── RightSidebar.tsx        # Citizen inspector, pinned list
│   │   └── BottomDrawer.tsx        # Collapsible census table
│   ├── views/                      # Top-level pages
│   │   ├── TacticalMapView.tsx     # Main map view (default route)
│   │   └── AnalyticsView.tsx       # Full-screen BI dashboard
│   ├── map/                        # PixiJS rendering
│   │   ├── MapViewport.tsx         # React wrapper around PixiJS Application
│   │   ├── layers/                 
│   │   │   ├── TerrainLayer.ts     # Chunk-based terrain rendering
│   │   │   ├── ZoneLayer.ts        # Zone boundaries and labels
│   │   │   ├── EntityLayer.ts      # WorldEntity sprites (resources, structures)
│   │   │   ├── CitizenLayer.ts     # Citizen sprites with state indicators
│   │   │   └── TrailLayer.ts       # Ghost trail lines from history buffer
│   │   ├── sprites/                
│   │   │   ├── CitizenSprite.ts    # Animated citizen glyph
│   │   │   └── EntitySprite.ts     # Generic entity glyph
│   │   └── utils/                  
│   │       ├── camera.ts           # Pan, zoom, follow-citizen logic
│   │       └── culling.ts          # Viewport frustum culling
│   ├── components/                 # Reusable UI components
│   │   ├── SimulationClock.tsx     # Tick + world time display
│   │   ├── StatusIndicator.tsx     # Network latency badge
│   │   ├── SearchBar.tsx           # Global citizen/entity search
│   │   ├── LayerToggle.tsx         # Checkbox group for map layers
│   │   ├── CitizenCard.tsx         # Summary card for pinned/selected citizen
│   │   ├── CitizenInspector.tsx    # Full detail panel (perception, equipment, inventory)
│   │   ├── CognitionTimeline.tsx   # Vertical timeline of thought processes
│   │   ├── BiometricsChart.tsx     # Vitality/energy sparkline chart
│   │   ├── CensusTable.tsx         # Sortable, filterable citizen table
│   │   ├── HomeostasisDial.tsx     # Gauge component for macro indicators
│   │   ├── MemoryMonitor.tsx       # RAM usage bar for session buffer
│   │   ├── RetentionSlider.tsx     # Config slider for history retention
│   │   └── ExportButton.tsx        # Download session data as JSON/CSV
│   └── analytics/                  # Analytics-specific components
│       ├── PopulationChart.tsx      # Histogram / bar chart
│       ├── VitalityScatter.tsx     # Scatter plot: vitality vs some metric
│       ├── ProfessionTreemap.tsx   # Treemap by profession
│       └── MasterTable.tsx         # Full population table with export
│
├── shared/                         # Cross-cutting utilities
│   ├── hooks/                      
│   │   ├── usePolling.ts           # Smart polling with dynamic interval
│   │   ├── useViewportBounds.ts    # Exposes camera bounds to store
│   │   ├── useLocalStorage.ts      # Persist config to localStorage
│   │   └── useKeyboardShortcuts.ts # Hotkeys (Escape to deselect, etc.)
│   ├── utils/                      
│   │   ├── lerp.ts                 # Linear interpolation math
│   │   ├── boundingBox.ts          # AABB intersection helpers
│   │   ├── circularBuffer.ts       # Generic circular buffer implementation
│   │   └── formatters.ts           # Date, number, tick formatters
│   └── constants/                  
│       ├── colors.ts               # Design system colour tokens
│       ├── polling.ts              # Default intervals, retry config
│       └── breakpoints.ts          # Responsive breakpoint values
│
├── App.tsx                         # Root component with Router + QueryProvider
├── main.tsx                        # Entry point
└── index.css                       # Tailwind directives + custom theme
```

---

## 5. API Contract

Base URL: `http://localhost:8080`

All responses include the header `X-Sim-Tick: <integer>` representing the current simulation tick. This value **must** be captured and stored globally by every API call.

### 5.1. World Endpoints

#### `GET /api/v1/world/chunks`

Returns terrain chunk metadata for a spatial region. **All parameters are required.**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `minX` | double | ✅ | Bounding box minimum X |
| `minZ` | double | ✅ | Bounding box minimum Z |
| `maxX` | double | ✅ | Bounding box maximum X |
| `maxZ` | double | ✅ | Bounding box maximum Z |

**Response** — `ChunkInfo[]`:
```typescript
interface ChunkInfo {
  gridX: number;       // Chunk grid coordinate X
  gridZ: number;       // Chunk grid coordinate Z
  size: number;        // World units per chunk side
  entityCount: number; // Number of entities in chunk
  movementCost: number; // Terrain difficulty (1.0 = normal)
}
```

#### `GET /api/v1/world/entities`

Returns detailed entity summaries within an optional bounding box.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `minX` | double | ❌ | Spatial filter |
| `minZ` | double | ❌ | Spatial filter |
| `maxX` | double | ❌ | Spatial filter |
| `maxZ` | double | ❌ | Spatial filter |
| `type` | string | ❌ | Filter by entity type |

**Response** — `WorldEntitySummaryDTO[]`:
```typescript
interface WorldEntitySummaryDTO {
  id: string;
  type: string;           // e.g. "TREE", "ROCK", "BUILDING"
  x: number;
  y: number;
  z: number;
  displayName: string;
  properties: Record<string, unknown>; // Type-specific metadata
}
```

#### `GET /api/v1/world/entities/map`

Lightweight version for mass map rendering (fewer fields, faster response).

Same spatial query parameters as `/entities` (all optional, plus `type`).

**Response** — `WorldEntityInMapDto[]`:
```typescript
interface WorldEntityInMapDto {
  id: string;
  type: string;
  position: Vector3; // { x, y, z }
}
```

#### `GET /api/v1/world/zones`

Returns all defined zones. **No parameters.**

**Response** — `Zone[]`:
```typescript
interface Zone {
  id: string;
  name: string;
  type: string;        // e.g. "SETTLEMENT", "FOREST", "DANGER_ZONE"
  center: Vector3;     // { x, y, z }
  width: number;       // Extent on X axis
  length: number;      // Extent on Z axis
}
```

#### `GET /api/v1/world/environment`

Returns current environment and world date.

**Response** — `WorldEnvironmentResponse`:
```typescript
interface WorldEnvironmentResponse {
  date: {
    day: number;       // Simulation day number
    time: string;      // e.g. "14:30"
  };
  environment: {
    terrainType: string;
    tags: string[];      // e.g. ["foggy", "cold"]
    lightLevel: string;  // e.g. "DAY", "NIGHT", "DUSK"
  };
}
```

### 5.2. Citizen Endpoints

#### `GET /api/v1/citizens`

Returns citizen summaries with optional spatial filtering.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `minX` | double | ❌ | Spatial filter |
| `minZ` | double | ❌ | Spatial filter |
| `maxX` | double | ❌ | Spatial filter |
| `maxZ` | double | ❌ | Spatial filter |

**Response** — `CitizenSummaryDto[]`:
```typescript
interface CitizenSummaryDto {
  uuid: string;        // UUID format
  name: string;
  x: number;
  y: number;
  z: number;
  state: string;       // e.g. "IDLE", "WORKING", "MOVING", "EATING"
  currentGoal: string; // Human-readable goal description
  vitality: number;    // 0–100
}
```

#### `GET /api/v1/citizens/map`

Minimal citizen data for map rendering (LOD 1).

Same spatial parameters as `/citizens`.

**Response** — `CitizenInMapDto[]`:
```typescript
interface CitizenInMapDto {
  uuid: string;
  x: number;
  z: number;           // Note: no Y coordinate (2D map only)
  state: string;
}
```

#### `GET /api/v1/citizens/{uuid}`

Full citizen detail for the inspector panel.

**Response** — `CitizenDetailDto`:
```typescript
interface CitizenDetailDto {
  manifest_id: string;
  perception: {
    identity: {
      name: string;
      traits: string[];
      skills: Record<string, number>; // skill name → level
    };
    status: {
      vitality: number;
      hunger: number;
      energy: number;
      stress: number;
    };
    equipment: {
      leftHand: EquippedItem | null;
      rightHand: EquippedItem | null;
    };
    inventory: {
      capacity: { usedSlots: number; maxSlots: number; status: string };
      items: InventoryItem[];
    };
    lastAction: LastAction;
    activeTask: ActiveTask;
    position: Vector3;
  };
  currentAction: LastAction;
  biometrics: BiometricsEntry[];
}

interface EquippedItem {
  id: string;
  name: string;
  tags: string[];
}

interface InventoryItem {
  id: string;
  name: string;
  tags: string[];
  quantity: number;
}

interface LastAction {
  type: string;
  status: string;
  reasoningWas: string;    // LLM reasoning text
  resultMessage: string;
  parameters: Record<string, unknown>;
}

interface ActiveTask {
  type: string;
  goal: string;
  target: string;
  completed: boolean;
}

interface BiometricsEntry {
  entityId: string;  // UUID
  tick: number;
  vitality: number;
  energy: number;
}
```

#### `GET /api/v1/citizens/{uuid}/cognition`

Returns the citizen's thought history (LLM reasoning chain).

| Parameter | Type | Required | Description |
|---|---|---|---|
| `sinceTick` | long | ❌ | Only return entries after this tick |

**Response** — `CognitionEntry[]`:
```typescript
interface CognitionEntry {
  entityId: string;       // UUID
  tick: number;
  thoughtProcess: string; // Full LLM reasoning text
  actionTarget: string;   // What entity/location the action targets
}
```

### 5.3. Common Types

```typescript
interface Vector3 {
  x: number;
  y: number;
  z: number;
}
```

---

## 6. Domain Model

These are the **internal** domain entities that the application works with after mapping from API DTOs. They include client-side enrichment (e.g., history buffer).

### 6.1. TrackedEntity

```typescript
interface TrackedEntity<T> {
  id: string;
  type: string;                // 'citizen' | 'resource' | 'structure' | 'zone'
  metadata: {
    name: string;
    traits?: string[];
  };
  history: HistoryEntry[];     // Circular buffer
  current: T;                  // Latest raw state for quick access
}

interface HistoryEntry {
  tick: number;                // From X-Sim-Tick header
  clientTimestamp: number;     // Date.now() at reception
  position: { x: number; z: number };
  vitality?: number;
  currentGoal?: string;
}
```

### 6.2. WorldSnapshot

Aggregated state of the world at a given point:

```typescript
interface WorldSnapshot {
  tick: number;
  entities: Map<string, TrackedEntity<WorldEntitySummaryDTO>>;
  citizens: Map<string, TrackedEntity<CitizenSummaryDto>>;
  zones: Zone[];
  chunks: ChunkInfo[];
  environment: WorldEnvironmentResponse;
}
```

---

## 7. State Management

Three Zustand stores, each with a specific responsibility.

### 7.1. `useWorldStore` — The Historian

**Responsibility**: Stores all tracked entities and their history buffers.

```typescript
interface WorldStoreState {
  // Current simulation tick (from last X-Sim-Tick header)
  currentTick: number;

  // Tracked entities with history
  citizens: Map<string, TrackedEntity<CitizenSummaryDto>>;
  entities: Map<string, TrackedEntity<WorldEntitySummaryDTO>>;

  // Static world data (changes infrequently)
  zones: Zone[];
  chunks: ChunkInfo[];
  environment: WorldEnvironmentResponse | null;

  // Actions
  mergeCitizens: (data: CitizenSummaryDto[], tick: number) => void;
  mergeEntities: (data: WorldEntitySummaryDTO[], tick: number) => void;
  setZones: (zones: Zone[]) => void;
  setChunks: (chunks: ChunkInfo[]) => void;
  setEnvironment: (env: WorldEnvironmentResponse) => void;
  pruneHistory: (retentionMs: number) => void;
}
```

**Merge strategy**: When `mergeCitizens` is called:
1. For each citizen in the response, look up by `uuid` in the `citizens` map.
2. If **exists**: push a new `HistoryEntry` to its `history` array, update `current`.
3. If **new**: create a new `TrackedEntity` with an empty history and the current data.
4. After merge, call `pruneHistory` to trim entries older than retention limit.

**Pruning logic**:
- **Time filter**: Remove history entries where `(Date.now() - entry.clientTimestamp) > retentionMs`.
- **Downsampling**: If a history array exceeds 500 entries, keep every Nth entry to preserve trajectory shape while limiting RAM usage.

### 7.2. `useCitizenStore` — Focus & Pinning

```typescript
interface CitizenStoreState {
  selectedCitizenId: string | null;        // Currently inspected citizen
  pinnedCitizenIds: Set<string>;           // Citizens being tracked across viewport
  citizenDetail: CitizenDetailDto | null;  // Full detail of selected citizen
  cognitionHistory: CognitionEntry[];      // Thought history of selected citizen

  // Actions
  selectCitizen: (uuid: string | null) => void;
  pinCitizen: (uuid: string) => void;
  unpinCitizen: (uuid: string) => void;
  setCitizenDetail: (detail: CitizenDetailDto) => void;
  setCognition: (entries: CognitionEntry[]) => void;
}
```

**Pinning behaviour**: When a citizen is pinned, the polling system must fetch `/api/v1/citizens/{uuid}` for that citizen even if they are outside the current viewport bounds.

### 7.3. `useUIStore` — Navigation & Display

```typescript
interface UIStoreState {
  // Viewport
  viewportBounds: { minX: number; minZ: number; maxX: number; maxZ: number };
  zoomLevel: number;

  // Layer visibility
  visibleLayers: {
    terrain: boolean;
    zones: boolean;
    entities: boolean;
    citizens: boolean;
    trails: boolean;
  };

  // Active view
  activeView: 'tactical' | 'analytics';

  // Drawer state
  drawerState: 'minimized' | 'expanded';

  // Sidebar state
  leftSidebarOpen: boolean;
  rightSidebarOpen: boolean;

  // Actions
  setViewportBounds: (bounds: UIStoreState['viewportBounds']) => void;
  setZoomLevel: (zoom: number) => void;
  toggleLayer: (layer: keyof UIStoreState['visibleLayers']) => void;
  setActiveView: (view: 'tactical' | 'analytics') => void;
  setDrawerState: (state: 'minimized' | 'expanded') => void;
}
```

### 7.4. `useConfigStore` — User Preferences

```typescript
interface ConfigStoreState {
  retentionMinutes: number;     // 5 | 15 | 60 | 120 — how long to keep history
  pollingFocusMs: number;       // Default: 800ms — when tracking a citizen
  pollingMacroMs: number;       // Default: 4000ms — distant/macro view
  ramLimitMB: number;           // Soft limit for the buffer size

  // Actions
  setRetention: (minutes: number) => void;
  setPollingRates: (focus: number, macro: number) => void;
  setRamLimit: (mb: number) => void;
}
```

**Persistence**: `useConfigStore` syncs to `localStorage` so user preferences survive page refreshes.

---

## 8. Data Synchronization Pipeline

### 8.1. Polling Architecture

The system uses **TanStack Query** with dynamic intervals controlled by the UI state.

```
┌──────────────────────────────────────────────────────────────┐
│                     Polling Controller                        │
│                                                              │
│  Inputs:                                                     │
│    - viewportBounds (from useUIStore)                         │
│    - selectedCitizenId (from useCitizenStore)                 │
│    - pinnedCitizenIds (from useCitizenStore)                  │
│    - zoomLevel (from useUIStore)                              │
│    - pollingConfig (from useConfigStore)                      │
│                                                              │
│  Outputs:                                                    │
│    - Scheduled TanStack Query refetches                      │
│    - Dynamic refetchInterval per query                       │
└──────────────────────────────────────────────────────────────┘
```

### 8.2. Polling Rules

| Condition | Interval | Endpoints Called |
|---|---|---|
| **Macro view** (zoom < 0.3) | `pollingMacroMs` (4000ms) | `/citizens/map`, `/world/entities/map` |
| **Normal view** (zoom 0.3–0.8) | 2000ms | `/citizens` + `/world/entities` with viewport bounds |
| **Focus mode** (citizen selected) | `pollingFocusMs` (800ms) | Above + `/citizens/{uuid}` + `/citizens/{uuid}/cognition` |
| **Pinned citizens** | Same as current view | For each pinned UUID: `/citizens/{uuid}` (regardless of viewport) |
| **Environment** | 10000ms | `/world/environment` (changes slowly) |
| **Chunks** | On viewport change only | `/world/chunks` with viewport bounds |
| **Zones** | On app init + every 30s | `/world/zones` |

### 8.3. Camera-Triggered Refetch

When the user pans or zooms the map:
1. `useViewportBounds` hook calculates the new bounding box from the PixiJS viewport.
2. Updates `useUIStore.viewportBounds`.
3. TanStack Query detects the changed query key (which includes bounds) and triggers an immediate refetch.

### 8.4. Tick Synchronisation

Every API response includes `X-Sim-Tick` in headers. The `httpClient` interceptor:
1. Extracts `X-Sim-Tick` from every response.
2. Calls `useWorldStore.getState().setTick(tick)`.
3. If `|localTick - serverTick| > 10`, set a **desynchronisation warning** flag in the UI store.

### 8.5. Latency-Aware Queuing

If a request takes longer than the polling interval:
- The next scheduled request is **skipped** (not queued) to prevent traffic accumulation.
- TanStack Query's `staleTime` and `refetchInterval` handle this natively when configured correctly.

---

## 9. Rendering Engine (PixiJS)

### 9.1. Application Setup

The PixiJS `Application` is created once inside `MapViewport.tsx` and destroyed on unmount. It uses a `ResizeObserver` to match the container dimensions.

### 9.2. Layer Stack (bottom to top)

All layers are `Container` instances added to the stage in order:

| # | Layer | Content | Update Frequency |
|---|---|---|---|
| 1 | **TerrainLayer** | Grid of chunk tiles, coloured by `movementCost` | Only when chunks change |
| 2 | **ZoneLayer** | Semi-transparent rectangles with name labels | Only when zones change |
| 3 | **TrailLayer** | Polylines from entity history | Every render tick |
| 4 | **EntityLayer** | Sprites for WorldEntities (trees, rocks, buildings) | On data merge |
| 5 | **CitizenLayer** | Animated citizen glyphs | On data merge + interpolation |
| 6 | **UIOverlayLayer** | Selection rings, hover tooltips | On interaction |

### 9.3. Citizen Sprite Design

Each citizen is rendered as a `Container` containing:

```
CitizenSprite
├── Base Circle          — Filled circle, colour mapped to state
│                           IDLE → cyan-500, WORKING → green-500,
│                           MOVING → blue-400, EATING → amber-500
├── Vitality Ring         — Circular border, width proportional to vitality (0–100)
│                           Full health → green arc, Low → red arc
├── State Indicator       — Small icon overlay for critical states:
│                           ⚠ Hunger (hunger > 70)
│                           ⚡ Low Energy (energy < 20)
│                           😰 Stress (stress > 60)
├── Name Label (optional) — Visible only at high zoom levels (zoom > 0.6)
└── Pulse Animation       — Scale oscillation (1.0 → 1.15 → 1.0) based on vitality
                            Faster pulse = lower vitality (distress signal)
```

### 9.4. Movement Interpolation

Entities do **not** teleport between positions. On every PixiJS ticker frame:

```typescript
function interpolate(sprite: Container, from: Vector2, to: Vector2, progress: number) {
  sprite.x = from.x + (to.x - from.x) * progress;
  sprite.y = from.z + (to.z - from.z) * progress;  // Note: world Z → screen Y
}
```

- `progress` goes from 0.0 to 1.0 over the polling interval duration.
- When a new position arrives, `from` is set to the sprite's current interpolated position (not the previous target) to avoid snapping.

### 9.5. Ghost Trails

For each tracked citizen with `visibleLayers.trails === true`:
- Draw a `Graphics` polyline through the last N history positions.
- Each segment's alpha decreases linearly: newest segment α=0.8, oldest segment α=0.05.
- Trail colour matches the citizen's base colour.
- Maximum trail length: 100 points (to limit draw calls).

### 9.6. Camera & Viewport

- **Pan**: Click-drag on empty space.
- **Zoom**: Mouse wheel. Min zoom: 0.05 (see entire world). Max zoom: 3.0 (street level).
- **Follow mode**: When a citizen is selected, the camera smoothly tracks their position using a lerp on the camera offset.
- The camera exposes its world-space bounding box to `useViewportBounds` on every frame.

### 9.7. Performance Considerations

- Use `ParticleContainer` if entity count exceeds 2000 simple sprites.
- Use `cacheAsBitmap = true` for static layers (terrain, zones) that change rarely.
- Implement **viewport culling**: Skip rendering any sprite whose world position is outside the current camera bounds plus a small margin.

---

## 10. User Interface — Layout & Components

### 10.1. App Shell Layout

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

### 10.2. Header Bar

Fixed at the top. Height: 56px. Contains:

| Element | Position | Behaviour |
|---|---|---|
| **Simulation Clock** | Left | Displays: `Day {day}, {time}` and `Tick #{tick}`. Pulses gently on each tick update. |
| **Global Search** | Center | Text input with autocomplete. Searches citizen names and entity IDs client-side from the store. |
| **View Toggle** | Center-Right | Segmented button: "Tactical Map" / "Analytics". Switches `activeView` in UI store. |
| **Status Indicator** | Right | Shows network latency (green/yellow/red dot) and last successful poll timestamp. Shows ⚠ if desync detected. |

> **Note — Global Search**: This feature searches the **local store data only** (no dedicated API endpoint). The search filters through `citizens` and `entities` maps in `useWorldStore` by name/ID. This is a client-side filter, not a server query.

### 10.3. Left Sidebar — Macro Controls

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

### 10.4. Right Sidebar — Citizen Inspector

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

### 10.5. Bottom Drawer — Census Table

Collapsible from bottom. Two states:

- **Minimized** (48px): Shows a summary ticker: "N citizens in view | Avg vitality: X%".
- **Expanded** (up to 320px): Full `CensusTable` component.

**CensusTable** features:
- Columns: Name | State | Current Goal | Vitality | Position (x, z).
- Data source: citizens currently in viewport bounds (from `useWorldStore.citizens` filtered by `useUIStore.viewportBounds`).
- **Sortable**: Click column headers to sort ascending/descending.
- **Filterable**: Text input at the top for semantic filtering by any text column (e.g., typing "hungry" filters by state or goal containing that word).
- **Clickable rows**: Clicking a row selects the citizen and centres the camera on them.

### 10.6. Analytics View

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

## 11. Responsive Design & Breakpoints

| Breakpoint | Name | Width | Layout Changes |
|---|---|---|---|
| `sm` | Mobile | < 768px | Both sidebars hidden (hamburger menu). Map fills screen. Inspector opens as full-screen modal. Bottom drawer becomes a bottom sheet. |
| `md` | Tablet | 768px – 1279px | Left sidebar collapsed to icons only. Right sidebar visible. Bottom drawer available. |
| `lg` | Desktop | ≥ 1280px | All panels visible. Full layout as described in §10.1. |

### Mobile-Specific Adaptations

- Map touch targets (citizen sprites) increase by 20% in size.
- Pan via single-finger drag, zoom via pinch gesture.
- Inspector opens as a slide-up modal with a drag handle.
- Census table is rendered inside a bottom sheet.

---

## 12. Visual Design Language

### 12.1. Theme — "Neon Dark / Sci-Fi HUD"

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

### 12.2. Typography

| Element | Font | Weight | Size |
|---|---|---|---|
| Headings | `Inter` or `Outfit` | 600–700 | 18–24px |
| Body | `Inter` | 400 | 14px |
| Data / Monospace | `JetBrains Mono` or `Fira Code` | 400 | 13px |
| Tick Counter | `JetBrains Mono` | 700 | 16px |

### 12.3. Effects

- **Glassmorphism**: All floating panels use `backdrop-blur-md` with `bg-opacity-80`.
- **Border glow**: Active/selected panels have a 1px border with `cyan-500/30` opacity.
- **Micro-animations**:
  - Sidebar collapse/expand: 200ms ease-out slide.
  - Drawer expand: 250ms spring animation.
  - Citizen selection: Ring pulse animation (0.3s ease-in-out infinite).
  - Data update flash: Brief 150ms background highlight on cells that changed value.
- **Hover effects**: Cards and table rows show `bg-elevated` on hover with 100ms transition.

---

## 13. Feature–Endpoint Matrix & Gaps

This table maps every UI feature to its data source. Features marked with 🔮 have **no API endpoint** and must be implemented as client-side computations or scaffolded for future backend support.

| Feature | Data Source | API Endpoint | Status |
|---|---|---|---|
| Map — citizen dots | Server | `GET /api/v1/citizens/map` | ✅ Available |
| Map — entity sprites | Server | `GET /api/v1/world/entities/map` | ✅ Available |
| Map — terrain chunks | Server | `GET /api/v1/world/chunks` | ✅ Available |
| Map — zone boundaries | Server | `GET /api/v1/world/zones` | ✅ Available |
| Map — ghost trails | Client store | History buffer | ✅ Client-only |
| Map — day/night lighting | Server | `GET /api/v1/world/environment` | ✅ Available |
| Header — simulation clock | Server | `X-Sim-Tick` header + `/environment` | ✅ Available |
| Header — global search | Client store | In-memory filter | 🔮 Client-only |
| Header — network status | Client | Polling latency measurement | 🔮 Client-only |
| Inspector — full detail | Server | `GET /api/v1/citizens/{uuid}` | ✅ Available |
| Inspector — cognition | Server | `GET /api/v1/citizens/{uuid}/cognition` | ✅ Available |
| Inspector — biometrics chart | Server | `biometrics[]` in citizen detail response | ✅ Available |
| Census — citizen table | Server + store | `GET /api/v1/citizens` filtered by bounds | ✅ Available |
| Census — semantic filter | Client store | In-memory text filter | 🔮 Client-only |
| Pinning system | Client store | Individual `/citizens/{uuid}` polls | ✅ Available |
| Sidebar — homeostasis dials | Client store | Aggregated from citizen data | 🔮 Client-only, no `/stats` endpoint |
| Sidebar — layer manager | Client | UI state only | ✅ Client-only |
| Sidebar — RAM monitor | Client | `performance.memory` API + buffer size estimate | 🔮 Client-only |
| Sidebar — retention config | Client | `localStorage` persistence | ✅ Client-only |
| Analytics — population chart | Client store | Aggregated from citizen data | 🔮 Client-only |
| Analytics — vitality scatter | Client store | Aggregated from citizen data | 🔮 Client-only |
| Analytics — profession treemap | Client store | Aggregated from citizen data | 🔮 Client-only |
| Analytics — master table | Client store | All tracked citizens | 🔮 Client-only |
| Analytics — export CSV/JSON | Client store | Buffer serialisation | 🔮 Client-only |
| Economic overlay layer | — | — | 🔮 **No endpoint. Scaffold UI toggle; disable until API available** |
| Director influence zones | — | — | 🔮 **No endpoint. Scaffold UI toggle; disable until API available** |

---

## 14. Quality Assurance & Resilience

### 14.1. Desynchronisation Detection

- Compare `useWorldStore.currentTick` with the latest `X-Sim-Tick` from responses.
- If they diverge by more than **10 ticks**, display a ⚠ warning badge in the header Status Indicator.
- The warning auto-clears when ticks re-align.

### 14.2. Disconnection & Retry

- If polling fails **3 consecutive times** (any endpoint):
  1. Activate **Extrapolation Mode**: Continue moving citizen sprites along their last known velocity vector for up to 2 seconds.
  2. Show a "Reconnecting..." overlay with a pulsing animation.
  3. Enter exponential backoff (1s, 2s, 4s, 8s) until connection is restored.
  4. On reconnection, perform a full state refresh (all endpoints).

### 14.3. Null Safety in Mappers

All DTO-to-Domain mappers must gracefully handle:
- `null` or `undefined` fields → use sensible defaults (e.g., `vitality: 0`, `name: "Unknown"`).
- Unexpected types → coerce or skip (e.g., string where number expected).
- Missing nested objects → return empty structures rather than crashing.

### 14.4. Memory Safety

- The pruning system runs after every merge operation.
- If `performance.memory?.usedJSHeapSize` exceeds `ramLimitMB`, trigger an aggressive prune (keep only last 60 seconds of history).
- Log estimated memory usage to console in development mode.

---

## 15. Implementation Guidelines for AI Assistants

When using this document to implement Caosmos Observer, follow these directives:

### 15.1. Project Initialisation

```bash
npx -y create-vite@latest ./ -- --template react-ts
npm install zustand @tanstack/react-query pixi.js recharts react-router
npm install -D tailwindcss @tailwindcss/vite
```

### 15.2. Implementation Order

1. **Foundation**: Set up Vite + Tailwind config, define colour tokens and typography in `index.css`, configure Tailwind theme extension.
2. **Domain Layer**: Create all TypeScript interfaces in `core/entities/`. These are pure types with no dependencies.
3. **Data Layer**: Implement `httpClient.ts` with X-Sim-Tick interceptor, then API clients and mappers. Ensure mappers are null-safe from the start.
4. **Store Layer**: Implement Zustand stores starting with `useWorldStore` (the most critical). Include merge and prune logic.
5. **Layout Shell**: Build `AppShell`, `Header`, sidebars, and drawer. Use CSS Grid. Ensure responsive breakpoints work.
6. **Map Engine**: Initialize PixiJS in `MapViewport`. Implement layers in order: Terrain → Zones → Entities → Citizens → Trails.
7. **Polling Integration**: Wire TanStack Query hooks with dynamic intervals. Connect viewport bounds to query keys.
8. **Inspector Panel**: Build the right sidebar with all citizen detail components.
9. **Census Table**: Implement the bottom drawer with sortable/filterable table.
10. **Analytics View**: Build the full-screen dashboard with charts.
11. **Polish**: Add animations, glassmorphism effects, hover states, keyboard shortcuts.

### 15.3. Code Style Rules

- **Strict TypeScript**: No `any` types. Use proper generics and discriminated unions.
- **Named exports only**: No default exports (except pages for lazy loading).
- **Component files**: One component per file. Co-locate component-specific styles.
- **Store immutability**: Use Zustand's `immer` middleware or manual spread patterns for all state updates.
- **No prop drilling**: Components access store data via hooks, not through props passed 5 levels deep.

### 15.4. Aesthetic Reminders

- The UI must look like a **futuristic command centre**, not a standard admin dashboard.
- Every panel must have **glassmorphism** (blur + transparency).
- Data values should have **subtle glow effects** on update.
- The map background should feel dark and atmospheric, not flat white.
- Citizen sprites must **animate** — they should pulse, trail, and indicate state visually.
- Use **monospace fonts** for all numerical data (ticks, coordinates, vitality values).