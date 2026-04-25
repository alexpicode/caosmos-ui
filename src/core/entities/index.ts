// Core domain entities — no external dependencies

export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface HistoryEntry {
  tick: number;
  clientTimestamp: number;
  position: { x: number; z: number };
  vitality?: number;
  currentGoal?: string;
  state?: string;
}

export interface TrackedEntity<T> {
  id: string;
  type: string;
  metadata: {
    name: string;
    traits?: string[];
  };
  history: HistoryEntry[];
  current: T;
}

export interface CitizenSummary {
  uuid: string;
  name: string;
  x: number;
  y: number;
  z: number;
  state: string;
  currentGoal: string;
  vitality: number;
  walkingSpeed?: number;
}

export interface CitizenInMap {
  uuid: string;
  x: number;
  z: number;
  state: string;
}

export interface EquippedItem {
  id: string;
  name: string;
  tags: string[];
}

export interface InventoryItem {
  id: string;
  name: string;
  tags: string[];
  quantity: number;
}

export interface InventoryCapacity {
  usedSlots: number;
  maxSlots: number;
  status: string;
}

export interface Inventory {
  capacity: InventoryCapacity;
  items: InventoryItem[];
}

export interface Equipment {
  leftHand: EquippedItem | null;
  rightHand: EquippedItem | null;
}

export interface Identity {
  name: string;
  traits: string[];
  skills: Record<string, number>;
}

export interface CitizenStatus {
  vitality: number;
  hunger: number;
  energy: number;
  stress: number;
}

export interface LastAction {
  type: string;
  status: string;
  reasoningWas: string;
  resultMessage: string;
  parameters: Record<string, unknown>;
}

export interface ActiveTask {
  type: string;
  goal: string;
  targetId?: string;
  targetName?: string;
  targetDescription?: string;
  completed: boolean;
}

export interface CognitiveAnchor {
  name: string;
  distance: number;
  range: string;
  direction: string;
}

export interface ExplorationStatus {
  percentage: number;
  fullyExplored: boolean;
}

export interface RememberedPOI {
  id: string;
  name: string;
  category: string;
  tags: string[];
  relativeDirection: string;
}

export interface ZoneMemory {
  zoneId: string;
  name: string;
  zoneType: string;
  category: string;
  exploration: ExplorationStatus;
  rememberedPOIs: RememberedPOI[];
}

export interface ZoneMemorySummary {
  zoneId: string;
  name: string;
  zoneType: string;
  category: string;
  explorationPercentage: number;
  fullyExplored: boolean;
}

export interface MentalMap {
  home?: CognitiveAnchor;
  nearestCity?: CognitiveAnchor;
  currentZoneMemory?: ZoneMemory;
  knownZones: ZoneMemorySummary[];
}

export interface CitizenPerception {
  identity: Identity;
  status: CitizenStatus;
  state: string;
  equipment: Equipment;
  inventory: Inventory;
  lastAction: LastAction | null;
  activeTask: ActiveTask | null;
  position: Vector3;
  mentalMap?: MentalMap;
  recentMessages: SpeechMessage[];
  coins: number;
}


export interface CitizenConfig {
  walkingSpeed: number;
}

export interface SpeechMessage {
  sourceName: string;
  targetName: string;
  message: string;
  tone: string;
}

export interface ExplorationProgress {
  name: string;
  percentage: number;
}

export interface CitizenDetail {
  uuid: string;
  config?: CitizenConfig;
  perception: CitizenPerception;
  currentAction: LastAction | null;
  recentMessages: SpeechMessage[];
  currentZone: string | null;
  explorationProgress: ExplorationProgress[];
  coins: number;
}

export interface CognitionEntry {
  citizenId: string;
  tick: number;
  reasoning: string;
  actionTarget: string;
}

export interface WorldObject {
  id: string;
  type: string;
  x: number;
  y: number;
  z: number;
  displayName: string;
  category?: string;
  owned?: string | null;
  tags: string[];
  properties: Record<string, unknown>;
}

export interface WorldObjectInMap {
  id: string;
  type: string;
  position: Vector3;
}

export interface ChunkInfo {
  gridX: number;
  gridZ: number;
  size: number;
  entityCount: number;
  movementCost: number;
}

export interface Zone {
  id: string;
  name: string;
  type: string;
  category?: string;
  owned?: string | null;
  tags: string[];
  isEntryRestricted: boolean;
  parentZoneId?: string | null;
  center: Vector3;
  width: number;
  length: number;
}

export interface WorldDate {
  day: number;
  time: string;
}

export interface Environment {
  terrainType: string;
  tags: string[];
  lightLevel: string;
}

export interface WorldEnvironment {
  date: WorldDate;
  environment: Environment;
}

export interface BoundingBox {
  minX: number;
  minZ: number;
  maxX: number;
  maxZ: number;
}
