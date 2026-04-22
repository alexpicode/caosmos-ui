import { MapViewport } from '@presentation/map/MapViewport';
import {
  useCitizenPolling,
  useWorldObjectPolling,
  useChunkPolling,
  useZonePolling,
  useEnvironmentPolling,
} from '@shared/hooks/usePolling';

export function TacticalMapView() {
  // Activate all polling hooks
  useCitizenPolling();
  useWorldObjectPolling();
  useChunkPolling();
  useZonePolling();
  useEnvironmentPolling();

  return <MapViewport />;
}
