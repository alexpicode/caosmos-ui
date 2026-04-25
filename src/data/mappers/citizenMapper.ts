import type {
  CitizenSummary,
  CitizenDetail,
  CitizenPerception,
  Identity,
  CitizenStatus,
  Equipment,
  Inventory,
  EquippedItem,
  InventoryItem,
  LastAction,
  ActiveTask,
  MentalMap,
  CognitiveAnchor,
  ZoneMemory,
  ZoneMemorySummary,
  RememberedPOI,
  CognitionEntry,
  Vector3,
  SpeechMessage,
  ExplorationProgress,
} from '@core/entities';

// Helpers for null safety
const str = (v: unknown, fallback = 'Unknown') => {
  if (v === null || v === undefined) return fallback;
  const s = String(v).trim();
  return s.length > 0 ? s : fallback;
};
const num = (v: unknown, fallback = 0) =>
  typeof v === 'number' && isFinite(v) ? v : fallback;
const bool = (v: unknown) => v === true;
const arr = <T>(v: unknown): T[] => (Array.isArray(v) ? v : []);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Raw = any;

function mapVector3(raw: Raw): Vector3 {
  return { x: num(raw?.x), y: num(raw?.y), z: num(raw?.z) };
}

function mapEquippedItem(raw: Raw): EquippedItem | null {
  if (!raw) return null;
  return { id: str(raw.id, ''), name: str(raw.name), tags: arr<string>(raw.tags) };
}

function mapInventoryItem(raw: Raw): InventoryItem {
  return {
    id: str(raw?.id, ''),
    name: str(raw?.name),
    tags: arr<string>(raw?.tags),
    quantity: num(raw?.quantity, 1),
  };
}

function mapInventory(raw: Raw): Inventory {
  return {
    capacity: {
      usedSlots: num(raw?.capacity?.usedSlots),
      maxSlots: num(raw?.capacity?.maxSlots, 10),
      status: str(raw?.capacity?.status, 'OK'),
    },
    items: arr<Raw>(raw?.items).map(mapInventoryItem),
  };
}

function mapEquipment(raw: Raw): Equipment {
  return {
    leftHand: mapEquippedItem(raw?.leftHand),
    rightHand: mapEquippedItem(raw?.rightHand),
  };
}

function mapIdentity(raw: Raw): Identity {
  const skills: Record<string, number> = {};
  if (raw?.skills && typeof raw.skills === 'object') {
    for (const [k, v] of Object.entries(raw.skills)) {
      skills[k] = num(v);
    }
  }
  return {
    name: str(raw?.name),
    traits: arr<string>(raw?.traits),
    skills,
  };
}

function mapStatus(raw: Raw): CitizenStatus {
  return {
    vitality: num(raw?.vitality, 100),
    hunger: num(raw?.hunger),
    energy: num(raw?.energy, 100),
    stress: num(raw?.stress),
  };
}

function mapLastAction(raw: Raw): LastAction | null {
  if (!raw) return null;
  return {
    type: str(raw.type, 'IDLE'),
    status: str(raw.status, 'OK'),
    reasoningWas: str(raw.reasoningWas, ''),
    resultMessage: str(raw.resultMessage, ''),
    parameters: typeof raw.parameters === 'object' && raw.parameters ? raw.parameters : {},
  };
}

function mapActiveTask(raw: Raw): ActiveTask | null {
  if (!raw) return null;
  return {
    type: str(raw.type, 'NONE'),
    goal: str(raw.goal, ''),
    targetId: raw.targetId ? str(raw.targetId) : undefined,
    targetName: raw.targetName ? str(raw.targetName) : undefined,
    targetDescription: raw.targetDescription ? str(raw.targetDescription) : undefined,
    completed: bool(raw.completed),
  };
}

function mapCognitiveAnchor(raw: Raw): CognitiveAnchor | undefined {
  if (!raw) return undefined;
  return {
    name: str(raw.name),
    distance: num(raw.distance),
    range: str(raw.range, 'UNKNOWN'),
    direction: str(raw.direction, 'CENTER'),
  };
}

function mapRememberedPOI(raw: Raw): RememberedPOI {
  return {
    id: str(raw?.id, ''),
    name: str(raw?.name),
    category: str(raw?.category, 'UNKNOWN'),
    tags: arr<string>(raw?.tags),
    relativeDirection: str(raw?.relativeDirection, 'UNKNOWN'),
  };
}

function mapZoneMemory(raw: Raw): ZoneMemory | undefined {
  if (!raw) return undefined;
  return {
    zoneId: str(raw.zoneId, ''),
    name: str(raw.name),
    zoneType: str(raw.zoneType, 'UNKNOWN'),
    category: str(raw.category, 'UNKNOWN'),
    exploration: {
      percentage: num(raw.exploration?.percentage),
      fullyExplored: bool(raw.exploration?.fullyExplored),
    },
    rememberedPOIs: arr<Raw>(raw.rememberedPOIs).map(mapRememberedPOI),
  };
}

function mapZoneMemorySummary(raw: Raw): ZoneMemorySummary {
  return {
    zoneId: str(raw?.zoneId, ''),
    name: str(raw?.name),
    zoneType: str(raw?.zoneType, 'UNKNOWN'),
    category: str(raw?.category, 'UNKNOWN'),
    explorationPercentage: num(raw?.explorationPercentage),
    fullyExplored: bool(raw?.fullyExplored),
  };
}

function mapMentalMap(raw: Raw): MentalMap {
  return {
    home: mapCognitiveAnchor(raw?.home),
    nearestCity: mapCognitiveAnchor(raw?.nearestCity),
    currentZoneMemory: mapZoneMemory(raw?.currentZoneMemory),
    knownZones: arr<Raw>(raw?.knownZones).map(mapZoneMemorySummary),
  };
}

function mapPerception(raw: Raw): CitizenPerception {
  return {
    identity: mapIdentity(raw?.identity),
    status: mapStatus(raw?.status),
    state: str(raw?.state, 'IDLE'),
    equipment: mapEquipment(raw?.equipment),
    inventory: mapInventory(raw?.inventory),
    lastAction: mapLastAction(raw?.lastAction),
    activeTask: mapActiveTask(raw?.activeTask),
    position: mapVector3(raw?.position),
    mentalMap: mapMentalMap(raw?.mentalMap),
    recentMessages: arr<Raw>(raw?.recentMessages).map(mapSpeechMessage),
    coins: num(raw?.coins),
  };
}

export function mapCitizenSummary(raw: Raw): CitizenSummary {
  return {
    uuid: str(raw?.uuid, ''),
    name: str(raw?.name),
    x: num(raw?.x),
    y: num(raw?.y),
    z: num(raw?.z),
    state: str(raw?.state, 'IDLE'),
    currentGoal: str(raw?.currentGoal, '—'),
    vitality: num(raw?.vitality, 100),
  };
}

function mapSpeechMessage(raw: Raw): SpeechMessage {
  return {
    sourceName: str(raw?.sourceName, 'Unknown'),
    targetName: str(raw?.targetName, 'Someone'),
    message: str(raw?.message, ''),
    tone: str(raw?.tone, 'Neutral'),
  };
}

export function mapCitizenDetail(raw: Raw): CitizenDetail {
  return {
    uuid: str(raw?.uuid, ''),
    config: raw?.config ? {
      walkingSpeed: num(raw.config.walkingSpeed, 1.4)
    } : undefined,
    perception: mapPerception(raw?.perception),
    currentAction: mapLastAction(raw?.currentAction),
    recentMessages: arr<Raw>(raw?.recentMessages).map(mapSpeechMessage),
    currentZone: str(raw?.currentZone, undefined),
    explorationProgress: arr<Raw>(raw?.explorationProgress).map(p => ({
      name: str(p?.name),
      percentage: num(p?.percentage)
    })),
    coins: num(raw?.coins, 0),
  };
}

export function mapCognitionEntry(raw: Raw): CognitionEntry {
  return {
    citizenId: str(raw?.citizenId || raw?.entityId, ''),
    tick: num(raw?.tick),
    reasoning: str(raw?.reasoning || raw?.thoughtProcess, ''),
    actionTarget: str(raw?.actionTarget, ''),
  };
}
