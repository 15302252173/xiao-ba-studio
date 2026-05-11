"use client";

import { useEffect, useState, useCallback } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

/* ─── Types ─── */
interface SocialPost {
  id: string;
  date: string;
  platform: "linkedin" | "xiaohongshu";
  status: string;
  title: string;
  content: string;
  purpose?: { category?: string; reason?: string };
  tags?: string[];
  time?: string;
}

interface SocialPlan {
  meta?: {
    owner?: string;
    platforms?: { id: string; name: string; color: string }[];
    period?: string;
    recommendedPostTimes?: Record<string, string[]>;
  };
  posts: SocialPost[];
}

interface SocialData {
  plan: SocialPlan | null;
  baiwan: {
    identity?: string;
    memory?: string;
    recentMemory?: string[];
    reports?: string[];
  };
  lastUpdated: string;
}

/* ─── Category color map ─── */
const CAT_COLORS: Record<string, { bg: string; color: string }> = {
  Branding: { bg: "rgba(191,90,242,0.15)", color: "#bf5af2" },
  "Knowledge Sharing": { bg: "rgba(10,132,255,0.15)", color: "#0a84ff" },
  "Emotional Connection": { bg: "rgba(255,69,58,0.15)", color: "#ff453a" },
  "Call-to-Action": { bg: "rgba(255,159,10,0.15)", color: "#ff9f0a" },
  "AI Related": { bg: "rgba(48,209,88,0.15)", color: "#30d158" },
};

/* ─── Helpers ─── */
function getPSTDate() {
  // Get current date parts in PST timezone
  const now = new Date();
  const pstStr = now.toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' });
  const [y, m, d] = pstStr.split('-').map(Number);
  return { year: y, month: m - 1, day: d };
}

function getMonthDates(offset: number) {
  const pst = getPSTDate();
  const d = new Date(pst.year, pst.month + offset, 1);
  const year = d.getFullYear();
  const month = d.getMonth();
  const firstDay = new Date(year, month, 1);
  // Start from Monday
  let startDow = firstDay.getDay(); // 0=Sun
  startDow = startDow === 0 ? 6 : startDow - 1; // Mon=0
  const start = new Date(firstDay);
  start.setDate(start.getDate() - startDow);
  const dates: Date[] = [];
  for (let i = 0; i < 42; i++) {
    const dd = new Date(start);
    dd.setDate(start.getDate() + i);
    dates.push(dd);
  }
  return { dates, year, month };
}

function fmtDate(d: Date) {
  // Use America/Los_Angeles to avoid UTC date shift
  const parts = d.toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' }); // en-CA gives YYYY-MM-DD
  return parts;
}

const MONTH_NAMES = [
  "一月", "二月", "三月", "四月", "五月", "六月",
  "七月", "八月", "九月", "十月", "十一月", "十二月",
];

const WEEKDAYS = ["一", "二", "三", "四", "五", "六", "日"];

/* ─── Post Detail Modal ─── */
function PostModal({
  post,
  on关闭,
}: {
  post: SocialPost;
  on关闭: () => void;
}) {
  const statusLabel = post.status === "published" ? "✅ 已发布" : "🕐 已排期";
  const catStyle = CAT_COLORS[post.purpose?.category || ""] || {
    bg: "rgba(255,255,255,0.06)",
    color: "var(--text-secondary)",
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* Backdrop */}
      <div
        onClick={on关闭}
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(0,0,0,0.7)",
          backdropFilter: "blur(4px)",
        }}
      />
      {/* Content */}
      <div
        style={{
          position: "relative",
          backgroundColor: "var(--card)",
          border: "1px solid var(--border)",
          borderRadius: "16px",
          width: "90%",
          maxWidth: "640px",
          maxHeight: "80vh",
          overflowY: "auto",
          padding: "28px",
          zIndex: 1,
          animation: "modalIn .2s ease",
        }}
      >
        <button
          onClick={on关闭}
          style={{
            position: "absolute",
            top: 14,
            right: 14,
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "50%",
            width: 32,
            height: 32,
            color: "var(--text-secondary)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <X size={16} />
        </button>

        {/* Platform + time + status */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginBottom: 16,
          }}
        >
          <span
            style={{
              fontSize: 12,
              fontWeight: 600,
              padding: "4px 12px",
              borderRadius: 8,
              background: "rgba(255,36,66,0.2)",
              color: "#ff6b7f",
            }}
          >
            📕 小红书
          </span>
          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
            📅 {post.date} {post.time ? `(${post.time})` : ""}
          </span>
          <span style={{ fontSize: 12, marginLeft: "auto" }}>{statusLabel}</span>
        </div>

        {/* Title */}
        <h2
          style={{
            fontSize: 18,
            fontWeight: 700,
            marginBottom: 16,
            lineHeight: 1.4,
            color: "var(--text-primary)",
          }}
        >
          {post.title}
        </h2>

        {/* Body */}
        <div
          style={{
            fontSize: 14,
            lineHeight: 1.8,
            color: "var(--text-secondary)",
            whiteSpace: "pre-wrap",
            marginBottom: 20,
            padding: 16,
            background: "var(--surface)",
            borderRadius: 8,
            maxHeight: 300,
            overflowY: "auto",
          }}
        >
          {post.content}
        </div>

        {/* Purpose */}
        {post.purpose && (
          <div
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              padding: 14,
            }}
          >
            <h4
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: "var(--text-muted)",
                marginBottom: 8,
                textTransform: "uppercase",
                letterSpacing: ".3px",
              }}
            >
              📌 发布目的
            </h4>
            {post.purpose.category && (
              <span
                style={{
                  display: "inline-block",
                  fontSize: 11,
                  fontWeight: 600,
                  padding: "3px 10px",
                  borderRadius: 8,
                  marginRight: 6,
                  marginBottom: 6,
                  background: catStyle.bg,
                  color: catStyle.color,
                }}
              >
                {post.purpose.category}
              </span>
            )}
            {post.purpose.reason && (
              <p
                style={{
                  fontSize: 13,
                  color: "var(--text-secondary)",
                  marginTop: 8,
                  lineHeight: 1.6,
                }}
              >
                {post.purpose.reason}
              </p>
            )}
          </div>
        )}

        {/* Tags */}
        {post.tags && post.tags.length > 0 && (
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 6,
              marginTop: 12,
            }}
          >
            {post.tags.map((t) => (
              <span
                key={t}
                style={{
                  fontSize: 11,
                  color: "var(--accent)",
                  background: "rgba(10,132,255,0.1)",
                  padding: "2px 8px",
                  borderRadius: 6,
                }}
              >
                {t}
              </span>
            ))}
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes modalIn {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  );
}

/* ─── Main Page ─── */
export default function SocialPage() {
  const [data, setData] = useState<SocialData | null>(null);
  const [loading, setLoading] = useState(true);
  const [monthOffset, setMonthOffset] = useState(0);
  const [selectedPost, setSelectedPost] = useState<SocialPost | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/social");
      if (res.ok) setData(await res.json());
    } catch (e) {
      console.error("Failed to fetch social data:", e);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // 只显示小红书帖子
  const allPosts = data?.plan?.posts || [];
  const posts = allPosts.filter((p) => p.platform === "xiaohongshu");
  const { dates, year, month } = getMonthDates(monthOffset);
  const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' });

  // 本月统计
  const monthPosts = posts.filter((p) => {
    const d = new Date(p.date);
    return d.getMonth() === month && d.getFullYear() === year;
  });
  const publishedCount = monthPosts.filter(
    (p) => p.status === "published"
  ).length;
  const plannedCount = monthPosts.length - publishedCount;

  // 类别分布
  const cats: Record<string, number> = {};
  monthPosts.forEach((p) => {
    const cat = p.purpose?.category || "Other";
    cats[cat] = (cats[cat] || 0) + 1;
  });

  return (
    <div style={{ padding: "16px 24px" }}>
      {/* Modal */}
      {selectedPost && (
        <PostModal
          post={selectedPost}
          on关闭={() => setSelectedPost(null)}
        />
      )}

      {/* ─── Social Layout: Calendar + Sidebar ─── */}
      <div style={{ display: "flex", gap: 20, height: "calc(100vh - 120px)" }}>
        {/* Main Calendar Area */}
        <div
          style={{
            flex: 1,
            minWidth: 0,
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Header */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 16,
            }}
          >
            <h2
              style={{
                fontSize: 20,
                fontWeight: 700,
                color: "var(--text-primary)",
                fontFamily: "var(--font-heading)",
              }}
            >
              📕 小红书内容日历
            </h2>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button
                onClick={() => setMonthOffset((o) => o - 1)}
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: 6,
                  width: 32,
                  height: 32,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  color: "var(--text-secondary)",
                }}
              >
                <ChevronLeft size={16} />
              </button>
              <span
                style={{
                  fontSize: 15,
                  fontWeight: 600,
                  color: "var(--text-primary)",
                  minWidth: 150,
                  textAlign: "center",
                }}
              >
                {year} · {MONTH_NAMES[month]}
              </span>
              <button
                onClick={() => setMonthOffset((o) => o + 1)}
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: 6,
                  width: 32,
                  height: 32,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  color: "var(--text-secondary)",
                }}
              >
                <ChevronRight size={16} />
              </button>
              <button
                onClick={() => setMonthOffset(0)}
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: 6,
                  height: 32,
                  padding: "0 12px",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  color: "var(--text-secondary)",
                }}
              >
                今天
              </button>
            </div>
          </div>

          {/* Weekday header */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(7, 1fr)",
              gap: 4,
              marginBottom: 4,
              textAlign: "center",
              fontSize: 14,
              fontWeight: 600,
              color: "var(--text-muted)",
              textTransform: "uppercase",
            }}
          >
            {WEEKDAYS.map((d) => (
              <div key={d}>{d}</div>
            ))}
          </div>

          {/* Calendar grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(7, 1fr)",
              gap: 4,
              flex: 1,
              gridAutoRows: "1fr",
            }}
          >
            {dates.map((d, i) => {
              const dateStr = fmtDate(d);
              const isThisMonth = d.getMonth() === month;
              const isToday = dateStr === todayStr;
              const dayPosts = posts.filter((p) => p.date === dateStr);

              return (
                <div
                  key={i}
                  style={{
                    backgroundColor: "var(--card)",
                    border: `1px solid ${isToday ? "var(--accent)" : "var(--border)"}`,
                    borderRadius: 6,
                    padding: "6px 8px",
                    minHeight: 80,
                    display: "flex",
                    flexDirection: "column",
                    opacity: isThisMonth ? 1 : 0.3,
                    transition: "border-color .15s",
                  }}
                >
                  <div
                    style={{
                      fontSize: 15,
                      fontWeight: isToday ? 700 : 600,
                      color: isToday ? "var(--accent)" : "var(--text-secondary)",
                      marginBottom: 4,
                    }}
                  >
                    {d.getDate()}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 3,
                      flex: 1,
                    }}
                  >
                    {dayPosts.map((p) => (
                      <div
                        key={p.id}
                        onClick={() => setSelectedPost(p)}
                        title={p.title}
                        style={{
                          fontSize: 10,
                          fontWeight: 600,
                          padding: "3px 6px",
                          borderRadius: 5,
                          cursor: "pointer",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          transition: "transform .1s, box-shadow .1s",
                          background: "rgba(255,36,66,0.2)",
                          color: "#ff6b7f",
                          borderLeft: "3px solid #FF2442",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = "scale(1.05)";
                          e.currentTarget.style.boxShadow =
                            "0 2px 8px rgba(0,0,0,0.3)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = "scale(1)";
                          e.currentTarget.style.boxShadow = "none";
                        }}
                      >
                        📕{" "}
                        {p.title.length > 14
                          ? p.title.slice(0, 14) + "…"
                          : p.title}
                        {p.status === "published" ? " ✅" : ""}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ─── Sidebar ─── */}
        <div
          style={{
            width: 260,
            flexShrink: 0,
            display: "flex",
            flexDirection: "column",
            gap: 14,
          }}
        >
          {/* Monthly stats card */}
          <div
            style={{
              background: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: 10,
              padding: 18,
            }}
          >
            <h3
              style={{
                fontSize: 15,
                fontWeight: 600,
                marginBottom: 14,
                color: "var(--text-primary)",
              }}
            >
              📊 本月统计
            </h3>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "8px 0",
                borderBottom: "1px solid var(--border)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontSize: 13,
                  color: "var(--text-secondary)",
                }}
              >
                📕 帖子总数
              </div>
              <span
                style={{
                  fontSize: 16,
                  fontWeight: 700,
                  color: "var(--text-primary)",
                }}
              >
                {monthPosts.length} 篇
              </span>
            </div>

            {/* 类别分布 */}
            <div
              style={{
                marginTop: 14,
                paddingTop: 12,
                borderTop: "1px solid var(--border)",
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  color: "var(--text-muted)",
                  marginBottom: 8,
                  fontWeight: 600,
                }}
              >
                类别分布
              </div>
              {Object.entries(cats).map(([cat, count]) => {
                const style = CAT_COLORS[cat] || {
                  bg: "rgba(255,255,255,0.06)",
                  color: "var(--text-secondary)",
                };
                return (
                  <div
                    key={cat}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "5px 0",
                      fontSize: 12,
                      color: "var(--text-secondary)",
                    }}
                  >
                    <span
                      style={{
                        fontSize: 11,
                        padding: "2px 8px",
                        borderRadius: 8,
                        background: style.bg,
                        color: style.color,
                      }}
                    >
                      {cat}
                    </span>
                    <span>{count}</span>
                  </div>
                );
              })}
            </div>

            {/* 发布状态 */}
            <div
              style={{
                marginTop: 14,
                paddingTop: 12,
                borderTop: "1px solid var(--border)",
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  color: "var(--text-muted)",
                  marginBottom: 4,
                  fontWeight: 600,
                }}
              >
                发布状态
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "5px 0",
                  fontSize: 12,
                  color: "var(--text-secondary)",
                }}
              >
                <span>✅ 已发布</span>
                <span>{publishedCount}</span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "5px 0",
                  fontSize: 12,
                  color: "var(--text-secondary)",
                }}
              >
                <span>🕐 已排期</span>
                <span>{plannedCount}</span>
              </div>
            </div>
          </div>

          {/* 小红书 Agent 状态卡片 */}
          <div
            style={{
              background: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: 10,
              padding: 18,
            }}
          >
            <h3
              style={{
                fontSize: 15,
                fontWeight: 600,
                marginBottom: 14,
                color: "var(--text-primary)",
              }}
            >
              📕 小红书 · 百万 Agent
            </h3>
            {data?.baiwan?.identity ? (
              <div style={{ fontSize: 12, lineHeight: 1.8, color: "var(--text-muted)" }}>
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  marginBottom: 8,
                }}>
                  <span style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: "#30d158",
                    display: "inline-block",
                  }} />
                  <span style={{ color: "var(--text-secondary)", fontWeight: 500 }}>
                    Agent 已连接
                  </span>
                </div>
                {data.baiwan.identity.slice(0, 120)}
                {data.baiwan.identity.length > 120 ? "…" : ""}
              </div>
            ) : (
              <div style={{ textAlign: "center", padding: "16px 0" }}>
                <span style={{ fontSize: 36, display: "block", marginBottom: 8 }}>
                  📕
                </span>
                <p style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 12 }}>
                  尚未配置小红书 Agent
                </p>
                <div style={{
                  fontSize: 11,
                  color: "var(--text-muted)",
                  background: "var(--surface)",
                  borderRadius: 6,
                  padding: "8px 12px",
                  textAlign: "left",
                  lineHeight: 1.6,
                }}>
                  <div style={{ fontWeight: 600, marginBottom: 4, color: "var(--text-secondary)" }}>
                    💡 配置方式：
                  </div>
                  设置环境变量 <code style={{ background: "rgba(10,132,255,0.15)", padding: "1px 4px", borderRadius: 3, color: "var(--accent)" }}>CONTENT_AGENT_WORKSPACE</code><br />
                  指向小红书内容 Agent 的工作区路径
                </div>
              </div>
            )}
          </div>

          {/* 账号配置卡片 */}
          <div
            style={{
              background: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: 10,
              padding: 18,
            }}
          >
            <h3
              style={{
                fontSize: 15,
                fontWeight: 600,
                marginBottom: 14,
                color: "var(--text-primary)",
              }}
            >
              🔗 数据源配置
            </h3>
            <div style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.8 }}>
              <div style={{
                padding: "6px 10px",
                background: "var(--surface)",
                borderRadius: 6,
              }}>
                <div style={{ fontWeight: 600, color: "var(--text-secondary)", marginBottom: 2 }}>
                  小红书 Agent
                </div>
                <code style={{ fontSize: 11, color: "var(--accent)" }}>
                  {data?.baiwan?.identity ? "✅ 已连接" : "⚠️ 未配置"}
                </code>
              </div>
            </div>
            <p style={{
              marginTop: 10,
              fontSize: 11,
              color: "var(--text-muted)",
              lineHeight: 1.6,
              borderTop: "1px solid var(--border)",
              paddingTop: 10,
            }}>
              💡 社交媒体内容由 OpenClaw Agent 生成并写入 <code style={{ background: "rgba(10,132,255,0.1)", padding: "1px 4px", borderRadius: 3 }}>social-media-plan.json</code>，
              本页面自动读取并展示。目前不支持直接绑定第三方平台 API。
            </p>
          </div>


        </div>
      </div>

      {/* 上次更新 */}
      {data?.lastUpdated && (
        <p
          style={{
            marginTop: 12,
            fontSize: 11,
            color: "var(--text-muted)",
          }}
        >
          上次更新: {new Date(data.lastUpdated).toLocaleString("zh-CN", { timeZone: "America/Los_Angeles" })}
        </p>
      )}
    </div>
  );
}
