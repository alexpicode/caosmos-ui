import { useEffect, useRef, useMemo, useState } from 'react';
import { Application, Container } from 'pixi.js';

export function useMapApp(containerRef: React.RefObject<HTMLDivElement | null>) {
  const appRef = useRef<Application | null>(null);
  const worldContainerRef = useRef<Container | null>(null);
  const terrainLayerRef = useRef<Container | null>(null);
  const zoneLayerRef = useRef<Container | null>(null);
  const worldObjectLayerRef = useRef<Container | null>(null);
  const trailLayerRef = useRef<Container | null>(null);
  const citizenLayerRef = useRef<Container | null>(null);
  const [isReady, setIsReady] = useState(false);

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

      // Setup world container for panning/scaling
      const world = new Container();
      app.stage.addChild(world);
      worldContainerRef.current = world;

      // Setup layers as children of world
      const terrain = new Container();
      const zones = new Container();
      const worldObjects = new Container();
      const trails = new Container();
      const citizens = new Container();

      world.addChild(terrain, zones, worldObjects, trails, citizens);

      terrainLayerRef.current = terrain;
      zoneLayerRef.current = zones;
      worldObjectLayerRef.current = worldObjects;
      trailLayerRef.current = trails;
      citizenLayerRef.current = citizens;
      
      setIsReady(true);
    };

    initPixi();

    return () => {
      isDestroyed = true;
      if (fallbackApp) {
        try { fallbackApp.destroy(true, { children: true }); } catch (e) { /* Ignore destroy errors on unmount */ }
      }
      appRef.current = null;
    };
  }, [containerRef]);

  return useMemo(() => ({
    appRef,
    layers: {
      world: worldContainerRef,
      terrain: terrainLayerRef,
      zones: zoneLayerRef,
      worldObjects: worldObjectLayerRef,
      trails: trailLayerRef,
      citizens: citizenLayerRef,
    },
    isReady
  }), [isReady]);
}
