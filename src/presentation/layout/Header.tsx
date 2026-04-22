import React from 'react';
import { useWorldStore } from '@store/useWorldStore';
import { useUIStore } from '@store/useUIStore';
import { useCitizenStore } from '@store/useCitizenStore';
import { formatTick, formatWorldDate } from '@shared/utils/formatters';

export function Header() {
  const currentTick = useWorldStore(s => s.currentTick);
  const environment = useWorldStore(s => s.environment);
  const desynced = useWorldStore(s => s.desynced);
  const activeView = useUIStore(s => s.activeView);
  const setActiveView = useUIStore(s => s.setActiveView);
  const networkStatus = useUIStore(s => s.networkStatus);
  const lastPollMs = useUIStore(s => s.lastPollMs);
  const citizens = useWorldStore(s => s.citizens);
  const selectCitizen = useCitizenStore(s => s.selectCitizen);
  const toggleLeft = useUIStore(s => s.toggleLeftSidebar);
  const toggleRight = useUIStore(s => s.toggleRightSidebar);

  const [search, setSearch] = React.useState('');
  const [suggestions, setSuggestions] = React.useState<{ id: string; name: string }[]>([]);

  const handleSearch = (value: string) => {
    setSearch(value);
    if (value.trim().length < 2) { setSuggestions([]); return; }
    const q = value.toLowerCase();
    const results: { id: string; name: string }[] = [];
    citizens.forEach(t => {
      if (t.current.name.toLowerCase().includes(q) || t.id.includes(q)) {
        results.push({ id: t.id, name: t.current.name });
      }
    });
    setSuggestions(results.slice(0, 8));
  };

  const selectFromSearch = (id: string) => {
    selectCitizen(id);
    setSearch('');
    setSuggestions([]);
    setActiveView('tactical');
  };

  const statusColor = { ok: '#10b981', slow: '#f59e0b', error: '#ef4444' }[networkStatus];
  const lastPollText = lastPollMs > 0
    ? `${Math.round((Date.now() - lastPollMs) / 1000)}s ago`
    : 'No poll yet';

  return (
    <header className="flex items-center gap-4 px-4 h-14 border-b shrink-0 relative z-50"
      style={{
        background: 'rgba(15,23,42,0.95)',
        backdropFilter: 'blur(12px)',
        borderColor: 'rgba(100,116,139,0.25)',
      }}
    >
      {/* Hamburger */}
      <button
        onClick={toggleLeft}
        className="p-1.5 rounded hover:bg-slate-700 transition-colors text-slate-400 hover:text-slate-100"
        title="Toggle left panel"
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor">
          <rect x="0" y="2" width="18" height="2" rx="1"/>
          <rect x="0" y="8" width="18" height="2" rx="1"/>
          <rect x="0" y="14" width="18" height="2" rx="1"/>
        </svg>
      </button>

      {/* Logo + Clock */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse-glow" />
          <span className="font-bold text-cyan-400 tracking-wider text-sm" style={{ fontFamily: 'var(--font-family-mono)' }}>
            CAOSMOS
          </span>
        </div>
        <div className="h-4 w-px bg-slate-700" />
        <div className="flex flex-col leading-none">
          <span className="text-slate-400 text-xs">
            {environment ? formatWorldDate(environment.date.day, environment.date.time) : '—'}
          </span>
          <span className="text-cyan-300 font-mono text-xs font-bold">
            {formatTick(currentTick)}
          </span>
        </div>
      </div>

      {/* Global Search */}
      <div className="relative flex-1 max-w-md mx-auto">
        <div className="flex items-center gap-2 rounded-lg px-3 h-8"
          style={{
            background: 'rgba(30,41,59,0.8)',
            border: '1px solid rgba(100,116,139,0.3)',
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-slate-500">
            <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
          </svg>
          <input
            value={search}
            onChange={e => handleSearch(e.target.value)}
            placeholder="Search citizens..."
            className="bg-transparent outline-none text-slate-200 text-xs w-full placeholder:text-slate-600"
          />
        </div>
        {suggestions.length > 0 && (
          <div className="absolute top-full mt-1 left-0 right-0 glass rounded-lg overflow-hidden z-50">
            {suggestions.map(s => (
              <button
                key={s.id}
                onClick={() => selectFromSearch(s.id)}
                className="w-full text-left px-3 py-2 text-xs text-slate-300 hover:bg-slate-700 transition-colors flex justify-between"
              >
                <span>{s.name}</span>
                <span className="text-slate-500 font-mono">{s.id.slice(0, 8)}…</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* View Toggle */}
      <div className="flex rounded-lg overflow-hidden border border-slate-700 shrink-0">
        {(['tactical', 'analytics'] as const).map(v => (
          <button
            key={v}
            onClick={() => setActiveView(v)}
            className="px-3 h-7 text-xs font-medium transition-colors"
            style={{
              background: activeView === v ? 'rgba(6,182,212,0.15)' : 'transparent',
              color: activeView === v ? '#06b6d4' : '#94a3b8',
            }}
          >
            {v === 'tactical' ? '🗺 Tactical' : '📊 Analytics'}
          </button>
        ))}
      </div>

      {/* Network Status */}
      <div className="flex items-center gap-2 shrink-0 text-xs text-slate-400">
        <div className="w-2 h-2 rounded-full" style={{ background: statusColor }} />
        <span className="font-mono text-xs">{lastPollText}</span>
        {desynced && (
          <span className="text-amber-400 font-mono text-xs animate-pulse-glow">⚠ DESYNC</span>
        )}
      </div>

      {/* Right panel toggle */}
      <button
        onClick={toggleRight}
        className="p-1.5 rounded hover:bg-slate-700 transition-colors text-slate-400 hover:text-slate-100"
        title="Toggle inspector"
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor">
          <rect x="0" y="2" width="18" height="2" rx="1"/>
          <rect x="4" y="8" width="14" height="2" rx="1"/>
          <rect x="8" y="14" width="10" height="2" rx="1"/>
        </svg>
      </button>
    </header>
  );
}
