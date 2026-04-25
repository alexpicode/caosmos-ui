import React from 'react';
import {
  useZonePolling,
  useEnvironmentPolling,
  useCitizenPolling,
} from '@shared/hooks/usePolling';
import { useWorldStore } from '@store/useWorldStore';
import { useCitizenStore } from '@store/useCitizenStore';
import { vitalityColor, stateBadgeClass } from '@shared/utils/formatters';
import type { CitizenSummary } from '@core/entities';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  ScatterChart, Scatter, Cell, Treemap,
} from 'recharts';

function countByField<T>(
  items: T[], key: keyof T
): { name: string; value: number }[] {
  const counts: Record<string, number> = {};
  items.forEach(item => {
    const val = String(item[key]);
    counts[val] = (counts[val] ?? 0) + 1;
  });
  return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
}

function ExportButton({ citizens }: { citizens: CitizenSummary[] }) {
  const [mode, setMode] = React.useState<'json' | 'csv'>('json');

  const download = () => {
    let content: string;
    let filename: string;
    let type: string;

    if (mode === 'json') {
      content = JSON.stringify(citizens, null, 2);
      filename = `caosmos-session-${Date.now()}.json`;
      type = 'application/json';
    } else {
      const headers = 'uuid,name,state,currentGoal,vitality,x,z';
      const rows = citizens.map(c =>
        `${c.uuid},"${c.name}",${c.state},"${c.currentGoal}",${c.vitality},${c.x.toFixed(2)},${c.z.toFixed(2)}`
      );
      content = [headers, ...rows].join('\n');
      filename = `caosmos-session-${Date.now()}.csv`;
      type = 'text/csv';
    }

    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex gap-2">
      {(['json', 'csv'] as const).map(m => (
        <button key={m} onClick={() => setMode(m)}
          className="text-xs px-2 py-1 rounded transition-all"
          style={{
            background: mode === m ? 'rgba(6,182,212,0.15)' : 'rgba(30,41,59,0.6)',
            color: mode === m ? '#06b6d4' : '#94a3b8',
            border: `1px solid ${mode === m ? 'rgba(6,182,212,0.4)' : 'rgba(100,116,139,0.2)'}`,
          }}
        >
          {m.toUpperCase()}
        </button>
      ))}
      <button onClick={download}
        className="text-xs px-3 py-1 rounded transition-all text-slate-200 hover:text-cyan-300"
        style={{ background: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.3)' }}
      >
        ⬇ Export
      </button>
    </div>
  );
}

export function AnalyticsView() {
  useCitizenPolling();
  useZonePolling();
  useEnvironmentPolling();

  const citizens = useWorldStore(s => s.citizens);
  const selectCitizen = useCitizenStore(s => s.selectCitizen);
  const [search, setSearch] = React.useState('');
  const [sortKey, setSortKey] = React.useState<keyof CitizenSummary>('vitality');
  const [sortAsc, setSortAsc] = React.useState(true);

  const allCitizens = Array.from(citizens.values())
    .map(t => t.current)
    .filter((c): c is CitizenSummary => !!c && !!c.uuid);

  const stateDistribution = countByField(allCitizens, 'state');
  const scatterData = allCitizens.map(c => ({ x: c.vitality, y: c.x, z: c.z, name: c.name }));
  const goalDistribution = countByField(allCitizens, 'currentGoal').slice(0, 12);

  const treemapData = {
    name: 'Population',
    children: goalDistribution.map(g => ({ name: g.name, size: g.value || 1 }))
  };

  const filtered = allCitizens
    .filter(c =>
      !search ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.state.toLowerCase().includes(search.toLowerCase()) ||
      c.currentGoal.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      const cmp = typeof av === 'number' && typeof bv === 'number'
        ? av - bv
        : String(av).localeCompare(String(bv));
      return sortAsc ? cmp : -cmp;
    });

  const handleSort = (key: keyof CitizenSummary) => {
    if (sortKey === key) setSortAsc(a => !a);
    else { setSortKey(key); setSortAsc(true); }
  };

  const tooltipStyle = { background: '#0f172a', border: '1px solid #334155', color: '#f1f5f9', fontSize: 12 };
  const stateColors: Record<string, string> = {
    IDLE: '#06b6d4', WORKING: '#10b981', MOVING: '#3b82f6', EATING: '#f59e0b',
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6"
      style={{ background: '#020617' }}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-100">Analytics</h1>
          <p className="text-slate-500 text-sm">{allCitizens.length} citizens tracked this session</p>
        </div>
        <ExportButton citizens={allCitizens} />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* State distribution */}
        <div className="glass p-4">
          <h3 className="text-slate-400 text-xs uppercase tracking-widest mb-3">State Distribution</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={stateDistribution} margin={{ left: -20 }}>
              <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 10 }} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="value" radius={[3, 3, 0, 0]}>
                {stateDistribution.map((entry, i) => (
                  <Cell key={i} fill={stateColors[entry.name] ?? '#475569'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Vitality scatter */}
        <div className="glass p-4">
          <h3 className="text-slate-400 text-xs uppercase tracking-widest mb-3">Vitality Distribution</h3>
          <ResponsiveContainer width="100%" height={180}>
            <ScatterChart margin={{ left: -20 }}>
              <XAxis type="number" dataKey="x" name="Vitality" domain={[0, 100]}
                tick={{ fill: '#94a3b8', fontSize: 10 }} label={{ value: 'Vitality', position: 'insideBottom', fill: '#475569', fontSize: 10 }} />
              <YAxis type="number" dataKey="y" name="X pos" tick={{ fill: '#94a3b8', fontSize: 10 }} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ stroke: '#334155' }}
                formatter={(val: unknown) => [typeof val === 'number' ? val.toFixed(1) : '—', '']} />

              <Scatter data={scatterData}>
                {scatterData.map((entry, i) => (
                  <Cell key={i} fill={vitalityColor(entry.x)} />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>

        {/* Goal treemap */}
        <div className="glass p-4">
          <h3 className="text-slate-400 text-xs uppercase tracking-widest mb-3">Goals Treemap</h3>
          <ResponsiveContainer width="100%" height={180}>
            <Treemap
              data={treemapData.children}
              dataKey="size"
              nameKey="name"
              animationDuration={400}
              content={(props: any) => {
                const { x = 0, y = 0, width = 0, height = 0, index = 0, name = '' } = props;
                const colors = ['#06b6d4','#8b5cf6','#10b981','#f59e0b','#3b82f6','#ef4444'];
                return (
                  <g>
                    <rect x={x} y={y} width={width} height={height}
                      fill={colors[index % colors.length]} fillOpacity={0.5}
                      stroke="#020617" strokeWidth={1} />
                    {width > 40 && height > 20 && name && (
                      <text x={x + 4} y={y + 14} fontSize={9} fill="#f1f5f9">{name.slice(0, 18)}</text>
                    )}
                  </g>
                );
              }}
            />
          </ResponsiveContainer>
        </div>
      </div>

      {/* Master Table */}
      <div className="glass p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between gap-4">
          <h3 className="text-slate-400 text-xs uppercase tracking-widest">All Citizens ({filtered.length})</h3>
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Filter by name, state, or goal…"
            className="bg-transparent text-xs text-slate-300 outline-none placeholder:text-slate-600 border-b border-slate-700 pb-0.5 w-64"
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs min-w-[600px]">
            <thead>
              <tr>
                {(['name', 'state', 'currentGoal', 'vitality'] as (keyof CitizenSummary)[]).map(col => (
                  <th key={col as string} onClick={() => handleSort(col)}
                    className="px-3 py-2 text-left text-slate-500 uppercase text-xs tracking-widest cursor-pointer hover:text-slate-300 transition-colors select-none">
                    {col === 'currentGoal' ? 'Goal' : String(col)}
                    {sortKey === col && <span className="ml-1">{sortAsc ? '↑' : '↓'}</span>}
                  </th>
                ))}
                <th className="px-3 py-2 text-left text-slate-500 uppercase text-xs tracking-widest">Position</th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 200).map(c => (
                <tr key={c.uuid} onClick={() => selectCitizen(c.uuid)}
                  className="border-t cursor-pointer hover:bg-slate-700/30 transition-colors"
                  style={{ borderColor: 'rgba(100,116,139,0.1)' }}>
                  <td className="px-3 py-2 text-slate-200">{c.name}</td>
                  <td className="px-3 py-2"><span className={`badge ${stateBadgeClass(c.state)}`}>{c.state}</span></td>
                  <td className="px-3 py-2 text-slate-500 max-w-48 truncate">{c.currentGoal}</td>
                  <td className="px-3 py-2 font-mono" style={{ color: vitalityColor(c.vitality) }}>{c.vitality}</td>
                  <td className="px-3 py-2 text-slate-600 font-mono">{c.x.toFixed(1)}, {c.z.toFixed(1)}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-600">No records match filter</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
