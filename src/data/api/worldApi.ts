import { httpClient } from './httpClient';
import type { BoundingBox } from '@core/entities';

const WORLD_BASE = '/api/v1/world';

function boundsToParams(bounds?: BoundingBox) {
  if (!bounds) return {};
  return {
    minX: bounds.minX,
    minZ: bounds.minZ,
    maxX: bounds.maxX,
    maxZ: bounds.maxZ,
  };
}

function requiredBoundsToParams(bounds: BoundingBox) {
  return {
    minX: bounds.minX,
    minZ: bounds.minZ,
    maxX: bounds.maxX,
    maxZ: bounds.maxZ,
  };
}

export const worldApi = {
  getEntities: (bounds?: BoundingBox, type?: string) =>
    httpClient.get(`${WORLD_BASE}/entities`, { ...boundsToParams(bounds), type }),

  getEntitiesForMap: (bounds?: BoundingBox, type?: string) =>
    httpClient.get(`${WORLD_BASE}/entities/map`, { ...boundsToParams(bounds), type }),

  getChunks: (bounds: BoundingBox) =>
    httpClient.get(`${WORLD_BASE}/chunks`, requiredBoundsToParams(bounds)),

  getZones: () =>
    httpClient.get(`${WORLD_BASE}/zones`),

  getEnvironment: () =>
    httpClient.get(`${WORLD_BASE}/environment`),
};
