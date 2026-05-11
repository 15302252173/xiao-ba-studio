/**
 * Usage Scanner - Reads cumulative token usage from OpenClaw JSONL session files
 * This gives accurate historical totals (unlike `openclaw status` which only shows current window)
 */

import { readdirSync, readFileSync, statSync } from "fs";
import { join } from "path";
import { createReadStream } from "fs";
import { createInterface } from "readline";
import os from "os";
import { calculateCost, normalizeModelId, getModelName } from "./pricing";

const OPENCLAW_DIR = process.env.OPENCLAW_DIR || join(os.homedir(), ".openclaw");
const AGENTS_DIR = join(OPENCLAW_DIR, "agents");

interface UsageEntry {
  date: string;       // YYYY-MM-DD
  model: string;
  agentId: string;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  totalTokens: number;
}

interface DayCost {
  date: string;
  cost: number;
  input: number;
  output: number;
}

interface AgentCostResult {
  agent: string;
  cost: number;
  tokens: number;
  inputTokens: number;
  outputTokens: number;
  cacheRead: number;
  cacheWrite: number;
  percentOf总计: number;
  messages: number;
}

interface ModelCostResult {
  model: string;
  cost: number;
  tokens: number;
  inputTokens: number;
  outputTokens: number;
  percentOf总计: number;
  messages: number;
}

/**
 * Scan all JSONL session files and extract usage data
 */
export async function scanAllUsage(): Promise<UsageEntry[]> {
  const entries: UsageEntry[] = [];

  let agentDirs: string[];
  try {
    agentDirs = readdirSync(AGENTS_DIR).filter((d) => {
      try {
        return statSync(join(AGENTS_DIR, d)).isDirectory();
      } catch {
        return false;
      }
    });
  } catch {
    return entries;
  }

  for (const agentId of agentDirs) {
    const sessionsDir = join(AGENTS_DIR, agentId, "sessions");
    let files: string[];
    try {
      files = readdirSync(sessionsDir).filter((f) => f.endsWith(".jsonl"));
    } catch {
      continue;
    }

    for (const file of files) {
      const filePath = join(sessionsDir, file);
      try {
        const content = readFileSync(filePath, "utf-8");
        for (const line of content.split("\n")) {
          if (!line.trim()) continue;
          try {
            const d = JSON.parse(line);
            const msg = d.message || {};
            const usage = msg.usage || d.usage;
            const model = msg.model || d.model || "";
            const ts = d.timestamp || "";
            if (!usage || !model || !ts) continue;

            const date = typeof ts === "string" ? ts.slice(0, 10) : "";
            if (!date || date.length !== 10) continue;

            entries.push({
              date,
              model: normalizeModelId(model),
              agentId,
              inputTokens: usage.input || 0,
              outputTokens: usage.output || 0,
              cacheReadTokens: usage.cacheRead || 0,
              cacheWriteTokens: usage.cacheWrite || 0,
              totalTokens: usage.totalTokens || 0,
            });
          } catch {
            // skip malformed lines
          }
        }
      } catch {
        // skip unreadable files
      }
    }
  }

  return entries;
}

/**
 * Build full cost report from JSONL data
 */
export async function buildCostReport(filterDays?: number) {
  const allEntries = await scanAllUsage();

  const now = new Date();
  const todayStr = now.toISOString().split("T")[0];
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split("T")[0];
  const thisMonthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthPrefix = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, "0")}`;

  // Filter by timeframe if specified
  let cutoffDate = "";
  if (filterDays) {
    const cutoff = new Date(now);
    cutoff.setDate(cutoff.getDate() - filterDays);
    cutoffDate = cutoff.toISOString().split("T")[0];
  }

  const filtered = cutoffDate
    ? allEntries.filter((e) => e.date >= cutoffDate)
    : allEntries;

  // Calculate costs for each entry
  function entryCost(e: UsageEntry): number {
    return calculateCost(e.model, e.inputTokens, e.outputTokens, e.cacheReadTokens, e.cacheWriteTokens);
  }

  // Summary costs
  const todayEntries = allEntries.filter((e) => e.date === todayStr);
  const yesterdayEntries = allEntries.filter((e) => e.date === yesterdayStr);
  const thisMonthEntries = allEntries.filter((e) => e.date.startsWith(thisMonthPrefix));
  const lastMonthEntries = allEntries.filter((e) => e.date.startsWith(lastMonthPrefix));

  const todayCost = todayEntries.reduce((s, e) => s + entryCost(e), 0);
  const yesterdayCost = yesterdayEntries.reduce((s, e) => s + entryCost(e), 0);
  const thisMonthCost = thisMonthEntries.reduce((s, e) => s + entryCost(e), 0);
  const lastMonthCost = lastMonthEntries.reduce((s, e) => s + entryCost(e), 0);

  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const daysElapsed = now.getDate();
  const projected = daysElapsed > 0 ? (thisMonthCost / daysElapsed) * daysInMonth : 0;

  // By agent
  const agentMap = new Map<string, { cost: number; tokens: number; in: number; out: number; cr: number; cw: number; msgs: number }>();
  for (const e of filtered) {
    const key = e.agentId;
    const prev = agentMap.get(key) || { cost: 0, tokens: 0, in: 0, out: 0, cr: 0, cw: 0, msgs: 0 };
    prev.cost += entryCost(e);
    prev.tokens += e.totalTokens;
    prev.in += e.inputTokens;
    prev.out += e.outputTokens;
    prev.cr += e.cacheReadTokens;
    prev.cw += e.cacheWriteTokens;
    prev.msgs += 1;
    agentMap.set(key, prev);
  }
  const totalAgentCost = Array.from(agentMap.values()).reduce((s, v) => s + v.cost, 0);
  const byAgent: AgentCostResult[] = Array.from(agentMap.entries())
    .map(([agent, v]) => ({
      agent,
      cost: v.cost,
      tokens: v.tokens,
      inputTokens: v.in,
      outputTokens: v.out,
      cacheRead: v.cr,
      cacheWrite: v.cw,
      percentOf总计: totalAgentCost > 0 ? (v.cost / totalAgentCost) * 100 : 0,
      messages: v.msgs,
    }))
    .sort((a, b) => b.cost - a.cost);

  // By model
  const modelMap = new Map<string, { cost: number; tokens: number; in: number; out: number; msgs: number }>();
  for (const e of filtered) {
    const name = getModelName(e.model);
    const prev = modelMap.get(name) || { cost: 0, tokens: 0, in: 0, out: 0, msgs: 0 };
    prev.cost += entryCost(e);
    prev.tokens += e.totalTokens;
    prev.in += e.inputTokens;
    prev.out += e.outputTokens;
    prev.msgs += 1;
    modelMap.set(name, prev);
  }
  const totalModelCost = Array.from(modelMap.values()).reduce((s, v) => s + v.cost, 0);
  const byModel: ModelCostResult[] = Array.from(modelMap.entries())
    .map(([model, v]) => ({
      model,
      cost: v.cost,
      tokens: v.tokens,
      inputTokens: v.in,
      outputTokens: v.out,
      percentOf总计: totalModelCost > 0 ? (v.cost / totalModelCost) * 100 : 0,
      messages: v.msgs,
    }))
    .sort((a, b) => b.cost - a.cost);

  // Daily trend
  const dailyMap = new Map<string, { cost: number; in: number; out: number }>();
  for (const e of filtered) {
    const prev = dailyMap.get(e.date) || { cost: 0, in: 0, out: 0 };
    prev.cost += entryCost(e);
    prev.in += e.inputTokens;
    prev.out += e.outputTokens;
    dailyMap.set(e.date, prev);
  }
  const daily: DayCost[] = Array.from(dailyMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, v]) => ({
      date: date.slice(5), // MM-DD
      cost: parseFloat(v.cost.toFixed(4)),
      input: v.in,
      output: v.out,
    }));

  // Token totals for today
  const todayTokens = todayEntries.reduce((s, e) => s + e.totalTokens, 0);
  const todayMsgs = todayEntries.length;

  return {
    today: todayCost,
    yesterday: yesterdayCost,
    thisMonth: thisMonthCost,
    lastMonth: lastMonthCost,
    projected,
    budget: 100,
    byAgent,
    byModel,
    daily,
    hourly: [],
    todayTokens,
    todayMessages: todayMsgs,
    totalTokens: filtered.reduce((s, e) => s + e.totalTokens, 0),
    totalMessages: filtered.length,
    liveEstimate: true,
    note: "Estimated cost — based on actual token usage from JSONL session files × published model pricing; does not account for subscription plans or vendor discounts.",
  };
}
