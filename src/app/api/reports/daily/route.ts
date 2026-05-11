import { NextRequest, NextResponse } from "next/server";
import { promises as fs, existsSync, readFileSync, statSync, readdirSync } from "fs";
import path from "path";
import { homedir } from "os";
import { getActivities, getActivityStats } from "@/lib/activities-db";
import { OPENCLAW_WORKSPACE, OPENCLAW_DIR } from "@/lib/paths";

export const dynamic = "force-dynamic";

const WORKSPACE = OPENCLAW_WORKSPACE;
const MEMORY_DIR = path.join(WORKSPACE, "memory");
const REPORTS_DIR = path.join(MEMORY_DIR, "reports");
const SESSIONS_DIR = path.join(OPENCLAW_DIR, "agents", "main", "sessions");
const STATE_DIR = path.join(WORKSPACE, "state");

// ── Types ──

interface AgentStatusEntry {
  id: string;
  status: string;
  currentTask: string;
  lastActivity: string;
}

interface AgentStatusFile {
  agents: Record<string, AgentStatusEntry>;
}

interface SessionUsageEntry {
  timestamp: number;
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite: number;
  totalTokens: number;
  totalCost: number;
}

interface SessionCacheEntry {
  sessionId: string;
  sessionFile: string;
  firstActivity: number;
  lastActivity: number;
  durationMs: number;
  activityDates: string[];
  dailyBreakdown: Array<{ date: string; tokens: number; cost: number }>;
  dailyMessageCounts: Array<{ date: string; total: number; user: number; assistant: number; toolCalls: number }>;
  dailyModelUsage: Array<{ date: string; provider: string; model: string; tokens: number; cost: number; count: number }>;
  messageCounts: { total: number; user: number; assistant: number; toolCalls: number };
  totals: { input: number; output: number; cacheRead: number; totalTokens: number; totalCost: number };
  modelUsage: Array<{ provider: string; model: string; count: number; totals: { totalTokens: number; totalCost: number } }>;
}

interface SessionSummary {
  sessionId: string;
  mainTask: string;
  model: string;
  provider: string;
  startTime: string;
  endTime: string;
  durationMs: number;
  messageCount: number;
  userMessages: number;
  assistantMessages: number;
  toolCalls: number;
  totalTokens: number;
  totalCost: number;
  inputTokens: number;
  outputTokens: number;
}

// ── Helpers ──

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function isValidDate(str: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(str) && !isNaN(new Date(str).getTime());
}

function formatDateCN(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  });
}

function formatDuration(ms: number): string {
  if (ms < 60000) return `${Math.round(ms / 1000)} 秒`;
  const minutes = Math.round(ms / 60000);
  if (minutes < 60) return `${minutes} 分钟`;
  const hours = Math.floor(minutes / 60);
  const remainMin = minutes % 60;
  return remainMin > 0 ? `${hours} 小时 ${remainMin} 分钟` : `${hours} 小时`;
}

function formatCost(cost: number): string {
  if (cost < 0.01) return `¥${(cost * 100).toFixed(2)} 分`;
  return `¥${cost.toFixed(2)}`;
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function formatTime(isoStr: string): string {
  try {
    return new Date(isoStr).toLocaleTimeString("zh-CN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return isoStr;
  }
}

function getDateStartEnd(date: string): { dayStart: number; dayEnd: number } {
  const d = new Date(date + "T00:00:00+08:00");
  const dayStart = d.getTime();
  const dayEnd = dayStart + 24 * 60 * 60 * 1000;
  return { dayStart, dayEnd };
}

// ── Data Readers ──

/** Get agent status data */
function getAgentStatus(): Record<string, AgentStatusEntry> {
  const statePath = path.join(STATE_DIR, "agent-status.json");
  try {
    if (!existsSync(statePath)) return {};
    const raw = readFileSync(statePath, "utf-8");
    const data: AgentStatusFile = JSON.parse(raw);
    return data.agents || {};
  } catch {
    return {};
  }
}

/** Read and parse the usage-cost-cache.json for session summaries */
function getTodayCacheSummaries(date: string): SessionCacheEntry[] {
  const cachePath = path.join(SESSIONS_DIR, ".usage-cost-cache.json");
  try {
    if (!existsSync(cachePath)) return [];
    const raw = readFileSync(cachePath, "utf-8");
    const cache = JSON.parse(raw);
    const entries: SessionCacheEntry[] = [];

    for (const [key, value] of Object.entries(cache)) {
      if (key.startsWith("C:\\") || key.startsWith("/")) {
        const entry = value as Record<string, unknown>;
        const summary = entry.sessionSummary as Record<string, unknown> | undefined;
        if (!summary) continue;

        const dates = summary.activityDates as string[] | undefined;
        if (!dates || !dates.includes(date)) continue;

        entries.push({
          sessionId: summary.sessionId as string,
          sessionFile: summary.sessionFile as string,
          firstActivity: summary.firstActivity as number,
          lastActivity: summary.lastActivity as number,
          durationMs: summary.durationMs as number,
          activityDates: dates,
          dailyBreakdown: (summary.dailyBreakdown || []) as SessionCacheEntry["dailyBreakdown"],
          dailyMessageCounts: (summary.dailyMessageCounts || []) as SessionCacheEntry["dailyMessageCounts"],
          dailyModelUsage: (summary.dailyModelUsage || []) as SessionCacheEntry["dailyModelUsage"],
          messageCounts: summary.messageCounts as SessionCacheEntry["messageCounts"],
          totals: (entry.totals || {}) as SessionCacheEntry["totals"],
          modelUsage: (entry.modelUsage || []) as SessionCacheEntry["modelUsage"],
        });
      }
    }
    return entries;
  } catch {
    return [];
  }
}

/** Check if a user message is a subagent/system context message (not a real user query) */
function isContextMessage(text: string): boolean {
  return (
    text.includes("[Subagent Context]") ||
    text.includes("You are running as a subagent") ||
    text.includes("[System Context]") ||
    text.startsWith("<system") ||
    text.startsWith("# AGENTS.md") ||
    text.includes("# Project Context")
  );
}

/** Extract text content from a message content field */
function extractMessageText(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    for (const part of content) {
      if (part && typeof part === "object" && part.type === "text" && part.text) {
        return String(part.text);
      }
    }
  }
  return "";
}

/** Parse a JSONL session file to extract the main task (first REAL user message) and model info */
function parseSessionFile(filePath: string): {
  firstUserMessage: string;
  model: string;
  provider: string;
  messageCount: number;
  userMsgCount: number;
  assistantMsgCount: number;
  toolCallCount: number;
  totalTokens: number;
  totalCost: number;
  inputTokens: number;
  outputTokens: number;
  firstTimestamp: string;
  lastTimestamp: string;
} {
  const result = {
    firstUserMessage: "",
    model: "",
    provider: "",
    messageCount: 0,
    userMsgCount: 0,
    assistantMsgCount: 0,
    toolCallCount: 0,
    totalTokens: 0,
    totalCost: 0,
    inputTokens: 0,
    outputTokens: 0,
    firstTimestamp: "",
    lastTimestamp: "",
  };

  try {
    if (!existsSync(filePath)) return result;
    const content = readFileSync(filePath, "utf-8");
    const lines = content.trim().split("\n");

    for (const line of lines) {
      try {
        const evt = JSON.parse(line);
        result.messageCount++;

        // Track timestamps
        if (evt.timestamp) {
          if (!result.firstTimestamp) result.firstTimestamp = evt.timestamp;
          result.lastTimestamp = evt.timestamp;
        }

        if (evt.type === "model_change" && !result.model) {
          result.model = evt.modelId || "";
          result.provider = evt.provider || "";
        }

        if (evt.type === "message" && evt.message) {
          const msg = evt.message;
          if (msg.role === "user") {
            result.userMsgCount++;
            // Only capture the first REAL user message (skip context/system messages)
            if (!result.firstUserMessage && msg.content) {
              const text = extractMessageText(msg.content);
              if (text && !isContextMessage(text)) {
                // Clean and truncate
                const cleaned = text.replace(/\n/g, " ").trim();
                result.firstUserMessage = cleaned.length > 150 ? cleaned.slice(0, 150) + "…" : cleaned;
              }
            }
          }
          if (msg.role === "assistant") {
            result.assistantMsgCount++;
            // Count tool calls in assistant content
            if (Array.isArray(msg.content)) {
              for (const part of msg.content) {
                if (part.type === "toolCall") result.toolCallCount++;
              }
            }
            // Extract usage data from assistant messages
            if (msg.usage) {
              result.totalTokens += msg.usage.totalTokens || 0;
              result.inputTokens += msg.usage.input || 0;
              result.outputTokens += msg.usage.output || 0;
              if (msg.usage.cost) {
                result.totalCost += msg.usage.cost.total || 0;
              }
            }
          }
        }
      } catch { /* skip malformed lines */ }
    }
  } catch { /* file may be locked or missing */ }
  return result;
}

/** Get all today's session summaries by combining JSONL + cache data */
function getTodaySessionSummaries(date: string): SessionSummary[] {
  const { dayStart, dayEnd } = getDateStartEnd(date);
  const cacheSummaries = getTodayCacheSummaries(date);
  const cacheMap = new Map<string, SessionCacheEntry>();
  for (const c of cacheSummaries) {
    cacheMap.set(c.sessionId, c);
  }

  const summaries: SessionSummary[] = [];

  // Scan session JSONL files
  try {
    if (!existsSync(SESSIONS_DIR)) return summaries;

    const allFiles = readdirSyncSafe(SESSIONS_DIR);
    const jsonlFiles = allFiles.filter(
      (f) =>
        f.endsWith(".jsonl") &&
        !f.includes(".trajectory.") &&
        !f.includes(".deleted.") &&
        !f.includes(".reset.") &&
        !f.startsWith(".")
    );

    for (const file of jsonlFiles) {
      const filePath = path.join(SESSIONS_DIR, file);
      let mtime: number;
      try {
        mtime = statSync(filePath).mtimeMs;
      } catch {
        continue;
      }
      // Check if file was modified today
      if (mtime < dayStart) continue;

      const sessionId = file.replace(".jsonl", "");
      const cacheEntry = cacheMap.get(sessionId);
      const parsed = parseSessionFile(filePath);

      // Calculate today's portion - use cache if available, fallback to direct parsing
      let todayTokens = 0;
      let todayCost = 0;
      let todayDurationMs = 0;
      let todayStartTime = "";
      let todayEndTime = "";
      let inputTokens = 0;
      let outputTokens = 0;

      if (cacheEntry) {
        const dayBreakdown = cacheEntry.dailyBreakdown.find((d) => d.date === date);
        if (dayBreakdown) {
          todayTokens = dayBreakdown.tokens;
          todayCost = dayBreakdown.cost;
        }
        todayDurationMs = cacheEntry.durationMs;
        todayStartTime = new Date(cacheEntry.firstActivity).toISOString();
        todayEndTime = new Date(cacheEntry.lastActivity).toISOString();
        // Extract input/output from cache totals (proportional)
        if (cacheEntry.totals.totalTokens > 0 && todayTokens > 0) {
          const ratio = todayTokens / cacheEntry.totals.totalTokens;
          inputTokens = Math.round((cacheEntry.totals.input || 0) * ratio);
          outputTokens = Math.round((cacheEntry.totals.output || 0) * ratio);
        }
      } else {
        // Fallback: use directly parsed data from JSONL
        todayTokens = parsed.totalTokens;
        todayCost = parsed.totalCost;
        inputTokens = parsed.inputTokens;
        outputTokens = parsed.outputTokens;
        todayStartTime = parsed.firstTimestamp;
        todayEndTime = parsed.lastTimestamp;
        if (parsed.firstTimestamp && parsed.lastTimestamp) {
          try {
            todayDurationMs = new Date(parsed.lastTimestamp).getTime() - new Date(parsed.firstTimestamp).getTime();
          } catch {}
        }
      }

      summaries.push({
        sessionId,
        mainTask: parsed.firstUserMessage || "（未找到用户消息）",
        model: parsed.model || cacheEntry?.modelUsage?.[0]?.model || "未知",
        provider: parsed.provider || cacheEntry?.modelUsage?.[0]?.provider || "未知",
        startTime: todayStartTime,
        endTime: todayEndTime,
        durationMs: todayDurationMs,
        messageCount: parsed.messageCount,
        userMessages: parsed.userMsgCount,
        assistantMessages: parsed.assistantMsgCount,
        toolCalls: parsed.toolCallCount,
        totalTokens: todayTokens,
        totalCost: todayCost,
        inputTokens,
        outputTokens,
      });
    }
  } catch { /* no sessions dir */ }

  // Sort by start time
  summaries.sort((a, b) => {
    if (!a.startTime) return 1;
    if (!b.startTime) return -1;
    return a.startTime.localeCompare(b.startTime);
  });

  return summaries;
}

/** Parse memory file into sections */
function parseMemorySections(content: string): Array<{ title: string; items: string[] }> {
  const sections: Array<{ title: string; items: string[] }> = [];
  const lines = content.split("\n");
  let currentTitle = "";
  let currentItems: string[] = [];

  for (const line of lines) {
    if (line.startsWith("## ")) {
      if (currentTitle) {
        sections.push({ title: currentTitle, items: currentItems });
        currentItems = [];
      }
      currentTitle = line.slice(3).trim();
    } else if (line.startsWith("- ")) {
      currentItems.push(line.slice(2).trim());
    } else if (line.startsWith("### ") && currentTitle) {
      currentItems.push(`**${line.slice(4).trim()}**`);
    }
  }
  if (currentTitle) {
    sections.push({ title: currentTitle, items: currentItems });
  }
  return sections;
}

function extractTodos(memoryContent: string): string[] {
  const todos: string[] = [];
  const lines = memoryContent.split("\n");
  for (const line of lines) {
    const unchecked = line.match(/^-\s*\[ \]\s+(.+)$/);
    if (unchecked) {
      todos.push(unchecked[1].trim());
    }
  }
  return todos;
}

interface TodoFromFile {
  id: string;
  text: string;
  date: string;
  done: boolean;
  createdAt: string;
  rolledOver: boolean;
}

function getAppTodos(date: string): { todos: TodoFromFile[]; doneCount: number; pendingCount: number; rolledCount: number } {
  const todosPath = path.join(process.cwd(), "data", "todos.json");
  try {
    if (!existsSync(todosPath)) return { todos: [], doneCount: 0, pendingCount: 0, rolledCount: 0 };
    const raw = readFileSync(todosPath, "utf-8");
    const data = JSON.parse(raw);
    const allTodos: TodoFromFile[] = data.todos || [];
    const todayTodos = allTodos.filter((t: TodoFromFile) => t.date === date);
    const doneCount = todayTodos.filter((t: TodoFromFile) => t.done).length;
    const pendingCount = todayTodos.filter((t: TodoFromFile) => !t.done).length;
    const rolledCount = todayTodos.filter((t: TodoFromFile) => t.rolledOver).length;
    return { todos: todayTodos, doneCount, pendingCount, rolledCount };
  } catch {
    return { todos: [], doneCount: 0, pendingCount: 0, rolledCount: 0 };
  }
}

/** Scan memory dir for analysis reports created/modified today */
function getTodayAnalysisReports(date: string): Array<{ name: string; title: string; summary: string }> {
  const reportPatterns = [/-analysis-/, /-report-/];
  const memoryDir = path.join(WORKSPACE, "memory");
  const results: Array<{ name: string; title: string; summary: string }> = [];
  try {
    if (!existsSync(memoryDir)) return results;
    const files = readdirSync(memoryDir).filter((f) => f.endsWith(".md"));
    const targetDate = date; // YYYY-MM-DD
    const todayPrefix = targetDate;
    for (const file of files) {
      const isReport = reportPatterns.some((p) => p.test(file));
      if (!isReport) continue;
      // Check if modified today
      try {
        const stat = statSync(path.join(memoryDir, file));
        const mtimeDate = new Date(stat.mtimeMs).toISOString().slice(0, 10);
        if (mtimeDate !== todayPrefix) continue;
      } catch { continue; }
      const content = safeReadFile(path.join(memoryDir, file));
      if (!content) continue;
      const titleMatch = content.match(/^#\s+(.+)$/m);
      const title = titleMatch ? titleMatch[1].trim() : file.replace(".md", "");
      // Extract first meaningful paragraph as summary
      const summaryMatch = content.match(/^##\s+[^\n]+\n\n(.+?)(?:\n##|\n\n##|$)/s);
      const summary = summaryMatch ? summaryMatch[1].trim().replace(/\n/g, " ").slice(0, 200) : "";
      results.push({ name: file, title, summary });
    }
  } catch { /* ignore */ }
  return results;
}

function getReportTypeLabel(filename: string): string {
  if (filename.includes("twitter")) return "🐦 · Twitter 分析";
  if (filename.includes("instagram")) return "📸 · Instagram 分析";
  if (filename.includes("youtube")) return "▶️ · YouTube 分析";
  if (filename.includes("xiaohongshu") || filename.includes("小红书")) return "📕 · 小红书分析";
  if (filename.includes("analysis")) return "📊 · 数据分析";
  if (filename.includes("report")) return "📋 · 专项报告";
  return "📄 · 报告";
}

function readdirSyncSafe(dir: string): string[] {
  try {
    return readdirSync(dir);
  } catch {
    return [];
  }
}

// ── Emoji & Status Maps ──

const STATUS_EMOJI: Record<string, string> = {
  working: "🟡",
  idle: "🟢",
  thinking: "🔵",
  sleeping: "⚫",
  error: "🔴",
  completed: "✅",
};

const STATUS_TEXT: Record<string, string> = {
  working: "工作中",
  idle: "待命中",
  thinking: "思考中",
  sleeping: "休眠中",
  error: "错误",
  completed: "已完成",
};

// ── Report Generation ──

async function generateReport(date: string): Promise<string> {
  const lines: string[] = [];
  const weekday = new Date(date + "T00:00:00").toLocaleDateString("zh-CN", { weekday: "long" });

  // ════════════════════════════════════════
  // HEADER
  // ════════════════════════════════════════
  const dateDisplay = formatDateCN(date);
  lines.push(`# 📊 牛二日报 — ${dateDisplay}`);
  lines.push("");
  lines.push(`> 🐮 *自动生成于 ${new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })} · 牛二日报系统*`);
  lines.push("");

  // ── Get all data sources ──
  const agents = getAgentStatus();
  const sessions = getTodaySessionSummaries(date);

  // Read memory file
  const memoryFile = path.join(MEMORY_DIR, `${date}.md`);
  let memoryContent = "";
  let hasMemory = false;
  if (existsSync(memoryFile)) {
    memoryContent = await fs.readFile(memoryFile, "utf-8");
    hasMemory = true;
  }

  // ════════════════════════════════════════
  // OVERVIEW / SUMMARY
  // ════════════════════════════════════════
  const totalTokens = sessions.reduce((sum, s) => sum + s.totalTokens, 0);
  const totalCost = sessions.reduce((sum, s) => sum + s.totalCost, 0);
  const totalDurationMs = sessions.reduce((sum, s) => sum + s.durationMs, 0);
  const agentCount = Object.keys(agents).length || sessions.length || 1;

  lines.push("## 🎯 总体概要");
  lines.push("");

  // Generate a meaningful summary
  const summaryParts: string[] = [];
  if (sessions.length > 0) {
    summaryParts.push(`今日共执行 **${sessions.length}** 个会话`);
  }
  if (agentCount > 0) {
    const workingAgents = Object.values(agents).filter((a) => a.status === "working" || a.status === "thinking").length;
    if (workingAgents > 0) summaryParts.push(`**${workingAgents}** 位 Agent 保持活跃`);
  }
  if (totalTokens > 0) {
    summaryParts.push(`消耗约 **${formatTokens(totalTokens)}** tokens（${formatCost(totalCost)}）`);
  }
  if (hasMemory) {
    summaryParts.push("今日记忆已记录");
  }

  if (summaryParts.length > 0) {
    lines.push(`${summaryParts.join("，")}。`);
  } else {
    lines.push("今日暂无活动记录，可能是个休息日 ☕");
  }
  lines.push("");

  // Generate a human-readable overview based on memory content
  if (hasMemory) {
    const sections = parseMemorySections(memoryContent);
    if (sections.length > 0) {
      // Extract key topics from first 3 sections
      const topics = sections.slice(0, 3).map((s) => s.title);
      const uniqueTopics = [...new Set(topics)];
      if (uniqueTopics.length > 0) {
        lines.push(`> 今日主要围绕 **${uniqueTopics.join("**、**")}** 展开工作。`);
        lines.push("");
      }
    }
  }

  // ════════════════════════════════════════
  // AGENT WORK DETAILS
  // ════════════════════════════════════════
  lines.push("## 🤖 Agent 工作详情");
  lines.push("");

  if (sessions.length > 0) {
    // Display each session as an agent work entry
    for (const session of sessions) {
      const sessionTimeStart = session.startTime ? formatTime(session.startTime) : "—";
      const sessionTimeEnd = session.endTime ? formatTime(session.endTime) : "—";

      lines.push(`### 🐮 小牛 · 会话 \`${session.sessionId.slice(0, 8)}\``);
      lines.push("");
      lines.push(`- **🕐 时间**：${sessionTimeStart} ~ ${sessionTimeEnd}`);
      lines.push(`- **🎯 任务**：${session.mainTask}`);
      if (session.model) {
        lines.push(`- **🧠 模型**：${session.provider}/${session.model}`);
      }
      if (session.totalTokens > 0) {
        lines.push(`- **🔢 Token**：${formatTokens(session.totalTokens)}（输入 ${formatTokens(session.inputTokens)} / 输出 ${formatTokens(session.outputTokens)}）`);
      }
      if (session.totalCost > 0) {
        lines.push(`- **💰 费用**：${formatCost(session.totalCost)}`);
      }
      if (session.durationMs > 60000) {
        lines.push(`- **⏱️ 时长**：${formatDuration(session.durationMs)}`);
      }
      lines.push(`- **💬 交互**：${session.userMessages} 条用户消息 · ${session.assistantMessages} 条助手回复 · ${session.toolCalls} 次工具调用`);
      lines.push("");
    }
  } else if (Object.keys(agents).length > 0) {
    // No sessions but have agent status - show agent states
    for (const [id, agent] of Object.entries(agents)) {
      const emoji = STATUS_EMOJI[agent.status] || "❓";
      const statusText = STATUS_TEXT[agent.status] || agent.status;
      // Clean garbled task text: keep only printable ASCII + common CJK
      const task = agent.currentTask
        ? agent.currentTask.replace(/[^\x20-\x7E\u4e00-\u9fff\u3000-\u303f\uff00-\uffef🎨💻📈👔🐮🔧⏰🛠️📋🔍📊🎯🔒⚙️🧹🔄]/g, "").trim()
        : "";

      lines.push(`### ${emoji} ${id}`);
      lines.push("");
      lines.push(`- **状态**：${emoji} ${statusText}`);
      if (task) lines.push(`- **当前任务**：${task}`);
      if (agent.lastActivity) {
        const lastTime = new Date(agent.lastActivity);
        const now = new Date();
        const timeAgoMs = now.getTime() - lastTime.getTime();
        const timeAgo = timeAgoMs < 60000 ? "刚刚" : timeAgoMs < 3600000 ? `${Math.floor(timeAgoMs / 60000)} 分钟前` : `${Math.floor(timeAgoMs / 3600000)} 小时前`;
        lines.push(`- **最后活跃**：${lastTime.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}（${timeAgo}）`);
      }
      lines.push("");
    }
  } else {
    lines.push("暂无 Agent 活动记录 🛌");
    lines.push("");
  }

  // ════════════════════════════════════════
  // KEY METRICS
  // ════════════════════════════════════════
  lines.push("## 📈 关键指标");
  lines.push("");

  const workingAgentCount = Object.values(agents).filter((a) => a.status === "working" || a.status === "thinking").length;

  lines.push("| 📊 指标 | 📏 数值 |");
  lines.push("|:--------|:--------|");
  lines.push(`| 🗂️ 活跃会话 | ${sessions.length} |`);
  lines.push(`| 🤖 活跃 Agent | ${workingAgentCount || sessions.length} |`);
  lines.push(`| 🔢 Token 消耗 | ${totalTokens > 0 ? formatTokens(totalTokens) : "—"} |`);
  lines.push(`| 💰 预估费用 | ${totalCost > 0 ? formatCost(totalCost) : "—"} |`);
  lines.push(`| ⏱️ 总工作时长 | ${totalDurationMs > 0 ? formatDuration(totalDurationMs) : "—"} |`);
  lines.push(`| 📝 记忆条目 | ${hasMemory ? "✅ 已记录" : "—"}`);

  // Add model breakdown if multiple models used
  const modelUsage: Record<string, { tokens: number; cost: number; count: number }> = {};
  for (const s of sessions) {
    const key = `${s.provider}/${s.model}`;
    if (!modelUsage[key]) modelUsage[key] = { tokens: 0, cost: 0, count: 0 };
    modelUsage[key].tokens += s.totalTokens;
    modelUsage[key].cost += s.totalCost;
    modelUsage[key].count++;
  }
  if (Object.keys(modelUsage).length > 0) {
    for (const [model, stats] of Object.entries(modelUsage)) {
      lines.push(`| 🧠 ${model} | ${formatTokens(stats.tokens)} / ${formatCost(stats.cost)} |`);
    }
  }

  lines.push("");

  // ════════════════════════════════════════
  // ACTIVITY STATS (from DB)
  // ════════════════════════════════════════
  try {
    const dateStart = `${date}T00:00:00`;
    const dayActivities = getActivities({
      startDate: dateStart,
      endDate: date,
      sort: "newest",
      limit: 1000,
    });

    if (dayActivities.activities.length > 0) {
      let dbTotalTokens = 0;
      let completedTasks = 0;
      const byType: Record<string, number> = {};

      for (const a of dayActivities.activities) {
        dbTotalTokens += a.tokens_used || 0;
        if (a.status === "success") completedTasks++;
        byType[a.type] = (byType[a.type] || 0) + 1;
      }

      lines.push("### 📋 活动分布");
      lines.push("");
      lines.push(`| 活动类型 | 次数 |`);
      lines.push(`|:---------|:-----|`);
      for (const [type, count] of Object.entries(byType).sort((a, b) => b[1] - a[1]).slice(0, 8)) {
        lines.push(`| ${type} | ${count} |`);
      }
      lines.push("");
    }
  } catch {
    // Activity DB not available - skip
  }

  // ════════════════════════════════════════
  // TODAY'S MEMORY
  // ════════════════════════════════════════
  if (hasMemory) {
    lines.push("## 🧠 今日记忆摘要");
    lines.push("");

    const sections = parseMemorySections(memoryContent);
    if (sections.length > 0) {
      for (const sec of sections.slice(0, 6)) {
        lines.push(`### ${sec.title}`);
        lines.push("");
        for (const item of sec.items.slice(0, 6)) {
          lines.push(`- ${item}`);
        }
        lines.push("");
      }
    }

    const memTodos = extractTodos(memoryContent);
    if (memTodos.length > 0) {
      lines.push("### 📋 记忆中的待办");
      lines.push("");
      for (const todo of memTodos.slice(0, 10)) {
        lines.push(`- [ ] ${todo}`);
      }
      lines.push("");
    }
  }

  // ── 每日待办总结（来自 todos.json）──
  const appTodos = getAppTodos(date);
  if (appTodos.todos.length > 0) {
    lines.push("## ✅ 每日待办总结");
    lines.push("");
    lines.push(`| 📊 统计 | 📏 数值 |`);
    lines.push(`|:--------|:--------|`);
    lines.push(`| 📝 待办总数 | ${appTodos.todos.length} |`);
    lines.push(`| ✅ 已完成 | ${appTodos.doneCount} |`);
    lines.push(`| ⏳ 未完成 | ${appTodos.pendingCount} |`);
    if (appTodos.rolledCount > 0) {
      lines.push(`| 🔄 顺延自昨日 | ${appTodos.rolledCount} |`);
    }
    const completionRate = appTodos.todos.length > 0 ? Math.round((appTodos.doneCount / appTodos.todos.length) * 100) : 0;
    const rateIcon = completionRate === 100 ? "🎉" : completionRate >= 50 ? "👍" : "💪";
    lines.push(`| ${rateIcon} 完成率 | ${completionRate}% |`);
    lines.push("");

    // 已完成列表
    const doneTodos = appTodos.todos.filter((t) => t.done);
    if (doneTodos.length > 0) {
      lines.push("### ✅ 已完成");
      lines.push("");
      for (const t of doneTodos) {
        lines.push(`- [x] ${t.text}${t.rolledOver ? " 🔄" : ""}`);
      }
      lines.push("");
    }

    // 未完成列表
    const pendingTodos = appTodos.todos.filter((t) => !t.done);
    if (pendingTodos.length > 0) {
      lines.push("### ⏳ 未完成（将顺延至明日）");
      lines.push("");
      for (const t of pendingTodos) {
        const tag = t.rolledOver ? " 🔄 已顺延" : "";
        lines.push(`- [ ] ${t.text}${tag}`);
      }
      lines.push("");
    }
  }

  // ── 今日分析报告 ──
  const todayReports = getTodayAnalysisReports(date);
  if (todayReports.length > 0) {
    lines.push("## 📊 今日分析报告");
    lines.push("");
    lines.push(`共生成 **${todayReports.length}** 份分析报告：`);
    lines.push("");
    for (const report of todayReports) {
      const typeLabel = getReportTypeLabel(report.name);
      lines.push(`- 📄 **${report.title}** ${typeLabel}`);
      if (report.summary) {
        lines.push(`  > ${report.summary.slice(0, 150)}`);
      }
      lines.push("");
    }
  }

  if (!hasMemory) {
    lines.push("## 🧠 今日记忆");
    lines.push("");
    lines.push("今日暂无记忆记录。明天记得要让小牛帮你记录哦 📝");
    lines.push("");
  }

  // ════════════════════════════════════════
  // TOMORROW SUGGESTIONS
  // ════════════════════════════════════════
  lines.push("## 🔮 明日建议");
  lines.push("");

  const suggestions: string[] = [];

  // Generate contextual suggestions based on data
  const appTodosForSuggestions = getAppTodos(date);
  const pendingAppTodos = appTodosForSuggestions.todos.filter((t) => !t.done);
  if (pendingAppTodos.length > 0) {
    const firstPending = pendingAppTodos[0];
    const rolledTag = firstPending.rolledOver ? "（已顺延多日）" : "";
    suggestions.push(`还有 **${pendingAppTodos.length}** 项待办未完成${rolledTag}，建议明天优先处理：${firstPending.text}`);
  } else if (hasMemory) {
    const memTodos = extractTodos(memoryContent);
    if (memTodos.length > 0) {
      suggestions.push(`记忆中有 **${memTodos.length}** 项待办未完成，建议明天关注：${memTodos[0]}`);
    }
  }

  if (sessions.length > 0 && sessions[0].mainTask.includes("日报")) {
    suggestions.push("日报系统已升级完成，明天可以验证自动生成的日报质量 📊");
  }

  if (Object.keys(agents).length > 0) {
    const idleAgents = Object.values(agents).filter((a) => a.status === "idle" || a.status === "sleeping");
    if (idleAgents.length >= Object.keys(agents).length / 2) {
      suggestions.push(`${idleAgents.length} 位 Agent 处于闲置状态，明天可以给它们分配新任务 🚀`);
    }
  }

  if (totalCost > 0.1) {
    suggestions.push(`今日费用 ${formatCost(totalCost)}，建议关注 token 消耗大户，优化 prompt 减少浪费 💡`);
  }

  // Fallback suggestions
  if (suggestions.length === 0) {
    suggestions.push("明天可以开始新的任务，让牛二团队帮你推进项目 🚀");
    if (!hasMemory) {
      suggestions.push("建议开始使用记忆功能记录每日工作日志 📝");
    }
  }

  for (const s of suggestions) {
    lines.push(`- 💡 ${s}`);
  }
  lines.push("");

  // ════════════════════════════════════════
  // FOOTER
  // ════════════════════════════════════════
  lines.push("---");
  lines.push("");
  lines.push(`*📊 牛二日报系统 v2.0 · ${new Date().toISOString()}*`);

  return lines.join("\n");
}

// ── Ensure reports directory ──

async function ensureReportsDir(): Promise<void> {
  try {
    await fs.mkdir(REPORTS_DIR, { recursive: true });
  } catch { /* ignore */ }
}

// ════════════════════════════════════════
// API Handlers
// ════════════════════════════════════════

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date") || todayStr();

  if (!isValidDate(date)) {
    return NextResponse.json({ error: "Invalid date format. Use YYYY-MM-DD." }, { status: 400 });
  }

  try {
    await ensureReportsDir();
    const reportPath = path.join(REPORTS_DIR, `${date}.md`);

    if (!existsSync(reportPath)) {
      const memoryFile = path.join(MEMORY_DIR, `${date}.md`);
      const hasMemory = existsSync(memoryFile);
      return NextResponse.json(
        {
          date,
          content: null,
          exists: false,
          hasMemory,
          message: hasMemory
            ? "日报尚未生成，但今日记忆文件存在。点击「生成日报」按钮生成。"
            : "该日期暂无记忆文件，无法生成日报。",
        },
        { status: 200 }
      );
    }

    const content = await fs.readFile(reportPath, "utf-8");
    return NextResponse.json({ date, content, exists: true });
  } catch (error) {
    console.error("[daily-report] GET error:", error);
    return NextResponse.json({ error: "Failed to read daily report" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const date = body.date || todayStr();

    if (!isValidDate(date)) {
      return NextResponse.json({ error: "Invalid date format. Use YYYY-MM-DD." }, { status: 400 });
    }

    await ensureReportsDir();

    const reportContent = await generateReport(date);
    const reportPath = path.join(REPORTS_DIR, `${date}.md`);
    await fs.writeFile(reportPath, reportContent, "utf-8");

    return NextResponse.json({
      date,
      content: reportContent,
      exists: true,
      generated: true,
    });
  } catch (error) {
    console.error("[daily-report] POST error:", error);
    return NextResponse.json({ error: "Failed to generate daily report" }, { status: 500 });
  }
}
