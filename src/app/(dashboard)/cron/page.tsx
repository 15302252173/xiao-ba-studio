"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  AlertCircle,
  ArrowDownWideNarrow,
  Bug,
  CalendarDays,
  Clock,
  List,
  RefreshCw,
  Zap,
} from "lucide-react";
import { CronJobCard, type CronJob } from "@/components/CronJobCard";
import { CronWeeklyTimeline } from "@/components/CronWeeklyTimeline";

type ViewMode = "list" | "timeline";
type SortMode = "updated-desc" | "next-run-asc" | "last-run-desc";

const SORT_LABELS: Record<SortMode, string> = {
  "updated-desc": "最新更新优先",
  "next-run-asc": "最早执行优先",
  "last-run-desc": "最近执行优先",
};

function getSortableNumber(value?: number | null): number | null {
  return typeof value === "number" && !Number.isNaN(value) ? value : null;
}

function sortJobs(jobs: CronJob[], sortMode: SortMode): CronJob[] {
  return [...jobs].sort((left, right) => {
    if (sortMode === "next-run-asc") {
      const leftNextRun = getSortableNumber(left.nextRunAtMs);
      const rightNextRun = getSortableNumber(right.nextRunAtMs);

      if (leftNextRun === null && rightNextRun === null) {
        return (right.updatedAtMs ?? 0) - (left.updatedAtMs ?? 0);
      }
      if (leftNextRun === null) return 1;
      if (rightNextRun === null) return -1;
      return leftNextRun - rightNextRun;
    }

    if (sortMode === "last-run-desc") {
      const leftLastRun = getSortableNumber(left.lastRunAtMs);
      const rightLastRun = getSortableNumber(right.lastRunAtMs);

      if (leftLastRun === null && rightLastRun === null) {
        return (right.updatedAtMs ?? 0) - (left.updatedAtMs ?? 0);
      }
      if (leftLastRun === null) return 1;
      if (rightLastRun === null) return -1;
      return rightLastRun - leftLastRun;
    }

    const leftUpdated = getSortableNumber(left.updatedAtMs) ?? left.createdAtMs ?? 0;
    const rightUpdated = getSortableNumber(right.updatedAtMs) ?? right.createdAtMs ?? 0;
    return rightUpdated - leftUpdated;
  });
}

function summarizePrompt(prompt: string): string {
  const normalized = prompt.replace(/\s+/g, " ").trim();
  if (normalized.length <= 140) {
    return normalized;
  }
  return `${normalized.slice(0, 137)}...`;
}

function StatCard({
  icon,
  value,
  label,
  tone,
}: {
  icon: ReactNode;
  value: number;
  label: string;
  tone: "info" | "success" | "accent" | "error";
}) {
  const toneStyles =
    tone === "success"
      ? { background: "color-mix(in srgb, var(--success) 20%, transparent)", color: "var(--success)" }
      : tone === "accent"
        ? { background: "color-mix(in srgb, var(--accent) 18%, transparent)", color: "var(--accent)" }
        : tone === "error"
          ? { background: "color-mix(in srgb, var(--error) 16%, transparent)", color: "var(--error)" }
          : { background: "color-mix(in srgb, var(--info) 20%, transparent)", color: "var(--info)" };

  return (
    <div
      style={{
        backgroundColor: "color-mix(in srgb, var(--card) 50%, transparent)",
        border: "1px solid var(--border)",
        borderRadius: "0.85rem",
        padding: "1rem",
        display: "flex",
        alignItems: "center",
        gap: "0.95rem",
      }}
    >
      <div
        style={{
          width: "3rem",
          height: "3rem",
          borderRadius: "0.8rem",
          backgroundColor: toneStyles.background,
          color: toneStyles.color,
          display: "grid",
          placeItems: "center",
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div>
        <p style={{ fontSize: "1.55rem", fontWeight: 800, color: "var(--text-primary)", lineHeight: 1.1 }}>{value}</p>
        <p style={{ fontSize: "0.88rem", color: "var(--text-secondary)", marginTop: "0.2rem" }}>{label}</p>
      </div>
    </div>
  );
}

export default function CronJobsPage() {
  const [jobs, setJobs] = useState<CronJob[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [sortMode, setSortMode] = useState<SortMode>("updated-desc");
  const [runToast, setRunToast] = useState<{ id: string; status: "success" | "error"; name: string; skipped?: boolean } | null>(null);

  const fetchJobs = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch("/api/cron");
      if (!res.ok) {
        const errData = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(errData.error || "Failed to fetch scheduled tasks");
      }
      const data = (await res.json()) as CronJob[];
      setJobs(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchJobs();
  }, [fetchJobs]);

  const handleToggle = async (id: string, enabled: boolean) => {
    try {
      const res = await fetch("/api/cron", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, enabled }),
      });
      if (!res.ok) throw new Error("Failed to update job");
      setJobs((prev) =>
        prev.map((job) =>
          job.id === id ? { ...job, enabled, updatedAtMs: Date.now() } : job
        )
      );
    } catch (err) {
      console.error("Toggle error:", err);
      setError("Failed to update job status");
    }
  };

  const handleDelete = async (id: string) => {
    if (deleteConfirm !== id) {
      setDeleteConfirm(id);
      return;
    }

    try {
      const res = await fetch(`/api/cron?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete job");
      setJobs((prev) => prev.filter((job) => job.id !== id));
      setDeleteConfirm(null);
    } catch (err) {
      console.error("Delete error:", err);
      setError("Failed to delete job");
    }
  };

  const handleRun = async (id: string) => {
    const job = jobs.find((item) => item.id === id);

    try {
      const res = await fetch("/api/cron/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, name: job?.name }),
      });

      const data = (await res.json()) as { success?: boolean; error?: string; skipped?: boolean };

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Trigger failed");
      }

      setRunToast({ id, status: "success", name: job?.name || id, skipped: !!data.skipped });
      window.setTimeout(() => setRunToast(null), data.skipped ? 6000 : 4000);
      window.setTimeout(() => {
        void fetchJobs();
      }, 1200);
    } catch (err) {
      console.error("Run error:", err);
      setRunToast({ id, status: "error", name: job?.name || id });
      setError(err instanceof Error ? err.message : "Failed to trigger job");
      window.setTimeout(() => setRunToast(null), 4000);
    }
  };

  const handleSavePrompt = async (id: string, prompt: string) => {
    try {
      const res = await fetch(`/api/cron?id=${encodeURIComponent(id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, prompt }),
      });

      const raw = await res.text();
      let data: { error?: string } = {};

      if (raw) {
        try {
          data = JSON.parse(raw) as { error?: string };
        } catch (parseErr) {
          console.error("Save prompt invalid JSON response:", {
            status: res.status,
            body: raw,
            error: parseErr,
          });
          throw new Error("Save failed: server returned an invalid response");
        }
      }

      if (!res.ok) {
        throw new Error(data.error || "Failed to update prompt");
      }

      setJobs((prev) =>
        prev.map((job) =>
          job.id === id
            ? {
                ...job,
                detailsText: prompt,
                description: summarizePrompt(prompt),
                updatedAtMs: Date.now(),
              }
            : job
        )
      );
    } catch (err) {
      console.error("Save prompt error:", err);
      setError(err instanceof Error ? err.message : "Failed to update prompt");
      throw err;
    }
  };

  const activeJobs = jobs.filter((job) => job.enabled).length;
  const issueJobs = jobs.filter((job) => job.hasIssue).length;
  const sortedJobs = useMemo(() => sortJobs(jobs, sortMode), [jobs, sortMode]);

  return (
    <div className="p-4 md:p-8">
      <div className="flex flex-col gap-4 mb-4 md:mb-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1
              className="text-2xl md:text-3xl font-bold mb-1"
              style={{
                color: "var(--text-primary)",
                fontFamily: "var(--font-heading)",
              }}
            >
              定时任务
            </h1>
            <p className="text-sm md:text-base" style={{ color: "var(--text-secondary)" }}>
              查看定时任务、下次运行时间、最近执行结果和问题一览。
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div
              style={{
                display: "flex",
                backgroundColor: "var(--card)",
                border: "1px solid var(--border)",
                borderRadius: "0.65rem",
                padding: "3px",
              }}
            >
              <button
                onClick={() => setViewMode("list")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.35rem",
                  padding: "0.45rem 0.85rem",
                  borderRadius: "0.45rem",
                  fontSize: "0.82rem",
                  fontWeight: 700,
                  backgroundColor: viewMode === "list" ? "var(--accent)" : "transparent",
                  color: viewMode === "list" ? "white" : "var(--text-secondary)",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                <List className="w-3.5 h-3.5" />
                List
              </button>
              <button
                onClick={() => setViewMode("timeline")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.35rem",
                  padding: "0.45rem 0.85rem",
                  borderRadius: "0.45rem",
                  fontSize: "0.82rem",
                  fontWeight: 700,
                  backgroundColor: viewMode === "timeline" ? "var(--accent)" : "transparent",
                  color: viewMode === "timeline" ? "white" : "var(--text-secondary)",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                <CalendarDays className="w-3.5 h-3.5" />
                Timeline
              </button>
            </div>

            {viewMode === "list" && (
              <label
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.55rem",
                  padding: "0.55rem 0.8rem",
                  borderRadius: "0.65rem",
                  backgroundColor: "var(--card)",
                  border: "1px solid var(--border)",
                  color: "var(--text-primary)",
                  fontSize: "0.84rem",
                  fontWeight: 700,
                }}
              >
                <ArrowDownWideNarrow className="w-4 h-4" />
                Sort
                <select
                  value={sortMode}
                  onChange={(event) => setSortMode(event.target.value as SortMode)}
                  style={{
                    backgroundColor: "transparent",
                    color: "var(--text-primary)",
                    border: "none",
                    outline: "none",
                    fontSize: "0.84rem",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  {Object.entries(SORT_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <button
              onClick={() => {
                setIsLoading(true);
                void fetchJobs();
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.55rem 0.95rem",
                backgroundColor: "var(--card)",
                color: "var(--text-primary)",
                borderRadius: "0.65rem",
                border: "1px solid var(--border)",
                cursor: "pointer",
                fontWeight: 700,
              }}
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "0.65rem",
            color: "var(--text-secondary)",
            fontSize: "0.84rem",
          }}
        >
          <span
            style={{
              padding: "0.35rem 0.65rem",
              borderRadius: "9999px",
              backgroundColor: "var(--card-elevated)",
              border: "1px solid var(--border)",
            }}
          >
            Sorted by "{SORT_LABELS[sortMode]}"
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 md:gap-4 mb-4 md:mb-8">
        <StatCard icon={<Clock className="w-6 h-6" />} value={jobs.length} label="总计 Tasks" tone="info" />
        <StatCard icon={<RefreshCw className="w-6 h-6" />} value={activeJobs} label="已启用" tone="success" />
        <StatCard icon={<Bug className="w-6 h-6" />} value={issueJobs} label="Recent Issues" tone="error" />
      </div>

      {issueJobs > 0 && (
        <div
          style={{
            marginBottom: "1rem",
            padding: "0.95rem 1rem",
            borderRadius: "0.85rem",
            backgroundColor: "color-mix(in srgb, var(--error) 10%, transparent)",
            border: "1px solid color-mix(in srgb, var(--error) 28%, transparent)",
            display: "flex",
            alignItems: "center",
            gap: "0.7rem",
            color: "var(--text-primary)",
          }}
        >
          <Bug className="w-4 h-4" style={{ color: "var(--error)" }} />
          <span>
            Currently <strong>{issueJobs}</strong> tasks have recent failures. Red bug indicators are shown in the list.
          </span>
        </div>
      )}

      {error && (
        <div
          style={{
            marginBottom: "1.5rem",
            padding: "1rem",
            backgroundColor: "color-mix(in srgb, var(--error) 10%, transparent)",
            border: "1px solid color-mix(in srgb, var(--error) 30%, transparent)",
            borderRadius: "0.75rem",
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
          }}
        >
          <AlertCircle className="w-5 h-5" style={{ color: "var(--error)" }} />
          <span style={{ color: "var(--error)" }}>{error}</span>
          <button
            onClick={() => setError(null)}
            style={{ marginLeft: "auto", color: "var(--error)", background: "none", border: "none", cursor: "pointer" }}
          >
            关闭
          </button>
        </div>
      )}

      {isLoading ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "3rem 0" }}>
          <div
            style={{
              width: "2rem",
              height: "2rem",
              border: "2px solid var(--accent)",
              borderTopColor: "transparent",
              borderRadius: "50%",
              animation: "spin 1s linear infinite",
            }}
          />
        </div>
      ) : jobs.length === 0 ? (
        <div style={{ textAlign: "center", padding: "4rem 0" }}>
          <Clock className="w-8 h-8 mx-auto mb-4" style={{ color: "var(--text-muted)" }} />
          <h3 style={{ fontSize: "1.125rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: "0.5rem" }}>
            No 定时任务
          </h3>
          <p style={{ color: "var(--text-secondary)" }}>Tasks will appear here once created via the OpenClaw CLI.</p>
        </div>
      ) : viewMode === "timeline" ? (
        <div
          className="rounded-xl overflow-hidden"
          style={{
            backgroundColor: "var(--card)",
            border: "1px solid var(--border)",
            padding: "1.25rem",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              marginBottom: "1.25rem",
              paddingBottom: "1rem",
              borderBottom: "1px solid var(--border)",
            }}
          >
            <CalendarDays className="w-5 h-5" style={{ color: "var(--accent)" }} />
            <h2
              style={{
                fontSize: "1rem",
                fontWeight: 800,
                color: "var(--text-primary)",
                fontFamily: "var(--font-heading)",
              }}
            >
              Next 7 Days Timeline
            </h2>
            <span
              style={{
                marginLeft: "auto",
                fontSize: "0.75rem",
                color: "var(--text-muted)",
                backgroundColor: "var(--card-elevated)",
                padding: "0.25rem 0.6rem",
                borderRadius: "0.35rem",
              }}
            >
              All times shown in local timezone
            </span>
          </div>
          <CronWeeklyTimeline jobs={jobs} />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {sortedJobs.map((job) => (
            <div key={job.id} style={{ position: "relative" }}>
              <CronJobCard
                job={job}
                onToggle={handleToggle}
                onSavePrompt={handleSavePrompt}
                onDelete={handleDelete}
                onRun={handleRun}
              />

              {deleteConfirm === job.id && (
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    backgroundColor: "rgba(12, 12, 12, 0.92)",
                    borderRadius: "1rem",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    backdropFilter: "blur(4px)",
                    zIndex: 10,
                  }}
                >
                  <div style={{ textAlign: "center", padding: "1rem" }}>
                    <p style={{ color: "var(--text-primary)", marginBottom: "1rem" }}>
                      Delete "{job.name}"?
                    </p>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.75rem" }}>
                      <button
                        onClick={() => setDeleteConfirm(null)}
                        style={{
                          padding: "0.55rem 1rem",
                          color: "var(--text-secondary)",
                          background: "none",
                          border: "1px solid var(--border)",
                          borderRadius: "0.65rem",
                          cursor: "pointer",
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => void handleDelete(job.id)}
                        style={{
                          padding: "0.55rem 1rem",
                          backgroundColor: "var(--error)",
                          color: "white",
                          border: "none",
                          borderRadius: "0.65rem",
                          cursor: "pointer",
                          fontWeight: 700,
                        }}
                      >
                        Confirm Delete
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {runToast && (
        <div
          style={{
            position: "fixed",
            bottom: "2.5rem",
            right: "1.5rem",
            zIndex: 100,
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            padding: "0.875rem 1.25rem",
            borderRadius: "0.75rem",
            backdropFilter: "blur(12px)",
            backgroundColor:
              runToast.status === "success"
                ? "color-mix(in srgb, var(--success) 15%, rgba(12,12,12,0.95))"
                : "color-mix(in srgb, var(--error) 15%, rgba(12,12,12,0.95))",
            border: `1px solid ${
              runToast.status === "success"
                ? "color-mix(in srgb, var(--success) 40%, transparent)"
                : "color-mix(in srgb, var(--error) 40%, transparent)"
            }`,
            boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
            color: "var(--text-primary)",
            fontSize: "0.875rem",
            fontWeight: 600,
            animation: "slideInRight 0.3s ease",
          }}
        >
          <Zap
            className="w-4 h-4"
            style={{ color: runToast.status === "success" ? "var(--success)" : "var(--error)" }}
          />
          {runToast.status === "success"
            ? runToast.skipped
              ? `✓ "${runToast.name}" 已触发，今日已排期的运行已跳过`
              : `✓ "${runToast.name}" 已触发`
            : `✗ "${runToast.name}" 触发失败`}
        </div>
      )}

      <style jsx global>{`
        @keyframes slideInRight {
          from {
            transform: translateX(2rem);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
