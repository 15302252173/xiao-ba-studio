/**
 * Test script v2 for daily report generation
 * Run: node scripts/test-daily-report.cjs
 */
const fs = require("fs");
const path = require("path");
const os = require("os");

const OPENCLAW_DIR = process.env.OPENCLAW_DIR || path.join(os.homedir(), ".openclaw");
const WORKSPACE = process.env.OPENCLAW_WORKSPACE || path.join(OPENCLAW_DIR, "workspace");
const SESSIONS_DIR = path.join(OPENCLAW_DIR, "agents", "main", "sessions");
const MEMORY_DIR = path.join(WORKSPACE, "memory");
const STATE_DIR = path.join(WORKSPACE, "state");

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatDateCN(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("zh-CN", { year: "numeric", month: "long", day: "numeric", weekday: "long" });
}

function formatTokens(n) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function formatCost(cost) {
  if (cost < 0.01) return `¥${(cost * 100).toFixed(2)} 分`;
  return `¥${cost.toFixed(2)}`;
}

function getDateStartEnd(date) {
  const d = new Date(date + "T00:00:00+08:00");
  return { dayStart: d.getTime(), dayEnd: d.getTime() + 24 * 60 * 60 * 1000 };
}

function extractMessageText(content) {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    for (const part of content) {
      if (part && typeof part === "object" && part.type === "text" && part.text) return String(part.text);
    }
  }
  return "";
}

function isContextMessage(text) {
  return (
    text.includes("[Subagent Context]") ||
    text.includes("You are running as a subagent") ||
    text.includes("[System Context]") ||
    text.startsWith("<system") ||
    text.startsWith("# AGENTS.md") ||
    text.includes("# Project Context")
  );
}

function parseSessionFile(filePath) {
  const result = {
    firstUserMessage: "", model: "", provider: "",
    messageCount: 0, userMsgCount: 0, assistantMsgCount: 0, toolCallCount: 0,
    totalTokens: 0, totalCost: 0, inputTokens: 0, outputTokens: 0,
    firstTimestamp: "", lastTimestamp: "",
  };
  try {
    if (!fs.existsSync(filePath)) return result;
    const content = fs.readFileSync(filePath, "utf-8");
    const lines = content.trim().split("\n");
    for (const line of lines) {
      try {
        const evt = JSON.parse(line);
        result.messageCount++;
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
            if (!result.firstUserMessage && msg.content) {
              const text = extractMessageText(msg.content);
              if (text && !isContextMessage(text)) {
                const cleaned = text.replace(/\n/g, " ").trim();
                result.firstUserMessage = cleaned.length > 150 ? cleaned.slice(0, 150) + "…" : cleaned;
              }
            }
          }
          if (msg.role === "assistant") {
            result.assistantMsgCount++;
            if (Array.isArray(msg.content)) {
              for (const part of msg.content) {
                if (part.type === "toolCall") result.toolCallCount++;
              }
            }
            if (msg.usage) {
              result.totalTokens += msg.usage.totalTokens || 0;
              result.inputTokens += msg.usage.input || 0;
              result.outputTokens += msg.usage.output || 0;
              if (msg.usage.cost) result.totalCost += msg.usage.cost.total || 0;
            }
          }
        }
      } catch {}
    }
  } catch {}
  return result;
}

// ── RUN ──
const date = process.argv[2] || todayStr();
const { dayStart } = getDateStartEnd(date);

console.log(`📊 测试日报生成 v2: ${formatDateCN(date)}\n`);

// Get session files
const jsonlFiles = fs.readdirSync(SESSIONS_DIR).filter(f =>
  f.endsWith(".jsonl") && !f.includes(".trajectory.") && !f.includes(".deleted.") && !f.includes(".reset.") && !f.startsWith(".")
);

let grandTotalTokens = 0;
let grandTotalCost = 0;
let grandTotalMs = 0;
let sessionCount = 0;
const modelUsage = {};
const sessions = [];

for (const file of jsonlFiles) {
  const filePath = path.join(SESSIONS_DIR, file);
  const mtime = fs.statSync(filePath).mtimeMs;
  if (mtime < dayStart) continue;

  sessionCount++;
  const sessionId = file.replace(".jsonl", "");
  const parsed = parseSessionFile(filePath);

  let durationMs = 0;
  if (parsed.firstTimestamp && parsed.lastTimestamp) {
    durationMs = new Date(parsed.lastTimestamp).getTime() - new Date(parsed.firstTimestamp).getTime();
  }

  const key = `${parsed.provider}/${parsed.model}`;
  if (!modelUsage[key]) modelUsage[key] = { tokens: 0, cost: 0, count: 0 };
  modelUsage[key].tokens += parsed.totalTokens;
  modelUsage[key].cost += parsed.totalCost;
  modelUsage[key].count++;

  grandTotalTokens += parsed.totalTokens;
  grandTotalCost += parsed.totalCost;
  if (durationMs > 0) grandTotalMs += durationMs;

  sessions.push({ sessionId, parsed, durationMs });
}

// Sort by first timestamp
sessions.sort((a, b) => {
  const ta = a.parsed.firstTimestamp || "z";
  const tb = b.parsed.firstTimestamp || "z";
  return ta.localeCompare(tb);
});

// Print summary
console.log(`🔢 总计: ${sessionCount} 个会话, ${formatTokens(grandTotalTokens)} tokens, ${formatCost(grandTotalCost)}`);
console.log();

// Print each session
for (const s of sessions.slice(0, 8)) {
  const { sessionId, parsed, durationMs } = s;
  const startTime = parsed.firstTimestamp ? new Date(parsed.firstTimestamp).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" }) : "—";
  const durStr = durationMs > 60000 ? `${Math.round(durationMs / 60000)}min` : `${Math.round(durationMs / 1000)}s`;
  console.log(`  🐮 ${sessionId.slice(0, 8)} — ${startTime} — ${durStr}`);
  console.log(`     🎯 ${parsed.firstUserMessage || "(subagent context only)"}`);
  console.log(`     🔢 ${formatTokens(parsed.totalTokens)} tokens | 💰 ${formatCost(parsed.totalCost)} | 💬 ${parsed.userMsgCount}U/${parsed.assistantMsgCount}A/${parsed.toolCallCount}T`);
}

if (sessions.length > 8) console.log(`  ... 还有 ${sessions.length - 8} 个会话`);

// Model breakdown
console.log(`\n🧠 模型分布:`);
for (const [m, stats] of Object.entries(modelUsage)) {
  console.log(`  ${m}: ${stats.count} sessions, ${formatTokens(stats.tokens)} tokens, ${formatCost(stats.cost)}`);
}

console.log(`\n✅ Test complete!`);
