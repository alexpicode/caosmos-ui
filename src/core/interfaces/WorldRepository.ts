import type {
  WorldEntitySummary,
  WorldEntityInMap,
  ChunkInfo,
  Zone,
  WorldEnvironment,
  BoundingBox,
} from '@core/entities';

export interface WorldRepository {
  getEntities(bounds?: BoundingBox, type?: string): Promise<WorldEntitySummary[]>;
  getEntitiesForMap(bounds?: BoundingBox, type?: string): Promise<WorldEntityInMap[]>;
  getChunks(bounds: BoundingBox): Promise<ChunkInfo[]>;
  getZones(): Promise<Zone[]>;
  getEnvironment(): Promise<WorldEnvironment>;
}
