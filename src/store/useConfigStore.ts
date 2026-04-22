import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ConfigStoreState {
  retentionMinutes: number;
  pollingFocusMs: number;
  pollingMacroMs: number;
  ramLimitMB: number;

  setRetention: (minutes: number) => void;
  setPollingRates: (focus: number, macro: number) => void;
  setRamLimit: (mb: number) => void;
}

export const useConfigStore = create<ConfigStoreState>()(
  persist(
    (set) => ({
      retentionMinutes: 15,
      pollingFocusMs: 500,
      pollingMacroMs: 4000,
      ramLimitMB: 256,

      setRetention: (retentionMinutes) => set({ retentionMinutes }),
      setPollingRates: (pollingFocusMs, pollingMacroMs) =>
        set({ pollingFocusMs, pollingMacroMs }),
      setRamLimit: (ramLimitMB) => set({ ramLimitMB }),
    }),
    { name: 'caosmos-config' }
  )
);
