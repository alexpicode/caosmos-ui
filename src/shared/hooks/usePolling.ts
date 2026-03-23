import { useQuery } from '@tanstack/react-query';
import { useUIStore } from '@store/useUIStore';
import { useWorldStore } from '@store/useWorldStore';
import { useCitizenStore } from '@store/useCitizenStore';
import { useConfigStore } from '@store/useConfigStore';
import { citizenApi } from '@data/api/citizenApi';
import { worldApi } from '@data/api/worldApi';
import { mapCitizenSummary, mapCitizenDetail, mapCognitionEntry } from '@data/mappers/citizenMapper';
import { mapWorldEntitySummary, mapChunkInfo, mapZone, mapEnvironment } from '@data/mappers/worldMapper';

/** Determine polling interval based on zoom and selection */
function usePollingInterval(): number {
  const zoom = useUIStore(s => s.zoomLevel);
  const selectedId = useCitizenStore(s => s.selectedCitizenId);
  const { pollingFocusMs, pollingMacroMs } = useConfigStore();

  if (selectedId) return pollingFocusMs;
  if (zoom < 0.3) return pollingMacroMs;
  return 2000;
}

/** Main citizen polling hook (viewport-bounded) */
export function useCitizenPolling() {
  const bounds = useUIStore(s => s.viewportBounds);
  const mergeCitizens = useWorldStore(s => s.mergeCitizens);
  const { retentionMinutes } = useConfigStore();
  const pruneHistory = useWorldStore(s => s.pruneHistory);
  const interval = usePollingInterval();
  const incFail = useUIStore(s => s.incrementFailures);
  const resetFail = useUIStore(s => s.resetFailures);
  const setStatus = useUIStore(s => s.setNetworkStatus);
  const setLastPoll = useUIStore(s => s.setLastPollMs);

  return useQuery({
    queryKey: ['citizens', bounds],
    queryFn: async () => {
      const start = Date.now();
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const raw = await citizenApi.getAll(bounds) as any[];
        const data = raw.map(mapCitizenSummary);
        const tick = useWorldStore.getState().serverTick;
        mergeCitizens(data, tick);
        pruneHistory(retentionMinutes * 60 * 1000);
        resetFail();
        setStatus(Date.now() - start > 2000 ? 'slow' : 'ok');
        setLastPoll(Date.now());
        return data;
      } catch (e) {
        incFail();
        const failures = useUIStore.getState().consoleFailures;
        setStatus(failures >= 3 ? 'error' : 'slow');
        throw e;
      }
    },
    refetchInterval: interval,
  });
}

/** World entities polling hook */
export function useEntityPolling() {
  const bounds = useUIStore(s => s.viewportBounds);
  const mergeEntities = useWorldStore(s => s.mergeEntities);
  const interval = usePollingInterval();

  return useQuery({
    queryKey: ['entities', bounds],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const raw = await worldApi.getEntities(bounds) as any[];
      const data = raw.map(mapWorldEntitySummary);
      const tick = useWorldStore.getState().serverTick;
      mergeEntities(data, tick);
      return data;
    },
    refetchInterval: interval,
  });
}

/** Chunks polling hook — only refetches when bounds change */
export function useChunkPolling() {
  const bounds = useUIStore(s => s.viewportBounds);
  const setChunks = useWorldStore(s => s.setChunks);

  return useQuery({
    queryKey: ['chunks', bounds],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const raw = await worldApi.getChunks(bounds) as any[];
      const data = raw.map(mapChunkInfo);
      setChunks(data);
      return data;
    },
    staleTime: 30_000,
  });
}

/** Zones — refetch every 30s */
export function useZonePolling() {
  const setZones = useWorldStore(s => s.setZones);

  return useQuery({
    queryKey: ['zones'],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const raw = await worldApi.getZones() as any[];
      const data = raw.map(mapZone);
      setZones(data);
      return data;
    },
    refetchInterval: 30_000,
  });
}

/** Environment — refetch every 10s */
export function useEnvironmentPolling() {
  const setEnvironment = useWorldStore(s => s.setEnvironment);

  return useQuery({
    queryKey: ['environment'],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const raw = await worldApi.getEnvironment() as any;
      const data = mapEnvironment(raw);
      setEnvironment(data);
      return data;
    },
    refetchInterval: 10_000,
  });
}

/** Citizen detail — fires when a citizen is selected */
export function useCitizenDetail(uuid: string | null) {
  const setCitizenDetail = useCitizenStore(s => s.setCitizenDetail);
  const { pollingFocusMs } = useConfigStore();

  return useQuery({
    queryKey: ['citizenDetail', uuid],
    queryFn: async () => {
      if (!uuid) return null;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const raw = await citizenApi.getDetail(uuid) as any;
      const data = mapCitizenDetail(raw);
      setCitizenDetail(data);
      return data;
    },
    enabled: !!uuid,
    refetchInterval: pollingFocusMs,
  });
}

/** Cognition history for selected citizen */
export function useCognitionPolling(uuid: string | null) {
  const setCognition = useCitizenStore(s => s.setCognition);
  const currentTick = useWorldStore(s => s.currentTick);
  const { pollingFocusMs } = useConfigStore();

  return useQuery({
    queryKey: ['cognition', uuid],
    queryFn: async () => {
      if (!uuid) return [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const raw = await citizenApi.getCognition(uuid, Math.max(0, currentTick - 20)) as any[];
      const data = raw.map(mapCognitionEntry);
      setCognition(data);
      return data;
    },
    enabled: !!uuid,
    refetchInterval: pollingFocusMs,
  });
}
