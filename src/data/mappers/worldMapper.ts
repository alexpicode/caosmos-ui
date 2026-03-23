import type {
  WorldEntitySummary,
  WorldEntityInMap,
  ChunkInfo,
  Zone,
  WorldEnvironment,
  Vector3,
} from '@core/entities';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Raw = any;

const str = (v: unknown, fallback = '') =>
  typeof v === 'string' ? v : fallback;
const num = (v: unknown, fallback = 0) =>
  typeof v === 'number' && isFinite(v) ? v : fallback;
const arr = <T>(v: unknown): T[] => (Array.isArray(v) ? v : []);

function mapVector3(raw: Raw): Vector3 {
  return { x: num(raw?.x), y: num(raw?.y), z: num(raw?.z) };
}

export function mapWorldEntitySummary(raw: Raw): WorldEntitySummary {
  const props: Record<string, unknown> =
    typeof raw?.properties === 'object' && raw.properties ? raw.properties : {};
  return {
    id: str(raw?.id),
    type: str(raw?.type, 'UNKNOWN'),
    x: num(raw?.x),
    y: num(raw?.y),
    z: num(raw?.z),
    displayName: str(raw?.displayName, raw?.type ?? 'Unknown Entity'),
    properties: props,
  };
}

export function mapWorldEntityInMap(raw: Raw): WorldEntityInMap {
  return {
    id: str(raw?.id),
    type: str(raw?.type, 'UNKNOWN'),
    position: mapVector3(raw?.position),
  };
}

export function mapChunkInfo(raw: Raw): ChunkInfo {
  return {
    gridX: num(raw?.gridX),
    gridZ: num(raw?.gridZ),
    size: num(raw?.size, 16),
    entityCount: num(raw?.entityCount),
    movementCost: num(raw?.movementCost, 1),
  };
}

export function mapZone(raw: Raw): Zone {
  return {
    id: str(raw?.id),
    name: str(raw?.name, 'Unknown Zone'),
    type: str(raw?.type, 'GENERIC'),
    center: mapVector3(raw?.center),
    width: num(raw?.width, 10),
    length: num(raw?.length, 10),
  };
}

export function mapEnvironment(raw: Raw): WorldEnvironment {
  return {
    date: {
      day: num(raw?.date?.day, 1),
      time: str(raw?.date?.time, '12:00'),
    },
    environment: {
      terrainType: str(raw?.environment?.terrainType, 'PLAINS'),
      tags: arr<string>(raw?.environment?.tags),
      lightLevel: str(raw?.environment?.lightLevel, 'DAY'),
    },
  };
}
