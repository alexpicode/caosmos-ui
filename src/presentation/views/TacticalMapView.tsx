import { MapViewport } from '@presentation/map/MapViewport';
import {
  useCitizenPolling,
  useEntityPolling,
  useChunkPolling,
  useZonePolling,
  useEnvironmentPolling,
} from '@shared/hooks/usePolling';

export function TacticalMapView() {
  // Activate all polling hooks
  useCitizenPolling();
  useEntityPolling();
  useChunkPolling();
  useZonePolling();
  useEnvironmentPolling();

  return <MapViewport />;
}
