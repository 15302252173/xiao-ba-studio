import { NextResponse } from "next/server";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { homedir } from "os";

export const dynamic = "force-dynamic";

interface AgentStatusEntry {
  id: string;
  status: "idle" | "working" | "thinking" | "sleeping" | "error";
  currentTask: string;
  lastActivity: string;
}

interface AgentStatusFile {
  agents: Record<string, AgentStatusEntry>;
}

const DEFAULT_AGENT_STATUS: AgentStatusEntry = {
  id: "",
  status: "idle",
  currentTask: "",
  lastActivity: "",
};

/**
 * GET /api/agents/status
 *
 * Reads the shared agent-status.json file from the state directory.
 * Falls back to idle defaults if the file doesn't exist or is invalid.
 */
export async function GET() {
  const openClawDir = process.env.OPENCLAW_DIR || join(homedir(), ".openclaw");
  const statePath = join(openClawDir, "workspace", "state", "agent-status.json");

  try {
    if (!existsSync(statePath)) {
      return NextResponse.json({ agents: {}, source: "fallback", timestamp: Date.now() });
    }

    const raw = readFileSync(statePath, "utf-8");
    const data: AgentStatusFile = JSON.parse(raw);

    // Fill in missing defaults for every agent entry
    const agents: Record<string, AgentStatusEntry> = {};
    if (data.agents && typeof data.agents === "object") {
      for (const [id, entry] of Object.entries(data.agents)) {
        agents[id] = {
          id: id,
          status: entry?.status || DEFAULT_AGENT_STATUS.status,
          currentTask: entry?.currentTask || DEFAULT_AGENT_STATUS.currentTask,
          lastActivity: entry?.lastActivity || DEFAULT_AGENT_STATUS.lastActivity,
        };
      }
    }

    return NextResponse.json({ agents, source: "file", timestamp: Date.now() });
  } catch (error) {
    console.error("[agents/status] Error reading status file:", error);
    return NextResponse.json({ agents: {}, source: "error", timestamp: Date.now() });
  }
}
