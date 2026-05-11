'use client';

import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Suspense, useState, useEffect, useCallback, useRef } from 'react';
import { AGENTS } from './agentsConfig';
import type { AgentState } from './agentsConfig';
import AgentDesk from './AgentDesk';
import AgentAvatar from './AgentAvatar';
import RoundTable from './RoundTable';
import Floor from './Floor';
import Walls from './Walls';
import Lights from './Lights';
import AgentPanel from './AgentPanel';
import AgentStatusBar from './AgentStatusBar';
import AgentListPanel from './AgentListPanel';
import LiveActivityPanel from './LiveActivityPanel';
import FirstPersonControls from './FirstPersonControls';
import CherryBlossomGarden from './CherryBlossomGarden';
import ClawTeamOffice from './ClawTeamOffice';
import type { CTMember } from './ClawTeamOffice';
import BreakRoom from './BreakRoom';
import StudyCorner from './StudyCorner';
import FoldingScreen from './FoldingScreen';
import TVScreen from './TVScreen';
import WallClock from './WallClock';

import { useIsMobile } from '@/hooks/useIsMobile';

const EMPTY_CLAWTEAM_SUMMARY = { pending: 0, in_progress: 0, completed: 0, blocked: 0 };
const ACTIVE_CLAWTEAM_REFRESH_MS = 10000;
const IDLE_CLAWTEAM_REFRESH_MS = 30000;
const OFFICE_RENDER_TICK_MS = 1000 / 30;
const OFFICE_CAMERA_QUERY_PARAM = 'officeCamera';
const OFFICE_QA_QUERY_PARAM = 'officeAvatarDebug';
const DEFAULT_OFFICE_CAMERA_PRESET_ID = 'default';
const BREAKROOM_OFFICE_CAMERA_PRESET_ID = 'breakroom';

type OfficeCameraPreset = {
  id: typeof DEFAULT_OFFICE_CAMERA_PRESET_ID | typeof BREAKROOM_OFFICE_CAMERA_PRESET_ID;
  camera: {
    position: [number, number, number];
    fov: number;
  };
  orbitTarget: [number, number, number];
};

const OFFICE_CAMERA_PRESETS: Record<OfficeCameraPreset['id'], OfficeCameraPreset> = {
  default: {
    id: DEFAULT_OFFICE_CAMERA_PRESET_ID,
    camera: { position: [-15, 16, 28], fov: 60 },
    orbitTarget: [-15, 0, 0],
  },
  breakroom: {
    id: BREAKROOM_OFFICE_CAMERA_PRESET_ID,
    camera: { position: [6.8, 6.4, 14.2], fov: 42 },
    orbitTarget: [10.9, 1.1, 7.1],
  },
};

function getOfficeCameraPreset(presetId: string | null): OfficeCameraPreset {
  if (presetId === BREAKROOM_OFFICE_CAMERA_PRESET_ID) {
    return OFFICE_CAMERA_PRESETS.breakroom;
  }

  return OFFICE_CAMERA_PRESETS.default;
}

function isOfficeQaEnabled(search: string): boolean {
  return new URLSearchParams(search).get(OFFICE_QA_QUERY_PARAM) === '1';
}

function getOfficeCameraPresetFromWindow(): OfficeCameraPreset {
  if (typeof window === 'undefined') {
    return OFFICE_CAMERA_PRESETS.default;
  }

  if (!isOfficeQaEnabled(window.location.search)) {
    return OFFICE_CAMERA_PRESETS.default;
  }

  const presetId = new URLSearchParams(window.location.search).get(OFFICE_CAMERA_QUERY_PARAM);
  return getOfficeCameraPreset(presetId);
}

function OfficeSceneTicker() {
  const { invalidate } = useThree();

  useEffect(() => {
    let intervalId: number | null = null;

    const stop = () => {
      if (intervalId !== null) {
        window.clearInterval(intervalId);
        intervalId = null;
      }
    };

    const start = () => {
      if (document.hidden || intervalId !== null) {
        return;
      }

      intervalId = window.setInterval(() => {
        invalidate();
      }, OFFICE_RENDER_TICK_MS);
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        stop();
        return;
      }

      invalidate();
      start();
    };

    invalidate();
    start();
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      stop();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [invalidate]);

  return null;
}

export default function Office3D() {
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [interactionModal, setInteractionModal] = useState<string | null>(null);
  const [modalData, setModalData] = useState<{
    todayTokens: number;
    activeAgents: number;
    totalAgents: number;
    uptime: string;
    recentSessions: number;
  }>({ todayTokens: 0, activeAgents: 0, totalAgents: 0, uptime: '...', recentSessions: 0 });
  const [controlMode] = useState<'orbit' | 'fps'>('orbit');
  const isMobile = useIsMobile();
  const [officeCameraPreset, setOfficeCameraPreset] = useState<OfficeCameraPreset>(() => getOfficeCameraPresetFromWindow());
  const [isOfficeQaMode, setIsOfficeQaMode] = useState<boolean>(() => (
    typeof window !== 'undefined' && isOfficeQaEnabled(window.location.search)
  ));

  const defaultState = (id: string): AgentState => ({
    id,
    status: 'idle',
  });

  // ClawTeam state
  const [clawTeamMembers, setClawTeamMembers] = useState<CTMember[]>([]);
  const [clawTeamSummary, setClawTeamSummary] = useState(EMPTY_CLAWTEAM_SUMMARY);
  const [clawTeamName, setClawTeamName] = useState('');
  const clawTeamPollTimeoutRef = useRef<number | null>(null);

  const [agentStates, setAgentStates] = useState<Record<string, AgentState>>(() => {
    const initial: Record<string, AgentState> = {};
    for (const agent of AGENTS) {
      initial[agent.id] = defaultState(agent.id);
    }
    return initial;
  });

  const fetchAgentStates = useCallback(async () => {
    try {
      const res = await fetch('/api/office');
      if (!res.ok) return;
      const data = await res.json();
      if (!data.agents || !Array.isArray(data.agents)) return;

      setAgentStates(prev => {
        const next = { ...prev };
        for (const a of data.agents) {
          const id = a.id;
          if (!id) continue;
          let status: 'working' | 'thinking' | 'idle' | 'sleeping' | 'error' = 'idle';
          if (a.status === 'working' || a.isActive) {
            status = 'working';
          } else if (a.status === 'sleeping') {
            status = 'sleeping';
          } else if (a.status === 'idle') {
            status = 'idle';
          }

          next[id] = {
            id,
            status,
            currentTask: a.currentTask || '',
            model: a.model || prev[id]?.model,
            sessionCount: a.sessionCount ?? prev[id]?.sessionCount,
            totalTokens: a.totalTokens ?? prev[id]?.totalTokens,
            lastActivity: a.lastSeen ? new Date(a.lastSeen).toISOString() : prev[id]?.lastActivity,
            recentSessions: a.recentSessions ?? prev[id]?.recentSessions,
          };
        }
        return next;
      });
    } catch {
      // silently fail
    }
  }, []);

  useEffect(() => {
    const syncOfficeCameraPreset = () => {
      const nextIsOfficeQaMode = isOfficeQaEnabled(window.location.search);
      const nextPreset = getOfficeCameraPresetFromWindow();

      setIsOfficeQaMode(prevIsOfficeQaMode => (
        prevIsOfficeQaMode === nextIsOfficeQaMode ? prevIsOfficeQaMode : nextIsOfficeQaMode
      ));
      setOfficeCameraPreset(prevPreset => (
        prevPreset.id === nextPreset.id ? prevPreset : nextPreset
      ));
    };

    syncOfficeCameraPreset();
    window.addEventListener('popstate', syncOfficeCameraPreset);

    return () => {
      window.removeEventListener('popstate', syncOfficeCameraPreset);
    };
  }, []);

  useEffect(() => {
    const initialFetch = window.setTimeout(() => {
      void fetchAgentStates();
    }, 0);
    const interval = window.setInterval(() => {
      void fetchAgentStates();
    }, 500);

    return () => {
      window.clearTimeout(initialFetch);
      window.clearInterval(interval);
    };
  }, [fetchAgentStates]);

  // Poll /api/agents/status every 10s for real-time sub-agent status
  const fetchAgentStatuses = useCallback(async () => {
    try {
      const res = await fetch('/api/agents/status');
      if (!res.ok) return;
      const data = await res.json();
      if (!data.agents || typeof data.agents !== 'object') return;

      setAgentStates(prev => {
        const next = { ...prev };
        for (const [agentId, entry] of Object.entries(data.agents) as [string, any][]) {
          if (!agentId) continue;
          let status: AgentState['status'] = 'idle';
          switch (entry.status) {
            case 'working': status = 'working'; break;
            case 'thinking': status = 'thinking'; break;
            case 'sleeping': status = 'sleeping'; break;
            case 'error': status = 'error'; break;
            case 'idle': default: status = 'idle'; break;
          }
          next[agentId] = {
            id: agentId,
            status,
            currentTask: entry.currentTask || prev[agentId]?.currentTask || '',
            lastActivity: entry.lastActivity || prev[agentId]?.lastActivity,
            model: prev[agentId]?.model,
            sessionCount: prev[agentId]?.sessionCount,
            totalTokens: prev[agentId]?.totalTokens,
            recentSessions: prev[agentId]?.recentSessions,
          };
        }
        return next;
      });
    } catch {
      // silently fail
    }
  }, []);

  useEffect(() => {
    const initialFetch = window.setTimeout(() => {
      void fetchAgentStatuses();
    }, 1000);
    const interval = window.setInterval(() => {
      void fetchAgentStatuses();
    }, 10000);

    return () => {
      window.clearTimeout(initialFetch);
      window.clearInterval(interval);
    };
  }, [fetchAgentStatuses]);

  // Fetch ClawTeam data
  const clearClawTeamPollTimeout = useCallback(() => {
    if (clawTeamPollTimeoutRef.current !== null) {
      window.clearTimeout(clawTeamPollTimeoutRef.current);
      clawTeamPollTimeoutRef.current = null;
    }
  }, []);

  const fetchClawTeam = useCallback(async (): Promise<boolean> => {
    try {
      const res = await fetch('/api/clawteam');
      if (!res.ok) return false;
      const data = await res.json();
      if (!data.active || !data.teams?.length) {
        setClawTeamMembers([]);
        setClawTeamSummary(EMPTY_CLAWTEAM_SUMMARY);
        setClawTeamName('');
        return false;
      }

      // Merge all teams (Mac + PC) into a single view
      const allMembers: CTMember[] = [];
      const mergedSummary = { pending: 0, in_progress: 0, completed: 0, blocked: 0 };
      const teamNames: string[] = [];

      for (const team of data.teams) {
        teamNames.push(team.teamName);
        const summary = team.taskSummary || { pending: 0, in_progress: 0, completed: 0, blocked: 0 };
        mergedSummary.pending += summary.pending;
        mergedSummary.in_progress += summary.in_progress;
        mergedSummary.completed += summary.completed;
        mergedSummary.blocked += summary.blocked;

        const inProgressOwners = new Set(
          (team.tasks?.in_progress || []).map((t: { owner: string }) => t.owner)
        );

        for (const m of (team.members || [])) {
          allMembers.push({
            name: m.name,
            agentType: m.agentType,
            status: inProgressOwners.has(m.name) ? 'working' as const : 'idle' as const,
            color: ['#FF9800', '#03A9F4', '#4CAF50', '#E91E63', '#9C27B0', '#00BCD4', '#FF5722', '#607D8B'][allMembers.length % 8],
            origin: m.origin || team.origin || 'mac',
            originLabel: m.originLabel || team.originLabel || '🍎',
          });
        }
      }

      setClawTeamName(teamNames.join(' + '));
      setClawTeamSummary(mergedSummary);
      setClawTeamMembers(allMembers);
      return true;
    } catch {
      setClawTeamMembers([]);
      setClawTeamSummary(EMPTY_CLAWTEAM_SUMMARY);
      setClawTeamName('');
      return false;
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    const scheduleNextPoll = (delay: number) => {
      clearClawTeamPollTimeout();
      if (cancelled) {
        return;
      }

      clawTeamPollTimeoutRef.current = window.setTimeout(() => {
        void pollClawTeam();
      }, delay);
    };

    const pollClawTeam = async () => {
      if (cancelled) {
        return;
      }

      if (document.hidden) {
        scheduleNextPoll(IDLE_CLAWTEAM_REFRESH_MS);
        return;
      }

      const hasLiveClawTeam = await fetchClawTeam();
      scheduleNextPoll(hasLiveClawTeam ? ACTIVE_CLAWTEAM_REFRESH_MS : IDLE_CLAWTEAM_REFRESH_MS);
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        clearClawTeamPollTimeout();
        return;
      }

      void pollClawTeam();
    };

    void pollClawTeam();
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      cancelled = true;
      clearClawTeamPollTimeout();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [clearClawTeamPollTimeout, fetchClawTeam]);

  const handleDeskClick = (agentId: string) => {
    setSelectedAgent(agentId);
  };

  const handleClosePanel = () => {
    setSelectedAgent(null);
  };

  const handleCloseModal = () => setInteractionModal(null);

  // Fetch data for interaction modals
  useEffect(() => {
    if (!interactionModal) return;

    const fetchModalData = async () => {
      const data = { todayTokens: 0, activeAgents: 0, totalAgents: 0, uptime: '...', recentSessions: 0 };

      try {
        const costRes = await fetch('/api/costs?timeframe=1d');
        if (costRes.ok) {
          const costData = await costRes.json();
          data.todayTokens = (costData.byAgent || []).reduce(
            (sum: number, a: { tokens: number }) => sum + (a.tokens || 0), 0
          );
        }
      } catch {}

      try {
        const agentsRes = await fetch('/api/agents');
        if (agentsRes.ok) {
          const agentsData = await agentsRes.json();
          data.totalAgents = (agentsData.agents || []).length;
          data.activeAgents = (agentsData.agents || []).filter(
            (a: { status: string }) => a.status === 'online'
          ).length;
        }
      } catch {}

      try {
        const sysRes = await fetch('/api/system/stats');
        if (sysRes.ok) {
          const sysData = await sysRes.json();
          data.uptime = sysData.uptime || '...';
        }
      } catch {}

      try {
        const actRes = await fetch('/api/activities?limit=1');
        if (actRes.ok) {
          const actData = await actRes.json();
          data.recentSessions = actData.total || 0;
        }
      } catch {}

      setModalData(data);
    };

    fetchModalData();
  }, [interactionModal]);

  return (
    <div className={`office-3d-root fixed top-0 bottom-0 right-0 z-0 ${isMobile ? 'left-0 pb-16' : 'left-[68px]'}`} style={{ backgroundColor: '#f0e8d5' }} suppressHydrationWarning>
      <Canvas
        key={`office-canvas-${officeCameraPreset.id}`}
        camera={officeCameraPreset.camera}
        shadows
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: false, powerPreference: "low-power" }}
        performance={{ min: 0.5, max: 1 }}
        frameloop="demand"
        style={{ width: '100%', height: '100%' }}
      >
        {isOfficeQaMode ? <OfficeSceneTicker /> : null}
        <color attach="background" args={['#f0e8d5']} />

        <Suspense fallback={
          <mesh>
            <boxGeometry args={[2, 2, 2]} />
            <meshStandardMaterial color="orange" />
          </mesh>
        }>
          <Lights />
          <Floor />
          <Walls />

          {/* Central display table */}
          <RoundTable onClick={() => setInteractionModal('roadmap')} />

          {/* === Cherry Blossom Garden (connecting two buildings) === */}
          <CherryBlossomGarden />

          {/* === ClawTeam Outsourcing Office === */}
          <ClawTeamOffice
            members={clawTeamMembers}
            taskSummary={clawTeamSummary}
            teamName={clawTeamName}
          />

          <BreakRoom />
          <StudyCorner />
          <FoldingScreen />
          {/* <CeilingBeams /> */}

          {/* Large TV - on the back wall in front of agent desks */}
          <TVScreen />

          {/* Large Apple-style clock - above the ceiling */}
          <WallClock position={[0, 16, -30]} />

          {/* Agent Desks */}
          {AGENTS.map((agent) => (
            <AgentDesk
              key={agent.id}
              agent={agent}
              state={agentStates[agent.id] ?? defaultState(agent.id)}
              onClick={() => handleDeskClick(agent.id)}
              isSelected={selectedAgent === agent.id}
            />
          ))}

          {/* Agent Avatars */}
          {AGENTS.map((agent) => (
            <AgentAvatar
              key={`avatar-${agent.id}`}
              agent={agent}
              state={agentStates[agent.id] ?? defaultState(agent.id)}
            />
          ))}

          {controlMode === 'orbit' || isMobile ? (
            <OrbitControls
              key={`office-orbit-controls-${officeCameraPreset.id}`}
              enableDamping
              dampingFactor={0.05}
              minDistance={5}
              maxDistance={65}
              maxPolarAngle={Math.PI / 2.2}
              target={officeCameraPreset.orbitTarget}
              touches={{ ONE: 0, TWO: 2 }}
            />
          ) : (
            <FirstPersonControls moveSpeed={5} />
          )}
        </Suspense>
      </Canvas>

      {/* Agent detail panel */}
      {selectedAgent && (
        <AgentPanel
          agent={AGENTS.find(a => a.id === selectedAgent)!}
          state={agentStates[selectedAgent] ?? defaultState(selectedAgent)}
          onClose={handleClosePanel}
        />
      )}

      {/* Left Agent List Panel - hidden on mobile */}
      {!isMobile && (
        <AgentListPanel
          agents={AGENTS}
          agentStates={agentStates}
          selectedAgent={selectedAgent}
          onSelectAgent={handleDeskClick}
        />
      )}

      {/* Right Live Activity Panel - hidden on mobile */}
      {!selectedAgent && !isMobile && <LiveActivityPanel />}

      {/* Bottom Agent Status Bar */}
      <AgentStatusBar
        agents={AGENTS}
        agentStates={agentStates}
        selectedAgent={selectedAgent}
        onSelectAgent={handleDeskClick}
      />

      {/* Object interaction modal */}
      {interactionModal && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-gray-900 border border-yellow-500 rounded-lg p-8 max-w-2xl w-full mx-4 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-yellow-400">
                {interactionModal === 'memory' && '📁 Reports'}
                {interactionModal === 'roadmap' && '📋 Roadmap & Planning'}
                {interactionModal === 'energy' && '☕ Agent Energy Dashboard'}
              </h2>
              <button
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-white text-3xl leading-none"
              >
                ×
              </button>
            </div>

            <div className="text-gray-300 space-y-4">
              {interactionModal === 'memory' && (
                <>
                  <p className="text-lg">📚 Browse workspace documents, memory & skills</p>
                  <div className="bg-gray-800 p-4 rounded border border-gray-700">
                    <p className="text-sm text-gray-400 mb-2">
                      Recent activity sessions: <span className="text-yellow-400 font-bold">{modalData.recentSessions}</span>
                    </p>
                    <p className="text-sm text-gray-400 mb-3">Quick Links:</p>
                    <ul className="space-y-2">
                      <li><a href="/memory" className="text-yellow-400 hover:underline">→ Open Reports</a></li>
                      <li><a href="/files" className="text-yellow-400 hover:underline">→ File Manager</a></li>
                    </ul>
                  </div>
                </>
              )}
              {interactionModal === 'roadmap' && (
                <>
                  <p className="text-lg">🗺️ Project Roadmap & Planning Panel</p>
                  <div className="bg-gray-800 p-4 rounded border border-gray-700">
                    <p className="text-sm text-gray-400 mb-2">Current Phase:</p>
                    <ul className="space-y-2">
                      <li className="flex items-center gap-2">
                        <span className="text-green-400">✓</span>
                        <span>Phase 0: TenacitOS Shell</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="text-yellow-400">●</span>
                        <span>Phase 8: 3D Office (MVP)</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="text-gray-500">○</span>
                        <span>Phase 2: File Browser Pro</span>
                      </li>
                    </ul>
                  </div>
                </>
              )}
              {interactionModal === 'energy' && (
                <>
                  <p className="text-lg">⚡ Agent Activity & Energy Level</p>
                  <div className="bg-gray-800 p-4 rounded border border-gray-700 space-y-3">
                    <div>
                      <p className="text-sm text-gray-400">Today's Token Usage:</p>
                      <p className="text-2xl font-bold text-yellow-400">
                        {modalData.todayTokens >= 1_000_000
                          ? `${(modalData.todayTokens / 1_000_000).toFixed(1)}M`
                          : modalData.todayTokens >= 1_000
                            ? `${(modalData.todayTokens / 1_000).toFixed(1)}K`
                            : modalData.todayTokens}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400">Active Agents:</p>
                      <p className="text-2xl font-bold text-green-400">
                        {modalData.activeAgents} / {modalData.totalAgents}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400">System Uptime:</p>
                      <p className="text-2xl font-bold text-blue-400">{modalData.uptime}</p>
                    </div>
                  </div>
                </>
              )}
            </div>

            <button
              onClick={handleCloseModal}
              className="mt-6 w-full bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-3 rounded transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
