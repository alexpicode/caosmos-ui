import type {
  WorldObject,
  ChunkInfo,
  Zone,
  WorldEnvironment,
  BoundingBox,
} from '@core/entities';

export interface WorldRepository {
  getWorldObjects(bounds?: BoundingBox, type?: string): Promise<WorldObject[]>;
  getChunks(bounds: BoundingBox): Promise<ChunkInfo[]>;
  getZones(): Promise<Zone[]>;
  getEnvironment(): Promise<WorldEnvironment>;
}
