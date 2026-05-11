import { NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import os from "os";

const execAsync = promisify(exec);
const isMac = process.platform === "darwin";

export async function GET() {
  try {
    // ── CPU ──────────────────────────────────────────────────────────────────
    const cpuCount = os.cpus().length;
    const loadAvg = os.loadavg();
    const cpuUsage = Math.min(Math.round((loadAvg[0] / cpuCount) * 100), 100);

    // ── RAM ──────────────────────────────────────────────────────────────────
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;

    // ── Disk ─────────────────────────────────────────────────────────────────
    let disk总计 = 0;
    let diskUsed = 0;
    let diskFree = 0;
    try {
      const dfCmd = isMac ? "df -g / | tail -1" : "df -BG / | tail -1";
      const { stdout } = await execAsync(dfCmd);
      const parts = stdout.trim().split(/\s+/);
      disk总计 = parseInt(parts[1].replace("G", ""));
      diskUsed = parseInt(parts[2].replace("G", ""));
      diskFree = parseInt(parts[3].replace("G", ""));
    } catch {
      // disk stats unavailable
    }
    const diskPercent = disk总计 > 0 ? (diskUsed / disk总计) * 100 : 0;

    return NextResponse.json({
      cpu: {
        usage: cpuUsage,
        cores: os.cpus().map((c) => Math.round(c.times ? ((c.times.user + c.times.sys) / (c.times.user + c.times.sys + c.times.idle)) * 100 : 0)),
        loadAvg,
      },
      ram: {
        total: parseFloat((totalMem / 1024 / 1024 / 1024).toFixed(2)),
        used: parseFloat((usedMem / 1024 / 1024 / 1024).toFixed(2)),
        free: parseFloat((freeMem / 1024 / 1024 / 1024).toFixed(2)),
      },
      disk: {
        total: disk总计,
        used: diskUsed,
        free: diskFree,
        percent: Math.round(diskPercent),
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error fetching system monitor data:", error);
    return NextResponse.json(
      { error: "Failed to fetch system monitor data" },
      { status: 500 }
    );
  }
}
