import { Container, Graphics, Text, TextStyle, Circle } from 'pixi.js';
import type { CitizenSummary, ChunkInfo, Zone, WorldEntitySummary } from '@core/entities';
import { 
  WORLD_SCALE, 
  CITIZEN_RADIUS, 
  CITIZEN_VISION_RANGE 
} from './MapConstants';
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
  speed: number;
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

  // Vision range circle (if selected)
  if (isSelected) {
    const visionRadius = CITIZEN_VISION_RANGE * WORLD_SCALE * zoom;
    g.circle(0, 0, visionRadius)
      .fill({ color: 0x06b6d4, alpha: 0.12 })
      .stroke({ color: 0x06b6d4, width: 1, alpha: 0.3 });
  }

  // Outer glow ring (vitality indicator)
  g.circle(0, 0, CITIZEN_RADIUS + 3)
    .fill({ color: vColor, alpha: 0.15 });

  // Vitality arc
  const vPct = c.vitality / 100;
  if (vPct > 0) {
    g.arc(0, 0, CITIZEN_RADIUS + 2, -Math.PI / 2, -Math.PI / 2 + 2 * Math.PI * vPct)
      .stroke({ color: vColor, width: 2, alpha: 0.8 });
  }

  // Main body
  g.circle(0, 0, CITIZEN_RADIUS)
    .fill({ color });

  // State indicator dot (stress/hunger)
  if (c.vitality < 35) {
    g.circle(CITIZEN_RADIUS - 2, -(CITIZEN_RADIUS - 2), 3)
      .fill({ color: 0xef4444 });
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
    const { sx, sy } = worldToScreen(zone.center.x, zone.center.z, camera, zoom, W, H);
    const hw = (zone.width * WORLD_SCALE * zoom) / 2;
    const hh = (zone.length * WORLD_SCALE * zoom) / 2;

    let sprite = zoneSprites.get(zone.id);
    if (!sprite) {
      const g = new Graphics();
      const label = new Text({ 
        text: zone.name, 
        style: isInterior ? interiorTextStyle : textStyle 
      });
      layer.addChild(g, label);
      sprite = { g, label };
      zoneSprites.set(zone.id, sprite);
    }

    const { g, label } = sprite;
    const color = isInterior ? 0x6366f1 : 0x8b5cf6;
    const fillColor = isInterior ? 0x1e1b4b : color;
    
    g.clear();
    if (isInterior) {
      g.rect(sx - hw, sy - hh, hw * 2, hh * 2)
        .fill({ color: fillColor, alpha: 0.4 })
        .stroke({ color, width: 1.5, alpha: 0.6, alignment: 1 });
      
      g.rect(sx - hw + 1, sy - hh + 1, Math.max(0, hw * 2 - 2), Math.max(0, hh * 2 - 2))
        .stroke({ color, width: 1, alpha: 0.15, alignment: 1 });
    } else {
      g.rect(sx - hw, sy - hh, hw * 2, hh * 2)
        .fill({ color, alpha: 0.02 })
        .stroke({ color, width: 1, alpha: 0.2 });
    }

    label.x = sx - label.width / 2;
    label.y = sy - hh - 14;
  }

  zoneSprites.forEach((sprite, id) => {
    if (!seenIds.has(id)) {
      layer.removeChild(sprite.g, sprite.label);
      zoneSprites.delete(id);
    }
  });
}

export function renderEntities(
  layer: Container,
  entitiesList: WorldEntitySummary[],
  entitySprites: Map<string, Graphics>,
  camera: { x: number; y: number },
  zoom: number,
  W: number,
  H: number,
  onHover: (text: string, x: number, y: number) => void,
  onLeave: () => void
) {
  const seenIds = new Set<string>();

  for (const entity of entitiesList) {
    seenIds.add(entity.id);
    const { sx, sy } = worldToScreen(entity.x, entity.z, camera, zoom, W, H);

    // Dynamic visibility check
    if (sx < -10 || sx > W + 10 || sy < -10 || sy > H + 10) {
      const g = entitySprites.get(entity.id);
      if (g) g.visible = false;
      continue;
    }

    let g = entitySprites.get(entity.id);
    if (!g) {
      g = new Graphics();
      g.eventMode = 'static';
      g.cursor = 'help';
      g.on('pointerenter', (e) => onHover(entity.displayName, e.client.x, e.client.y));
      g.on('pointermove', (e) => onHover(entity.displayName, e.client.x, e.client.y));
      g.on('pointerleave', () => onLeave());
      layer.addChild(g);
      entitySprites.set(entity.id, g);
    }

    const color = entityColor(entity.type);
    g.visible = true;
    g.clear();
    g.rect(sx - 3, sy - 3, 6, 6)
      .fill({ color });
  }

  entitySprites.forEach((g, id) => {
    if (!seenIds.has(id)) {
      layer.removeChild(g);
      entitySprites.delete(id);
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

  // Background
  g.rect(0, 0, W, H).fill({ color: 0x020617 });

  const gridStep = 16;
  const worldGridSize = gridStep * WORLD_SCALE * zoom;
  
  // Calculate visible range to avoid 10,000 iterations
  const startX = Math.floor((camera.x - (W / 2) / (WORLD_SCALE * zoom)) / gridStep) - 1;
  const endX = Math.ceil((camera.x + (W / 2) / (WORLD_SCALE * zoom)) / gridStep) + 1;
  const startZ = Math.floor((camera.y - (H / 2) / (WORLD_SCALE * zoom)) / gridStep) - 1;
  const endZ = Math.ceil((camera.y + (H / 2) / (WORLD_SCALE * zoom)) / gridStep) + 1;

  for (let gx = startX; gx <= endX; gx++) {
    for (let gz = startZ; gz <= endZ; gz++) {
      const { sx, sy } = worldToScreen(gx * gridStep, (gz + 1) * gridStep, camera, zoom, W, H);
      g.rect(sx, sy, worldGridSize, worldGridSize)
        .stroke({ color: 0x1e293b, width: 0.5, alpha: 0.2 });
    }
  }

  for (const chunk of chunkList) {
    const worldX = chunk.gridX * chunk.size;
    const worldZ = chunk.gridZ * chunk.size;
    const { sx, sy } = worldToScreen(worldX, worldZ + chunk.size, camera, zoom, W, H);
    const size = chunk.size * WORLD_SCALE * zoom;
    
    if (sx < -size || sx > W || sy < -size || sy > H) continue;

    const cost = chunk.movementCost;
    const shade = Math.round(15 + cost * 8);
    const color = (shade << 16) | (shade << 8) | (shade + 5);
    g.rect(sx, sy, size, size)
      .fill({ color, alpha: 0.8 })
      .stroke({ color: 0x1e293b, width: 0.5, alpha: 0.4 });
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

      const { sx: x1, sy: y1 } = worldToScreen(from.position.x, from.position.z, camera, zoom, W, H);
      const { sx: x2, sy: y2 } = worldToScreen(to.position.x, to.position.z, camera, zoom, W, H);

      // Simple frustum culling for segments
      if (
        (x1 < 0 && x2 < 0) || (x1 > W && x2 > W) ||
        (y1 < 0 && y2 < 0) || (y1 > H && y2 > H)
      ) continue;

      const alpha = Math.max(0.1, 0.6 * (1 - age / FADE_MS));
      g.moveTo(x1, y1).lineTo(x2, y2).stroke({ color, width: 1.5, alpha });
      hasDrawn = true;
    }

    if (interp && history.length >= 1) {
      const from = history[history.length - 1];
      const { sx: x1, sy: y1 } = worldToScreen(from.position.x, from.position.z, camera, zoom, W, H);
      const { sx: x2, sy: y2 } = worldToScreen(interp.currentX, interp.currentZ, camera, zoom, W, H);
      
      if (!((x1 < 0 && x2 < 0) || (x1 > W && x2 > W) || (y1 < 0 && y2 < 0) || (y1 > H && y2 > H))) {
        g.moveTo(x1, y1).lineTo(x2, y2).stroke({ color, width: 1.5, alpha: 0.6 });
        hasDrawn = true;
      }
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
