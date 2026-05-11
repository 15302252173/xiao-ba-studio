'use client';

import { useState, useEffect } from 'react';
import { Box, Html } from '@react-three/drei';

interface Activity {
  id: string;
  timestamp: string;
  type: string;
  description: string;
  status: 'success' | 'error' | 'pending' | 'running';
  agent?: string;
  tokens_used?: number;
}

interface TVStats {
  onlineAgents: number;
  todayActivities: number;
  todayTokens: number;
  todayCost: number;
}

/**
 * TVScreen — Office large TV / monitoring display
 * Shows real-time dashboard: date, activity feed, and stats.
 */
export default function TVScreen() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [stats, setStats] = useState<TVStats>({
    onlineAgents: 0,
    todayActivities: 0,
    todayTokens: 0,
    todayCost: 0,
  });

  // Fetch activity feed
  useEffect(() => {
    const fetchActivities = async () => {
      try {
        const res = await fetch('/api/activities?limit=5');
        if (res.ok) {
          const data = await res.json();
          setActivities(data.activities || []);
        }
      } catch {
        // Silently fail — keep last data
      }
    };

    fetchActivities();
    const interval = setInterval(fetchActivities, 5000);
    return () => clearInterval(interval);
  }, []);

  // Fetch stats
  useEffect(() => {
    const fetchStats = async () => {
      const newStats: TVStats = { onlineAgents: 0, todayActivities: 0, todayTokens: 0, todayCost: 0 };

      try {
        // Online agents
        const agentsRes = await fetch('/api/agents');
        if (agentsRes.ok) {
          const agentsData = await agentsRes.json();
          newStats.onlineAgents = (agentsData.agents || []).filter(
            (a: { status: string }) => a.status === 'online'
          ).length;
        }
      } catch {}

      try {
        // Today's activities
        const statsRes = await fetch('/api/activities/stats');
        if (statsRes.ok) {
          const statsData = await statsRes.json();
          newStats.todayActivities = statsData.today || 0;
        }
      } catch {}

      try {
        // Today's token/cost
        const costRes = await fetch('/api/costs?timeframe=1d');
        if (costRes.ok) {
          const costData = await costRes.json();
          // Sum all agent tokens
          newStats.todayTokens = (costData.byAgent || []).reduce(
            (sum: number, a: { tokens: number }) => sum + (a.tokens || 0),
            0
          );
          newStats.todayCost = costData.todayCost || 0;
        }
      } catch {}

      setStats(newStats);
    };

    fetchStats();
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  // Format date
  const now = new Date();
  const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const weekDay = ['日', '一', '二', '三', '四', '五', '六'][now.getDay()];
  const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  const formatTokens = (n: number): string => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return String(n);
  };

  const statusEmoji = (s: string) => {
    switch (s) {
      case 'success': return '✅';
      case 'error': return '❌';
      case 'running': return '🔄';
      case 'pending': return '⏳';
      default: return '•';
    }
  };

  const activityTypeLabel = (t: string) => {
    const map: Record<string, string> = {
      task: '📋',
      agent: '🤖',
      system: '⚙️',
      session: '💬',
      skill: '🔧',
      memory: '🧠',
    };
    return map[t] || '📌';
  };

  return (
    <group position={[0, 3.8, -9.6]} rotation={[0, 0, 0]}>
      {/* TV frame - dark aluminum finish */}
      <Box args={[6, 3.2, 0.15]} castShadow>
        <meshStandardMaterial color="#c9a96e" metalness={0.7} roughness={0.25} />
      </Box>

      {/* Screen panel - now darker to serve as backdrop for HTML */}
      <Box args={[5.6, 2.8, 0.02]} position={[0, 0, 0.08]}>
        <meshStandardMaterial
          color="#0a0a1a"
          emissive="#1a3a5c"
          emissiveIntensity={0.4}
          metalness={0.1}
          roughness={0.3}
        />
      </Box>

      {/* HTML Overlay — Monitoring Dashboard */}
      <Html
        transform
        position={[0, 0, 0.1]}
        rotation={[0, 0, 0]}
        style={{
          width: '560px',
          height: '280px',
          background: '#0a0a1a',
          color: '#22c55e',
          fontFamily: "'Courier New', 'Consolas', 'Fira Code', monospace",
          fontSize: '10px',
          lineHeight: '1.4',
          padding: '10px 12px',
          boxSizing: 'border-box',
          borderRadius: '2px',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          border: '1px solid #1e3a5f',
          boxShadow: 'inset 0 0 30px rgba(34, 197, 94, 0.05)',
          pointerEvents: 'none',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '6px',
          paddingBottom: '6px',
          borderBottom: '1px solid #1e3a5f',
          flexShrink: 0,
        }}>
          <div>
            <span style={{ color: '#4fc3f7', fontWeight: 'bold', fontSize: '11px' }}>
              🐮 牛二办公室
            </span>
            <span style={{ color: '#64748b', marginLeft: '8px', fontSize: '9px' }}>
              NIU-OS v2.4
            </span>
          </div>
          <div style={{ textAlign: 'right', color: '#94a3b8', fontSize: '9px' }}>
            <div>{dateStr} 周{weekDay}</div>
            <div style={{ color: '#22c55e' }}>{timeStr}</div>
          </div>
        </div>

        {/* Main content area */}
        <div style={{
          display: 'flex',
          flex: 1,
          gap: '10px',
          minHeight: 0,
        }}>
          {/* Left: Activity Feed */}
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            minWidth: 0,
          }}>
            <div style={{
              color: '#4fc3f7',
              fontSize: '9px',
              fontWeight: 'bold',
              marginBottom: '4px',
              letterSpacing: '0.5px',
            }}>
              ⚡ ACTIVITY FEED
            </div>
            <div style={{
              flex: 1,
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              gap: '2px',
            }}>
              {activities.length === 0 ? (
                <div style={{ color: '#475569', fontStyle: 'italic', fontSize: '9px' }}>
                  等待数据...
                </div>
              ) : (
                activities.map((a, i) => (
                  <div key={a.id || i} style={{
                    display: 'flex',
                    gap: '4px',
                    fontSize: '8.5px',
                    opacity: i === 0 ? 1 : 0.6 + (4 - i) * 0.1,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}>
                    <span style={{ flexShrink: 0 }}>{statusEmoji(a.status)}</span>
                    <span style={{ color: '#64748b', flexShrink: 0 }}>
                      {a.timestamp ? new Date(a.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                    </span>
                    <span style={{ flexShrink: 0 }}>{activityTypeLabel(a.type)}</span>
                    <span style={{
                      color: a.status === 'error' ? '#ef4444' : a.status === 'running' ? '#f59e0b' : '#94a3b8',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}>
                      {a.description || a.type}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Right: Stats Cards */}
          <div style={{
            width: '120px',
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: '5px',
            justifyContent: 'center',
          }}>
            {/* Online Agents */}
            <div style={{
              background: 'rgba(34, 197, 94, 0.08)',
              border: '1px solid rgba(34, 197, 94, 0.2)',
              borderRadius: '3px',
              padding: '5px 7px',
              textAlign: 'center',
            }}>
              <div style={{ color: '#64748b', fontSize: '7.5px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Agents Online
              </div>
              <div style={{ color: '#22c55e', fontSize: '16px', fontWeight: 'bold', lineHeight: 1.2 }}>
                {stats.onlineAgents}
              </div>
            </div>

            {/* Today Tasks */}
            <div style={{
              background: 'rgba(79, 195, 247, 0.08)',
              border: '1px solid rgba(79, 195, 247, 0.2)',
              borderRadius: '3px',
              padding: '5px 7px',
              textAlign: 'center',
            }}>
              <div style={{ color: '#64748b', fontSize: '7.5px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Today Tasks
              </div>
              <div style={{ color: '#4fc3f7', fontSize: '16px', fontWeight: 'bold', lineHeight: 1.2 }}>
                {stats.todayActivities}
              </div>
            </div>

            {/* Today Tokens */}
            <div style={{
              background: 'rgba(245, 158, 11, 0.08)',
              border: '1px solid rgba(245, 158, 11, 0.2)',
              borderRadius: '3px',
              padding: '5px 7px',
              textAlign: 'center',
            }}>
              <div style={{ color: '#64748b', fontSize: '7.5px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Tokens
              </div>
              <div style={{ color: '#f59e0b', fontSize: '14px', fontWeight: 'bold', lineHeight: 1.2 }}>
                {formatTokens(stats.todayTokens)}
              </div>
              {stats.todayCost > 0 && (
                <div style={{ color: '#f59e0b', fontSize: '8px', opacity: 0.7 }}>
                  ${stats.todayCost.toFixed(3)}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer status bar */}
        <div style={{
          marginTop: '6px',
          paddingTop: '4px',
          borderTop: '1px solid #1e3a5f',
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: '7.5px',
          color: '#475569',
          flexShrink: 0,
        }}>
          <span>🟢 SYSTEM NOMINAL</span>
          <span>NET: {activities.length > 0 ? 'ACTIVE' : 'IDLE'}</span>
          <span>REFRESH: 5s</span>
        </div>
      </Html>

      {/* Bottom stand - slim metal column */}
      <Box args={[0.15, 1.2, 0.15]} position={[0, -2.2, 0.3]} castShadow>
        <meshStandardMaterial color="#2c2c2c" metalness={0.8} roughness={0.2} />
      </Box>

      {/* Base */}
      <Box args={[1.8, 0.08, 0.8]} position={[0, -2.8, 0.3]} castShadow>
        <meshStandardMaterial color="#2c2c2c" metalness={0.8} roughness={0.2} />
      </Box>

      {/* Ambient light emitted from screen */}
      <pointLight
        position={[0, 0, 1.5]}
        color="#4fc3f7"
        intensity={0.6}
        distance={8}
      />
    </group>
  );
}
