import { useState, useEffect, useRef } from 'react';
import type { BoundingBox } from '@core/entities';

/**
 * Hook to provide stable, padded, and gridded viewport bounds for efficient REST polling.
 */
export function useStableBounds(rawBounds: BoundingBox, zoom: number) {
  const [stable, setStable] = useState({
    narrow: rawBounds, // For citizens (small padding)
    wide: rawBounds,   // For entities (large padding + pre-loading)
  });

  const lastUpdateRef = useRef(rawBounds);

  useEffect(() => {
    // Dynamic grid size based on zoom
    // At higher zoom (zoom > 2), we want smaller grids (e.g. 5 units)
    // At lower zoom (zoom < 0.2), we want larger grids (e.g. 200 units)
    const gridSize = Math.max(5, Math.min(500, 50 / zoom));

    const roundToGrid = (v: number) => Math.round(v / gridSize) * gridSize;

    const gridded = {
      minX: roundToGrid(rawBounds.minX),
      minZ: roundToGrid(rawBounds.minZ),
      maxX: roundToGrid(rawBounds.maxX),
      maxZ: roundToGrid(rawBounds.maxZ),
    };

    // Threshold check: only update if the center moved by more than 20% of the current grid
    const dx = Math.abs((gridded.minX + gridded.maxX) / 2 - (lastUpdateRef.current.minX + lastUpdateRef.current.maxX) / 2);
    const dz = Math.abs((gridded.minZ + gridded.maxZ) / 2 - (lastUpdateRef.current.minZ + lastUpdateRef.current.maxZ) / 2);

    // Also check for significant zoom changes
    const dW = Math.abs((gridded.maxX - gridded.minX) - (lastUpdateRef.current.maxX - lastUpdateRef.current.minX));
    
    if (dx > gridSize * 0.5 || dz > gridSize * 0.5 || dW > gridSize * 2) {
      lastUpdateRef.current = gridded;

      // Calculate padded versions
      const W = gridded.maxX - gridded.minX;
      const H = gridded.maxZ - gridded.minZ;

      setStable({
        narrow: {
          minX: gridded.minX - W * 0.2,
          minZ: gridded.minZ - H * 0.2,
          maxX: gridded.maxX + W * 0.2,
          maxZ: gridded.maxZ + H * 0.2,
        },
        wide: {
          minX: gridded.minX - W * 0.5,
          minZ: gridded.minZ - H * 0.5,
          maxX: gridded.maxX + W * 0.5,
          maxZ: gridded.maxZ + H * 0.5,
        }
      });
    }
  }, [rawBounds, zoom]);

  return stable;
}
