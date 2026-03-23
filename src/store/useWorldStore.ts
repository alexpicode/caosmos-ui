import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { enableMapSet } from 'immer';
import type {
  CitizenSummary,
  WorldEntitySummary,
  Zone,
  ChunkInfo,
  WorldEnvironment,
  TrackedEntity,
  HistoryEntry,
  BoundingBox,
} from '@core/entities';

enableMapSet();

const MAX_HISTORY_POINTS = 500;
const DOWNSAMPLE_KEEP_EVERY = 5;

interface WorldStoreState {
  currentTick: number;
  serverTick: number;
  desynced: boolean;

  citizens: Map<string, TrackedEntity<CitizenSummary>>;
  entities: Map<string, TrackedEntity<WorldEntitySummary>>;

  zones: Zone[];
  chunks: ChunkInfo[];
  environment: WorldEnvironment | null;

  setTick: (tick: number) => void;
  mergeCitizens: (data: CitizenSummary[], tick: number) => void;
  mergeEntities: (data: WorldEntitySummary[], tick: number) => void;
  setZones: (zones: Zone[]) => void;
  setChunks: (chunks: ChunkInfo[]) => void;
  setEnvironment: (env: WorldEnvironment) => void;
  pruneHistory: (retentionMs: number) => void;
  purgeAll: () => void;
  getCitizensInBounds: (bounds: BoundingBox) => CitizenSummary[];
}

function downsample(history: HistoryEntry[]): HistoryEntry[] {
  if (history.length <= MAX_HISTORY_POINTS) return history;
  return history.filter((_, i) => i % DOWNSAMPLE_KEEP_EVERY === 0);
}

export const useWorldStore = create<WorldStoreState>()(
  immer((set, get) => ({
    currentTick: 0,
    serverTick: 0,
    desynced: false,

    citizens: new Map(),
    entities: new Map(),
    zones: [],
    chunks: [],
    environment: null,

    setTick(tick) {
      set(state => {
        state.serverTick = tick;
        // If the most recently polled data is more than 10 ticks ahead of last stored tick
        state.desynced = Math.abs(tick - state.currentTick) > 10 && state.currentTick > 0;
      });
    },

    mergeCitizens(data, tick) {
      set(state => {
        state.currentTick = tick;
        for (const citizen of data) {
          const id = citizen.uuid;
          const entry: HistoryEntry = {
            tick,
            clientTimestamp: Date.now(),
            position: { x: citizen.x, z: citizen.z },
            vitality: citizen.vitality,
            currentGoal: citizen.currentGoal,
            state: citizen.state,
          };

          const existing = state.citizens.get(id);
          if (existing) {
            existing.history.push(entry);
            // Downsample if too large
            if (existing.history.length > MAX_HISTORY_POINTS) {
              existing.history = downsample(existing.history);
            }
            existing.current = citizen;
          } else {
            state.citizens.set(id, {
              id,
              type: 'citizen',
              metadata: { name: citizen.name, traits: [] },
              history: [entry],
              current: citizen,
            });
          }
        }
      });
    },

    mergeEntities(data, tick) {
      set(state => {
        for (const entity of data) {
          const id = entity.id;
          const entry: HistoryEntry = {
            tick,
            clientTimestamp: Date.now(),
            position: { x: entity.x, z: entity.z },
          };

          const existing = state.entities.get(id);
          if (existing) {
            existing.history.push(entry);
            if (existing.history.length > MAX_HISTORY_POINTS) {
              existing.history = downsample(existing.history);
            }
            existing.current = entity;
          } else {
            state.entities.set(id, {
              id,
              type: entity.type.toLowerCase(),
              metadata: { name: entity.displayName },
              history: [entry],
              current: entity,
            });
          }
        }
      });
    },

    setZones(zones) {
      set(state => { state.zones = zones; });
    },

    setChunks(chunks) {
      set(state => { state.chunks = chunks; });
    },

    setEnvironment(env) {
      set(state => { state.environment = env; });
    },

    pruneHistory(retentionMs) {
      const cutoff = Date.now() - retentionMs;
      set(state => {
        state.citizens.forEach(entity => {
          entity.history = entity.history.filter(h => h.clientTimestamp > cutoff);
        });
        state.entities.forEach(entity => {
          entity.history = entity.history.filter(h => h.clientTimestamp > cutoff);
        });
      });
    },

    purgeAll() {
      set(state => {
        state.citizens.forEach(entity => { entity.history = []; });
        state.entities.forEach(entity => { entity.history = []; });
      });
    },

    getCitizensInBounds(bounds) {
      const { citizens } = get();
      const result: CitizenSummary[] = [];
      citizens.forEach(tracked => {
        const { x, z } = tracked.current;
        if (x >= bounds.minX && x <= bounds.maxX && z >= bounds.minZ && z <= bounds.maxZ) {
          result.push(tracked.current);
        }
      });
      return result;
    },
  }))
);
