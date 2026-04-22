import { useUIStore } from '@store/useUIStore';
import { Header } from './Header';
import { LeftSidebar } from './LeftSidebar';
import { RightSidebar } from './RightSidebar';
import { BottomDrawer } from './BottomDrawer';
import { TacticalMapView } from '@presentation/views/TacticalMapView';
import { AnalyticsView } from '@presentation/views/AnalyticsView';

export function AppShell() {
  const activeView = useUIStore(s => s.activeView);
  const leftSidebarOpen = useUIStore(s => s.leftSidebarOpen);

  return (
    <div
      className="flex flex-col h-full w-full overflow-hidden"
      style={{ background: '#020617', fontFamily: 'var(--font-family-sans)' }}
    >
      {/* Top Header */}
      <Header />

      {/* Main content area */}
      <div className="flex flex-1 min-h-0">
        {/* Left Sidebar */}
        {leftSidebarOpen !== false && <LeftSidebar />}

        {/* Center: Map or Analytics */}
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          {activeView === 'tactical' ? <TacticalMapView /> : <AnalyticsView />}
          <BottomDrawer />
        </div>

        {/* Right Sidebar / Inspector */}
        <RightSidebar />
      </div>
    </div>
  );
}
