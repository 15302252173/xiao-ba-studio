'use client';

import { useState, useEffect } from 'react';
import { Box, Text, Html } from '@react-three/drei';

interface WhiteboardProps {
  position: [number, number, number];
  rotation?: [number, number, number];
  onClick?: () => void;
}

interface TodoItem {
  id: string;
  text: string;
  date: string;
  done: boolean;
  rolledOver: boolean;
}

const STATUS_COLORS: Record<string, string> = {
  done: '#22c55e',
  pending: '#f59e0b',
  rolled: '#ef4444',
};

export default function Whiteboard({ position, rotation = [0, 0, 0], onClick }: WhiteboardProps) {
  const [hovered, setHovered] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [overdue, setOverdue] = useState(0);

  // Fetch real todos
  useEffect(() => {
    const fetchTodos = async () => {
      try {
        const res = await fetch('/api/todos');
        if (res.ok) {
          const data = await res.json();
          setTodos(data.todos || []);
          setOverdue(data.overdue || 0);
        }
      } catch { /* silent */ }
    };
    fetchTodos();
    const interval = setInterval(fetchTodos, 15000);
    return () => clearInterval(interval);
  }, []);

  // Refresh when modal opens
  useEffect(() => {
    if (showModal) {
      fetch('/api/todos').then(r => r.json()).then(d => {
        setTodos(d.todos || []);
        setOverdue(d.overdue || 0);
      }).catch(() => {});
    }
  }, [showModal]);

  const doneCount = todos.filter((t) => t.done).length;
  const totalCount = todos.length;
  const pendingCount = totalCount - doneCount;
  const rolledCount = todos.filter((t) => t.rolledOver && !t.done).length;
  const progressPct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

  const today = new Date().toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'short' });

  return (
    <group position={position} rotation={rotation}>
      {/* Board surface */}
      <Box
        args={[2.5, 1.5, 0.1]}
        position={[0, 1.5, 0]}
        castShadow
        receiveShadow
        onClick={(e) => {
          e.stopPropagation();
          setShowModal(true);
          onClick?.();
        }}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <meshStandardMaterial
          color={hovered ? '#f0f0f0' : '#ffffff'}
          emissive={hovered ? '#fbbf24' : '#000000'}
          emissiveIntensity={hovered ? 0.1 : 0}
        />
      </Box>

      {/* Frame */}
      <Box args={[2.6, 1.6, 0.08]} position={[0, 1.5, -0.05]}>
        <meshStandardMaterial color="#1f2937" metalness={0.3} roughness={0.6} />
      </Box>

      {/* Marker tray */}
      <Box args={[2.3, 0.1, 0.15]} position={[0, 0.7, 0.05]} castShadow>
        <meshStandardMaterial color="#6b7280" />
      </Box>

      {/* Markers */}
      {[-0.6, -0.2, 0.2, 0.6].map((x, i) => (
        <group key={i} position={[x, 0.75, 0.1]}>
          <Box args={[0.08, 0.3, 0.08]} castShadow>
            <meshStandardMaterial
              color={['#ef4444', '#3b82f6', '#22c55e', '#eab308'][i]}
            />
          </Box>
          {/* Cap */}
          <Box args={[0.09, 0.08, 0.09]} position={[0, 0.17, 0]} castShadow>
            <meshStandardMaterial color="#1f2937" />
          </Box>
        </group>
      ))}

      {/* Board title */}
      <Text
        position={[0, 2.0, 0.06]}
        fontSize={0.18}
        color="#1f2937"
        anchorX="center"
        anchorY="middle"
        fontWeight="bold"
      >
        📋 TODOS
      </Text>

      {/* Mini progress bar on board surface */}
      <group position={[0, 1.3, 0.06]}>
        <Box args={[1.8, 0.06, 0.005]}>
          <meshStandardMaterial color="#e5e7eb" />
        </Box>
        {totalCount > 0 && (
          <Box args={[1.8 * (progressPct / 100), 0.06, 0.006]} position={[-(1.8 - 1.8 * (progressPct / 100)) / 2, 0, 0.001]}>
            <meshStandardMaterial color="#22c55e" emissive="#22c55e" emissiveIntensity={0.3} />
          </Box>
        )}
        <Text
          position={[0, -0.15, 0.005]}
          fontSize={0.09}
          color="#6b7280"
          anchorX="center"
          anchorY="middle"
        >
          {totalCount > 0 ? `${doneCount}/${totalCount} · ${progressPct}%` : '今日暂无待办'}
        </Text>
      </group>

      {/* Hover label */}
      {hovered && !showModal && (
        <Text
          position={[0, 2.5, 0.1]}
          fontSize={0.12}
          color="#fbbf24"
          anchorX="center"
          anchorY="middle"
        >
          {totalCount > 0 ? `📋 ${doneCount}/${totalCount} 已完成` : '📋 点击添加待办'}
        </Text>
      )}

      {/* Modal Overlay */}
      {showModal && (
        <Html
          transform
          position={[0, 1.5, 0.52]}
          rotation={[0, 0, 0]}
          style={{
            width: '360px',
            maxHeight: '480px',
            background: '#ffffff',
            borderRadius: '12px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3), 0 0 0 1px rgba(0,0,0,0.05)',
            padding: '0',
            fontFamily: "'Inter', 'PingFang SC', 'Microsoft YaHei', sans-serif",
            fontSize: '13px',
            color: '#1f2937',
            overflow: 'hidden',
            pointerEvents: 'auto',
          }}
        >
          {/* Modal Header */}
          <div style={{
            background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
            color: '#ffffff',
            padding: '14px 16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <div>
              <div style={{ fontSize: '15px', fontWeight: 700, letterSpacing: '-0.3px' }}>
                📋 每日待办
              </div>
              <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '2px' }}>
                {today}
              </div>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowModal(false);
              }}
              style={{
                background: 'rgba(255,255,255,0.1)',
                border: 'none',
                color: '#ffffff',
                width: '28px',
                height: '28px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          {/* Modal Body */}
          <div style={{ padding: '14px 16px', maxHeight: '360px', overflowY: 'auto' }}>
            {/* Overdue warning */}
            {overdue > 0 && (
              <div style={{
                background: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '8px',
                padding: '8px 10px',
                marginBottom: '12px',
                fontSize: '11px',
                color: '#dc2626',
              }}>
                ⚠️ 有 {overdue} 项待办已逾期，已自动顺延至今天
              </div>
            )}

            {/* Stats */}
            <div style={{ marginBottom: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '10px', color: '#6b7280' }}>
                <span>完成进度</span>
                <span style={{ fontWeight: 600 }}>{totalCount > 0 ? `${doneCount}/${totalCount} (${progressPct}%)` : '暂无'}</span>
              </div>
              {totalCount > 0 && (
                <div style={{ height: '6px', background: '#f3f4f6', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: `${progressPct}%`,
                    background: progressPct === 100
                      ? 'linear-gradient(90deg, #22c55e, #4ade80)'
                      : progressPct >= 50
                      ? 'linear-gradient(90deg, #f59e0b, #fbbf24)'
                      : 'linear-gradient(90deg, #ef4444, #f87171)',
                    borderRadius: '3px',
                    transition: 'width 0.3s',
                  }} />
                </div>
              )}
            </div>

            {/* Stats badges */}
            <div style={{
              display: 'flex',
              gap: '6px',
              marginBottom: '12px',
              fontSize: '10px',
              fontWeight: 600,
            }}>
              <span style={{
                background: '#dcfce7',
                color: '#16a34a',
                padding: '2px 8px',
                borderRadius: '4px',
              }}>
                ✅ 完成 {doneCount}
              </span>
              <span style={{
                background: '#fef3c7',
                color: '#d97706',
                padding: '2px 8px',
                borderRadius: '4px',
              }}>
                ⏳ 待办 {pendingCount}
              </span>
              {rolledCount > 0 && (
                <span style={{
                  background: '#fee2e2',
                  color: '#dc2626',
                  padding: '2px 8px',
                  borderRadius: '4px',
                }}>
                  🔄 顺延 {rolledCount}
                </span>
              )}
            </div>

            {/* Todo List */}
            {totalCount === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '30px 0',
                color: '#9ca3af',
                fontSize: '12px',
              }}>
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>📝</div>
                <p>今天还没有待办事项</p>
                <p style={{ fontSize: '10px', marginTop: '4px' }}>
                  去仪表盘添加今天的任务吧 ✨
                </p>
              </div>
            ) : (
              <div>
                {todos.map((item) => (
                  <div key={item.id} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '7px 0',
                    borderBottom: '1px solid #f3f4f6',
                    fontSize: '12px',
                  }}>
                    <span style={{
                      fontSize: '14px',
                      flexShrink: 0,
                    }}>
                      {item.done ? '✅' : item.rolledOver ? '🔄' : '⬜'}
                    </span>
                    <span style={{
                      flex: 1,
                      color: item.done ? '#9ca3af' : '#374151',
                      textDecoration: item.done ? 'line-through' : 'none',
                      minWidth: 0,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {item.text}
                    </span>
                    {item.rolledOver && !item.done && (
                      <span style={{
                        background: '#fee2e2',
                        color: '#dc2626',
                        padding: '1px 5px',
                        borderRadius: '3px',
                        fontSize: '9px',
                        flexShrink: 0,
                      }}>
                        顺延
                      </span>
                    )}
                    <span style={{
                      color: item.done ? '#22c55e' : '#94a3b8',
                      fontSize: '10px',
                      flexShrink: 0,
                    }}>
                      {item.done ? '完成' : '进行中'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Modal Footer */}
          <div style={{
            padding: '8px 16px',
            borderTop: '1px solid #f3f4f6',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '10px',
            color: '#9ca3af',
          }}>
            <span>自动刷新 · 每15秒</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowModal(false);
              }}
              style={{
                background: '#1e293b',
                color: '#ffffff',
                border: 'none',
                padding: '5px 12px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '11px',
                fontWeight: 500,
              }}
            >
              关闭
            </button>
          </div>
        </Html>
      )}
    </group>
  );
}
