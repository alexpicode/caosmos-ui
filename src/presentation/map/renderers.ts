import { Container, Graphics, Text, TextStyle, Circle } from 'pixi.js';
import type { CitizenSummary, ChunkInfo, Zone, WorldObject } from '@core/entities';
import { 
  WORLD_SCALE, 
  CITIZEN_RADIUS, 
  CITIZEN_VISION_RANGE 
} from './MapConstants';

export { WORLD_SCALE, CITIZEN_RADIUS, CITIZEN_VISION_RANGE };
import { 
  worldToScreen, 
  citizenColor, 
  entityColor, 
  getVitalityHexColor 
} from './MapUtils';

export interface CitizenInterp {
  startX: number;
  startZ: number;
  currentX: number;
  currentZ: number;
  targetX: number;
  targetZ: number;
  startTime: number;
  duration: number;
  lastTick: number;
  isIdle: boolean;
}

export interface HistoryPoint {
  position: { x: number; z: number };
  clientTimestamp: number;
}

export function drawCitizenGlyph(
  g: Graphics, 
  c: CitizenSummary, 
  isSelected: boolean, 
  zoom: number
) {
  g.clear();
  const color = citizenColor(c.state);
  const vColor = getVitalityHexColor(c.vitality);

  // Level of Detail: Very low zoom, just draw a simple circle
  const isSimplified = zoom < 0.4;

  // Vision range circle (if selected)
  if (isSelected) {
    const visionRadius = CITIZEN_VISION_RANGE * WORLD_SCALE * zoom;
    g.circle(0, 0, visionRadius)
      .fill({ color: 0x06b6d4, alpha: 0.12 })
      .stroke({ color: 0x06b6d4, width: 1, alpha: 0.3 });
  }

  if (!isSimplified) {
    // Outer glow ring (vitality indicator)
    g.circle(0, 0, CITIZEN_RADIUS + 3)
      .fill({ color: vColor, alpha: 0.15 });

    // Vitality arc
    const vPct = c.vitality / 100;
    if (vPct > 0) {
      g.arc(0, 0, CITIZEN_RADIUS + 2, -Math.PI / 2, -Math.PI / 2 + 2 * Math.PI * vPct)
        .stroke({ color: vColor, width: 2, alpha: 0.8 });
    }
  }

  // Main body
  // Body radius should be constant in screen pixels, so we scale it inversely
  const radius = CITIZEN_RADIUS / zoom;
  g.circle(0, 0, radius)
    .fill({ color });

  if (!isSimplified) {
    // State indicator dot (stress/hunger)
    if (c.vitality < 35) {
      g.circle(CITIZEN_RADIUS - 2, -(CITIZEN_RADIUS - 2), 3)
        .fill({ color: 0xd97706 });
    }
  }
}

export function updateCitizenSprite(container: Container, c: CitizenSummary, isSelected: boolean, zoom: number) {
  const g = container.children[0] as Graphics;
  if (g) drawCitizenGlyph(g, c, isSelected, zoom);
}

export function createCitizenSprite(
  c: CitizenSummary, 
  isSelected: boolean, 
  zoom: number,
  onSelect: (uuid: string) => void,
  onHover: (text: string, x: number, y: number) => void,
  onLeave: () => void
): Container {
  const container = new Container();
  const g = new Graphics();
  drawCitizenGlyph(g, c, isSelected, zoom);
  container.addChild(g);

  // Limit hit area to the citizen icon itself, ignoring the vision circle
  container.hitArea = new Circle(0, 0, CITIZEN_RADIUS + 3);

  container.eventMode = 'static';
  container.cursor = 'pointer';
  container.on('pointerdown', () => onSelect(c.uuid));
  container.on('pointerenter', (e) => onHover(c.name, e.client.x, e.client.y));
  container.on('pointermove', (e) => onHover(c.name, e.client.x, e.client.y));
  container.on('pointerleave', () => onLeave());

  return container;
}

export function renderZones(
  layer: Container,
  zoneList: Zone[],
  zoneSprites: Map<string, { g: Graphics; label: Text }>,
  camera: { x: number; y: number },
  zoom: number,
  W: number,
  H: number
) {
  const seenIds = new Set<string>();
  const textStyle = new TextStyle({ fontSize: 11, fill: 0x94a3b8, fontFamily: 'Inter, sans-serif' });
  const interiorTextStyle = new TextStyle({ fontSize: 11, fill: 0xc7d2fe, fontWeight: 'bold', fontFamily: 'Inter, sans-serif' });

  for (const zone of zoneList) {
    seenIds.add(zone.id);
    const isInterior = zone.type?.toUpperCase() === 'INTERIOR';
    
    // Draw in world coordinates
    const wx = zone.center.x * WORLD_SCALE;
    const wz = -zone.center.z * WORLD_SCALE;
    const hw = (zone.width * WORLD_SCALE) / 2;
    const hl = (zone.length * WORLD_SCALE) / 2;

    let sprite = zoneSprites.get(zone.id);
    if (!sprite) {
      const g = new Graphics();
      const label = new Text({ 
        text: zone.name, 
        style: isInterior ? interiorTextStyle : textStyle 
      });
      // Label needs to be scaled inversely so it stays readable
      label.scale.set(1 / zoom);
      layer.addChild(g, label);
      sprite = { g, label };
      zoneSprites.set(zone.id, sprite);
    }

    const { g, label } = sprite;
    const color = isInterior ? 0x6366f1 : 0x8b5cf6;
    const fillColor = isInterior ? 0x1e1b4b : color;
    const strokeColor = zone.isEntryRestricted ? 0xd97706 : color;
    const strokeWidth = (zone.isEntryRestricted ? 1.5 : (isInterior ? 1.5 : 1)) / zoom;
    
    g.clear();
    if (isInterior) {
      g.rect(wx - hw, wz - hl, hw * 2, hl * 2)
        .fill({ color: fillColor, alpha: 0.4 })
        .stroke({ color: strokeColor, width: strokeWidth, alpha: 0.6, alignment: 1 });
    } else {
      g.rect(wx - hw, wz - hl, hw * 2, hl * 2)
        .fill({ color, alpha: 0.02 })
        .stroke({ color: strokeColor, width: strokeWidth, alpha: zone.isEntryRestricted ? 0.8 : 0.2 });
    }

    label.scale.set(1 / zoom);
    label.x = wx - (label.width) / 2;
    label.y = wz - hl - (14 / zoom);

    // LOD: Hide label if zone is too small on screen
    // Projected size check
    const screenW = zone.width * zoom * WORLD_SCALE;
    const screenH = zone.length * zoom * WORLD_SCALE;
    label.visible = (screenW > 60 && screenH > 30) || zoom > 0.8;
  }

  zoneSprites.forEach((sprite, id) => {
    if (!seenIds.has(id)) {
      layer.removeChild(sprite.g, sprite.label);
      zoneSprites.delete(id);
    }
  });
}

export function renderWorldObjects(
  layer: Container,
  objectsList: WorldObject[],
  objectSprites: Map<string, Graphics>,
  camera: { x: number; y: number },
  zoom: number,
  W: number,
  H: number,
  onHover: (text: string, x: number, y: number) => void,
  onLeave: () => void
) {
  const seenIds = new Set<string>();
  const invScale = 1 / zoom;

  for (const obj of objectsList) {
    seenIds.add(obj.id);
    
    let g = objectSprites.get(obj.id);
    if (!g) {
      g = new Graphics();
      g.eventMode = 'static';
      g.cursor = 'help';
      g.on('pointerenter', (e) => onHover(obj.displayName, e.client.x, e.client.y));
      g.on('pointermove', (e) => onHover(obj.displayName, e.client.x, e.client.y));
      g.on('pointerleave', () => onLeave());
      layer.addChild(g);
      objectSprites.set(obj.id, g);
    }

    const color = entityColor(obj.type);
    g.visible = true;
    g.clear();

    // LOD: Scale world objects down at low zoom
    const size = (zoom < 0.2 ? 3 : 6) * invScale;
    const offset = size / 2;
    
    g.rect(obj.x * WORLD_SCALE - offset, -obj.z * WORLD_SCALE - offset, size, size)
      .fill({ color });
  }

  objectSprites.forEach((g, id) => {
    if (!seenIds.has(id)) {
      layer.removeChild(g);
      objectSprites.delete(id);
    }
  });
}

export function drawChunkGrid(
  layer: Container, 
  chunkList: ChunkInfo[], 
  camera: { x: number; y: number }, 
  zoom: number, 
  W: number, 
  H: number
) {
  let g = layer.children[0] as Graphics;
  if (!g) {
    g = new Graphics();
    layer.addChild(g);
  }
  g.clear();

  // LOD: Dynamic grid step based on zoom
  let gridStep = 16;
  if (zoom < 0.2) gridStep = 64;
  if (zoom < 0.08) gridStep = 256;

  const worldGridSize = gridStep; // in world units
  const screenGridSize = worldGridSize * WORLD_SCALE * zoom;
  
  // LOD: Hide grid if lines are too dense
  if (screenGridSize > 4) {
    // We draw a large area around the camera in world coordinates
    const startX = Math.floor(camera.x / gridStep) - 20;
    const endX = Math.floor(camera.x / gridStep) + 20;
    const startZ = Math.floor(camera.y / gridStep) - 20;
    const endZ = Math.floor(camera.y / gridStep) + 20;

    for (let gx = startX; gx <= endX; gx++) {
      for (let gz = startZ; gz <= endZ; gz++) {
        g.rect(gx * gridStep * WORLD_SCALE, -gz * gridStep * WORLD_SCALE, worldGridSize * WORLD_SCALE, -worldGridSize * WORLD_SCALE)
          .stroke({ color: 0x1e293b, width: 0.5 / zoom, alpha: 0.2 });
      }
    }
  }

  for (const chunk of chunkList) {
    const worldX = chunk.gridX * chunk.size * WORLD_SCALE;
    const worldZ = -chunk.gridZ * chunk.size * WORLD_SCALE;
    const size = chunk.size * WORLD_SCALE;
    
    const cost = chunk.movementCost;
    const shade = Math.round(15 + cost * 8);
    const color = (shade << 16) | (shade << 8) | (shade + 5);
    g.rect(worldX, worldZ, size, -size)
      .fill({ color, alpha: 0.8 })
      .stroke({ color: 0x1e293b, width: 0.5 / zoom, alpha: 0.4 });
  }
}

export function renderTrails(
  layer: Container,
  citizens: Map<string, { current: CitizenSummary; history: HistoryPoint[] }>,
  trailSprites: Map<string, Graphics>,
  citizenInterp: Map<string, CitizenInterp>,
  camera: { x: number; y: number },
  zoom: number,
  W: number, 
  H: number,
  isVisible: boolean,
  selectedId: string | null
) {
  if (!isVisible) {
    layer.visible = false;
    return;
  }
  layer.visible = true;

  citizens.forEach((tracked, id) => {
    let g = trailSprites.get(id);

    // Only show trail for the selected citizen
    if (id !== selectedId) {
      if (g) {
        g.clear();
        g.visible = false;
      }
      return;
    }

    if (tracked.history.length === 0) return;

    if (!g) {
      g = new Graphics();
      layer.addChild(g);
      trailSprites.set(id, g);
    }
    g.clear();

    const history = tracked.history.slice(-15);
    const now = Date.now();
    const color = citizenColor(tracked.current.state);
    const interp = citizenInterp.get(id);

    const segmentsLimit = history.length - 1;
    let hasDrawn = false;

    // Fade-out parameters
    const FADE_MS = 1 * 60 * 1000; // 1 minute

    for (let i = 1; i <= segmentsLimit; i++) {
      const from = history[i - 1];
      const to = history[i];
      
      const age = (now - to.clientTimestamp);
      if (age > FADE_MS) continue; // Skip very old points

      const x1 = from.position.x * WORLD_SCALE;
      const y1 = -from.position.z * WORLD_SCALE;
      const x2 = to.position.x * WORLD_SCALE;
      const y2 = -to.position.z * WORLD_SCALE;

      const alpha = Math.max(0.1, 0.6 * (1 - age / FADE_MS));
      g.moveTo(x1, y1).lineTo(x2, y2).stroke({ color, width: 1.5 / zoom, alpha });
      hasDrawn = true;
    }

    if (interp && history.length >= 1) {
      const from = history[history.length - 1];
      const x1 = from.position.x * WORLD_SCALE;
      const y1 = -from.position.z * WORLD_SCALE;
      const x2 = interp.currentX * WORLD_SCALE;
      const y2 = -interp.currentZ * WORLD_SCALE;
      
      g.moveTo(x1, y1).lineTo(x2, y2).stroke({ color, width: 1.5 / zoom, alpha: 0.6 });
      hasDrawn = true;
    }
    
    g.visible = hasDrawn;
  });

  trailSprites.forEach((g, id) => {
    if (!citizens.has(id)) {
      layer.removeChild(g);
      trailSprites.delete(id);
    }
  });
}
