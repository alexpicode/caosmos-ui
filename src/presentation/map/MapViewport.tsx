import React, { useEffect, useRef, useCallback } from 'react';
import {
  Application, Container, Graphics, Text, TextStyle,
  FederatedPointerEvent
} from 'pixi.js';
import { useWorldStore } from '@store/useWorldStore';
import { useCitizenStore } from '@store/useCitizenStore';
import { useUIStore } from '@store/useUIStore';
import { vitalityColor } from '@shared/utils/formatters';
import type { CitizenSummary, ChunkInfo, Zone, WorldEntitySummary } from '@core/entities';

// ─── Constants ──────────────────────────────────────────────
const CITIZEN_RADIUS = 7;
const MIN_ZOOM = 0.05;
const MAX_ZOOM = 4.0;
const WORLD_SCALE = 4; // world units → pixels (1 world unit = 4px)

// State colours for citizen sprites
function citizenColor(state: string): number {
  switch (state.toUpperCase()) {
    case 'WORKING':  return 0x10b981;
    case 'MOVING':   return 0x3b82f6;
    case 'EATING':   return 0xf59e0b;
    case 'IDLE':
    default:         return 0x06b6d4;
  }
}

// Entity type colours
function entityColor(type: string): number {
  switch (type.toUpperCase()) {
    case 'TREE': return 0x15803d;
    case 'ROCK': return 0x78716c;
    case 'BUILDING': return 0x7c3aed;
    default: return 0x475569;
  }
}

// World coords → screen pixels
function worldToScreen(x: number, z: number, camera: { x: number; y: number }, zoom: number, W: number, H: number) {
  return {
    sx: (x * WORLD_SCALE - camera.x) * zoom + W / 2,
    sy: (z * WORLD_SCALE - camera.y) * zoom + H / 2,
  };
}

// Screen pixels → world coords
function screenToWorld(sx: number, sy: number, camera: { x: number; y: number }, zoom: number, W: number, H: number) {
  return {
    x: ((sx - W / 2) / zoom + camera.x) / WORLD_SCALE,
    z: ((sy - H / 2) / zoom + camera.y) / WORLD_SCALE,
  };
}

// ─── Main Component ──────────────────────────────────────────
export function MapViewport() {
  const containerRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<Application | null>(null);

  // Camera state (not in Zustand — local render state)
  const cameraRef = useRef({ x: 0, y: 0 });
  const zoomRef = useRef(1.0);
  const isDragging = useRef(false);
  const lastMouse = useRef({ x: 0, y: 0 });

  // Layer containers
  const terrainLayerRef = useRef<Container | null>(null);
  const zoneLayerRef = useRef<Container | null>(null);
  const entityLayerRef = useRef<Container | null>(null);
  const trailLayerRef = useRef<Container | null>(null);
  const citizenLayerRef = useRef<Container | null>(null);

  // Sprite maps
  const citizenSprites = useRef<Map<string, Container>>(new Map());
  // Target positions for interpolation
  const citizenTargets = useRef<Map<string, { sx: number; sy: number }>>(new Map());

  // Store access
  const visibleLayers = useUIStore(s => s.visibleLayers);
  const visibleLayersRef = useRef(visibleLayers);
  visibleLayersRef.current = visibleLayers;

  const setViewportBounds = useUIStore(s => s.setViewportBounds);
  const setZoomLevel = useUIStore(s => s.setZoomLevel);
  const selectCitizen = useCitizenStore(s => s.selectCitizen);

  // ── Initialize PixiJS ─────────────────────────────────────
  useEffect(() => {
    let isDestroyed = false;
    let fallbackApp: Application | null = null;

    const initPixi = async () => {
      if (!containerRef.current) return;
      const W = containerRef.current.clientWidth;
      const H = containerRef.current.clientHeight;

      const app = new Application();
      fallbackApp = app;

      await app.init({
        width: W || 800,
        height: H || 600,
        backgroundColor: 0x020617,
        antialias: true,
        resolution: window.devicePixelRatio || 1,
        autoDensity: true,
      });

      if (isDestroyed) {
        app.destroy(true, { children: true });
        return;
      }

      appRef.current = app;
      if (!containerRef.current) return;
      containerRef.current.appendChild(app.canvas);

      // Setup layers
      const terrain = new Container();
      const zones = new Container();
      const entities = new Container();
      const trails = new Container();
      const citizens = new Container();

      app.stage.addChild(terrain, zones, entities, trails, citizens);

      terrainLayerRef.current = terrain;
      zoneLayerRef.current = zones;
      entityLayerRef.current = entities;
      trailLayerRef.current = trails;
      citizenLayerRef.current = citizens;

      // Draw initial grid
      drawChunkGrid(terrain, [], cameraRef.current, zoomRef.current, app.canvas.width / app.renderer.resolution, app.canvas.height / app.renderer.resolution);

      // Ticker for interpolation
      app.ticker.add(() => {
        const cw = app.canvas.width / app.renderer.resolution;
        const ch = app.canvas.height / app.renderer.resolution;
        tickRender(app, cw, ch);
      });

      // Resize observer
      const ro = new ResizeObserver(entries => {
        if (isDestroyed) return;
        const entry = entries[0];
        const w = entry.contentRect.width;
        const h = entry.contentRect.height;
        if (w === 0 || h === 0) return;

        app.renderer.resize(w, h);
        updateViewportBounds(w, h);
        
        // Re-render the grid on resize because the background must span the new dimensions
        drawChunkGrid(terrainLayerRef.current!, useWorldStore.getState().chunks, cameraRef.current, zoomRef.current, w, h);
        renderZones(useWorldStore.getState().zones, w, h);
      });
      ro.observe(containerRef.current);

      updateViewportBounds(W, H);
    };

    initPixi();

    return () => {
      isDestroyed = true;
      if (fallbackApp) {
        // Must catch if destroy throws during mid-initialization
        try { fallbackApp.destroy(true, { children: true }); } catch (e) {}
      }
      appRef.current = null;
      citizenSprites.current.clear();
      citizenTargets.current.clear();
    };
  }, []); // intentionally empty — runs once

  // ── Update viewport bounds for polling ──────────────────────
  const updateViewportBounds = useCallback((W: number, H: number) => {
    const tl = screenToWorld(0, 0, cameraRef.current, zoomRef.current, W, H);
    const br = screenToWorld(W, H, cameraRef.current, zoomRef.current, W, H);
    setViewportBounds({ minX: tl.x, minZ: tl.z, maxX: br.x, maxZ: br.z });
    setZoomLevel(zoomRef.current);
  }, [setViewportBounds, setZoomLevel]);

  // ── Reactive: citizens data changed ─────────────────────────
  const citizens = useWorldStore(s => s.citizens);
  useEffect(() => {
    if (!appRef.current || !citizenLayerRef.current || !trailLayerRef.current) return;
    const app = appRef.current;
    const W = app.renderer.width / (window.devicePixelRatio || 1);
    const H = app.renderer.height / (window.devicePixelRatio || 1);

    renderCitizens(citizens, W, H);
    if (visibleLayersRef.current.trails) {
      renderTrails(citizens, W, H);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [citizens]);

  const zones = useWorldStore(s => s.zones);
  useEffect(() => {
    if (!appRef.current || !zoneLayerRef.current) return;
    const app = appRef.current;
    const W = app.renderer.width / (window.devicePixelRatio || 1);
    const H = app.renderer.height / (window.devicePixelRatio || 1);
    renderZones(zones, W, H);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zones]);

  const chunks = useWorldStore(s => s.chunks);
  useEffect(() => {
    if (!appRef.current || !terrainLayerRef.current) return;
    const app = appRef.current;
    const W = app.renderer.width / (window.devicePixelRatio || 1);
    const H = app.renderer.height / (window.devicePixelRatio || 1);
    drawChunkGrid(terrainLayerRef.current, chunks, cameraRef.current, zoomRef.current, W, H);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chunks]);

  const entities = useWorldStore(s => s.entities);
  useEffect(() => {
    if (!appRef.current || !entityLayerRef.current) return;
    const app = appRef.current;
    const W = app.renderer.width / (window.devicePixelRatio || 1);
    const H = app.renderer.height / (window.devicePixelRatio || 1);
    renderEntities(Array.from(entities.values()).map(t => t.current), W, H);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entities]);

  // Sync layer visibility
  useEffect(() => {
    if (!appRef.current) return;
    if (terrainLayerRef.current) terrainLayerRef.current.visible = visibleLayers.terrain;
    if (zoneLayerRef.current) zoneLayerRef.current.visible = visibleLayers.zones;
    if (entityLayerRef.current) entityLayerRef.current.visible = visibleLayers.entities;
    if (citizenLayerRef.current) citizenLayerRef.current.visible = visibleLayers.citizens;
    if (trailLayerRef.current) trailLayerRef.current.visible = visibleLayers.trails;
  }, [visibleLayers]);

  // ── Render functions ─────────────────────────────────────────

  function getCam(): { x: number; y: number } { return cameraRef.current; }
  function getZoom(): number { return zoomRef.current; }

  function renderCitizens(citizenMap: typeof citizens, W: number, H: number) {
    if (!citizenLayerRef.current) return;
    const layer = citizenLayerRef.current;

    citizenMap.forEach(tracked => {
      const c: CitizenSummary = tracked.current;
      const { sx, sy } = worldToScreen(c.x, c.z, getCam(), getZoom(), W, H);

      let sprite = citizenSprites.current.get(c.uuid);
      if (!sprite) {
        // Create new sprite
        sprite = createCitizenSprite(c);
        sprite.x = sx;
        sprite.y = sy;
        sprite.eventMode = 'static';
        sprite.cursor = 'pointer';
        sprite.on('pointerdown', () => selectCitizen(c.uuid));
        layer.addChild(sprite);
        citizenSprites.current.set(c.uuid, sprite);
      }

      // Update target position for lerp
      citizenTargets.current.set(c.uuid, { sx, sy });

      // Update color based on state
      updateCitizenSprite(sprite, c);
    });

    // Remove despawned citizens
    citizenSprites.current.forEach((sprite, id) => {
      if (!citizenMap.has(id)) {
        layer.removeChild(sprite);
        citizenSprites.current.delete(id);
        citizenTargets.current.delete(id);
      }
    });
  }

  function createCitizenSprite(c: CitizenSummary): Container {
    const container = new Container();
    const g = new Graphics();
    drawCitizenGlyph(g, c);
    container.addChild(g);
    return container;
  }

  function drawCitizenGlyph(g: Graphics, c: CitizenSummary) {
    g.clear();
    const color = citizenColor(c.state);
    const vColor = parseInt(vitalityColor(c.vitality).replace('#', '0x'));

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

  function updateCitizenSprite(container: Container, c: CitizenSummary) {
    const g = container.children[0] as Graphics;
    if (g) drawCitizenGlyph(g, c);
  }

  function renderTrails(citizenMap: typeof citizens, W: number, H: number) {
    if (!trailLayerRef.current) return;
    const layer = trailLayerRef.current;
    layer.removeChildren();

    citizenMap.forEach(tracked => {
      if (tracked.history.length < 2) return;
      const g = new Graphics();
      const history = tracked.history.slice(-100);
      const now = Date.now();

      for (let i = 1; i < history.length; i++) {
        const from = history[i - 1];
        const to = history[i];
        const age = (now - to.clientTimestamp) / (5 * 60 * 1000); // normalise over 5 min
        const alpha = Math.max(0.05, 0.6 * (1 - age));
        const color = citizenColor(tracked.current.state);
        const { sx: x1, sy: y1 } = worldToScreen(from.position.x, from.position.z, getCam(), getZoom(), W, H);
        const { sx: x2, sy: y2 } = worldToScreen(to.position.x, to.position.z, getCam(), getZoom(), W, H);
        g.moveTo(x1, y1).lineTo(x2, y2).stroke({ color, width: 1.5, alpha });
      }

      layer.addChild(g);
    });
  }

  function renderZones(zoneList: Zone[], W: number, H: number) {
    if (!zoneLayerRef.current) return;
    const layer = zoneLayerRef.current;
    layer.removeChildren();

    const textStyle = new TextStyle({ fontSize: 11, fill: 0x94a3b8, fontFamily: 'Inter, sans-serif' });

    for (const zone of zoneList) {
      const { sx, sy } = worldToScreen(zone.center.x, zone.center.z, getCam(), getZoom(), W, H);
      const hw = (zone.width * WORLD_SCALE * getZoom()) / 2;
      const hh = (zone.length * WORLD_SCALE * getZoom()) / 2;

      const g = new Graphics();
      g.rect(sx - hw, sy - hh, hw * 2, hh * 2)
       .fill({ color: 0x8b5cf6, alpha: 0.06 })
       .stroke({ color: 0x8b5cf6, width: 1, alpha: 0.4 });

      const label = new Text({ text: zone.name, style: textStyle });
      label.x = sx - label.width / 2;
      label.y = sy - hh - 14;

      layer.addChild(g, label);
    }
  }

  function renderEntities(entitiesList: WorldEntitySummary[], W: number, H: number) {
    if (!entityLayerRef.current) return;
    const layer = entityLayerRef.current;
    layer.removeChildren();

    for (const entity of entitiesList) {
      const { sx, sy } = worldToScreen(entity.x, entity.z, getCam(), getZoom(), W, H);
      const color = entityColor(entity.type);
      const g = new Graphics();
      g.rect(sx - 3, sy - 3, 6, 6)
       .fill({ color });
      layer.addChild(g);
    }
  }

  function drawChunkGrid(layer: Container, chunkList: ChunkInfo[], camera: { x: number; y: number }, zoom: number, W: number, H: number) {
    layer.removeChildren();
    const g = new Graphics();

    // Draw a background first
    g.rect(0, 0, W, H).fill({ color: 0x020617 });

    // Draw subtle infinite grid first
    const gridSize = 16 * WORLD_SCALE * zoom;
    for (let gx = -50; gx < 50; gx++) {
      for (let gz = -50; gz < 50; gz++) {
        const { sx, sy } = worldToScreen(gx * 16, gz * 16, camera, zoom, W, H);
        if (sx < -gridSize || sx > W + gridSize || sy < -gridSize || sy > H + gridSize) continue;
        g.rect(sx, sy, gridSize, gridSize)
         .stroke({ color: 0x1e293b, width: 0.5, alpha: 0.3 });
      }
    }

    // Draw active chunks
    for (const chunk of chunkList) {
      const worldX = chunk.gridX * chunk.size;
      const worldZ = chunk.gridZ * chunk.size;
      const { sx, sy } = worldToScreen(worldX, worldZ, camera, zoom, W, H);
      const size = chunk.size * WORLD_SCALE * zoom;
      const cost = chunk.movementCost;
      const shade = Math.round(15 + cost * 8);
      const color = (shade << 16) | (shade << 8) | (shade + 5);
      g.rect(sx, sy, size, size)
       .fill({ color })
       .stroke({ color: 0x1e293b, width: 0.5, alpha: 0.5 });
    }


    layer.addChild(g);
  }

  // ── Ticker (interpolation) ───────────────────────────────────
  const lerpFactor = 0.12; // smoothing per frame
  function tickRender(_app: Application, _W: number, _H: number) {
    citizenSprites.current.forEach((sprite, id) => {
      const target = citizenTargets.current.get(id);
      if (!target) return;
      sprite.x += (target.sx - sprite.x) * lerpFactor;
      sprite.y += (target.sy - sprite.y) * lerpFactor;
    });
  }

  // ── Mouse events ─────────────────────────────────────────────
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const app = appRef.current;
    if (!app) return;
    const W = app.renderer.width / (window.devicePixelRatio || 1);
    const H = app.renderer.height / (window.devicePixelRatio || 1);

    const delta = -e.deltaY * 0.001;
    const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoomRef.current * (1 + delta)));
    zoomRef.current = newZoom;

    updateViewportBounds(W, H);

    // Re-render layers that depend on zoom
    renderZones(useWorldStore.getState().zones, W, H);
    drawChunkGrid(terrainLayerRef.current!, useWorldStore.getState().chunks, cameraRef.current, newZoom, W, H);

    // Update all citizen target positions
    const cs = useWorldStore.getState().citizens;
    cs.forEach((tracked, id) => {
      const { sx, sy } = worldToScreen(tracked.current.x, tracked.current.z, cameraRef.current, newZoom, W, H);
      citizenTargets.current.set(id, { sx, sy });
    });
  }, [updateViewportBounds]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    isDragging.current = true;
    lastMouse.current = { x: e.clientX, y: e.clientY };
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging.current) return;
    const dx = e.clientX - lastMouse.current.x;
    const dy = e.clientY - lastMouse.current.y;
    lastMouse.current = { x: e.clientX, y: e.clientY };

    cameraRef.current.x -= dx / zoomRef.current;
    cameraRef.current.y -= dy / zoomRef.current;

    const app = appRef.current;
    if (!app) return;
    const W = app.renderer.width / (window.devicePixelRatio || 1);
    const H = app.renderer.height / (window.devicePixelRatio || 1);

    updateViewportBounds(W, H);

    // Re-render all on camera move
    const worldState = useWorldStore.getState();
    renderZones(worldState.zones, W, H);
    drawChunkGrid(terrainLayerRef.current!, worldState.chunks, cameraRef.current, zoomRef.current, W, H);
    renderEntities(Array.from(worldState.entities.values()).map(t => t.current), W, H);
    renderTrails(worldState.citizens, W, H);

    // Update citizen positions immediately on pan
    worldState.citizens.forEach((tracked, id) => {
      const { sx, sy } = worldToScreen(tracked.current.x, tracked.current.z, cameraRef.current, zoomRef.current, W, H);
      citizenTargets.current.set(id, { sx, sy });
    });
  }, [updateViewportBounds]);

  const handleMouseUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  // ── Follow selected citizen ──────────────────────────────────
  const selectedId = useCitizenStore(s => s.selectedCitizenId);
  useEffect(() => {
    if (!selectedId) return;
    const citizen = useWorldStore.getState().citizens.get(selectedId);
    if (!citizen) return;
    cameraRef.current = {
      x: citizen.current.x * WORLD_SCALE,
      y: citizen.current.z * WORLD_SCALE,
    };
    const app = appRef.current;
    if (!app) {
      const W = window.innerWidth;
      const H = window.innerHeight;
      updateViewportBounds(W, H);
    } else {
      const W = app.renderer.width / (window.devicePixelRatio || 1);
      const H = app.renderer.height / (window.devicePixelRatio || 1);
      updateViewportBounds(W, H);
    }
  }, [selectedId, updateViewportBounds]);

  return (
    <div
      ref={containerRef}
      className="flex-1 relative overflow-hidden"
      style={{ cursor: isDragging.current ? 'grabbing' : 'grab', background: '#020617' }}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    />
  );
}
