import { useUIStore } from '@store/useUIStore';
import { useWorldStore } from '@store/useWorldStore';
import { useConfigStore } from '@store/useConfigStore';

type Layer = keyof ReturnType<typeof useUIStore.getState>['visibleLayers'];

const LAYERS: { key: Layer; label: string; icon: string }[] = [
  { key: 'terrain',  label: 'Terrain',   icon: '⛰' },
  { key: 'zones',    label: 'Zones',     icon: '⬡' },
  { key: 'entities', label: 'Objects',   icon: '🪵' },
  { key: 'citizens', label: 'Citizens',  icon: '🫆' },
  { key: 'trails',   label: 'Trails',    icon: '〰' },
];

const RETENTION_OPTIONS = [5, 15, 60, 120] as const;

function HomeostasisDial({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  const r = 22;
  const circ = 2 * Math.PI * r;
  const filled = circ * (pct / 100);

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative w-14 h-14">
        <svg viewBox="0 0 56 56" className="w-14 h-14 -rotate-90">
          <circle cx="28" cy="28" r={r} fill="none" stroke="rgba(100,116,139,0.2)" strokeWidth="4" />
          <circle
            cx="28" cy="28" r={r} fill="none"
            stroke={color} strokeWidth="4"
            strokeDasharray={`${filled} ${circ - filled}`}
            strokeLinecap="round"
            style={{ transition: 'stroke-dasharray 0.6s ease-out', filter: `drop-shadow(0 0 4px ${color})` }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="font-mono text-xs font-bold text-slate-200">{pct}</span>
        </div>
      </div>
      <span className="text-slate-500 text-xs">{label}</span>
    </div>
  );
}

export function LeftSidebar() {
  const isOpen = useUIStore(s => s.leftSidebarOpen);
  const visibleLayers = useUIStore(s => s.visibleLayers);
  const toggleLayer = useUIStore(s => s.toggleLayer);
  const retentionMinutes = useConfigStore(s => s.retentionMinutes);
  const setRetention = useConfigStore(s => s.setRetention);
  const purgeAll = useWorldStore(s => s.purgeAll);

  // Computed homeostasis metrics
  const citizens = useWorldStore(s => s.citizens);
  const citizenList = Array.from(citizens.values()).map(t => t.current);
  const totalCitizens = citizenList.length;
  const avgVitality = totalCitizens > 0
    ? citizenList.reduce((a, c) => a + c.vitality, 0) / totalCitizens
    : 0;
  const activeWorkers = citizenList.filter(c => c.state === 'WORKING').length;

  // Estimated RAM usage (rough: each history entry ≈ 64 bytes, avg 50 entries per citizen)
  let totalEntries = 0;
  citizens.forEach(t => { totalEntries += t.history.length; });
  const ramEstimateMB = (totalEntries * 64) / 1024 / 1024;
  const { ramLimitMB } = useConfigStore();
  const ramPct = Math.min(100, (ramEstimateMB / ramLimitMB) * 100);

  if (!isOpen) {
    return (
      <div className="flex flex-col items-center py-4 gap-4 w-14 shrink-0 border-r"
        style={{ borderColor: 'rgba(100,116,139,0.15)', background: 'rgba(15,23,42,0.8)' }}
      >
        {LAYERS.map(l => (
          <button key={l.key} onClick={() => toggleLayer(l.key)} title={l.label}
            className="text-lg transition-opacity"
            style={{ opacity: visibleLayers[l.key] ? 1 : 0.3 }}
          >
            {l.icon}
          </button>
        ))}
      </div>
    );
  }

  return (
    <aside className="flex flex-col w-60 shrink-0 border-r overflow-y-auto"
      style={{
        borderColor: 'rgba(100,116,139,0.15)',
        background: 'rgba(15,23,42,0.85)',
        backdropFilter: 'blur(12px)',
      }}
    >
      {/* Homeostasis */}
      <section className="p-4 border-b" style={{ borderColor: 'rgba(100,116,139,0.15)' }}>
        <h3 className="text-slate-500 text-xs uppercase tracking-widest mb-3">Homeostasis</h3>
        <div className="flex justify-around">
          <HomeostasisDial label="Pop" value={totalCitizens} max={Math.max(100, totalCitizens)} color="#06b6d4" />
          <HomeostasisDial label="Vitality" value={avgVitality} max={100} color="#10b981" />
          <HomeostasisDial label="Active" value={activeWorkers} max={Math.max(1, totalCitizens)} color="#8b5cf6" />
        </div>
      </section>

      {/* Layer Manager */}
      <section className="p-4 border-b" style={{ borderColor: 'rgba(100,116,139,0.15)' }}>
        <h3 className="text-slate-500 text-xs uppercase tracking-widest mb-3">Layers</h3>
        <div className="flex flex-col gap-1.5">
          {LAYERS.map(l => (
            <label key={l.key} className="flex items-center gap-3 cursor-pointer group">
              <div
                onClick={() => toggleLayer(l.key)}
                className="w-4 h-4 rounded border flex items-center justify-center transition-all cursor-pointer"
                style={{
                  borderColor: visibleLayers[l.key] ? '#06b6d4' : 'rgba(100,116,139,0.4)',
                  background: visibleLayers[l.key] ? 'rgba(6,182,212,0.15)' : 'transparent',
                }}
              >
                {visibleLayers[l.key] && (
                  <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                    <polyline points="1,4 3,6 7,2" stroke="#06b6d4" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </div>
              <span className="text-xs text-slate-300 group-hover:text-slate-100 transition-colors select-none">
                {l.icon} {l.label}
              </span>
            </label>
          ))}
        </div>
      </section>

      {/* Session Config */}
      <section className="p-4 flex flex-col gap-4">
        <h3 className="text-slate-500 text-xs uppercase tracking-widest">Session</h3>

        {/* Retention */}
        <div>
          <div className="flex justify-between text-xs mb-2">
            <span className="text-slate-400">History Retention</span>
            <span className="text-cyan-400 font-mono">{retentionMinutes}m</span>
          </div>
          <div className="grid grid-cols-4 gap-1">
            {RETENTION_OPTIONS.map(opt => (
              <button
                key={opt}
                onClick={() => setRetention(opt)}
                className="text-xs py-1 rounded transition-all"
                style={{
                  background: retentionMinutes === opt ? 'rgba(6,182,212,0.2)' : 'rgba(30,41,59,0.8)',
                  color: retentionMinutes === opt ? '#06b6d4' : '#94a3b8',
                  border: `1px solid ${retentionMinutes === opt ? 'rgba(6,182,212,0.4)' : 'rgba(100,116,139,0.2)'}`,
                }}
              >
                {opt}m
              </button>
            ))}
          </div>
        </div>

        {/* RAM Monitor */}
        <div>
          <div className="flex justify-between text-xs mb-2">
            <span className="text-slate-400">Buffer Memory</span>
            <span className="font-mono" style={{ color: ramPct > 80 ? '#f59e0b' : '#94a3b8' }}>
              {ramEstimateMB.toFixed(1)} MB
            </span>
          </div>
          <div className="stat-bar-track">
            <div
              className="stat-bar-fill"
              style={{
                width: `${ramPct}%`,
                background: ramPct > 80 ? '#f59e0b' : '#06b6d4',
              }}
            />
          </div>
        </div>

        {/* Purge */}
        <button
          onClick={() => purgeAll()}
          className="text-xs py-2 px-3 rounded border transition-all text-slate-400 hover:text-red-400 hover:border-red-500/40"
          style={{ border: '1px solid rgba(100,116,139,0.2)' }}
        >
          🗑 Purge History
        </button>
      </section>
    </aside>
  );
}
