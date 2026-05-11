import { NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import os from "os";

const execAsync = promisify(exec);

// Systemd services to check — override via SYSTEMD_WATCHED_SERVICES env var (comma-separated)
const SYSTEMD_SERVICES: string[] = process.env.SYSTEMD_WATCHED_SERVICES
  ? process.env.SYSTEMD_WATCHED_SERVICES.split(",").map((s) => s.trim()).filter(Boolean)
  : ["mission-control"];

export async function GET() {
  try {
    // CPU (load average as percentage)
    const loadAvg = os.loadavg()[0];
    const cpuCount = os.cpus().length;
    const cpu = Math.min(Math.round((loadAvg / cpuCount) * 100), 100);

    // RAM
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const ram = {
      used: parseFloat((usedMem / 1024 / 1024 / 1024).toFixed(2)),
      total: parseFloat((totalMem / 1024 / 1024 / 1024).toFixed(2)),
    };

    // Disk (cross-platform)
    let diskUsed = 0;
    let disk总计 = 100;
    try {
      const platform = process.platform;
      if (platform === "darwin") {
        const { stdout } = await execAsync("df -g / | tail -1");
        const parts = stdout.trim().split(/\s+/);
        disk总计 = parseFloat(parts[1]) || 100;
        diskUsed = parseFloat(parts[2]) || 0;
      } else if (platform === "win32") {
        const { stdout } = await execAsync("powershell -Command \"Get-CimInstance Win32_LogicalDisk -Filter 'DriveType=3' | Select-Object DeviceID,Size,FreeSpace | ConvertTo-Json\"");
        const json = JSON.parse(stdout.trim());
        const disks = Array.isArray(json) ? json : [json];
        const cDrive = disks.find((d: any) => d.DeviceID === "C:");
        if (cDrive) {
          const totalBytes = parseFloat(cDrive.Size);
          const freeBytes = parseFloat(cDrive.FreeSpace);
          if (totalBytes > 0) {
            disk总计 = parseFloat((totalBytes / 1024 / 1024 / 1024).toFixed(1));
            diskUsed = parseFloat(((totalBytes - freeBytes) / 1024 / 1024 / 1024).toFixed(1));
          }
        }
      } else {
        const { stdout } = await execAsync("df -BG / | tail -1");
        const parts = stdout.trim().split(/\s+/);
        disk总计 = parseInt(parts[1].replace("G", ""));
        diskUsed = parseInt(parts[2].replace("G", ""));
      }
    } catch (error) {
      console.error("Failed to get disk stats:", error);
    }

    // Systemd Services (only on Linux)
    let activeServices = 0;
    let totalServices = SYSTEMD_SERVICES.length;
    if (process.platform === "linux") {
      try {
        for (const name of SYSTEMD_SERVICES) {
          const { stdout } = await execAsync(`systemctl is-active ${name} 2>/dev/null || true`);
          if (stdout.trim() === "active") activeServices++;
        }
      } catch (error) {
        console.error("Failed to get systemd stats:", error);
      }
    } else {
      // On macOS, check if processes are running by name instead
      totalServices = 0;
      activeServices = 0;
    }

    // Tailscale VPN Status
    let vpn活跃 = false;
    try {
      const { stdout } = await execAsync("tailscale status 2>/dev/null || true");
      vpn活跃 = stdout.trim().length > 0 && !stdout.includes("Tailscale is stopped") && !stdout.includes("not running");
    } catch {
      vpn活跃 = false;
    }

    // Firewall Status
    let firewall活跃 = false;
    try {
      if (process.platform === "darwin") {
        const { stdout } = await execAsync("/usr/libexec/ApplicationFirewall/socketfilterfw --getglobalstate 2>/dev/null || true");
        firewall活跃 = stdout.includes("enabled");
      } else {
        const { stdout } = await execAsync("ufw status 2>/dev/null | head -1 || true");
        firewall活跃 = stdout.includes("active");
      }
    } catch {
      firewall活跃 = false;
    }

    // Uptime
    const uptimeSeconds = os.uptime();
    const days = Math.floor(uptimeSeconds / 86400);
    const hours = Math.floor((uptimeSeconds % 86400) / 3600);
    const uptime = `${days}d ${hours}h`;

    return NextResponse.json({
      cpu,
      ram,
      disk: { used: diskUsed, total: disk总计 },
      vpn活跃,
      firewall活跃,
      activeServices,
      totalServices,
      uptime,
    });
  } catch (error) {
    console.error("Error fetching system stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch system stats" },
      { status: 500 }
    );
  }
}
