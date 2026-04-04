import React from 'react';
import { useCitizenStore } from '@store/useCitizenStore';
import { useWorldStore } from '@store/useWorldStore';
import { useUIStore } from '@store/useUIStore';
import { useCitizenDetail, useCognitionPolling } from '@shared/hooks/usePolling';
import { vitalityColor, stateBadgeClass, truncate } from '@shared/utils/formatters';
import type { CitizenDetail, CognitionEntry, CitizenSummary } from '@core/entities';

// ─── Sub-components ──────────────────────────────

function StatBar({ label, value, max = 100, color }: { label: string; value: number; max?: number; color: string }) {
  const pct = Math.round((value / max) * 100);
  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between text-xs">
        <span className="text-slate-400">{label}</span>
        <span className="font-mono" style={{ color }}>{value}/{max}</span>
      </div>
      <div className="stat-bar-track">
        <div className="stat-bar-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

function KnownPlacesList({ places }: { places: string[] }) {
  const [isOpen, setIsOpen] = React.useState(false);

  if (places.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full text-slate-500 text-xs uppercase hover:text-slate-300 transition-colors group"
      >
        <div className="flex items-center gap-2">
          <span>Known Places</span>
          <span className="badge badge-idle text-[10px] leading-none px-1.5 opacity-60">
            {places.length}
          </span>
        </div>
        <span className={`text-[10px] transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`}>
          ▶
        </span>
      </button>

      {isOpen && (
        <div className="flex flex-wrap gap-1.5 animate-fade-in pl-1 border-l border-slate-800 ml-1 mt-1">
          {places.map((place) => (
            <span
              key={place}
              className="px-2 py-0.5 rounded text-[10px] font-medium tracking-wide uppercase"
              style={{
                background: 'rgba(30,41,59,0.5)',
                color: '#94a3b8',
                border: '1px solid rgba(100,116,139,0.15)',
                backdropFilter: 'blur(4px)',
              }}
            >
              {place.replace(/_/g, ' ')}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function CitizenInspector({ detail, uuid }: { detail: CitizenDetail; uuid: string }) {
  const cognition = useCognitionPolling(uuid);
  const cognitionHistory = useCitizenStore(s => s.cognitionHistory);
  const pinCitizen = useCitizenStore(s => s.pinCitizen);
  const unpinCitizen = useCitizenStore(s => s.unpinCitizen);
  const pinnedIds = useCitizenStore(s => s.pinnedCitizenIds);
  const isPinned = pinnedIds.has(uuid);

  const { perception, currentAction } = detail;
  const { identity, status, state, equipment, inventory, activeTask, lastAction } = perception;

  return (
    <div className="flex flex-col gap-3 animate-fade-in">
      {/* Identity header */}
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-slate-100 font-semibold text-sm truncate">{identity.name}</h2>
            <span className={`badge text-[10px] leading-none py-0.5 ${stateBadgeClass(state)}`}>
              {state}
            </span>
          </div>
          <div className="flex flex-wrap gap-1 mt-1">
            {identity.traits.map(t => (
              <span key={t} className="badge badge-idle text-slate-400">{t}</span>
            ))}
          </div>
        </div>
        <button
          onClick={() => isPinned ? unpinCitizen(uuid) : pinCitizen(uuid)}
          className="text-xs px-2 py-1 rounded transition-colors"
          style={{
            background: isPinned ? 'rgba(6,182,212,0.15)' : 'rgba(30,41,59,0.8)',
            color: isPinned ? '#06b6d4' : '#94a3b8',
            border: '1px solid rgba(100,116,139,0.3)',
          }}
        >
          📌 {isPinned ? 'Pinned' : 'Pin'}
        </button>
      </div>

      {/* Skills */}
      {Object.entries(identity.skills).length > 0 && (
        <div>
          <h4 className="text-slate-500 text-xs uppercase mb-2">Skills</h4>
          <div className="grid grid-cols-2 gap-1">
            {Object.entries(identity.skills).map(([k, v]) => (
              <div key={k} className="flex justify-between text-xs px-2 py-1 rounded"
                style={{ background: 'rgba(30,41,59,0.6)' }}>
                <span className="text-slate-400 capitalize">{k}</span>
                <span className="font-mono text-cyan-400">{v}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Status */}
      <div>
        <h4 className="text-slate-500 text-xs uppercase mb-2">Status</h4>
        <div className="flex flex-col gap-2">
          <StatBar label="Vitality" value={status.vitality} color={vitalityColor(status.vitality)} />
          <StatBar label="Energy" value={status.energy} color="#3b82f6" />
          <StatBar label="Hunger" value={status.hunger} color="#f59e0b" />
          <StatBar label="Stress" value={status.stress} color="#ef4444" />
        </div>
      </div>

      {/* Current Zone */}
      {detail.currentZone && (
        <div className="flex flex-col gap-1.5">
          <h4 className="text-slate-500 text-xs uppercase">Current Location</h4>
          <div className="px-3 py-2 rounded-lg border text-xs font-medium text-cyan-400 bg-cyan-400/5 border-cyan-400/20">
            📍 {detail.currentZone.replace(/_/g, ' ')}
          </div>
        </div>
      )}

      {/* Known Places (Collapsible) */}
      <KnownPlacesList places={detail.visitedZoneIds} />

      {/* Active Task */}
      {activeTask && (
        <div className="p-2.5 rounded-lg" style={{ background: 'rgba(30,41,59,0.7)', border: '1px solid rgba(100,116,139,0.2)' }}>
          <div className="flex justify-between items-center mb-1.5">
            <h4 className="text-slate-500 text-[10px] uppercase tracking-wider font-semibold">Active Task</h4>
            <span className="badge badge-working text-[10px] py-0.5 px-1.5 uppercase font-bold tracking-tight">
              {activeTask.type}
            </span>
          </div>
          <p className="text-slate-200 text-xs font-medium leading-relaxed mb-2">{activeTask.goal}</p>
          
          {(activeTask.targetName || activeTask.targetId || activeTask.targetDescription) && (
            <div className="mt-2 pt-2 border-t border-slate-700/50 flex flex-col gap-1">
              <div className="flex items-center gap-1.5">
                <div className="w-1 h-1 rounded-full bg-cyan-400/60 shadow-[0_0_4px_rgba(34,211,238,0.5)]" />
                <span className="text-cyan-400/90 text-[10px] font-bold uppercase tracking-widest">Target</span>
              </div>
              <div className="flex items-baseline gap-2 pl-2.5">
                {activeTask.targetName && (
                  <p className="text-slate-100 text-xs font-semibold">{activeTask.targetName}</p>
                )}
                {activeTask.targetId && (
                  <p className={`font-mono text-[10px] ${activeTask.targetName ? 'text-slate-500' : 'text-slate-300 font-semibold'}`}>
                    {activeTask.targetName ? `#${activeTask.targetId}` : activeTask.targetId}
                  </p>
                )}
              </div>
              {activeTask.targetDescription && (
                <p className="text-slate-400 text-[10px] italic leading-snug pl-2.5 mt-0.5 border-l border-slate-800 ml-0.5">
                  {activeTask.targetDescription}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Equipment */}
      <div>
        <h4 className="text-slate-500 text-xs uppercase mb-2">Equipment</h4>
        <div className="grid grid-cols-2 gap-2">
          {(['leftHand', 'rightHand'] as const).map(slot => {
            const item = equipment[slot];
            return (
              <div key={slot} className="p-2 rounded-lg text-xs"
                style={{ background: item ? 'rgba(6,182,212,0.08)' : 'rgba(15,23,42,0.6)', border: '1px solid rgba(100,116,139,0.2)' }}>
                <div className="text-slate-500 text-xs mb-1">{slot === 'leftHand' ? '← Left' : 'Right →'}</div>
                <div className="text-slate-300 font-medium">{item?.name ?? '—'}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Inventory */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <h4 className="text-slate-500 text-xs uppercase">Inventory</h4>
          <span className="text-slate-500 font-mono text-xs">
            {inventory.capacity.usedSlots}/{inventory.capacity.maxSlots}
          </span>
        </div>
        {inventory.items.length === 0 ? (
          <p className="text-slate-600 text-xs">Empty</p>
        ) : (
          <div className="grid grid-cols-2 gap-1">
            {inventory.items.map((item, i) => (
              <div key={i} className="flex justify-between items-center px-2 py-1 rounded text-xs"
                style={{ background: 'rgba(30,41,59,0.6)' }}>
                <span className="text-slate-300 truncate">{item.name}</span>
                <span className="text-cyan-400 font-mono ml-1 shrink-0">×{item.quantity}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* LLM Reasoning */}
      {(lastAction?.reasoningWas || currentAction?.reasoningWas) && (
        <div>
          <h4 className="text-slate-500 text-xs uppercase mb-2">Reasoning</h4>
          <div className="terminal text-xs max-h-32 overflow-y-auto">
            {(currentAction?.reasoningWas || lastAction?.reasoningWas) ?? '—'}
          </div>
        </div>
      )}

      {/* Cognition Timeline */}
      {cognitionHistory.length > 0 && (
        <div>
          <h4 className="text-slate-500 text-xs uppercase mb-2">Thought History</h4>
          <div className="flex flex-col gap-2">
            {cognitionHistory.slice(-8).reverse().map((entry: CognitionEntry, i: number) => (
              <CognitionEntryCard key={i} entry={entry} />
            ))}
          </div>
        </div>
      )}

      {cognition.isFetching && (
        <div className="flex justify-center py-2">
          <div className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}

function CognitionEntryCard({ entry }: { entry: CognitionEntry }) {
  const [expanded, setExpanded] = React.useState(false);
  return (
    <button
      onClick={() => setExpanded(e => !e)}
      className="text-left p-2 rounded-lg transition-colors"
      style={{ background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(100,116,139,0.15)' }}
    >
      <div className="flex justify-between items-center mb-1">
        <span className="font-mono text-cyan-400 text-xs">Tick #{entry.tick}</span>
        <span className="text-slate-500 text-xs truncate max-w-24">{entry.actionTarget}</span>
      </div>
      <p className="text-slate-400 text-xs leading-relaxed">
        {expanded ? entry.thoughtProcess : truncate(entry.thoughtProcess, 80)}
      </p>
    </button>
  );
}

function PinnedCard({ citizen }: { citizen: CitizenSummary }) {
  const selectCitizen = useCitizenStore(s => s.selectCitizen);
  const unpinCitizen = useCitizenStore(s => s.unpinCitizen);

  return (
    <div
      className="p-2.5 rounded-lg cursor-pointer hover:bg-slate-700/50 transition-colors group relative"
      onClick={() => selectCitizen(citizen.uuid)}
      style={{ background: 'rgba(30,41,59,0.6)', border: '1px solid rgba(100,116,139,0.2)' }}
    >
      <button
        onClick={e => { e.stopPropagation(); unpinCitizen(citizen.uuid); }}
        className="absolute top-1.5 right-1.5 text-slate-600 hover:text-red-400 text-xs z-10 p-1"
      >✕</button>
      <div className="flex items-center gap-2 mb-1.5 pr-5">
        <div className="w-2 h-2 rounded-full" style={{ background: vitalityColor(citizen.vitality) }} />
        <span className="text-slate-200 text-xs font-medium">{citizen.name}</span>
        <span className={`badge text-xs ml-auto ${stateBadgeClass(citizen.state)}`}>{citizen.state}</span>
      </div>
      <p className="text-slate-500 text-xs truncate mb-1.5">{citizen.currentGoal}</p>
    </div>
  );
}

export function RightSidebar() {
  const isOpen = useUIStore(s => s.rightSidebarOpen);
  const selectedId = useCitizenStore(s => s.selectedCitizenId);
  const citizenDetail = useCitizenStore(s => s.citizenDetail);
  const pinnedIds = useCitizenStore(s => s.pinnedCitizenIds);
  const selectCitizen = useCitizenStore(s => s.selectCitizen);
  const citizens = useWorldStore(s => s.citizens);

  // Always poll when a citizen is selected
  useCitizenDetail(selectedId);

  const pinnedCitizens = Array.from(pinnedIds)
    .map(id => citizens.get(id)?.current)
    .filter(Boolean) as CitizenSummary[];

  if (!isOpen) return null;

  return (
    <aside
      className="flex flex-col w-80 shrink-0 border-l overflow-y-auto animate-slide-in-right"
      style={{
        borderColor: 'rgba(100,116,139,0.15)',
        background: 'rgba(15,23,42,0.85)',
        backdropFilter: 'blur(12px)',
      }}
    >
      {/* Focus Section */}
      <section className="flex-1 p-4 border-b overflow-y-auto" style={{ borderColor: 'rgba(100,116,139,0.15)' }}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-slate-500 text-xs uppercase tracking-widest">Inspector</h3>
          {selectedId && (
            <button onClick={() => selectCitizen(null)} className="text-slate-500 hover:text-slate-300 text-xs">
              ✕ Clear
            </button>
          )}
        </div>

        {selectedId && citizenDetail ? (
          <CitizenInspector detail={citizenDetail} uuid={selectedId} />
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="text-3xl mb-2 opacity-30">👁</div>
            <p className="text-slate-600 text-xs">Click a citizen on the map or in the census to inspect them</p>
          </div>
        )}
      </section>

      {/* Pinned Section */}
      {pinnedCitizens.length > 0 && (
        <section className="p-4">
          <h3 className="text-slate-500 text-xs uppercase tracking-widest mb-3">
            Pinned ({pinnedCitizens.length})
          </h3>
          <div className="flex flex-col gap-2">
            {pinnedCitizens.map(c => <PinnedCard key={c.uuid} citizen={c} />)}
          </div>
        </section>
      )}
    </aside>
  );
}
