"use client";

import { useEffect, useState, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import {
  CheckCircle,
  XCircle,
  Circle,
  Bot,
  Heart,
  Sparkles,
  Server,
  Cpu,
  HardDrive,
  Clock,
  Brain,
  Puzzle,
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
  Pencil,
  CheckCheck,
  AlertTriangle,
  X,
  CalendarCheck,
  Download,
  Link,
  Loader2,
  ExternalLink,
  Copy,
} from "lucide-react";

interface Agent {
  id: string;
  name: string;
  emoji: string;
  color: string;
  role?: string;
  model: string;
  status: "online" | "offline";
}

interface OfficeAgent {
  id: string;
  name: string;
  model: string;
  currentTask: string;
  isActive: boolean;
  status: "working" | "idle" | "sleeping";
  lastSeen: number;
}

interface SystemStats {
  cpu: number;
  ram: { used: number; total: number };
  disk: { used: number; total: number };
}

interface CronJob {
  name: string;
  enabled: boolean;
  lastRun: string | null;
  didRunToday: boolean;
  failures: number;
}

interface TodoItem {
  id: string;
  text: string;
  date: string;
  done: boolean;
  createdAt: string;
  rolledOver: boolean;
}

interface DashboardData {
  cron: {
    jobs: CronJob[];
    totalJobs: number;
    ranToday: number;
    totalRuns: number;
    totalFailures: number;
  };
  yesterdayMemory: {
    requestedDate?: string;
    date: string;
    available: boolean;
    isFallback?: boolean;
    sections: Array<{ title: string; items: string[] }>;
  };
  evolution: {
    morningBriefDate: string | null;
    lastSignalCollection: string | null;
    lastReview: string | null;
    improvements: Array<{ title: string; priority: string }>;
    recommendations: Array<{ name: string; type: string }>;
    todayGaps: number;
    installedSkills: string[];
    skillCount: number;
  };
}

function ProgressRing({ value, max, color, size = 48 }: { value: number; max: number; color: string; size?: number }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  const r = (size - 6) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--card-elevated)" strokeWidth="5" />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth="5" strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" className="transition-all duration-700" />
      <text x={size / 2} y={size / 2} textAnchor="middle" dominantBaseline="central" fill="var(--text-primary)" fontSize="11" fontWeight="bold" className="rotate-90" style={{ transformOrigin: "center" }}>
        {Math.round(pct)}%
      </text>
    </svg>
  );
}

function getGreeting(): { text: string; emoji: string } {
  const h = new Date().getHours();
  if (h < 6) return { text: "夜深了，该休息了", emoji: "🌙" };
  if (h < 9) return { text: "早上好！又是新的一天", emoji: "🌅" };
  if (h < 12) return { text: "上午好！保持高效", emoji: "☀️" };
  if (h < 14) return { text: "中午好！记得吃饭", emoji: "🍱" };
  if (h < 18) return { text: "下午好！加油", emoji: "💪" };
  if (h < 21) return { text: "晚上好！今天辛苦了", emoji: "🌇" };
  return { text: "晚安！美好的一天", emoji: "🌃" };
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "刚刚";
  if (mins < 60) return `${mins} 分钟前`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} 小时前`;
  return `${Math.floor(hrs / 24)} 天前`;
}

const PRIORITY_COLORS: Record<string, string> = { "high": "#ef4444", "medium": "#f59e0b", "low": "#60a5fa" };

export default function DashboardPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [officeAgents, setOfficeAgents] = useState<Record<string, OfficeAgent>>({});
  const [system, setSystem] = useState<SystemStats | null>(null);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAllCron, setShowAllCron] = useState(false);
  const [gatewayUp, setGatewayUp] = useState<boolean | null>(null);
  const [gatewayLatency, setGatewayLatency] = useState<number | null>(null);

  // ─── 每日待办 state ───
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [overdueCount, setOverdueCount] = useState(0);
  const [newTodoText, setNewTodoText] = useState("");
  const [editingTodo, setEditingTodo] = useState<TodoItem | null>(null);
  const [editText, setEditText] = useState("");
  const [todoModalOpen, setTodoModalOpen] = useState(false);

  // ─── Instagram 下载器 state ───
  const [igUrl, setIgUrl] = useState("");
  const [igLoading, setIgLoading] = useState(false);
  const [igResult, setIgResult] = useState<{
    videoUrl: string;
    thumbnailUrl?: string;
    caption?: string;
    authorName?: string;
    type?: string;
    provider?: string;
  } | null>(null);
  const [igError, setIgError] = useState("");
  const [igCopied, setIgCopied] = useState(false);

  const handleIgDownload = async () => {
    if (!igUrl.trim()) return;
    setIgLoading(true);
    setIgError("");
    setIgResult(null);

    try {
      const res = await fetch("/api/instagram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: igUrl.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setIgResult(data);
      } else {
        // All server providers failed, offer sssinstagram direct link
        setIgError(data.error || "下载失败");
      }
    } catch {
      setIgError("网络错误，请稍后重试");
    }
    setIgLoading(false);
  };

  const openSssInstagram = () => {
    const sssUrl = `https://sssinstagram.com/zh?url=${encodeURIComponent(igUrl.trim())}`;
    window.open(sssUrl, "_blank", "noopener,noreferrer");
  };

  const copyIgUrl = async () => {
    if (!igResult?.videoUrl) return;
    try {
      await navigator.clipboard.writeText(igResult.videoUrl);
      setIgCopied(true);
      setTimeout(() => setIgCopied(false), 2000);
    } catch {
      const input = document.createElement("input");
      input.value = igResult.videoUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      setIgCopied(true);
      setTimeout(() => setIgCopied(false), 2000);
    }
  };

  const fetchTodos = useCallback(async () => {
    try {
      const res = await fetch("/api/todos");
      if (res.ok) {
        const data = await res.json();
        setTodos(data.todos || []);
        setOverdueCount(data.overdue || 0);
      }
    } catch { /* silent */ }
  }, []);

  const addTodo = async () => {
    if (!newTodoText.trim()) return;
    try {
      const res = await fetch("/api/todos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: newTodoText.trim() }),
      });
      if (res.ok) {
        setNewTodoText("");
        fetchTodos();
      }
    } catch { /* silent */ }
  };

  const toggleTodo = async (todo: TodoItem) => {
    try {
      const res = await fetch("/api/todos", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: todo.id, done: !todo.done }),
      });
      if (res.ok) fetchTodos();
    } catch { /* silent */ }
  };

  const deleteTodo = async (id: string) => {
    try {
      const res = await fetch("/api/todos", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (res.ok) fetchTodos();
    } catch { /* silent */ }
  };

  const saveEdit = async () => {
    if (!editingTodo || !editText.trim()) return;
    try {
      const res = await fetch("/api/todos", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editingTodo.id, text: editText.trim() }),
      });
      if (res.ok) {
        setEditingTodo(null);
        setEditText("");
        fetchTodos();
      }
    } catch { /* silent */ }
  };

  const openEditModal = (todo: TodoItem) => {
    setEditingTodo(todo);
    setEditText(todo.text);
    setTodoModalOpen(true);
  };

  const undoneCount = todos.filter((t) => !t.done).length;
  const doneCount = todos.filter((t) => t.done).length;

  // ─── fetch todos ───
  useEffect(() => {
    fetchTodos();
    const interval = setInterval(fetchTodos, 30000);
    return () => clearInterval(interval);
  }, [fetchTodos]);

  // One-time fetch for static data (agents config, system stats, dashboard)
  useEffect(() => {
    Promise.all([
      fetch("/api/agents").then((r) => r.json()).catch(() => ({ agents: [] })),
      fetch("/api/system/stats").then((r) => r.json()).catch(() => null),
      fetch("/api/dashboard").then((r) => r.json()).catch(() => null),
    ]).then(([agentsData, sysData, dashData]) => {
      setAgents(agentsData.agents || []);
      if (sysData) setSystem({ cpu: sysData.cpu || 0, ram: sysData.ram || { used: 0, total: 0 }, disk: sysData.disk || { used: 0, total: 0 } });
      if (dashData) setDashboard(dashData);
      setLoading(false);
    });
  }, []);

  // Real-time polling for agent status (every 500ms)
  const fetchOfficeStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/office");
      if (!res.ok) return;
      const data = await res.json();
      if (!data.agents || !Array.isArray(data.agents)) return;
      const map: Record<string, OfficeAgent> = {};
      for (const a of data.agents) {
        if (a.id) map[a.id] = a;
      }
      setOfficeAgents(map);
    } catch { /* silent */ }
  }, []);

  // Gateway health polling (every 10s)
  useEffect(() => {
    const fetchHealth = async () => {
      try {
        const res = await fetch("/api/health");
        if (!res.ok) return;
        const data = await res.json();
        const gw = data.checks?.find((c: { name: string }) => c.name === "OpenClaw Gateway");
        setGatewayUp(gw?.status === "up");
        setGatewayLatency(gw?.latency ?? null);
      } catch { setGatewayUp(false); }
    };
    fetchHealth();
    const interval = setInterval(fetchHealth, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    fetchOfficeStatus();
    const interval = setInterval(fetchOfficeStatus, 500);
    return () => clearInterval(interval);
  }, [fetchOfficeStatus]);

  const greeting = getGreeting();
  // Derive real-time counts from office status
  const workingAgents = agents.filter((a) => officeAgents[a.id]?.status === "working");
  const idleAgents = agents.filter((a) => officeAgents[a.id]?.status === "idle");
  const sleepingAgents = agents.filter((a) => !officeAgents[a.id] || officeAgents[a.id]?.status === "sleeping");

  const getAgentStatus = (id: string): "working" | "idle" | "sleeping" => officeAgents[id]?.status || "sleeping";
  const getStatusDot = (s: "working" | "idle" | "sleeping") => {
    if (s === "working") return { fill: "#facc15", label: "工作中", bg: "rgba(250,204,21,0.1)", border: "rgba(250,204,21,0.25)", textColor: "#facc15" };
    if (s === "idle") return { fill: "#4ade80", label: "待命中", bg: "rgba(74,222,128,0.06)", border: "rgba(74,222,128,0.2)", textColor: "#4ade80" };
    return { fill: "#6b7280", label: "休眠中", bg: "var(--card-elevated)", border: "var(--border)", textColor: "#6b7280" };
  };

  return (
    <div className="max-w-[1400px] mx-auto">
      {/* ===== Greeting Header ===== */}
      <div className="mb-8 p-6 rounded-2xl" style={{ background: "linear-gradient(135deg, rgba(239,68,68,0.08), rgba(249,115,22,0.06), rgba(52,199,89,0.05))", border: "1px solid var(--border)" }}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
          <div className="flex items-center gap-3 sm:gap-4">
            <span className="text-3xl sm:text-4xl">{greeting.emoji}</span>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold" style={{ fontFamily: "var(--font-heading)", color: "var(--text-primary)", letterSpacing: "-1px" }}>
                {greeting.text}
              </h1>
              <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
                🤖 {agents.length} 个智能体 · {workingAgents.length} 个工作中 · {idleAgents.length} 个待命中 · {new Date().toLocaleDateString("zh-CN", { weekday: "long", month: "long", day: "numeric" })}
              </p>
            </div>
          </div>
          {/* Gateway status badge */}
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl shrink-0" style={{ backgroundColor: gatewayUp ? "rgba(74,222,128,0.08)" : gatewayUp === false ? "rgba(239,68,68,0.08)" : "rgba(107,114,128,0.08)", border: `1px solid ${gatewayUp ? "rgba(74,222,128,0.25)" : gatewayUp === false ? "rgba(239,68,68,0.25)" : "rgba(107,114,128,0.2)"}` }}>
            <span className="relative flex h-3 w-3">
              {gatewayUp && <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-50" style={{ backgroundColor: "#4ade80" }} />}
              <span className="relative inline-flex rounded-full h-3 w-3" style={{ backgroundColor: gatewayUp ? "#4ade80" : gatewayUp === false ? "#ef4444" : "#6b7280" }} />
            </span>
            <div className="text-right">
              <span className="text-xs font-semibold" style={{ color: gatewayUp ? "#4ade80" : gatewayUp === false ? "#ef4444" : "#6b7280" }}>
                网关 {gatewayUp ? "运行中" : gatewayUp === false ? "离线" : "..."}
              </span>
              {gatewayLatency !== null && gatewayUp && (
                <span className="text-xs ml-1.5" style={{ color: "var(--text-muted)" }}>{gatewayLatency}ms</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ===== 每日待办 ===== */}
      <div className="mb-6 p-5 rounded-xl" style={{ backgroundColor: "var(--card)", border: undoneCount > 0 ? "2px solid rgba(251,191,36,0.4)" : "1px solid var(--border)" }}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <CalendarCheck className="w-5 h-5" style={{ color: undoneCount > 0 ? "#fbbf24" : "#4ade80" }} />
            <h2 className="text-base font-bold" style={{ fontFamily: "var(--font-heading)", color: "var(--text-primary)" }}>📋 每日待办</h2>
            {overdueCount > 0 && (
              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold" style={{ backgroundColor: "rgba(239,68,68,0.15)", color: "#ef4444" }}>
                ⚠️ {overdueCount} 项逾期未做
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>
              {doneCount}/{todos.length} 已完成
            </span>
            {todos.length > 0 && doneCount === todos.length && (
              <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: "rgba(74,222,128,0.12)", color: "#4ade80" }}>
                🎉 全部完成!
              </span>
            )}
          </div>
        </div>

        {/* 待办列表 */}
        {todos.length > 0 ? (
          <div className="space-y-1.5 mb-4">
            {todos.map((todo) => (
              <div
                key={todo.id}
                className="flex items-center gap-3 p-2.5 rounded-lg group transition-all"
                style={{
                  backgroundColor: todo.done ? "var(--card-elevated)" : "var(--surface)",
                  border: todo.rolledOver && !todo.done ? "1px solid rgba(251,191,36,0.3)" : "1px solid transparent",
                  opacity: todo.done ? 0.6 : 1,
                }}
              >
                {/* Checkbox */}
                <button
                  onClick={() => toggleTodo(todo)}
                  className="shrink-0"
                  style={{ cursor: "pointer", background: "none", border: "none", padding: 0 }}
                >
                  {todo.done ? (
                    <CheckCheck className="w-5 h-5" style={{ color: "#4ade80" }} />
                  ) : (
                    <Circle className="w-5 h-5" style={{ color: "var(--text-muted)" }} />
                  )}
                </button>

                {/* 文本 */}
                <div className="flex-1 min-w-0">
                  <span
                    className="text-sm block cursor-pointer"
                    style={{
                      color: todo.done ? "var(--text-muted)" : "var(--text-primary)",
                      textDecoration: todo.done ? "line-through" : "none",
                    }}
                    onClick={() => !todo.done && openEditModal(todo)}
                  >
                    {todo.text}
                  </span>
                  {todo.rolledOver && !todo.done && (
                    <span className="text-[10px] mt-0.5" style={{ color: "#fbbf24" }}>
                      🔄 从昨天顺延
                    </span>
                  )}
                </div>

                {/* 操作按钮 (hover 显示) */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {!todo.done && (
                    <button
                      onClick={() => openEditModal(todo)}
                      className="p-1 rounded"
                      style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--text-muted)" }}
                      title="编辑"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    onClick={() => deleteTodo(todo.id)}
                    className="p-1 rounded"
                    style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--text-muted)" }}
                    title="删除"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 mb-4">
            <CalendarCheck className="w-10 h-10 mx-auto mb-2" style={{ color: "var(--text-muted)", opacity: 0.3 }} />
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>今天还没有待办事项，添加一个吧 ✨</p>
          </div>
        )}

        {/* 添加新待办 */}
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={newTodoText}
            onChange={(e) => setNewTodoText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addTodo()}
            placeholder="添加新待办… (回车提交)"
            className="flex-1 px-3 py-2 rounded-lg text-sm"
            style={{
              backgroundColor: "var(--surface)",
              border: "1px solid var(--border)",
              color: "var(--text-primary)",
              outline: "none",
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = "var(--accent)";
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = "var(--border)";
            }}
          />
          <button
            onClick={addTodo}
            disabled={!newTodoText.trim()}
            className="px-4 py-2 rounded-lg text-sm font-bold shrink-0 transition-all"
            style={{
              backgroundColor: newTodoText.trim() ? "var(--accent)" : "var(--card-elevated)",
              color: newTodoText.trim() ? "#fff" : "var(--text-muted)",
              border: "none",
              cursor: newTodoText.trim() ? "pointer" : "default",
            }}
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ===== Edit Todo Modal ===== */}
      {todoModalOpen && editingTodo && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            onClick={() => { setTodoModalOpen(false); setEditingTodo(null); }}
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(0,0,0,0.6)",
              backdropFilter: "blur(4px)",
            }}
          />
          <div
            style={{
              position: "relative",
              backgroundColor: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: "16px",
              width: "90%",
              maxWidth: "480px",
              padding: "28px",
              zIndex: 1,
              animation: "modalIn .2s ease",
            }}
          >
            <button
              onClick={() => { setTodoModalOpen(false); setEditingTodo(null); }}
              style={{
                position: "absolute",
                top: 14,
                right: 14,
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: "50%",
                width: 32,
                height: 32,
                color: "var(--text-secondary)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <X size={16} />
            </button>

            <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 16, color: "var(--text-primary)" }}>
              ✏️ 编辑待办
            </h3>

            <textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  saveEdit();
                }
              }}
              rows={3}
              className="w-full px-3 py-2.5 rounded-lg text-sm mb-4 resize-none"
              style={{
                backgroundColor: "var(--surface)",
                border: "1px solid var(--border)",
                color: "var(--text-primary)",
                outline: "none",
                fontFamily: "inherit",
              }}
              autoFocus
            />

            <div className="flex items-center justify-between">
              <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                {editingTodo.rolledOver && "🔄 从之前顺延 · "}
                创建于 {new Date(editingTodo.createdAt).toLocaleString("zh-CN")}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { setTodoModalOpen(false); setEditingTodo(null); }}
                  className="px-4 py-2 rounded-lg text-sm"
                  style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-secondary)", cursor: "pointer" }}
                >
                  取消
                </button>
                <button
                  onClick={saveEdit}
                  className="px-4 py-2 rounded-lg text-sm font-bold"
                  style={{ background: "var(--accent)", border: "none", color: "#fff", cursor: "pointer" }}
                >
                  保存
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== Row 1: System Health + Agent Status ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 mb-6">
        {/* System Health — compact */}
        <div className="lg:col-span-2 p-5 rounded-xl" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
          <div className="flex items-center gap-2 mb-5">
            <Server className="w-4 h-4" style={{ color: "#4ade80" }} />
            <h2 className="text-base font-bold" style={{ fontFamily: "var(--font-heading)", color: "var(--text-primary)" }}>系统健康</h2>
          </div>
          {system ? (
            <div className="flex items-center justify-around">
              <div className="flex flex-col items-center gap-1">
                <ProgressRing value={system.cpu} max={100} color={system.cpu > 80 ? "#ef4444" : system.cpu > 50 ? "#f59e0b" : "#4ade80"} />
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                  <Cpu className="inline w-3 h-3 mr-1" />CPU
                </span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <ProgressRing value={system.ram.used} max={system.ram.total} color={system.ram.used / system.ram.total > 0.8 ? "#ef4444" : "#60a5fa"} />
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                  <Bot className="inline w-3 h-3 mr-1" />{system.ram.used.toFixed(0)}G/{system.ram.total.toFixed(0)}G
                </span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <ProgressRing value={system.disk.used} max={system.disk.total} color={system.disk.used / system.disk.total > 0.85 ? "#ef4444" : "#a78bfa"} />
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                  <HardDrive className="inline w-3 h-3 mr-1" />{system.disk.used}G/{system.disk.total}G
                </span>
              </div>
            </div>
          ) : (
            <div className="text-sm text-center py-6" style={{ color: "var(--text-muted)" }}>{loading ? "加载中..." : "无法获取"}</div>
          )}
        </div>

        {/* Agent Status */}
        <div className="lg:col-span-3 p-5 rounded-xl" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
          <div className="flex items-center gap-2 mb-4">
            <Heart className="w-4 h-4" style={{ color: "#f472b6" }} />
            <h2 className="text-base font-bold" style={{ fontFamily: "var(--font-heading)", color: "var(--text-primary)" }}>智能体状态</h2>
          </div>
          {agents.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 2xl:grid-cols-6 gap-2.5">
              {agents.map((agent) => {
                const status = getAgentStatus(agent.id);
                const dot = getStatusDot(status);
                const agentOffice = officeAgents[agent.id];
                return (
                  <div
                    key={agent.id}
                    className="flex items-center gap-2 p-2.5 rounded-lg transition-colors"
                    style={{ backgroundColor: dot.bg, border: `1px solid ${dot.border}` }}
                    title={agentOffice?.currentTask ? `当前任务: ${agentOffice.currentTask}` : undefined}
                  >
                    <span className="text-lg shrink-0">{agent.emoji}</span>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-semibold truncate" style={{ color: "var(--text-primary)" }}>{agent.name}</div>
                      <div className="flex items-center gap-1 mt-0.5">
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: dot.fill }} />
                        <span className="text-[10px]" style={{ color: dot.textColor }}>{dot.label}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-sm text-center py-6" style={{ color: "var(--text-muted)" }}>{loading ? "加载中..." : "暂无智能体数据"}</div>
          )}
        </div>
      </div>

      {/* ===== Row 2: Cron + Yesterday ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 mb-6">
        {/* Cron Jobs */}
        <div className="lg:col-span-3 p-5 rounded-xl" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" style={{ color: "#60a5fa" }} />
              <h2 className="text-base font-bold" style={{ fontFamily: "var(--font-heading)", color: "var(--text-primary)" }}>定时心跳任务</h2>
            </div>
            {dashboard && (
              <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: "var(--card-elevated)", color: "var(--text-muted)" }}>
                今日 {dashboard.cron.ranToday}/{dashboard.cron.totalJobs} 个已执行
              </span>
            )}
          </div>
          {dashboard ? (
            <>
              <div className="space-y-2">
                {(showAllCron ? dashboard.cron.jobs : dashboard.cron.jobs.slice(0, 6)).map((job) => (
                  <div key={job.name} className="flex items-center gap-3 p-2.5 rounded-lg" style={{ backgroundColor: "var(--card-elevated)" }}>
                    <span>{job.enabled ? <CheckCircle className="w-4 h-4" style={{ color: "#4ade80" }} /> : <XCircle className="w-4 h-4" style={{ color: "#6b7280" }} />}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium truncate" style={{ color: "var(--text-primary)" }}>{job.name}</div>
                      <div className="text-[10px] mt-0.5" style={{ color: "var(--text-muted)" }}>
                        {job.didRunToday ? "今日已执行" : job.lastRun ? `上次: ${timeAgo(job.lastRun)}` : "未运行"}
                      </div>
                    </div>
                    {job.failures > 0 && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded font-bold" style={{ backgroundColor: "rgba(239,68,68,0.1)", color: "#ef4444" }}>
                        {job.failures} 次失败
                      </span>
                    )}
                  </div>
                ))}
              </div>
              {dashboard.cron.totalFailures > 0 && (
                <div className="mt-3 text-xs px-3 py-2 rounded-lg" style={{ backgroundColor: "rgba(239,68,68,0.08)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.15)" }}>
                  ⚠️ {dashboard.cron.totalFailures} 个任务失败，请检查
                </div>
              )}
              {dashboard.cron.jobs.length > 6 && (
                <button
                  onClick={() => setShowAllCron(!showAllCron)}
                  className="mt-3 text-xs flex items-center gap-1 px-3 py-1.5 rounded-lg transition-colors"
                  style={{ color: "var(--text-muted)", backgroundColor: "var(--card-elevated)", border: "1px solid var(--border)", cursor: "pointer" }}
                >
                  {showAllCron ? "收起" : `展开全部 (${dashboard.cron.jobs.length} 个)`}
                  {showAllCron ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
              )}
            </>
          ) : (
            <div className="text-sm text-center py-6" style={{ color: "var(--text-muted)" }}>{loading ? "加载中..." : "暂无定时任务数据"}</div>
          )}
        </div>

        {/* Yesterday's Memory Review */}
        <div className="lg:col-span-2 p-5 rounded-xl" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
          <div className="flex items-center gap-2 mb-4">
            <Brain className="w-4 h-4" style={{ color: "#a78bfa" }} />
            <h2 className="text-base font-bold" style={{ fontFamily: "var(--font-heading)", color: "var(--text-primary)" }}>昨日回顾</h2>
          </div>
          {dashboard?.yesterdayMemory ? (
            dashboard.yesterdayMemory.available ? (
              <div className="space-y-3 max-h-[320px] overflow-y-auto">
                {dashboard.yesterdayMemory.sections.map((sec, i) => (
                  <div key={i}>
                    <h3 className="text-xs font-semibold mb-1.5" style={{ color: "var(--text-secondary)" }}>{sec.title}</h3>
                    <ul className="space-y-1">
                      {sec.items.map((item, j) => (
                        <li key={j} className="text-xs flex items-start gap-1.5" style={{ color: "var(--text-muted)" }}>
                          <span className="mt-1 w-1 h-1 rounded-full shrink-0" style={{ backgroundColor: "var(--text-muted)" }} />
                          <ReactMarkdown>{item}</ReactMarkdown>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-center py-8" style={{ color: "var(--text-muted)" }}>
                <Brain className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p>{dashboard.yesterdayMemory.isFallback ? "暂无昨日记忆" : "无法获取昨日记忆"}</p>
              </div>
            )
          ) : (
            <div className="text-sm text-center py-6" style={{ color: "var(--text-muted)" }}>{loading ? "加载中..." : "暂无昨日记忆数据"}</div>
          )}
        </div>
      </div>

      {/* ===== Row 3: Evolution ===== */}
      <div className="p-5 rounded-xl mb-6" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
        <div className="flex items-center gap-2 mb-5">
          <Sparkles className="w-4 h-4" style={{ color: "#f59e0b" }} />
          <h2 className="text-base font-bold" style={{ fontFamily: "var(--font-heading)", color: "var(--text-primary)" }}>🧬 自我进化</h2>
        </div>
        {dashboard?.evolution ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Improvements */}
            <div>
              <div className="text-xs font-bold mb-3 flex items-center gap-1.5" style={{ color: "var(--text-secondary)" }}>
                🔍 待改进领域
                {dashboard.evolution.todayGaps > 0 && (
                  <span className="px-1.5 py-0.5 rounded text-[10px]" style={{ backgroundColor: "rgba(239,68,68,0.1)", color: "#ef4444" }}>
                    +{dashboard.evolution.todayGaps} 新发现
                  </span>
                )}
              </div>
              <div className="space-y-2">
                {dashboard.evolution.improvements.length > 0 ? dashboard.evolution.improvements.map((imp, i) => (
                  <div key={i} className="p-2.5 rounded-lg" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] px-1.5 py-0.5 rounded font-bold" style={{ backgroundColor: `${PRIORITY_COLORS[imp.priority] || "#60a5fa"}15`, color: PRIORITY_COLORS[imp.priority] || "#60a5fa" }}>
                        {imp.priority === "high" ? "高" : imp.priority === "medium" ? "中" : "低"}
                      </span>
                      <span className="text-xs" style={{ color: "var(--text-primary)" }}>{imp.title}</span>
                    </div>
                  </div>
                )) : (
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>🎉 无需改进 — 完美!</p>
                )}
              </div>
            </div>

            {/* 推荐技能 */}
            <div>
              <div className="text-xs font-bold mb-3" style={{ color: "var(--text-secondary)" }}>💡 推荐技能</div>
              <div className="space-y-2">
                {dashboard.evolution.recommendations.length > 0 ? dashboard.evolution.recommendations.map((rec, i) => (
                  <div key={i} className="flex items-center gap-2 p-2.5 rounded-lg" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
                    <Puzzle className="w-3.5 h-3.5" style={{ color: "#4ade80" }} />
                    <div>
                      <span className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>{rec.name}</span>
                      <span className="text-[10px] ml-1.5" style={{ color: "var(--text-muted)" }}>{rec.type}</span>
                    </div>
                  </div>
                )) : (
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>暂无新推荐</p>
                )}
              </div>
            </div>

            {/* 已安装技能 */}
            <div>
              <div className="text-xs font-bold mb-3" style={{ color: "var(--text-secondary)" }}>
                🧰 已安装技能 ({dashboard.evolution.skillCount})
              </div>
              <div className="flex flex-wrap gap-1.5">
                {dashboard.evolution.installedSkills.map((skill) => (
                  <span
                    key={skill}
                    className="text-[10px] px-2 py-1 rounded-full font-medium"
                    style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}
                  >
                    {skill}
                  </span>
                ))}
              </div>
              <div className="mt-3 text-[10px] space-y-1" style={{ color: "var(--text-muted)" }}>
                {dashboard.evolution.lastSignalCollection && (
                  <div>🔎 信号采集: {dashboard.evolution.lastSignalCollection}</div>
                )}
                {dashboard.evolution.lastReview && (
                  <div>📋 每日回顾: {dashboard.evolution.lastReview}</div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-sm py-6 text-center" style={{ color: "var(--text-muted)" }}>{loading ? "加载中..." : "暂无自我进化数据"}</div>
        )}
      </div>

      {/* ===== Row 3: Instagram 无水印下载 ===== */}
      <div className="mb-6 p-5 rounded-xl" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
        <div className="flex items-center gap-2 mb-4">
          <Download className="w-5 h-5" style={{ color: "#f472b6" }} />
          <h2 className="text-base font-bold" style={{ fontFamily: "var(--font-heading)", color: "var(--text-primary)" }}>
            📸 Instagram 无水印下载
          </h2>
          <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ backgroundColor: "rgba(244,114,182,0.12)", color: "#f472b6" }}>
            支持 Reel / Post / TV
          </span>
        </div>

        {/* 输入区 */}
        <div className="flex items-center gap-2 mb-4">
          <div className="flex-1 relative">
            <Link className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--text-muted)" }} />
            <input
              type="text"
              value={igUrl}
              onChange={(e) => setIgUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleIgDownload()}
              placeholder="粘贴 Instagram 链接，如 https://www.instagram.com/reel/xxx/"
              className="w-full pl-9 pr-3 py-2.5 rounded-lg text-sm"
              style={{
                backgroundColor: "var(--surface)",
                border: "1px solid var(--border)",
                color: "var(--text-primary)",
                outline: "none",
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = "var(--accent)"; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = "var(--border)"; }}
            />
          </div>
          <button
            onClick={handleIgDownload}
            disabled={igLoading || !igUrl.trim()}
            className="px-5 py-2.5 rounded-lg text-sm font-bold shrink-0 transition-all flex items-center gap-2"
            style={{
              backgroundColor: igUrl.trim() && !igLoading ? "#f472b6" : "var(--card-elevated)",
              color: igUrl.trim() && !igLoading ? "#fff" : "var(--text-muted)",
              border: "none",
              cursor: igUrl.trim() && !igLoading ? "pointer" : "default",
            }}
          >
            {igLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                解析中…
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                提取视频
              </>
            )}
          </button>
        </div>

        {/* 错误提示 + sssinstagram 直通按钮 */}
        {igError && (
          <div className="p-4 rounded-lg mb-4" style={{ backgroundColor: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)" }}>
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4" style={{ color: "#ef4444" }} />
              <span className="text-sm" style={{ color: "#ef4444" }}>服务器解析失败</span>
            </div>
            <p className="text-xs mb-3" style={{ color: "var(--text-muted)", lineHeight: 1.6 }}>
              自动解析服务暂时不可用。点击下方按钮将自动跳转到 SSSInstagram 并预填链接，手动点击下载即可。
            </p>
            <button
              onClick={openSssInstagram}
              className="px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all"
              style={{ backgroundColor: "#f472b6", color: "#fff", border: "none", cursor: "pointer" }}
            >
              <ExternalLink className="w-4 h-4" />
              在 SSSInstagram 中打开
            </button>
          </div>
        )}

        {/* 结果展示 */}
        {igResult && (
          <div className="p-4 rounded-lg" style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}>
            <div className="flex items-start gap-4">
              {/* 缩略图 */}
              {igResult.thumbnailUrl && (
                <div className="shrink-0 rounded-lg overflow-hidden" style={{ width: 120, height: 120, backgroundColor: "var(--card-elevated)" }}>
                  <img
                    src={igResult.thumbnailUrl}
                    alt="缩略图"
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                    crossOrigin="anonymous"
                  />
                </div>
              )}

              {/* 信息 */}
              <div className="flex-1 min-w-0">
                {igResult.authorName && (
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs" style={{ color: "#f472b6" }}>
                      @{igResult.authorName}
                    </span>
                    {igResult.provider && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ backgroundColor: "rgba(74,222,128,0.12)", color: "#4ade80" }}>
                        via {igResult.provider}
                      </span>
                    )}
                  </div>
                )}
                {igResult.caption && (
                  <p className="text-sm mb-3 line-clamp-3" style={{ color: "var(--text-secondary)", lineHeight: 1.5 }}>
                    {igResult.caption.length > 150 ? igResult.caption.slice(0, 150) + "…" : igResult.caption}
                  </p>
                )}
                <div className="flex items-center gap-2 mt-2">
                  <button
                    onClick={() => window.open(igResult.videoUrl, "_blank")}
                    className="px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all"
                    style={{ backgroundColor: "#f472b6", color: "#fff", border: "none", cursor: "pointer" }}
                  >
                    <ExternalLink className="w-4 h-4" />
                    打开视频
                  </button>
                  <button
                    onClick={() => {
                      const a = document.createElement("a");
                      a.href = igResult.videoUrl;
                      a.download = `instagram_${Date.now()}.mp4`;
                      a.target = "_blank";
                      a.rel = "noopener noreferrer";
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                    }}
                    className="px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all"
                    style={{ backgroundColor: "var(--accent)", color: "#fff", border: "none", cursor: "pointer" }}
                  >
                    <Download className="w-4 h-4" />
                    下载视频
                  </button>
                  <button
                    onClick={copyIgUrl}
                    className="px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all"
                    style={{ backgroundColor: "var(--card-elevated)", color: "var(--text-secondary)", border: "1px solid var(--border)", cursor: "pointer" }}
                  >
                    {igCopied ? (
                      <>
                        <CheckCheck className="w-4 h-4" style={{ color: "#4ade80" }} />
                        已复制
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        复制链接
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 使用提示 */}
        {!igResult && !igError && (
          <div className="text-xs" style={{ color: "var(--text-muted)", lineHeight: 1.8 }}>
            <p>💡 <strong>支持格式：</strong> Reel 短视频、普通帖子视频、IGTV 长视频</p>
            <p>🔗 <strong>示例链接：</strong> <code style={{ fontSize: 11, backgroundColor: "rgba(10,132,255,0.08)", padding: "1px 4px", borderRadius: 3 }}>https://www.instagram.com/reel/xxxxx/</code> 或 <code style={{ fontSize: 11, backgroundColor: "rgba(10,132,255,0.08)", padding: "1px 4px", borderRadius: 3 }}>https://www.instagram.com/p/xxxxx/</code></p>
            <p>⚠️ 仅支持 <strong>公开账号</strong> 的内容，私密账号无法下载</p>
          </div>
        )}
      </div>
    </div>
  );
}
