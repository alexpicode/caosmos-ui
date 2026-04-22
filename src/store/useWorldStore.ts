import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { enableMapSet } from 'immer';
import type {
  CitizenSummary,
  WorldObject,
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
  worldObjects: Map<string, TrackedEntity<WorldObject>>;

  zones: Zone[];
  chunks: ChunkInfo[];
  environment: WorldEnvironment | null;

  setTick: (tick: number) => void;
  mergeCitizens: (data: CitizenSummary[], tick: number) => void;
  mergeWorldObjects: (data: WorldObject[], tick: number) => void;
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
    worldObjects: new Map(),
    zones: [],
    chunks: [],
    environment: null,

    setTick(tick) {
      set(state => {
        state.serverTick = tick;
        state.desynced = Math.abs(tick - state.currentTick) > 10 && state.currentTick > 0;
      });
    },

    mergeCitizens(data, tick) {
      set(state => {
        const isMacro = data.length > 1;
        if (isMacro && tick < state.currentTick && state.currentTick > 0) return;
        if (isMacro) state.currentTick = tick;

        for (const citizen of data) {
          const id = citizen.uuid;
          const existing = state.citizens.get(id);

          if (existing && tick < (existing.history[existing.history.length - 1]?.tick || 0)) {
            continue;
          }

          const entry: HistoryEntry = {
            tick,
            clientTimestamp: Date.now(),
            position: { x: citizen.x, z: citizen.z },
            vitality: citizen.vitality,
            currentGoal: citizen.currentGoal,
            state: citizen.state,
          };

          if (existing) {
            existing.history.push(entry);
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

    mergeWorldObjects(data, tick) {
      set(state => {
        const isMacro = data.length > 1;
        if (isMacro && tick < state.currentTick && state.currentTick > 0) return;
        if (isMacro) state.currentTick = tick;

        for (const obj of data) {
          const id = obj.id;
          const existing = state.worldObjects.get(id);

          if (existing && tick < (existing.history[existing.history.length - 1]?.tick || 0)) {
            continue;
          }

          const entry: HistoryEntry = {
            tick,
            clientTimestamp: Date.now(),
            position: { x: obj.x, z: obj.z },
          };

          if (existing) {
            existing.history.push(entry);
            if (existing.history.length > MAX_HISTORY_POINTS) {
              existing.history = downsample(existing.history);
            }
            existing.current = obj;
          } else {
            state.worldObjects.set(id, {
              id,
              type: obj.type.toLowerCase(),
              metadata: { name: obj.displayName },
              history: [entry],
              current: obj,
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
        state.worldObjects.forEach(entity => {
          entity.history = entity.history.filter(h => h.clientTimestamp > cutoff);
        });
      });
    },

    purgeAll() {
      set(state => {
        state.citizens.forEach(entity => { entity.history = []; });
        state.worldObjects.forEach(entity => { entity.history = []; });
      });
    },

    getCitizensInBounds(bounds) {
      const { citizens } = get();
      const resultMap = new Map<string, CitizenSummary>();
      
      citizens.forEach(tracked => {
        const { x, z, uuid } = tracked.current;
        if (!uuid || uuid === 'Unknown') return;
        
        if (x >= bounds.minX && x <= bounds.maxX && z >= bounds.minZ && z <= bounds.maxZ) {
          resultMap.set(uuid, tracked.current);
        }
      });
      
      return Array.from(resultMap.values());
    },
  }))
);
