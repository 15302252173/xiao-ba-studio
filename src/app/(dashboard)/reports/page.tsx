"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  FileBarChart,
  FileText,
  RefreshCw,
  Clock,
  HardDrive,
  Calendar,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  FileDigit,
  Send,
  Loader2,
} from "lucide-react";
import { MarkdownPreview } from "@/components/MarkdownPreview";

// ── Types ──

interface DailyReportResponse {
  date: string;
  content: string | null;
  exists: boolean;
  hasMemory?: boolean;
  message?: string;
  generated?: boolean;
}

interface AnalysisReport {
  name: string;
  path: string;
  title: string;
  type: string;
  size: number;
  modified: string;
}

// ── Helpers ──

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("zh-CN", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function yesterdayStr(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatDateCN(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("zh-CN", {
    month: "long",
    day: "numeric",
    weekday: "short",
  });
}

/** Get array of dates for the last N days */
function getLastNDays(n: number): string[] {
  const dates: string[] = [];
  const today = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    dates.push(`${y}-${m}-${day}`);
  }
  return dates;
}

// ── Component ──

type TabId = "daily" | "analysis";

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<TabId>("daily");

  // Daily report state
  const [selectedDate, setSelectedDate] = useState<string>(todayStr());
  const [dailyContent, setDailyContent] = useState<string>("");
  const [dailyExists, setDailyExists] = useState(false);
  const [dailyHasMemory, setDailyHasMemory] = useState(false);
  const [dailyMessage, setDailyMessage] = useState("");
  const [isLoadingDaily, setIsLoadingDaily] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [availableDates, setAvailableDates] = useState<Set<string>>(new Set());

  // Stats
  const last7Days = getLastNDays(7);
  const last7Count = last7Days.filter((d) => availableDates.has(d)).length;
  const currentMonthPrefix = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;
  const monthCount = Array.from(availableDates).filter((d) => d.startsWith(currentMonthPrefix)).length;

  // Analysis report state
  const [analysisReports, setAnalysisReports] = useState<AnalysisReport[]>([]);
  const [selectedReportPath, setSelectedReportPath] = useState<string | null>(null);
  const [analysisContent, setAnalysisContent] = useState("");
  const [isLoadingAnalysis, setIsLoadingAnalysis] = useState(true);
  const [isLoadingAnalysisContent, setIsLoadingAnalysisContent] = useState(false);

  // ─── 报告需求输入 ───
  const [requestMessage, setRequestMessage] = useState("");
  const [isSendingRequest, setIsSendingRequest] = useState(false);
  const [requestSent, setRequestSent] = useState(false);

  const handleSendRequest = async () => {
    if (!requestMessage.trim() || isSendingRequest) return;
    setIsSendingRequest(true);
    try {
      const res = await fetch("/api/reports/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: requestMessage.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setRequestSent(true);
        setRequestMessage("");
        setTimeout(() => setRequestSent(false), 4000);
      }
    } catch { /* silent */ }
    setIsSendingRequest(false);
  };

  // ── Daily Report Functions ──

  const loadDailyReport = useCallback(async (date: string) => {
    setIsLoadingDaily(true);
    try {
      const res = await fetch(`/api/reports/daily?date=${date}`);
      const data: DailyReportResponse = await res.json();
      if (data.exists && data.content) {
        setDailyContent(data.content);
        setDailyExists(true);
        setDailyHasMemory(false);
        setDailyMessage("");
      } else {
        setDailyContent(data.message || "该日期暂无日报。");
        setDailyExists(false);
        setDailyHasMemory(data.hasMemory || false);
        setDailyMessage(data.message || "");
      }
    } catch (err) {
      console.error(err);
      setDailyContent("# 错误\n\n无法加载日报内容。");
      setDailyExists(false);
      setDailyHasMemory(false);
    } finally {
      setIsLoadingDaily(false);
    }
  }, []);

  const generateReport = useCallback(async (date: string) => {
    setIsGenerating(true);
    try {
      const res = await fetch("/api/reports/daily", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date }),
      });
      const data: DailyReportResponse = await res.json();
      if (data.content) {
        setDailyContent(data.content);
        setDailyExists(true);
        setDailyHasMemory(false);
        setDailyMessage("");
        setAvailableDates((prev) => new Set(prev).add(data.date));
      }
    } catch (err) {
      console.error(err);
      setDailyContent("# 错误\n\n生成日报失败。");
    } finally {
      setIsGenerating(false);
    }
  }, []);

  const generateTodayReport = useCallback(() => generateReport(todayStr()), [generateReport]);
  const generateYesterdayReport = useCallback(() => generateReport(yesterdayStr()), [generateReport]);

  const handleDateClick = useCallback(
    (date: string) => {
      setSelectedDate(date);
      loadDailyReport(date);
    },
    [loadDailyReport]
  );

  // Scan available dates on mount
  useEffect(() => {
    const scanDates = async () => {
      const dates = getLastNDays(30);
      const available = new Set<string>();

      const results = await Promise.all(
        dates.map(async (date) => {
          try {
            const res = await fetch(`/api/reports/daily?date=${date}`);
            const data: DailyReportResponse = await res.json();
            return { date, exists: data.exists };
          } catch {
            return { date, exists: false };
          }
        })
      );

      for (const r of results) {
        if (r.exists) available.add(r.date);
      }
      setAvailableDates(available);
    };
    scanDates();
  }, []);

  // Load today's report on mount
  useEffect(() => {
    loadDailyReport(todayStr());
  }, [loadDailyReport]);

  // ── Analysis Report Functions ──

  const loadAnalysisReports = useCallback(async () => {
    try {
      setIsLoadingAnalysis(true);
      const res = await fetch("/api/reports");
      if (!res.ok) throw new Error("Failed to load reports");
      const data = await res.json();
      setAnalysisReports(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingAnalysis(false);
    }
  }, []);

  const loadAnalysisContent = useCallback(async (reportPath: string) => {
    try {
      setIsLoadingAnalysisContent(true);
      const res = await fetch(`/api/reports?path=${encodeURIComponent(reportPath)}`);
      if (!res.ok) throw new Error("Failed to load report");
      const data = await res.json();
      setAnalysisContent(data.content);
    } catch (err) {
      console.error(err);
      setAnalysisContent("# 错误\n\n无法加载报告内容。");
    } finally {
      setIsLoadingAnalysisContent(false);
    }
  }, []);

  const handleAnalysisSelect = useCallback(
    (report: AnalysisReport) => {
      setSelectedReportPath(report.path);
      loadAnalysisContent(report.path);
    },
    [loadAnalysisContent]
  );

  useEffect(() => {
    if (activeTab === "analysis") {
      loadAnalysisReports();
    }
  }, [activeTab, loadAnalysisReports]);

  useEffect(() => {
    if (activeTab === "analysis" && analysisReports.length > 0 && !selectedReportPath) {
      handleAnalysisSelect(analysisReports[0]);
    }
  }, [activeTab, analysisReports, selectedReportPath, handleAnalysisSelect]);

  // ── Calendar rendering ──

  const calendarDays = getLastNDays(30);
  const isToday = (date: string) => date === todayStr();

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div
        className="flex items-center justify-between p-3 md:p-4 flex-shrink-0"
        style={{
          backgroundColor: "var(--card)",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <div className="flex items-center gap-2 md:gap-3">
          <FileBarChart className="w-5 h-5 md:w-6 md:h-6" style={{ color: "var(--accent)" }} />
          <div>
            <h1
              className="text-lg md:text-xl font-bold"
              style={{
                color: "var(--text-primary)",
                fontFamily: "var(--font-heading)",
              }}
            >
              报告管理
            </h1>
            <p className="text-xs md:text-sm hidden sm:block" style={{ color: "var(--text-secondary)" }}>
              每日汇报 · 分析报告
            </p>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center gap-1 p-1 rounded-lg" style={{ backgroundColor: "var(--card-elevated)" }}>
          <button
            onClick={() => setActiveTab("daily")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all"
            style={{
              backgroundColor: activeTab === "daily" ? "var(--accent)" : "transparent",
              color: activeTab === "daily" ? "var(--text-primary)" : "var(--text-muted)",
              cursor: "pointer",
            }}
          >
            <Calendar className="w-3.5 h-3.5" />
            每日汇报
          </button>
          <button
            onClick={() => setActiveTab("analysis")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all"
            style={{
              backgroundColor: activeTab === "analysis" ? "var(--accent)" : "transparent",
              color: activeTab === "analysis" ? "var(--text-primary)" : "var(--text-muted)",
              cursor: "pointer",
            }}
          >
            <FileDigit className="w-3.5 h-3.5" />
            分析报告
          </button>
        </div>
      </div>

      {/* ── DAILY REPORT TAB ── */}
      {activeTab === "daily" && (
        <div className="flex-1 flex flex-col md:flex-row min-h-0">
          {/* Calendar sidebar */}
          <div
            className="w-full md:w-72 lg:w-80 flex-shrink-0 overflow-y-auto"
            style={{
              backgroundColor: "var(--card)",
              borderRight: "1px solid var(--border)",
              borderBottom: "1px solid var(--border)",
            }}
          >
            {/* Yesterday Review Card */}
            <div className="p-3" style={{ borderBottom: "1px solid var(--border)" }}>
              <button
                onClick={() => !isGenerating && handleDateClick(yesterdayStr())}
                className="w-full text-left rounded-lg p-3 transition-all"
                style={{
                  backgroundColor: "rgba(59,130,246,0.06)",
                  border: "1px solid rgba(59,130,246,0.15)",
                  cursor: "pointer",
                }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">📅</span>
                  <span
                    className="text-sm font-semibold"
                    style={{ color: "var(--text-primary)" }}
                  >
                    昨日回顾
                  </span>
                  <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                    {formatDateCN(yesterdayStr())}
                  </span>
                </div>
                {availableDates.has(yesterdayStr()) ? (
                  <div className="flex items-center gap-1.5 ml-7">
                    <span
                      className="w-1.5 h-1.5 rounded-full inline-block"
                      style={{ backgroundColor: "#4ade80" }}
                    />
                    <span className="text-xs" style={{ color: "#4ade80" }}>
                      已有日报 — 点击查看
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 mt-1 ml-7">
                    <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                      暂无日报
                    </span>
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        generateYesterdayReport();
                      }}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.stopPropagation(); generateYesterdayReport(); } }}
                      className="text-xs px-2 py-1 rounded transition-all select-none"
                      style={{
                        backgroundColor: "var(--accent)",
                        color: "var(--text-primary)",
                        cursor: isGenerating ? "not-allowed" : "pointer",
                        opacity: isGenerating ? 0.6 : 1,
                        display: "inline-block",
                      }}
                    >
                      {isGenerating ? "生成中..." : "生成昨日日报"}
                    </span>
                  </div>
                )}
              </button>
            </div>

            {/* Stats bar */}
            <div
              className="px-3 py-2 flex items-center gap-4"
              style={{ borderBottom: "1px solid var(--border)" }}
            >
              <div className="flex items-center gap-1.5">
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                  📊 7天
                </span>
                <span
                  className="text-xs font-bold"
                  style={{
                    color:
                      last7Count >= 5
                        ? "#4ade80"
                        : last7Count >= 3
                        ? "#facc15"
                        : "var(--text-muted)",
                  }}
                >
                  {last7Count}/7
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                  📅 本月
                </span>
                <span
                  className="text-xs font-bold"
                  style={{ color: "var(--text-primary)" }}
                >
                  {monthCount} 天
                </span>
              </div>
            </div>

            {/* Calendar Quick Nav */}
            <div
              className="px-3 py-2 flex items-center gap-2"
              style={{ borderBottom: "1px solid var(--border)" }}
            >
              <button
                onClick={() => handleDateClick(yesterdayStr())}
                className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors hover:opacity-80"
                style={{
                  backgroundColor: "var(--card-elevated)",
                  color: "var(--text-secondary)",
                  cursor: "pointer",
                }}
              >
                <ChevronLeft className="w-3 h-3" />
                昨天
              </button>
              <button
                onClick={() => handleDateClick(todayStr())}
                className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors hover:opacity-80"
                style={{
                  backgroundColor: "var(--card-elevated)",
                  color: "var(--text-secondary)",
                  cursor: "pointer",
                }}
              >
                今天
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>

            {/* Generate button */}
            <div className="p-3" style={{ borderBottom: "1px solid var(--border)" }}>
              <button
                onClick={generateTodayReport}
                disabled={isGenerating}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all"
                style={{
                  backgroundColor: "var(--accent)",
                  color: "var(--text-primary)",
                  cursor: isGenerating ? "not-allowed" : "pointer",
                  opacity: isGenerating ? 0.6 : 1,
                }}
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    生成中...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    生成今日日报
                  </>
                )}
              </button>
            </div>

            {/* Calendar header */}
            <div
              className="px-3 py-2 flex items-center justify-between"
              style={{ borderBottom: "1px solid var(--border)" }}
            >
              <h2
                className="text-xs font-semibold uppercase tracking-wide"
                style={{ color: "var(--text-secondary)" }}
              >
                最近 30 天
              </h2>
              <span
                className="flex items-center gap-1 text-[10px]"
                style={{ color: "var(--text-muted)" }}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full inline-block"
                  style={{ backgroundColor: "#4ade80" }}
                />
                有日报
                <span
                  className="inline-block ml-1 w-3 h-3 rounded border"
                  style={{ borderColor: "var(--accent)" }}
                />
                今天
                <span
                  className="inline-block ml-1 w-3 h-3 rounded border"
                  style={{ borderColor: "#ef4444" }}
                />
                昨天
              </span>
            </div>

            {/* Calendar grid */}
            <div className="p-2">
              <div className="grid grid-cols-7 gap-1">
                {["一", "二", "三", "四", "五", "六", "日"].map((d) => (
                  <div
                    key={d}
                    className="text-center text-[10px] font-medium py-1"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {d}
                  </div>
                ))}

                {/* Pad with empty cells to align with weekday */}
                {(() => {
                  const firstDay = new Date(calendarDays[0]);
                  const dayOfWeek = firstDay.getDay(); // 0=Sun, 1=Mon
                  const padDays = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // adjust to Mon=0
                  return Array.from({ length: padDays }).map((_, i) => (
                    <div key={`pad-${i}`} className="aspect-square" />
                  ));
                })()}

                {calendarDays.map((date) => {
                  const hasReport = availableDates.has(date);
                  const isSelected = date === selectedDate;
                  const isTdy = isToday(date);
                  const isYdy = date === yesterdayStr();
                  const dayNum = parseInt(date.split("-")[2], 10);

                  return (
                    <button
                      key={date}
                      onClick={() => handleDateClick(date)}
                      title={formatDateCN(date)}
                      className="aspect-square flex flex-col items-center justify-center rounded-md text-[11px] font-medium transition-all relative"
                      style={{
                        backgroundColor: isSelected
                          ? "var(--accent)"
                          : hasReport
                          ? "rgba(74,222,128,0.1)"
                          : "transparent",
                        color: isSelected
                          ? "var(--text-primary)"
                          : hasReport
                          ? "#4ade80"
                          : "var(--text-muted)",
                        cursor: "pointer",
                        border: isTdy && !isSelected
                          ? "2px solid var(--accent)"
                          : isYdy && !isSelected
                          ? "2px solid #ef4444"
                          : "1px solid transparent",
                      }}
                    >
                      {dayNum}
                      {hasReport && !isSelected && (
                        <span
                          className="absolute bottom-1 w-1 h-1 rounded-full"
                          style={{ backgroundColor: "#4ade80" }}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Report preview */}
          <div
            className="flex-1 min-w-0 min-h-0 flex flex-col"
            style={{ backgroundColor: "var(--background)" }}
          >
            {/* Date header bar */}
            <div
              className="flex items-center justify-between px-4 py-2 flex-shrink-0"
              style={{
                backgroundColor: "var(--card)",
                borderBottom: "1px solid var(--border)",
              }}
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                  {formatDateCN(selectedDate)}
                </span>
                {dailyExists && (
                  <span
                    className="text-[10px] px-1.5 py-0.5 rounded-full"
                    style={{
                      backgroundColor: "rgba(74,222,128,0.1)",
                      color: "#4ade80",
                    }}
                  >
                    已生成
                  </span>
                )}
                {!dailyExists && (isToday(selectedDate) || selectedDate === yesterdayStr()) && dailyHasMemory && (
                  <span
                    className="text-[10px] px-1.5 py-0.5 rounded-full"
                    style={{
                      backgroundColor: "rgba(250,204,21,0.1)",
                      color: "#facc15",
                    }}
                  >
                    可生成
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                {isToday(selectedDate) && (
                  <button
                    onClick={generateTodayReport}
                    disabled={isGenerating}
                    className="px-2 py-1 rounded text-[10px] font-medium transition-colors"
                    style={{
                      backgroundColor: "var(--accent)",
                      color: "var(--text-primary)",
                      cursor: isGenerating ? "not-allowed" : "pointer",
                      opacity: isGenerating ? 0.5 : 1,
                    }}
                  >
                    {isGenerating ? "生成中..." : "重新生成"}
                  </button>
                )}
                {selectedDate === yesterdayStr() && (
                  <button
                    onClick={generateYesterdayReport}
                    disabled={isGenerating}
                    className="px-2 py-1 rounded text-[10px] font-medium transition-colors"
                    style={{
                      backgroundColor: "var(--accent)",
                      color: "var(--text-primary)",
                      cursor: isGenerating ? "not-allowed" : "pointer",
                      opacity: isGenerating ? 0.5 : 1,
                    }}
                  >
                    {isGenerating ? "生成中..." : dailyExists ? "重新生成" : "生成昨日日报"}
                  </button>
                )}
                <button
                  onClick={() => loadDailyReport(selectedDate)}
                  className="p-1.5 rounded transition-colors hover:opacity-80"
                  style={{ color: "var(--text-secondary)" }}
                  title="刷新"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingDaily ? "animate-spin" : ""}`} />
                </button>
              </div>
            </div>

            {/* Content area */}
            <div className="flex-1 min-h-0">
              {isLoadingDaily ? (
                <div
                  className="flex items-center justify-center h-full"
                  style={{ color: "var(--text-secondary)" }}
                >
                  <RefreshCw className="w-5 h-5 animate-spin mr-2" />
                  加载中...
                </div>
              ) : dailyContent ? (
                <MarkdownPreview content={dailyContent} />
              ) : (
                <div
                  className="flex items-center justify-center h-full"
                  style={{ color: "var(--text-muted)" }}
                >
                  <div className="text-center">
                    <Calendar className="w-16 h-16 mx-auto mb-4 opacity-30" />
                    <p className="text-lg">选择日期查看日报</p>
                    {(isToday(selectedDate) || selectedDate === yesterdayStr()) && (
                      <button
                        onClick={
                          isToday(selectedDate)
                            ? generateTodayReport
                            : generateYesterdayReport
                        }
                        disabled={isGenerating}
                        className="mt-4 flex items-center gap-2 mx-auto px-4 py-2 rounded-lg text-sm font-medium transition-all"
                        style={{
                          backgroundColor: "var(--accent)",
                          color: "var(--text-primary)",
                          cursor: isGenerating ? "not-allowed" : "pointer",
                          opacity: isGenerating ? 0.6 : 1,
                        }}
                      >
                        <Sparkles className="w-4 h-4" />
                        {isGenerating
                          ? "生成中..."
                          : isToday(selectedDate)
                          ? "生成今日日报"
                          : "生成昨日日报"}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── ANALYSIS REPORT TAB ── */}
      {activeTab === "analysis" && (
        <div className="flex-1 flex flex-col md:flex-row min-h-0">
          {/* Report list */}
          <div
            className="w-full md:w-80 lg:w-96 overflow-y-auto flex-shrink-0"
            style={{
              backgroundColor: "var(--card)",
              borderRight: "1px solid var(--border)",
              borderBottom: "1px solid var(--border)",
            }}
          >
            {/* 使用说明 */}
            <div className="p-3" style={{ borderBottom: "1px solid var(--border)" }}>
              <div className="rounded-lg p-3" style={{ backgroundColor: "rgba(59,130,246,0.05)", border: "1px solid rgba(59,130,246,0.12)" }}>
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-4 h-4" style={{ color: "#60a5fa" }} />
                  <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>如何使用分析报告？</span>
                </div>
                <div className="text-xs space-y-1.5" style={{ color: "var(--text-muted)", lineHeight: 1.6 }}>
                  <p>📝 <strong>是什么：</strong>AI 生成的深度分析文档（如竞品分析、数据复盘）。</p>
                  <p>📂 <strong>放哪里：</strong><code style={{ fontSize: 10, backgroundColor: "rgba(10,132,255,0.1)", padding: "1px 3px", borderRadius: 2 }}>workspace/memory/</code> 目录下。</p>
                  <p>🔍 <strong>命名规则：</strong>文件名含 <code style={{ fontSize: 10, backgroundColor: "rgba(10,132,255,0.1)", padding: "1px 3px", borderRadius: 2 }}>-analysis-</code> 或 <code style={{ fontSize: 10, backgroundColor: "rgba(10,132,255,0.1)", padding: "1px 3px", borderRadius: 2 }}>-report-</code>。</p>
                  <p>💬 <strong>上手：</strong>跟小牛说「帮我分析 xxx 生成报告」，自动出现。</p>
                </div>
              </div>
            </div>

            {/* 报告需求输入 */}
            <div className="p-3" style={{ borderBottom: "1px solid var(--border)" }}>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={requestMessage}
                  onChange={(e) => setRequestMessage(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSendRequest()}
                  placeholder="输入报告需求，如：分析最近的抖音趋势…"
                  className="flex-1 px-3 py-2 rounded-lg text-xs"
                  style={{
                    backgroundColor: "var(--surface)",
                    border: "1px solid var(--border)",
                    color: "var(--text-primary)",
                    outline: "none",
                  }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = "var(--accent)"; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = "var(--border)"; }}
                />
                <button
                  onClick={handleSendRequest}
                  disabled={isSendingRequest || !requestMessage.trim()}
                  className="px-3 py-2 rounded-lg flex items-center gap-1.5 transition-all shrink-0"
                  style={{
                    backgroundColor: requestMessage.trim() && !isSendingRequest ? "var(--accent)" : "var(--card-elevated)",
                    color: requestMessage.trim() && !isSendingRequest ? "#fff" : "var(--text-muted)",
                    border: "none",
                    cursor: requestMessage.trim() && !isSendingRequest ? "pointer" : "default",
                  }}
                >
                  {isSendingRequest ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : requestSent ? (
                    <span className="text-xs">✅ 已发送</span>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span className="text-xs font-medium">生成</span>
                    </>
                  )}
                </button>
              </div>
              {requestSent && (
                <p className="text-[10px] mt-1.5" style={{ color: "#4ade80" }}>
                  需求已发送，小牛正在为你生成分析报告…
                </p>
              )}
            </div>

            <div className="p-3 flex items-center justify-between" style={{ borderBottom: "1px solid var(--border)" }}>
              <h2
                className="text-sm font-semibold uppercase tracking-wide"
                style={{ color: "var(--text-secondary)" }}
              >
                {isLoadingAnalysis ? "加载中..." : `${analysisReports.length} 份报告`}
              </h2>
              <button
                onClick={loadAnalysisReports}
                className="p-1.5 rounded transition-colors hover:opacity-80"
                style={{ color: "var(--text-secondary)" }}
                title="刷新"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            {!isLoadingAnalysis && analysisReports.length === 0 && (
              <div className="p-8 text-center" style={{ color: "var(--text-muted)" }}>
                <FileBarChart className="w-16 h-16 mx-auto mb-4 opacity-20" />
                <p className="text-sm font-medium mb-2" style={{ color: "var(--text-secondary)" }}>还没有分析报告</p>
                <p className="text-xs leading-relaxed">
                  AI 生成的分析报告会自动出现在这里。<br />
                  试试跟小牛说：<br />
                  <code style={{ fontSize: 11, backgroundColor: "var(--card-elevated)", padding: "2px 6px", borderRadius: 3, color: "var(--accent)" }}>帮我分析一下最近的抖音数据趋势，生成报告</code>
                </p>
              </div>
            )}

            <div className="p-2 space-y-2">
              {analysisReports.map((report) => (
                <button
                  key={report.path}
                  onClick={() => handleAnalysisSelect(report)}
                  className="w-full text-left rounded-lg p-3 transition-all"
                  style={{
                    backgroundColor:
                      selectedReportPath === report.path
                        ? "var(--accent)"
                        : "var(--card-elevated, var(--background))",
                    border: `1px solid ${
                      selectedReportPath === report.path ? "var(--accent)" : "var(--border)"
                    }`,
                    cursor: "pointer",
                  }}
                  onMouseEnter={(e) => {
                    if (selectedReportPath !== report.path) {
                      e.currentTarget.style.borderColor = "var(--accent)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedReportPath !== report.path) {
                      e.currentTarget.style.borderColor = "var(--border)";
                    }
                  }}
                >
                  <div className="flex items-start gap-3">
                    <FileText
                      className="w-5 h-5 mt-0.5 flex-shrink-0"
                      style={{
                        color:
                          selectedReportPath === report.path
                            ? "var(--text-primary)"
                            : "var(--accent)",
                      }}
                    />
                    <div className="min-w-0 flex-1">
                      <p
                        className="font-medium text-sm truncate"
                        style={{
                          color:
                            selectedReportPath === report.path
                              ? "var(--text-primary)"
                              : "var(--text-primary)",
                        }}
                      >
                        {report.title}
                      </p>
                      <div
                        className="flex items-center gap-3 mt-1 text-xs"
                        style={{
                          color:
                            selectedReportPath === report.path
                              ? "var(--text-primary)"
                              : "var(--text-muted)",
                          opacity: selectedReportPath === report.path ? 0.8 : 1,
                        }}
                      >
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDate(report.modified)}
                        </span>
                        <span className="flex items-center gap-1">
                          <HardDrive className="w-3 h-3" />
                          {formatSize(report.size)}
                        </span>
                      </div>
                      <span
                        className="inline-block mt-1.5 text-xs px-2 py-0.5 rounded-full"
                        style={{
                          backgroundColor:
                            selectedReportPath === report.path
                              ? "rgba(255,255,255,0.15)"
                              : "var(--background)",
                          color:
                            selectedReportPath === report.path
                              ? "var(--text-primary)"
                              : "var(--text-secondary)",
                        }}
                      >
                        {report.type}
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Preview panel */}
          <div
            className="flex-1 min-w-0 min-h-0"
            style={{ backgroundColor: "var(--background)" }}
          >
            {selectedReportPath ? (
              isLoadingAnalysisContent ? (
                <div
                  className="flex items-center justify-center h-full"
                  style={{ color: "var(--text-secondary)" }}
                >
                  加载报告中...
                </div>
              ) : (
                <MarkdownPreview content={analysisContent} />
              )
            ) : (
              <div
                className="flex items-center justify-center h-full"
                style={{ color: "var(--text-muted)" }}
              >
                <div className="text-center">
                  <FileBarChart className="w-16 h-16 mx-auto mb-4 opacity-30" />
                  <p className="text-lg">选择一个报告预览</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
