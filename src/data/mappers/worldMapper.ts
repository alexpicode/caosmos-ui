import type { 
  WorldObject, 
  WorldObjectInMap, 
  ChunkInfo, 
  Zone, 
  WorldEnvironment,
  Vector3
} from '@core/entities';

type Raw = any;

const str = (val: any, fallback = ''): string => String(val ?? fallback);
const num = (val: any, fallback = 0): number => {
  const n = Number(val);
  return isNaN(n) ? fallback : n;
};

export function mapVector3(raw: any): Vector3 {
  return { x: num(raw?.x), y: num(raw?.y), z: num(raw?.z) };
}

export function mapWorldObject(raw: any): WorldObject {
  return {
    id: String(raw?.id || ''),
    type: String(raw?.type || 'UNKNOWN'),
    x: Number(raw?.x || 0),
    y: Number(raw?.y || 0),
    z: Number(raw?.z || 0),
    displayName: String(raw?.displayName || raw?.id || 'Unknown Object'),
    category: raw?.category ? String(raw.category) : undefined,
    owned: raw?.owned ? String(raw.owned) : null,
    tags: Array.isArray(raw?.tags) ? raw.tags.map(String) : [],
    properties: raw?.properties || {},
  };
}

export function mapWorldObjectInMap(raw: Raw): WorldObjectInMap {
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
    movementCost: num(raw?.movementCost, 1.0),
  };
}

export function mapZone(raw: Raw): Zone {
  return {
    id: str(raw?.id),
    name: str(raw?.name, 'Unnamed Zone'),
    type: str(raw?.type, 'UNKNOWN'),
    category: raw?.category ? str(raw.category) : undefined,
    owned: raw?.owned ? str(raw.owned) : null,
    tags: Array.isArray(raw?.tags) ? raw.tags.map((t: string) => str(t)) : [],
    isEntryRestricted: !!raw?.isEntryRestricted,
    parentZoneId: raw?.parentZoneId ? str(raw.parentZoneId) : null,
    center: mapVector3(raw?.center),
    width: num(raw?.width),
    length: num(raw?.length),
  };
}

export function mapEnvironment(raw: Raw): WorldEnvironment {
  return {
    date: {
      day: num(raw?.date?.day, 1),
      time: str(raw?.date?.time, '06:00'),
    },
    environment: {
      terrainType: str(raw?.environment?.terrainType, 'UNKNOWN'),
      tags: Array.isArray(raw?.environment?.tags) ? raw.environment.tags.map(str) : [],
      lightLevel: str(raw?.environment?.lightLevel, 'NORMAL'),
    },
  };
}
