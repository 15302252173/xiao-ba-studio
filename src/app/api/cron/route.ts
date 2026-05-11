import { execFileSync } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";
import { NextRequest, NextResponse } from "next/server";

const OPENCLAW_DIR = process.env.OPENCLAW_DIR || path.join(os.homedir(), ".openclaw");
const CRON_JOBS_PATH = path.join(OPENCLAW_DIR, "cron", "jobs.json");
const CRON_JOBS_READ_ATTEMPTS = 4;
const CRON_JOBS_RETRY_DELAY_MS = 50;

type JsonRecord = Record<string, unknown>;

// User-defined keywords for categorizing/tagging cron jobs.
// Add domain-specific keywords here to highlight matching jobs in the UI.

function asRecord(value: unknown): JsonRecord | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : null;
}

function readString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function readNumber(value: unknown): number | null {
  return typeof value === "number" && !Number.isNaN(value) ? value : null;
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isErrnoException(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}

function extractCronJobs(data: JsonRecord): JsonRecord[] {
  const jobs = data.jobs;
  return Array.isArray(jobs) ? jobs.filter((job): job is JsonRecord => Boolean(asRecord(job))) : [];
}

function runCronCommand(commandVariants: string[][]): string {
  let lastError: unknown;

  for (const args of commandVariants) {
    try {
      return execFileSync("openclaw", ["cron", ...args], {
        timeout: 10000,
        encoding: "utf-8",
        stdio: ["pipe", "pipe", "pipe"],
      });
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Failed to execute cron command");
}

async function readCronJobsDataFromFile(): Promise<JsonRecord> {
  let lastError: unknown;

  for (let attempt = 0; attempt < CRON_JOBS_READ_ATTEMPTS; attempt += 1) {
    try {
      const content = await fs.promises.readFile(CRON_JOBS_PATH, "utf-8");
      return JSON.parse(content) as JsonRecord;
    } catch (error) {
      lastError = error;

      const retryableSyntaxError = error instanceof SyntaxError;
      const retryableFsError = isErrnoException(error) && (error.code === "ENOENT" || error.code === "EBUSY");

      if ((retryableSyntaxError || retryableFsError) && attempt < CRON_JOBS_READ_ATTEMPTS - 1) {
        await delay(CRON_JOBS_RETRY_DELAY_MS * (attempt + 1));
        continue;
      }

      throw error;
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Failed to read cron jobs");
}

async function readCronJobs(): Promise<JsonRecord[]> {
  try {
    const output = runCronCommand([
      ["list", "--json", "--all"],
      ["list", "--json"],
    ]);
    const data = JSON.parse(output) as JsonRecord;
    return extractCronJobs(data);
  } catch {
    try {
      const data = await readCronJobsDataFromFile();
      return extractCronJobs(data);
    } catch {
      return [];
    }
  }
}

function isSafeJobId(str: string): boolean {
  return /^[A-Za-z0-9._:-]+$/.test(str);
}

function getPayloadText(job: JsonRecord): string {
  const payload = asRecord(job.payload);
  if (!payload) return "";

  if (payload.kind === "agentTurn") {
    return readString(payload.message) || "";
  }

  if (payload.kind === "systemEvent") {
    return readString(payload.text) || "";
  }

  return "";
}

function summarizeText(text: string): string {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) return "";
  return normalized.length > 140 ? `${normalized.slice(0, 137)}...` : normalized;
}

function formatDescription(job: JsonRecord, payloadText: string): string {
  if (payloadText) {
    return summarizeText(payloadText);
  }

  const description = readString(job.description);
  return description ? summarizeText(description) : "";
}

function formatSchedule(schedule: JsonRecord | null): string {
  if (!schedule) return "Unknown";

  switch (schedule.kind) {
    case "cron":
      return `${readString(schedule.expr) || "Unknown"}${readString(schedule.tz) ? ` (${readString(schedule.tz)})` : ""}`;
    case "every": {
      const everyMs = readNumber(schedule.everyMs);
      if (!everyMs) return "Every ?";
      if (everyMs >= 3600000) return `Every ${everyMs / 3600000}h`;
      if (everyMs >= 60000) return `Every ${everyMs / 60000}m`;
      return `Every ${everyMs / 1000}s`;
    }
    case "at":
      return `Once at ${readString(schedule.at) || "Unknown"}`;
    default:
      return JSON.stringify(schedule);
  }
}

function getRecurrenceMeta(schedule: JsonRecord | null): {
  kind: "once" | "recurring" | "interval" | "unknown";
  label: string;
} {
  switch (schedule?.kind) {
    case "at":
      return { kind: "once", label: "One-time" };
    case "cron":
      return { kind: "recurring", label: "Recurring" };
    case "every":
      return { kind: "interval", label: "Interval" };
    default:
      return { kind: "unknown", label: "Unknown" };
  }
}

function getSessionTargetMeta(target: unknown): { label: string; description: string } {
  switch (target) {
    case "isolated":
      return {
        label: "Isolated session",
        description: "Runs in a separate session without interrupting the current conversation.",
      };
    case "current":
      return {
        label: "Current session",
        description: "Runs directly within the current session.",
      };
    case "shared":
      return {
        label: "Shared session",
        description: "Multiple tasks may share the same session.",
      };
    default:
      return {
        label: readString(target) || "Unspecified",
        description: "No additional details.",
      };
  }
}

function formatDeliverySummary(deliveryValue: unknown): string {
  const delivery = asRecord(deliveryValue);
  if (!delivery) return "Default delivery";

  const parts: string[] = [];
  const mode = readString(delivery.mode);
  const channel = readString(delivery.channel);
  const to = readString(delivery.to);

  if (mode) parts.push(mode);
  if (channel) parts.push(channel === "discord" ? "Discord" : channel);
  if (to) {
    parts.push(to.startsWith("channel:") ? `Channel ${to.replace("channel:", "")}` : to);
  }

  return parts.length > 0 ? parts.join(" · ") : "Default delivery";
}

function hasIssue(state: JsonRecord | null): boolean {
  if (!state) return false;
  const lastRunStatus = readString(state.lastRunStatus);
  const lastError = readString(state.lastError);
  const consecutiveErrors = readNumber(state.consecutiveErrors) || 0;
  return lastRunStatus === "error" || consecutiveErrors > 0 || Boolean(lastError?.trim());
}

async function readCronUpdateRequest(
  request: NextRequest
): Promise<{ id: string; enabled?: boolean; prompt?: string } | Response> {
  const fallbackId = request.nextUrl.searchParams.get("id")?.trim() || "";
  const rawBody = await request.text();

  if (!rawBody.trim()) {
    return { id: fallbackId };
  }

  try {
    const body = JSON.parse(rawBody) as unknown;

    if (typeof body === "string") {
      return { id: fallbackId, prompt: body };
    }

    const record = asRecord(body);
    if (!record) {
      return NextResponse.json(
        { error: "Request body must be a JSON object or a prompt string" },
        { status: 400 }
      );
    }

    return {
      id: typeof record.id === "string" ? record.id : fallbackId,
      enabled: typeof record.enabled === "boolean" ? record.enabled : undefined,
      prompt: typeof record.prompt === "string" ? record.prompt : undefined,
    };
  } catch {
    if (fallbackId) {
      return { id: fallbackId, prompt: rawBody };
    }

    return NextResponse.json(
      {
        error: "Request body must be valid JSON, or provide ?id=... when sending raw prompt text",
      },
      { status: 400 }
    );
  }
}

export async function GET() {
  try {
    const rawJobs = await readCronJobs();

    const jobs = rawJobs.map((job) => {
      const schedule = asRecord(job.schedule);
      const state = asRecord(job.state);
      const payloadText = getPayloadText(job);
      const recurrence = getRecurrenceMeta(schedule);
      const sessionTarget = getSessionTargetMeta(job.sessionTarget);
      const nextRunAtMs = readNumber(state?.nextRunAtMs);
      const lastRunAtMs = readNumber(state?.lastRunAtMs);

      return {
        id: readString(job.id) || "unknown",
        agentId: readString(job.agentId) || "main",
        name: readString(job.name) || "Unnamed",
        enabled: job.enabled ?? true,
        createdAtMs: readNumber(job.createdAtMs),
        updatedAtMs: readNumber(job.updatedAtMs),
        schedule: job.schedule,
        scheduleKind: readString(schedule?.kind),
        scheduleDisplay: formatSchedule(schedule),
        recurrenceKind: recurrence.kind,
        recurrenceLabel: recurrence.label,
        sessionTarget: readString(job.sessionTarget) || undefined,
        sessionTargetLabel: sessionTarget.label,
        sessionTargetDescription: sessionTarget.description,
        payload: asRecord(job.payload) || undefined,
        detailsText: payloadText,
        description: formatDescription(job, payloadText),
        delivery: asRecord(job.delivery) || undefined,
        deliverySummary: formatDeliverySummary(job.delivery),
        state: state || undefined,
        timezone: readString(schedule?.tz) || "UTC",
        nextRunAtMs,
        nextRun: nextRunAtMs ? new Date(nextRunAtMs).toISOString() : null,
        lastRunAtMs,
        lastRun: lastRunAtMs ? new Date(lastRunAtMs).toISOString() : null,
        lastRunStatus: readString(state?.lastRunStatus),
        lastDurationMs: readNumber(state?.lastDurationMs),
        lastError: readString(state?.lastError),
        lastDeliveryStatus: readString(state?.lastDeliveryStatus),
        consecutiveErrors: readNumber(state?.consecutiveErrors) || 0,
        hasIssue: hasIssue(state),
      };
    });

    return NextResponse.json(jobs);
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error("Error fetching cron jobs:", errMsg);
    return NextResponse.json(
      {
        error: "Failed to fetch cron jobs",
        details: errMsg,
      },
      { status: 503 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const updateRequest = await readCronUpdateRequest(request);
    if (updateRequest instanceof Response) {
      return updateRequest;
    }

    const { id, enabled, prompt } = updateRequest;

    if (!id || !isSafeJobId(id)) {
      return NextResponse.json({ error: "Valid job ID is required" }, { status: 400 });
    }

    if (typeof enabled !== "boolean" && typeof prompt !== "string") {
      return NextResponse.json({ error: "已启用 flag or prompt is required" }, { status: 400 });
    }

    if (typeof prompt === "string") {
      const trimmedPrompt = prompt.trim();
      if (!trimmedPrompt) {
        return NextResponse.json({ error: "Prompt cannot be empty" }, { status: 400 });
      }

      try {
        runCronCommand([
          ["edit", id, "--message", trimmedPrompt, "--json"],
          ["edit", id, "--message", trimmedPrompt],
        ]);
        return NextResponse.json({ success: true, id, prompt: trimmedPrompt });
      } catch (commandErr) {
        throw new Error(`Failed to update prompt via OpenClaw CLI: ${commandErr}`);
      }
    }

    const action = enabled ? "enable" : "disable";
    try {
      runCronCommand([
        [action, id, "--json"],
        ["update", id, `--enabled=${enabled}`, "--json"],
        ["update", id, `--enabled=${enabled}`],
      ]);
    } catch (commandErr) {
      throw new Error(`Failed to update job via OpenClaw CLI: ${commandErr}`);
    }

    return NextResponse.json({ success: true, id, enabled });
  } catch (error) {
    console.error("Error updating cron job:", error);
    return NextResponse.json({ error: "Failed to update cron job" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id") || "";

    if (!id || !isSafeJobId(id)) {
      return NextResponse.json({ error: "Valid job ID is required" }, { status: 400 });
    }

    try {
      runCronCommand([
        ["remove", id, "--json"],
        ["remove", id],
      ]);
    } catch (commandErr) {
      throw new Error(`Failed to delete job via OpenClaw CLI: ${commandErr}`);
    }

    return NextResponse.json({ success: true, deleted: id });
  } catch (error) {
    console.error("Error deleting cron job:", error);
    return NextResponse.json({ error: "Failed to delete cron job" }, { status: 500 });
  }
}
