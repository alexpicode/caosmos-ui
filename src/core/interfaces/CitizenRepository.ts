import type {
  CitizenSummary,
  CitizenDetail,
  CognitionEntry,
  BoundingBox,
} from '@core/entities';

export interface CitizenRepository {
  getCitizens(bounds?: BoundingBox): Promise<CitizenSummary[]>;
  getCitizenDetail(uuid: string): Promise<CitizenDetail>;
  getCognition(uuid: string, sinceTick?: number): Promise<CognitionEntry[]>;
}
