import React from 'react';
import { useUIStore } from '@store/useUIStore';
import { useWorldStore } from '@store/useWorldStore';
import { useCitizenStore } from '@store/useCitizenStore';
import type { CitizenSummary } from '@core/entities';
import { vitalityColor, stateBadgeClass } from '@shared/utils/formatters';

type SortKey = 'name' | 'state' | 'currentGoal' | 'vitality';

export function BottomDrawer() {
  const drawerState = useUIStore(s => s.drawerState);
  const setDrawerState = useUIStore(s => s.setDrawerState);
  const bounds = useUIStore(s => s.viewportBounds);
  const getCitizensInBounds = useWorldStore(s => s.getCitizensInBounds);
  const currentTick = useWorldStore(s => s.currentTick);
  const selectCitizen = useCitizenStore(s => s.selectCitizen);
  const setActiveView = useUIStore(s => s.setActiveView);

  const [sortKey, setSortKey] = React.useState<SortKey>('name');
  const [sortAsc, setSortAsc] = React.useState(true);
  const [filter, setFilter] = React.useState('');

  const citizens = getCitizensInBounds(bounds);
  const avgVitality = citizens.length > 0
    ? Math.round(citizens.reduce((a, c) => a + c.vitality, 0) / citizens.length)
    : 0;

  const filtered = citizens.filter(c =>
    !filter || c.name.toLowerCase().includes(filter.toLowerCase()) ||
    c.state.toLowerCase().includes(filter.toLowerCase()) ||
    c.currentGoal.toLowerCase().includes(filter.toLowerCase())
  );

  const sorted = [...filtered].sort((a, b) => {
    const aVal = a[sortKey];
    const bVal = b[sortKey];
    const cmp = typeof aVal === 'number' && typeof bVal === 'number'
      ? aVal - bVal
      : String(aVal).localeCompare(String(bVal));
    return sortAsc ? cmp : -cmp;
  });

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(a => !a);
    else { setSortKey(key); setSortAsc(true); }
  };

  const handleRowClick = (citizen: CitizenSummary) => {
    selectCitizen(citizen.uuid);
    setActiveView('tactical');
  };

  const isExpanded = drawerState === 'expanded';

  return (
    <div
      className="border-t shrink-0 overflow-hidden flex flex-col transition-all duration-250"
      style={{
        height: isExpanded ? '280px' : '40px',
        borderColor: 'rgba(100,116,139,0.2)',
        background: 'rgba(15,23,42,0.92)',
        backdropFilter: 'blur(12px)',
      }}
    >
      {/* Drawer Handle / Summary row */}
      <button
        onClick={() => setDrawerState(isExpanded ? 'minimized' : 'expanded')}
        className="flex items-center gap-4 px-4 h-10 shrink-0 w-full text-left hover:bg-slate-800/50 transition-colors"
      >
        <span className="text-cyan-400 text-xs font-mono rotate-90 inline-block" style={{ transform: isExpanded ? 'rotate(270deg)' : 'rotate(90deg)', transition: 'transform 0.2s' }}>›</span>
        <span className="text-slate-400 text-xs">
          <span className="font-mono text-slate-200">{citizens.length}</span> citizens in view
          {citizens.length > 0 && (
            <> · avg vitality <span className="font-mono" style={{ color: vitalityColor(avgVitality) }}>{avgVitality}%</span></>
          )}
          <span className="text-slate-600 ml-4 font-mono">Tick #{currentTick.toLocaleString()}</span>
        </span>
      </button>

      {/* Census Table */}
      {isExpanded && (
        <div className="flex flex-col flex-1 min-h-0">
          {/* Filter */}
          <div className="px-4 py-2 border-b flex gap-2" style={{ borderColor: 'rgba(100,116,139,0.15)' }}>
            <input
              value={filter}
              onChange={e => setFilter(e.target.value)}
              placeholder="Filter by name, state, or goal..."
              className="flex-1 bg-transparent text-xs text-slate-200 outline-none placeholder:text-slate-600"
            />
            {filter && (
              <button onClick={() => setFilter('')} className="text-slate-500 hover:text-slate-300 text-xs">✕</button>
            )}
            <span className="text-slate-600 text-xs font-mono">{sorted.length}/{citizens.length}</span>
          </div>

          {/* Table */}
          <div className="overflow-x-auto overflow-y-auto flex-1">
            <table className="w-full text-xs min-w-[600px]">
              <thead className="sticky top-0" style={{ background: 'rgba(15,23,42,0.98)' }}>
                <tr>
                  {(['name', 'state', 'currentGoal', 'vitality'] as SortKey[]).map(col => (
                    <th
                      key={col}
                      onClick={() => handleSort(col)}
                      className="px-4 py-2 text-left text-slate-500 uppercase text-xs tracking-widest cursor-pointer hover:text-slate-300 transition-colors select-none"
                    >
                      {col === 'currentGoal' ? 'Goal' : col.charAt(0).toUpperCase() + col.slice(1)}
                      {sortKey === col && <span className="ml-1">{sortAsc ? '↑' : '↓'}</span>}
                    </th>
                  ))}
                  <th className="px-4 py-2 text-left text-slate-500 uppercase text-xs tracking-widest">Pos</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map(citizen => (
                  <tr
                    key={citizen.uuid}
                    onClick={() => handleRowClick(citizen)}
                    className="border-t cursor-pointer hover:bg-slate-700/30 transition-colors"
                    style={{ borderColor: 'rgba(100,116,139,0.1)' }}
                  >
                    <td className="px-4 py-2 text-slate-200 font-medium">{citizen.name}</td>
                    <td className="px-4 py-2">
                      <span className={`badge ${stateBadgeClass(citizen.state)}`}>{citizen.state}</span>
                    </td>
                    <td className="px-4 py-2 text-slate-400 max-w-48 truncate">{citizen.currentGoal}</td>
                    <td className="px-4 py-2">
                      <span className="font-mono" style={{ color: vitalityColor(citizen.vitality) }}>
                        {citizen.vitality}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-slate-600 font-mono text-xs">
                      {citizen.x.toFixed(1)}, {citizen.z.toFixed(1)}
                    </td>
                  </tr>
                ))}
                {sorted.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-slate-600 text-xs">
                      {filter ? 'No matches for filter' : 'No citizens in current viewport'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
