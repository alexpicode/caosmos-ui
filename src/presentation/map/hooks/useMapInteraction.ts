import { useCallback, useRef, useEffect, useMemo } from 'react';
import { Application } from 'pixi.js';
import { useUIStore } from '@store/useUIStore';
import { MIN_ZOOM, MAX_ZOOM } from '../MapConstants';
import { screenToWorld } from '../MapUtils';

export function useMapInteraction(
  appRef: React.RefObject<Application | null>, 
  containerRef: React.RefObject<HTMLDivElement | null>,
  cameraRef: React.MutableRefObject<{ x: number; y: number }>,
  zoomRef: React.MutableRefObject<number>,
  onViewChange: () => void
) {
  const isDragging = useRef(false);
  const lastMouse = useRef({ x: 0, y: 0 });
  const lastUpdateRef = useRef(0);

  const setViewportBounds = useUIStore(s => s.setViewportBounds);
  const setZoomLevel = useUIStore(s => s.setZoomLevel);

  const updateViewportBounds = useCallback((W: number, H: number, force = false) => {
    const now = Date.now();
    if (!force && now - lastUpdateRef.current < 300) return;
    lastUpdateRef.current = now;

    const tl = screenToWorld(0, 0, cameraRef.current, zoomRef.current, W, H);
    const br = screenToWorld(W, H, cameraRef.current, zoomRef.current, W, H);
    
    setViewportBounds({
      minX: Math.min(tl.x, br.x),
      minZ: Math.min(tl.z, br.z),
      maxX: Math.max(tl.x, br.x),
      maxZ: Math.max(tl.z, br.z)
    });
    setZoomLevel(zoomRef.current);
  }, [setViewportBounds, setZoomLevel]);

  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    const app = appRef.current;
    if (!app) return;
    const W = app.renderer.width / (window.devicePixelRatio || 1);
    const H = app.renderer.height / (window.devicePixelRatio || 1);

    const delta = -e.deltaY * 0.001;
    const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoomRef.current * (1 + delta)));
    zoomRef.current = newZoom;

    updateViewportBounds(W, H, true);
    onViewChange();
  }, [appRef, updateViewportBounds, onViewChange]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [handleWheel, containerRef]);

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
    onViewChange();
  }, [appRef, updateViewportBounds, onViewChange]);

  const handleMouseUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  const handlers = useMemo(() => ({
    onMouseDown: handleMouseDown,
    onMouseMove: handleMouseMove,
    onMouseUp: handleMouseUp,
    onMouseLeave: handleMouseUp,
  }), [handleMouseDown, handleMouseMove, handleMouseUp]);

  return useMemo(() => ({
    isDragging,
    handlers,
    updateViewportBounds
  }), [handlers, updateViewportBounds]);
}
