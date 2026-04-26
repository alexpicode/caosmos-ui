import React, { useEffect, useRef, useCallback } from 'react';
import { Container, Graphics } from 'pixi.js';
import { useWorldStore } from '@store/useWorldStore';
import { useCitizenStore } from '@store/useCitizenStore';
import { useUIStore } from '@store/useUIStore';
import { useConfigStore } from '@store/useConfigStore';

import { 
  worldToScreen 
} from './MapUtils';
import {
  createCitizenSprite,
  updateCitizenSprite,
  drawCitizenGlyph,
  renderZones,
  renderWorldObjects,
  drawChunkGrid,
  renderTrails,
  WORLD_SCALE
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
    lastTick: number;
    isIdle: boolean;
  }>>(new Map());
  const trailSprites = useRef<Map<string, Graphics>>(new Map());
  const worldObjectSprites = useRef<Map<string, Graphics>>(new Map());
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
  const worldObjects = useWorldStore(s => s.worldObjects);
  const pollingInterval = useConfigStore(s => s.pollingFocusMs);

  const cameraRef = useRef({ x: 0, y: 0 });
  const zoomRef = useRef(1.0);
  const lastZoomRef = useRef(1.0);
  const selectedIdRef = useRef<string | null>(null);

  useEffect(() => {
    selectedIdRef.current = selectedId;
  }, [selectedId]);
  const updateTransform = useCallback(() => {
    const world = layers.world.current;
    const app = appRef.current;
    if (!world || !app) return;

    const W = app.renderer.width / (window.devicePixelRatio || 1);
    const H = app.renderer.height / (window.devicePixelRatio || 1);
    const zoom = zoomRef.current;
    const scale = zoom; // Changed: scale is just zoom, children handle WORLD_SCALE

    world.scale.set(scale);
    world.position.set(
      W / 2 - cameraRef.current.x * scale,
      H / 2 - cameraRef.current.y * scale
    );
  }, [layers.world, appRef]);

  const updateCitizenPositions = useCallback((W: number, H: number) => {
    const currentZoom = zoomRef.current;
    const zoomChanged = Math.abs(currentZoom - lastZoomRef.current) > 0.01;
    const crossedThreshold = (lastZoomRef.current >= 0.4 && currentZoom < 0.4) || (lastZoomRef.current < 0.4 && currentZoom >= 0.4);
    
    citizenSprites.current.forEach((sprite, id) => {
      const interp = citizenInterp.current.get(id);
      if (sprite && interp) {
        // Now using world coordinates directly for sprites
        sprite.x = interp.currentX * WORLD_SCALE;
        sprite.y = -interp.currentZ * WORLD_SCALE;

        // Optimization: Only redraw glyph if zoom changed significantly, 
        // or if it's the selected citizen (vision range changes with zoom)
        const isSelected = id === selectedId;
        if (zoomChanged || crossedThreshold || isSelected) {
          const tracked = citizens.get(id);
          if (tracked) {
            const g = sprite.children[0] as Graphics;
            if (g) drawCitizenGlyph(g, tracked.current, isSelected, currentZoom);
          }
        }
      }
    });

    if (zoomChanged || crossedThreshold) {
      lastZoomRef.current = currentZoom;
    }
  }, [citizens, selectedId]);

  const onViewChange = useCallback(() => {
    updateTransform();

    const app = appRef.current;
    if (!app) return;
    const W = app.renderer.width / (window.devicePixelRatio || 1);
    const H = app.renderer.height / (window.devicePixelRatio || 1);
    
    // Redraw LOD-dependent layers only when zoom changes or explicitly needed
    // In world coordinates, we don't need to redraw on pan!
    const zoom = zoomRef.current;
    const zoomChanged = Math.abs(zoom - lastZoomRef.current) > 0.01;

    if (zoomChanged) {
      if (layers.zones.current) renderZones(layers.zones.current, useWorldStore.getState().zones, zoneSprites.current, cameraRef.current, zoom, W, H);
      if (layers.terrain.current) drawChunkGrid(layers.terrain.current, useWorldStore.getState().chunks, cameraRef.current, zoom, W, H);
      if (layers.worldObjects.current) renderWorldObjects(layers.worldObjects.current, Array.from(useWorldStore.getState().worldObjects.values()).map(t => t.current), worldObjectSprites.current, cameraRef.current, zoom, W, H, (text, x, y) => setHoveredInfo({ text, x, y }), () => setHoveredInfo(null));
    }
    
    updateCitizenPositions(W, H);
  }, [isReady, appRef, layers, updateCitizenPositions, updateTransform]);

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

      const bounds = useUIStore.getState().viewportBounds;
      const margin = 5; // Extra padding for culling

      citizenSprites.current.forEach((sprite, id) => {
        const interp = citizenInterp.current.get(id);
        if (!interp) return;

        // Viewport Culling: Skip if far outside the view
        const isFar = interp.currentX < bounds.minX - margin || interp.currentX > bounds.maxX + margin ||
                      interp.currentZ < bounds.minZ - margin || interp.currentZ > bounds.maxZ + margin;
        
        if (isFar) {
          sprite.visible = false;
          return;
        }
        sprite.visible = true;

        if (!interp.isIdle && interp.duration > 0) {
          const elapsed = now - interp.startTime;
          const t = Math.min(elapsed / interp.duration, 1.0);
          
          interp.currentX = interp.startX + (interp.targetX - interp.startX) * t;
          interp.currentZ = interp.startZ + (interp.targetZ - interp.startZ) * t;
          
          sprite.x = interp.currentX * WORLD_SCALE;
          sprite.y = -interp.currentZ * WORLD_SCALE;
        } else {
          // Snap to target if idle or duration is zero
          interp.currentX = interp.targetX;
          interp.currentZ = interp.targetZ;
          sprite.x = interp.currentX * WORLD_SCALE;
          sprite.y = -interp.currentZ * WORLD_SCALE;
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
      if (app.ticker) app.ticker.remove(tick);
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
      const latestEntry = tracked.history[tracked.history.length - 1];
      const tick = latestEntry?.tick || 0;
      const isIdle = c.state === 'IDLE';

      if (!interp) {
        citizenInterp.current.set(c.uuid, {
          startX: c.x, startZ: c.z, currentX: c.x, currentZ: c.z, targetX: c.x, targetZ: c.z,
          startTime: Date.now(), duration: 0, lastTick: tick, isIdle
        });
      } else {
        // Anti-Jitter: ignore old ticks
        if (tick <= interp.lastTick && interp.lastTick !== 0) return;

        // If target changed or state changed, update interpolation
        if (interp.targetX !== c.x || interp.targetZ !== c.z || interp.isIdle !== isIdle) {
          interp.startX = interp.currentX;
          interp.startZ = interp.currentZ;
          interp.targetX = c.x;
          interp.targetZ = c.z;
          interp.startTime = Date.now();
          interp.lastTick = tick;
          interp.isIdle = isIdle;
          
          // Fixed duration interpolation: polling period + buffer
          interp.duration = isIdle ? 0 : pollingInterval + 50;
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
  }, [isReady, citizens, selectedId, citizenDetail, selectCitizen, layers.citizens, zoomRef, pollingInterval]);

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
    if (!appRef.current || !layers.worldObjects.current) return;
    const W = appRef.current.renderer.width / (window.devicePixelRatio || 1);
    const H = appRef.current.renderer.height / (window.devicePixelRatio || 1);
    renderWorldObjects(layers.worldObjects.current, Array.from(worldObjects.values()).map(t => t.current), worldObjectSprites.current, cameraRef.current, zoomRef.current, W, H, (text, x, y) => setHoveredInfo({ text, x, y }), () => setHoveredInfo(null));
  }, [isReady, worldObjects, layers.worldObjects, cameraRef, zoomRef]);

  // Sync layer visibility
  useEffect(() => {
    if (layers.terrain.current) layers.terrain.current.visible = visibleLayers.terrain;
    if (layers.zones.current) layers.zones.current.visible = visibleLayers.zones;
    if (layers.worldObjects.current) layers.worldObjects.current.visible = visibleLayers.worldObjects;
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
