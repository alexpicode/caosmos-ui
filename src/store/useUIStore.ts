import { create } from 'zustand';
import type { BoundingBox } from '@core/entities';

type ActiveView = 'tactical' | 'analytics';
type DrawerState = 'minimized' | 'expanded';

interface VisibleLayers {
  terrain: boolean;
  zones: boolean;
  worldObjects: boolean;
  citizens: boolean;
  trails: boolean;
}

interface UIStoreState {
  viewportBounds: BoundingBox;
  zoomLevel: number;
  visibleLayers: VisibleLayers;
  activeView: ActiveView;
  drawerState: DrawerState;
  leftSidebarOpen: boolean;
  rightSidebarOpen: boolean;
  networkStatus: 'ok' | 'slow' | 'error';
  lastPollMs: number;
  consoleFailures: number;

  setViewportBounds: (bounds: BoundingBox) => void;
  setZoomLevel: (zoom: number) => void;
  toggleLayer: (layer: keyof VisibleLayers) => void;
  setActiveView: (view: ActiveView) => void;
  setDrawerState: (state: DrawerState) => void;
  toggleLeftSidebar: () => void;
  toggleRightSidebar: () => void;
  setNetworkStatus: (status: 'ok' | 'slow' | 'error') => void;
  setLastPollMs: (ms: number) => void;
  incrementFailures: () => void;
  resetFailures: () => void;
}

export const useUIStore = create<UIStoreState>()((set) => ({
  viewportBounds: { minX: -50, minZ: -50, maxX: 50, maxZ: 50 },
  zoomLevel: 1,
  visibleLayers: {
    terrain: true,
    zones: true,
    worldObjects: true,
    citizens: true,
    trails: true,
  },
  activeView: 'tactical',
  drawerState: 'minimized',
  leftSidebarOpen: true,
  rightSidebarOpen: true,
  networkStatus: 'ok',
  lastPollMs: 0,
  consoleFailures: 0,

  setViewportBounds: (bounds) => set({ viewportBounds: bounds }),
  setZoomLevel: (zoom) => set({ zoomLevel: zoom }),

  toggleLayer: (layer) =>
    set(state => ({
      visibleLayers: { ...state.visibleLayers, [layer]: !state.visibleLayers[layer] },
    })),

  setActiveView: (view) => set({ activeView: view }),
  setDrawerState: (drawerState) => set({ drawerState }),

  toggleLeftSidebar: () => set(state => ({ leftSidebarOpen: !state.leftSidebarOpen })),
  toggleRightSidebar: () => set(state => ({ rightSidebarOpen: !state.rightSidebarOpen })),

  setNetworkStatus: (networkStatus) => set({ networkStatus }),
  setLastPollMs: (lastPollMs) => set({ lastPollMs }),
  incrementFailures: () => set(state => ({ consoleFailures: state.consoleFailures + 1 })),
  resetFailures: () => set({ consoleFailures: 0 }),
}));
