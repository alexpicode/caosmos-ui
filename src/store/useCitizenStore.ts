import { create } from 'zustand';
import type { CitizenDetail, CognitionEntry } from '@core/entities';

interface CitizenStoreState {
  selectedCitizenId: string | null;
  pinnedCitizenIds: Set<string>;
  citizenDetail: CitizenDetail | null;
  cognitionHistory: CognitionEntry[];
  lastCognitionTick: number;

  selectCitizen: (uuid: string | null) => void;
  pinCitizen: (uuid: string) => void;
  unpinCitizen: (uuid: string) => void;
  setCitizenDetail: (detail: CitizenDetail) => void;
  setCognition: (entries: CognitionEntry[]) => void;
  appendCognition: (entries: CognitionEntry[], tick: number) => void;
}

export const useCitizenStore = create<CitizenStoreState>()((set) => ({
  selectedCitizenId: null,
  pinnedCitizenIds: new Set(),
  citizenDetail: null,
  cognitionHistory: [],
  lastCognitionTick: 0,

  selectCitizen(uuid) {
    set({ selectedCitizenId: uuid, citizenDetail: null, cognitionHistory: [], lastCognitionTick: 0 });
  },

  pinCitizen(uuid) {
    set(state => {
      const next = new Set(state.pinnedCitizenIds);
      next.add(uuid);
      return { pinnedCitizenIds: next };
    });
  },

  unpinCitizen(uuid) {
    set(state => {
      const next = new Set(state.pinnedCitizenIds);
      next.delete(uuid);
      return { pinnedCitizenIds: next };
    });
  },

  setCitizenDetail(detail) {
    set({ citizenDetail: detail });
  },

  setCognition(entries) {
    set({ cognitionHistory: entries });
  },

  appendCognition(entries, tick) {
    const MAX_COGNITION_ENTRIES = 200;
    const currentState = useCitizenStore.getState();
    const currentMax = currentState.lastCognitionTick;

    // Use the max tick from entries as the primary source of truth for "sinceTick"
    const entriesMaxTick = entries.length > 0 
      ? Math.max(...entries.map(e => e.tick)) 
      : 0;
    
    // Fallback to simulation tick only if entries are empty or simulation is further ahead
    const nextTick = Math.max(currentMax, entriesMaxTick, tick);

    if (entries.length === 0) {
      set({ lastCognitionTick: nextTick });
      return;
    }
    
    set(state => {
      // Avoid adding duplicate entries (by tick) if they already exist
      const existingTicks = new Set(state.cognitionHistory.map(e => e.tick));
      const newEntries = entries.filter(e => !existingTicks.has(e.tick));
      
      if (newEntries.length === 0) {
        return { lastCognitionTick: nextTick };
      }

      const merged = [...state.cognitionHistory, ...newEntries];
      // Keep only the last 200 entries
      const pruned = merged.slice(-MAX_COGNITION_ENTRIES);
      
      return {
        cognitionHistory: pruned,
        lastCognitionTick: nextTick
      };
    });
  },
}));
