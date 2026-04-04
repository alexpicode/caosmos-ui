import { useQuery } from '@tanstack/react-query';
import { useUIStore } from '@store/useUIStore';
import { useWorldStore } from '@store/useWorldStore';
import { useCitizenStore } from '@store/useCitizenStore';
import { useConfigStore } from '@store/useConfigStore';
import { citizenApi } from '@data/api/citizenApi';
import { worldApi } from '@data/api/worldApi';
import { mapCitizenSummary, mapCitizenDetail, mapCognitionEntry } from '@data/mappers/citizenMapper';
import { mapWorldObject, mapChunkInfo, mapZone, mapEnvironment } from '@data/mappers/worldMapper';
import { useStableBounds } from './useStableBounds';

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
  const rawBounds = useUIStore(s => s.viewportBounds);
  const zoom = useUIStore(s => s.zoomLevel);
  const { narrow: bounds } = useStableBounds(rawBounds, zoom);
  
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
        const response = await citizenApi.getAll(bounds) as { data: any[], tick: number };
        const data = response.data.map(mapCitizenSummary);
        mergeCitizens(data, response.tick);
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

/** World objects polling hook */
export function useWorldObjectPolling() {
  const rawBounds = useUIStore(s => s.viewportBounds);
  const zoom = useUIStore(s => s.zoomLevel);
  const { wide: bounds } = useStableBounds(rawBounds, zoom);
  
  const mergeWorldObjects = useWorldStore(s => s.mergeWorldObjects);
  // Objects update less frequently as requested (10s)
  const OBJECT_INTERVAL = 10_000;

  return useQuery({
    queryKey: ['worldObjects', bounds],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const response = await worldApi.getWorldObjects(bounds) as { data: any[], tick: number };
      const data = response.data.map(mapWorldObject);
      mergeWorldObjects(data, response.tick);
      return data;
    },
    refetchInterval: OBJECT_INTERVAL,
  });
}

/** Chunks polling hook — only refetches when bounds change */
export function useChunkPolling() {
  const rawBounds = useUIStore(s => s.viewportBounds);
  const zoom = useUIStore(s => s.zoomLevel);
  const { wide: bounds } = useStableBounds(rawBounds, zoom);
  const setChunks = useWorldStore(s => s.setChunks);

  return useQuery({
    queryKey: ['chunks', bounds],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const response = await worldApi.getChunks(bounds) as { data: any[], tick: number };
      const data = response.data.map(mapChunkInfo);
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
      const response = await worldApi.getZones() as { data: any[], tick: number };
      const data = response.data.map(mapZone);
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
      const response = await worldApi.getEnvironment() as { data: any, tick: number };
      const data = mapEnvironment(response.data);
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
      const response = await citizenApi.getDetail(uuid) as { data: any, tick: number };
      const data = mapCitizenDetail(response.data);
      setCitizenDetail(data);

      // Cross-sync: push to world store to update map immediately
      useWorldStore.getState().mergeCitizens([{
        uuid: data.uuid,
        name: data.perception.identity.name,
        x: data.perception.position.x,
        y: data.perception.position.y,
        z: data.perception.position.z,
        state: data.perception.state,
        currentGoal: data.perception.activeTask?.goal || 'Idle',
        vitality: data.perception.status.vitality,
        walkingSpeed: data.config?.walkingSpeed
      }], response.tick);

      return data;
    },
    enabled: !!uuid,
    refetchInterval: pollingFocusMs,
    refetchOnMount: 'always',
    refetchIntervalInBackground: true,
  });
}

/** Cognition history for selected citizen */
export function useCognitionPolling(uuid: string | null) {
  const appendCognition = useCitizenStore(s => s.appendCognition);
  const { pollingFocusMs } = useConfigStore();

  return useQuery({
    queryKey: ['cognition', uuid],
    queryFn: async () => {
      if (!uuid) return [];
      
      // Get the latest lastTick directly from store state to avoid closure staleness
      const lastTick = useCitizenStore.getState().lastCognitionTick;
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const response = await citizenApi.getCognition(uuid, lastTick) as { data: any[], tick: number };
      const data = response.data.map(mapCognitionEntry);
      
      // If response.tick is 0 (missing header), fallback to worldStore currentTick
      const simTick = response.tick || useWorldStore.getState().currentTick;
      
      appendCognition(data, simTick);
      return data;
    },
    enabled: !!uuid,
    refetchInterval: pollingFocusMs,
  });
}
