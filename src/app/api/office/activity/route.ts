import { NextResponse } from "next/server";
import { readdirSync, readFileSync, statSync } from "fs";
import { join } from "path";
import { homedir } from "os";

export const dynamic = "force-dynamic";

interface LiveActivityEvent {
  id: string;
  tool: string;
  toolIcon: string;
  agentId: string;
  agentName: string;
  agentEmoji: string;
  description?: string;
  timestamp: number;
}

const TOOL_ICONS: Record<string, string> = {
  exec: "⚡",
  read: "📖",
  write: "✍️",
  edit: "✏️",
  web_search: "🔍",
  web_fetch: "🌐",
  message: "💬",
  sessions_spawn: "🚀",
  sessions_yield: "⏸️",
  process: "🔄",
};

const AGENT_MAP: Record<string, { name: string; emoji: string }> = {
  main: { name: "小牛", emoji: "🐮" },
  designer: { name: "设计师", emoji: "🎨" },
  developer: { name: "程序员", emoji: "💻" },
  operator: { name: "高级运营", emoji: "📈" },
  manager: { name: "经理", emoji: "👔" },
};

function parseSessionJsonl(filePath: string, agentId: string): LiveActivityEvent[] {
  const events: LiveActivityEvent[] = [];
  try {
    const content = readFileSync(filePath, "utf-8");
    const lines = content.trim().split("\n");
    
    // Read last 200 lines max for performance
    const recentLines = lines.slice(-200);
    
    for (const line of recentLines) {
      try {
        const entry = JSON.parse(line);
        if (entry.type !== "message") continue;
        const msg = entry.message;
        if (!msg) continue;

        // Look for tool calls (assistant calling tools)
        if (msg.role === "assistant" && Array.isArray(msg.content)) {
          for (const block of msg.content) {
            if (block.type === "toolCall" || block.type === "tool_use") {
              const toolName = block.name || block.toolName || "unknown";
              const agentInfo = AGENT_MAP[agentId] || { name: agentId, emoji: "🤖" };
              events.push({
                id: `${entry.id}-${toolName}`,
                tool: toolName,
                toolIcon: TOOL_ICONS[toolName] || "🔧",
                agentId,
                agentName: agentInfo.name,
                agentEmoji: agentInfo.emoji,
                description: toolName,
                timestamp: new Date(entry.timestamp).getTime(),
              });
            }
          }
        }
      } catch {
        // skip malformed lines
      }
    }
  } catch {
    // file read error
  }
  return events;
}

export async function GET() {
  try {
    const openclawDir = process.env.OPENCLAW_DIR || join(homedir(), '.openclaw');
    const agentsDir = join(openclawDir, "agents");
    const allEvents: LiveActivityEvent[] = [];

    let agentDirs: string[] = [];
    try {
      agentDirs = readdirSync(agentsDir);
    } catch {
      return NextResponse.json({ events: [] });
    }

    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;

    for (const agentId of agentDirs) {
      const sessionsDir = join(agentsDir, agentId, "sessions");
      let sessionFiles: string[] = [];
      try {
        sessionFiles = readdirSync(sessionsDir).filter(f => f.endsWith(".jsonl"));
      } catch {
        continue;
      }

      // Only check recently modified session files (within 1 hour)
      const recentFiles = sessionFiles
        .map(f => {
          const fullPath = join(sessionsDir, f);
          try {
            const stat = statSync(fullPath);
            return { path: fullPath, mtime: stat.mtime.getTime() };
          } catch {
            return null;
          }
        })
        .filter((f): f is { path: string; mtime: number } => f !== null && f.mtime > oneHourAgo)
        .sort((a, b) => b.mtime - a.mtime)
        .slice(0, 3); // Max 3 most recent sessions per agent

      for (const file of recentFiles) {
        const events = parseSessionJsonl(file.path, agentId);
        allEvents.push(...events);
      }
    }

    // Sort by timestamp desc and return top 20
    allEvents.sort((a, b) => b.timestamp - a.timestamp);
    const top20 = allEvents.slice(0, 20);

    return NextResponse.json({ events: top20 });
  } catch (error) {
    console.error("Error fetching activity:", error);
    return NextResponse.json({ events: [] });
  }
}
