/** Format simulation tick */
export function formatTick(tick: number): string {
  return `#${tick.toLocaleString()}`;
}

/** Format world date */
export function formatWorldDate(day: number, time: string): string {
  return `Day ${day} · ${time}`;
}

/** Format a number as a percentage */
export function formatPercent(value: number, max = 100): string {
  return `${Math.round((value / max) * 100)}%`;
}

/** Truncate long strings */
export function truncate(str: string, maxLen: number): string {
  return str.length > maxLen ? str.slice(0, maxLen - 1) + '…' : str;
}

/** Format bytes to human-readable MB */
export function formatMB(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/** Get a colour class for a vitality value */
export function vitalityColor(vitality: number): string {
  if (vitality >= 70) return '#10b981'; // emerald
  if (vitality >= 35) return '#f59e0b'; // amber
  return '#ef4444'; // red
}

/** Get state badge class */
export function stateBadgeClass(state: string): string {
  switch (state.toUpperCase()) {
    case 'WORKING':  return 'badge-working';
    case 'MOVING':   return 'badge-moving';
    case 'EATING':   return 'badge-eating';
    case 'IDLE':
    default:         return 'badge-idle';
  }
}
