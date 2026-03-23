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
  target: string;
  completed: boolean;
}

export interface CitizenPerception {
  identity: Identity;
  status: CitizenStatus;
  equipment: Equipment;
  inventory: Inventory;
  lastAction: LastAction | null;
  activeTask: ActiveTask | null;
  position: Vector3;
}

export interface BiometricsEntry {
  entityId: string;
  tick: number;
  vitality: number;
  energy: number;
}

export interface CitizenDetail {
  manifestId: string;
  perception: CitizenPerception;
  currentAction: LastAction | null;
  biometrics: BiometricsEntry[];
}

export interface CognitionEntry {
  entityId: string;
  tick: number;
  thoughtProcess: string;
  actionTarget: string;
}

export interface WorldEntitySummary {
  id: string;
  type: string;
  x: number;
  y: number;
  z: number;
  displayName: string;
  properties: Record<string, unknown>;
}

export interface WorldEntityInMap {
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
