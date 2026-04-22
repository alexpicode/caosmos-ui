import { WORLD_SCALE } from './MapConstants';
import { vitalityColor } from '@shared/utils/formatters';

// State colors for citizen sprites
export function citizenColor(state: string): number {
  switch (state.toUpperCase()) {
    case 'WORKING': return 0x10b981;
    case 'MOVING': return 0x3b82f6;
    case 'EATING': return 0xf59e0b;
    case 'IDLE':
    default: return 0x06b6d4;
  }
}

// Entity type colors
export function entityColor(type: string): number {
  switch (type.toUpperCase()) {
    case 'TREE': return 0x15803d;
    case 'ROCK': return 0x78716c;
    case 'BUILDING': return 0x7c3aed;
    default: return 0x475569;
  }
}

// Map vitality percentage to hex color
export function getVitalityHexColor(vitality: number): number {
  return parseInt(vitalityColor(vitality).replace('#', '0x'));
}

// World coords → screen pixels
export function worldToScreen(
  x: number, 
  z: number, 
  camera: { x: number; y: number }, 
  zoom: number, 
  W: number, 
  H: number
) {
  return {
    sx: (x * WORLD_SCALE - camera.x) * zoom + W / 2,
    sy: (-z * WORLD_SCALE - camera.y) * zoom + H / 2,
  };
}

// Screen pixels → world coords
export function screenToWorld(
  sx: number, 
  sy: number, 
  camera: { x: number; y: number }, 
  zoom: number, 
  W: number, 
  H: number
) {
  return {
    x: ((sx - W / 2) / zoom + camera.x) / WORLD_SCALE,
    z: -((sy - H / 2) / zoom + camera.y) / WORLD_SCALE,
  };
}
