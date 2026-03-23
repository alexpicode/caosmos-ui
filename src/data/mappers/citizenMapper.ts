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
  BiometricsEntry,
  CognitionEntry,
  Vector3,
} from '@core/entities';

// Helpers for null safety
const str = (v: unknown, fallback = 'Unknown') =>
  typeof v === 'string' && v.length > 0 ? v : fallback;
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
    target: str(raw.target, ''),
    completed: bool(raw.completed),
  };
}

function mapPerception(raw: Raw): CitizenPerception {
  return {
    identity: mapIdentity(raw?.identity),
    status: mapStatus(raw?.status),
    equipment: mapEquipment(raw?.equipment),
    inventory: mapInventory(raw?.inventory),
    lastAction: mapLastAction(raw?.lastAction),
    activeTask: mapActiveTask(raw?.activeTask),
    position: mapVector3(raw?.position),
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

export function mapCitizenDetail(raw: Raw): CitizenDetail {
  const biometrics: BiometricsEntry[] = arr<Raw>(raw?.biometrics).map((b: Raw) => ({
    entityId: str(b?.entityId, ''),
    tick: num(b?.tick),
    vitality: num(b?.vitality, 100),
    energy: num(b?.energy, 100),
  }));

  return {
    manifestId: str(raw?.manifest_id, ''),
    perception: mapPerception(raw?.perception),
    currentAction: mapLastAction(raw?.currentAction),
    biometrics,
  };
}

export function mapCognitionEntry(raw: Raw): CognitionEntry {
  return {
    entityId: str(raw?.entityId, ''),
    tick: num(raw?.tick),
    thoughtProcess: str(raw?.thoughtProcess, ''),
    actionTarget: str(raw?.actionTarget, ''),
  };
}
