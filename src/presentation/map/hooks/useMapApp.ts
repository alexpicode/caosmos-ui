import { useEffect, useRef, useMemo, useState } from 'react';
import { Application, Container } from 'pixi.js';

export function useMapApp(containerRef: React.RefObject<HTMLDivElement | null>) {
  const appRef = useRef<Application | null>(null);
  const terrainLayerRef = useRef<Container | null>(null);
  const zoneLayerRef = useRef<Container | null>(null);
  const entityLayerRef = useRef<Container | null>(null);
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
      
      setIsReady(true);
    };

    initPixi();

    return () => {
      isDestroyed = true;
      if (fallbackApp) {
        try { fallbackApp.destroy(true, { children: true }); } catch (e) { }
      }
      appRef.current = null;
    };
  }, [containerRef]);

  return useMemo(() => ({
    appRef,
    layers: {
      terrain: terrainLayerRef,
      zones: zoneLayerRef,
      entities: entityLayerRef,
      trails: trailLayerRef,
      citizens: citizenLayerRef,
    },
    isReady
  }), [isReady]);
}
