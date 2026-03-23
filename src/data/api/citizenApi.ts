import { httpClient } from './httpClient';
import type { BoundingBox } from '@core/entities';

const CITIZENS_BASE = '/api/v1/citizens';

function boundsToParams(bounds?: BoundingBox) {
  if (!bounds) return {};
  return {
    minX: bounds.minX,
    minZ: bounds.minZ,
    maxX: bounds.maxX,
    maxZ: bounds.maxZ,
  };
}

export const citizenApi = {
  getAll: (bounds?: BoundingBox) =>
    httpClient.get(CITIZENS_BASE, boundsToParams(bounds)),

  getForMap: (bounds?: BoundingBox) =>
    httpClient.get(`${CITIZENS_BASE}/map`, boundsToParams(bounds)),

  getDetail: (uuid: string) =>
    httpClient.get(`${CITIZENS_BASE}/${uuid}`),

  getCognition: (uuid: string, sinceTick?: number) =>
    httpClient.get(`${CITIZENS_BASE}/${uuid}/cognition`, sinceTick !== undefined ? { sinceTick } : {}),
};
