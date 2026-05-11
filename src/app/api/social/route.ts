import { NextResponse } from "next/server";
import { readFileSync, readdirSync } from "fs";
import { join } from "path";
import os from "os";

export const dynamic = "force-dynamic";

function safeReadFile(filePath: string): string {
  try {
    return readFileSync(filePath, "utf-8");
  } catch {
    return "";
  }
}

function getRecentMemory(workspacePath: string): string[] {
  const memoryDir = join(workspacePath, "memory");
  try {
    const files = readdirSync(memoryDir)
      .filter((f) => f.endsWith(".md"))
      .sort()
      .reverse()
      .slice(0, 3);
    return files.map((f) => {
      const content = safeReadFile(join(memoryDir, f));
      return `## ${f.replace(".md", "")}\n${content.slice(0, 500)}`;
    });
  } catch {
    return [];
  }
}

function getRecentReports(workspacePath: string): string[] {
  const reportsDir = join(workspacePath, "reports");
  try {
    const files = readdirSync(reportsDir)
      .filter((f) => f.endsWith(".md") || f.endsWith(".json"))
      .sort()
      .reverse()
      .slice(0, 3);
    return files.map((f) => {
      const content = safeReadFile(join(reportsDir, f));
      return `## ${f}\n${content.slice(0, 500)}`;
    });
  } catch {
    return [];
  }
}

export async function GET() {
  try {
    const home = os.homedir();
    const openclawDir = process.env.OPENCLAW_DIR || join(home, ".openclaw");
    const baiwanWorkspace = process.env.CONTENT_AGENT_WORKSPACE || join(openclawDir, "workspace-content");

    // 小红书内容计划
    let socialPlan = null;
    const planPaths = [
      join(baiwanWorkspace, "social-media-plan.json"),
      join(baiwanWorkspace, "reports", "social-media-plan.json"),
    ];
    for (const p of planPaths) {
      try {
        const content = safeReadFile(p);
        if (content) {
          socialPlan = JSON.parse(content);
          break;
        }
      } catch {}
    }

    // 百万 Agent (小红书) 数据
    const baiwanMemory = safeReadFile(join(baiwanWorkspace, "MEMORY.md"));
    const baiwanIdentity = safeReadFile(join(baiwanWorkspace, "IDENTITY.md"));
    const baiwanRecentMemory = getRecentMemory(baiwanWorkspace);
    const baiwanReports = getRecentReports(baiwanWorkspace);

    return NextResponse.json({
      plan: socialPlan,
      baiwan: {
        identity: baiwanIdentity,
        memory: baiwanMemory,
        recentMemory: baiwanRecentMemory,
        reports: baiwanReports,
      },
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error fetching social data:", error);
    return NextResponse.json(
      { error: "Failed to fetch social media data" },
      { status: 500 }
    );
  }
}
