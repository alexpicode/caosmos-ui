import React, { useEffect, useRef, useCallback } from 'react';
import { Container, Graphics } from 'pixi.js';
import { useWorldStore } from '@store/useWorldStore';
import { useCitizenStore } from '@store/useCitizenStore';
import { useUIStore } from '@store/useUIStore';

import { 
  DEFAULT_WALKING_SPEED 
} from './MapConstants';
import { 
  worldToScreen 
} from './MapUtils';
import {
  createCitizenSprite,
  updateCitizenSprite,
  drawCitizenGlyph,
  renderZones,
  renderEntities,
  drawChunkGrid,
  renderTrails
} from './renderers';
import { useMapApp } from './hooks/useMapApp';
import { useMapInteraction } from './hooks/useMapInteraction';

export function MapViewport() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { appRef, layers, isReady } = useMapApp(containerRef);

  // Sprite and interpolation state
  const citizenSprites = useRef<Map<string, Container>>(new Map());
  const citizenInterp = useRef<Map<string, {
    startX: number;
    startZ: number;
    currentX: number;
    currentZ: number;
    targetX: number;
    targetZ: number;
    startTime: number;
    duration: number;
    speed: number;
  }>>(new Map());
  const trailSprites = useRef<Map<string, Graphics>>(new Map());
  const entitySprites = useRef<Map<string, Graphics>>(new Map());
  const zoneSprites = useRef<Map<string, { g: Graphics; label: any }>>(new Map());

  // Tooltip overlay state
  const [hoveredInfo, setHoveredInfo] = React.useState<{ text: string; x: number; y: number } | null>(null);

  // Store access
  const visibleLayers = useUIStore(s => s.visibleLayers);
  const selectCitizen = useCitizenStore(s => s.selectCitizen);
  const selectedId = useCitizenStore(s => s.selectedCitizenId);
  const citizenDetail = useCitizenStore(s => s.citizenDetail);

  const citizens = useWorldStore(s => s.citizens);
  const zones = useWorldStore(s => s.zones);
  const chunks = useWorldStore(s => s.chunks);
  const entities = useWorldStore(s => s.entities);

  const cameraRef = useRef({ x: 0, y: 0 });
  const zoomRef = useRef(1.0);
  const selectedIdRef = useRef<string | null>(null);

  useEffect(() => {
    selectedIdRef.current = selectedId;
  }, [selectedId]);

  const updateCitizenPositions = useCallback((W: number, H: number) => {
    citizenSprites.current.forEach((sprite, id) => {
      const interp = citizenInterp.current.get(id);
      if (sprite && interp) {
        const { sx, sy } = worldToScreen(interp.currentX, interp.currentZ, cameraRef.current, zoomRef.current, W, H);
        sprite.x = sx;
        sprite.y = sy;
      }
      
      // Update glyph (vision circle etc)
      const tracked = citizens.get(id);
      if (tracked) {
        const g = sprite.children[0] as Graphics;
        if (g) drawCitizenGlyph(g, tracked.current, id === selectedId, zoomRef.current);
      }
    });
  }, [citizens, selectedId]);

  const onViewChange = useCallback(() => {
    // Re-render when view changes
    const app = appRef.current;
    if (!app) return;
    const W = app.renderer.width / (window.devicePixelRatio || 1);
    const H = app.renderer.height / (window.devicePixelRatio || 1);
    
    if (layers.zones.current) renderZones(layers.zones.current, useWorldStore.getState().zones, zoneSprites.current, cameraRef.current, zoomRef.current, W, H);
    if (layers.terrain.current) drawChunkGrid(layers.terrain.current, useWorldStore.getState().chunks, cameraRef.current, zoomRef.current, W, H);
    if (layers.entities.current) renderEntities(layers.entities.current, Array.from(useWorldStore.getState().entities.values()).map(t => t.current), entitySprites.current, cameraRef.current, zoomRef.current, W, H, (text, x, y) => setHoveredInfo({ text, x, y }), () => setHoveredInfo(null));
    
    // Update citizen/trail positions immediately on pan/zoom
    updateCitizenPositions(W, H);
  }, [isReady, appRef, layers, updateCitizenPositions]);

  // Interaction hook
  const { 
    isDragging, 
    handlers, 
    updateViewportBounds 
  } = useMapInteraction(appRef, containerRef, cameraRef, zoomRef, onViewChange);

  // Initial render and data updates
  useEffect(() => {
    if (!isReady || !appRef.current) return;
    const app = appRef.current;
    
    const tick = () => {
      const W = app.renderer.width / (window.devicePixelRatio || 1);
      const H = app.renderer.height / (window.devicePixelRatio || 1);
      const now = Date.now();

      citizenSprites.current.forEach((sprite, id) => {
        const interp = citizenInterp.current.get(id);
        if (!interp) return;

        if (interp.speed > 0 && interp.duration > 0) {
          const elapsed = now - interp.startTime;
          const t = Math.min(elapsed / interp.duration, 1.1);
          interp.currentX = interp.startX + (interp.targetX - interp.startX) * t;
          interp.currentZ = interp.startZ + (interp.targetZ - interp.startZ) * t;
          const { sx, sy } = worldToScreen(interp.currentX, interp.currentZ, cameraRef.current, zoomRef.current, W, H);
          sprite.x = sx;
          sprite.y = sy;
        } else {
          const { sx, sy } = worldToScreen(interp.currentX, interp.currentZ, cameraRef.current, zoomRef.current, W, H);
          sprite.x = sx;
          sprite.y = sy;
        }
      });

      if (layers.trails.current) {
        renderTrails(
          layers.trails.current, 
          useWorldStore.getState().citizens, 
          trailSprites.current, 
          citizenInterp.current, 
          cameraRef.current, 
          zoomRef.current, 
          W, H, 
          visibleLayers.trails,
          selectedIdRef.current
        );
      }
    };

    app.ticker.add(tick);
    
    // Resize observer integration
    const ro = new ResizeObserver(entries => {
      const entry = entries[0];
      const w = entry.contentRect.width;
      const h = entry.contentRect.height;
      if (w === 0 || h === 0) return;

      app.renderer.resize(w, h);
      updateViewportBounds(w, h, true);
      
      if (layers.terrain.current) drawChunkGrid(layers.terrain.current, useWorldStore.getState().chunks, cameraRef.current, zoomRef.current, w, h);
      if (layers.zones.current) renderZones(layers.zones.current, useWorldStore.getState().zones, zoneSprites.current, cameraRef.current, zoomRef.current, w, h);
    });
    
    if (containerRef.current) ro.observe(containerRef.current);

    return () => {
      app.ticker.remove(tick);
      ro.disconnect();
    };
  }, [isReady, appRef, layers, updateViewportBounds, cameraRef, zoomRef, visibleLayers.trails]);

  // Reactive data updates
  useEffect(() => {
    if (!appRef.current || !layers.citizens.current) return;
    const W = appRef.current.renderer.width / (window.devicePixelRatio || 1);
    const H = appRef.current.renderer.height / (window.devicePixelRatio || 1);

    citizens.forEach(tracked => {
      const c = tracked.current;
      if (!c.uuid || c.uuid === 'Unknown') return;

      let sprite = citizenSprites.current.get(c.uuid);
      if (!sprite) {
        sprite = createCitizenSprite(
          c, 
          c.uuid === selectedId, 
          zoomRef.current, 
          selectCitizen, 
          (text, x, y) => setHoveredInfo({ text, x, y }),
          () => setHoveredInfo(null)
        );
        layers.citizens.current?.addChild(sprite);
        citizenSprites.current.set(c.uuid, sprite);
      }

      const interp = citizenInterp.current.get(c.uuid);
      const speed = (c.uuid === selectedId && citizenDetail?.config?.walkingSpeed)
        ? citizenDetail.config.walkingSpeed
        : (c.walkingSpeed || DEFAULT_WALKING_SPEED);

      if (!interp) {
        citizenInterp.current.set(c.uuid, {
          startX: c.x, startZ: c.z, currentX: c.x, currentZ: c.z, targetX: c.x, targetZ: c.z,
          startTime: Date.now(), duration: 0, speed: speed || 0
        });
      } else {
        // If target changed, update interpolation
        if (interp.targetX !== c.x || interp.targetZ !== c.z) {
          const dist = Math.sqrt(Math.pow(c.x - interp.currentX, 2) + Math.pow(c.z - interp.currentZ, 2));
          interp.startX = interp.currentX;
          interp.startZ = interp.currentZ;
          interp.targetX = c.x;
          interp.targetZ = c.z;
          interp.startTime = Date.now();
          // Add a small buffer to duration to avoid snapping at the end
          interp.duration = speed > 0 ? (dist / speed) * 1050 : 0;
          interp.speed = speed;
        }
      }

      updateCitizenSprite(sprite, c, c.uuid === selectedId, zoomRef.current);
    });

    citizenSprites.current.forEach((sprite, id) => {
      if (!citizens.has(id)) {
        layers.citizens.current?.removeChild(sprite);
        citizenSprites.current.delete(id);
        citizenInterp.current.delete(id);
      }
    });
  }, [isReady, citizens, selectedId, citizenDetail, selectCitizen, layers.citizens, zoomRef]);

  useEffect(() => {
    if (!appRef.current || !layers.zones.current) return;
    const W = appRef.current.renderer.width / (window.devicePixelRatio || 1);
    const H = appRef.current.renderer.height / (window.devicePixelRatio || 1);
    renderZones(layers.zones.current, zones, zoneSprites.current, cameraRef.current, zoomRef.current, W, H);
  }, [isReady, zones, layers.zones, cameraRef, zoomRef]);

  useEffect(() => {
    if (!appRef.current || !layers.terrain.current) return;
    const W = appRef.current.renderer.width / (window.devicePixelRatio || 1);
    const H = appRef.current.renderer.height / (window.devicePixelRatio || 1);
    drawChunkGrid(layers.terrain.current, chunks, cameraRef.current, zoomRef.current, W, H);
  }, [isReady, chunks, layers.terrain, cameraRef, zoomRef]);

  useEffect(() => {
    if (!appRef.current || !layers.entities.current) return;
    const W = appRef.current.renderer.width / (window.devicePixelRatio || 1);
    const H = appRef.current.renderer.height / (window.devicePixelRatio || 1);
    renderEntities(layers.entities.current, Array.from(entities.values()).map(t => t.current), entitySprites.current, cameraRef.current, zoomRef.current, W, H, (text, x, y) => setHoveredInfo({ text, x, y }), () => setHoveredInfo(null));
  }, [isReady, entities, layers.entities, cameraRef, zoomRef]);

  // Sync layer visibility
  useEffect(() => {
    if (layers.terrain.current) layers.terrain.current.visible = visibleLayers.terrain;
    if (layers.zones.current) layers.zones.current.visible = visibleLayers.zones;
    if (layers.entities.current) layers.entities.current.visible = visibleLayers.entities;
    if (layers.citizens.current) layers.citizens.current.visible = visibleLayers.citizens;
    if (layers.trails.current) layers.trails.current.visible = visibleLayers.trails;
  }, [visibleLayers, layers]);

  return (
    <>
      <div
        ref={containerRef}
        className="flex-1 relative overflow-hidden"
        style={{ cursor: isDragging.current ? 'grabbing' : 'grab', background: '#020617' }}
        {...handlers}
      />
      {hoveredInfo && (
        <div
          className="absolute pointer-events-none z-50 glass px-2 py-1 text-xs rounded shadow-lg text-slate-200"
          style={{ left: hoveredInfo.x + 10, top: hoveredInfo.y + 10 }}
        >
          {hoveredInfo.text}
        </div>
      )}
    </>
  );
}
