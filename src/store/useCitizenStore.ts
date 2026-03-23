import { create } from 'zustand';
import type { CitizenDetail, CognitionEntry } from '@core/entities';

interface CitizenStoreState {
  selectedCitizenId: string | null;
  pinnedCitizenIds: Set<string>;
  citizenDetail: CitizenDetail | null;
  cognitionHistory: CognitionEntry[];

  selectCitizen: (uuid: string | null) => void;
  pinCitizen: (uuid: string) => void;
  unpinCitizen: (uuid: string) => void;
  setCitizenDetail: (detail: CitizenDetail) => void;
  setCognition: (entries: CognitionEntry[]) => void;
}

export const useCitizenStore = create<CitizenStoreState>()((set) => ({
  selectedCitizenId: null,
  pinnedCitizenIds: new Set(),
  citizenDetail: null,
  cognitionHistory: [],

  selectCitizen(uuid) {
    set({ selectedCitizenId: uuid, citizenDetail: null, cognitionHistory: [] });
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
}));
