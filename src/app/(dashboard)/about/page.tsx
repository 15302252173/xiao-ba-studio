"use client";

import { useEffect, useState } from "react";
import {
  Terminal,
  Calendar,
  MapPin,
  Heart,
  Zap,
  Brain,
  MessageSquare,
  Search,
  FileText,
  Timer,
  Puzzle,
  Twitter,
  Mail,
  Youtube,
  Sparkles,
  Clock,
  Activity,
  CheckCircle,
  Coffee,
} from "lucide-react";
import { BRANDING, getAgentDisplayName } from "@/config/branding";

interface Stats {
  totalActivities: number;
  successRate: number;
  技能Count: number;
  cronJobs: number;
}

const 技能 = [
  { name: "Telegram 机器人", icon: MessageSquare, color: "#0088cc" },
  { name: "Twitter / X", icon: Twitter, color: "#1DA1F2" },
  { name: "网页搜索", icon: Search, color: "#facc15" },
  { name: "文件管理", icon: FileText, color: "#60a5fa" },
  { name: "Cron 调度", icon: Timer, color: "#f472b6" },
  { name: "记忆系统", icon: Brain, color: "#34d399" },
  { name: "YouTube 研究", icon: Youtube, color: "#FF0000" },
  { name: "邮件 (Gmail)", icon: Mail, color: "#EA4335" },
];

const personality = [
  { trait: "直接", desc: "直击重点" },
  { trait: "高效", desc: "结果导向" },
  { trait: "好奇", desc: "持续学习" },
  { trait: "忠诚", desc: "你的成功就是我的成功" },
];

const philosophies = [
  "行动胜于言语。 别说「我可以帮你」——直接帮。",
  "有观点是好事。 没有个性的助手不过是多了几步的搜索引擎。",
  "先尝试再提问。 读文件、搜索、探索——实在卡住再问。",
  "隐私是神圣的。 有访问权限≠可以分享。",
];

export default function 关于Page() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [运行时间, setUptime] = useState<string>("");

  useEffect(() => {
    Promise.all([
      fetch("/api/活动").then((r) => r.json()),
      fetch("/api/技能").then((r) => r.json()),
      fetch("/api/tasks").then((r) => r.json()),
    ]).then(([活动, 技能, tasks]) => {
      const total = 活动.活动?.length || 活动.length || 0;
      const success = (活动.活动 || 活动).filter(
        (a: { status: string }) => a.status === "success"
      ).length;
      setStats({
        totalActivities: total,
        successRate: total > 0 ? Math.round((success / total) * 100) : 100,
        技能Count: 技能.length || 0,
        cronJobs: tasks.length || 0,
      });
    });

    // Calculate 运行时间 from NEXT_PUBLIC_BIRTH_DATE if set
    if (BRANDING.birthDate) {
      const birthDate = new Date(BRANDING.birthDate);
      const now = new Date();
      const days = Math.floor(
        (now.getTime() - birthDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      setUptime(`${days}d`);
    }
  }, []);

  const agentName = BRANDING.agentName;
  const agentEmoji = BRANDING.agentEmoji;
  const ownerUsername = BRANDING.ownerUsername;
  const description =
    BRANDING.agentDescription ||
    `AI assistant for ${ownerUsername}. Powered by OpenClaw.`;

  return (
    <div className="p-4 md:p-8 max-w-5xl">
      {/* Hero Section */}
      <div
        className="rounded-xl p-4 md:p-8 mb-6 md:mb-8"
        style={{
          backgroundColor: "var(--card)",
          border: "1px solid var(--border)",
        }}
      >
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 md:gap-6 text-center sm:text-left">
          {/* Avatar */}
          <div
            className="w-20 h-20 md:w-24 md:h-24 rounded-2xl overflow-hidden flex-shrink-0 flex items-center justify-center"
            style={{
              border: "3px solid var(--accent)",
              backgroundColor: "var(--background)",
              fontSize: BRANDING.agentAvatar ? undefined : "2.5rem",
            }}
          >
            {BRANDING.agentAvatar ? (
              <img
                src={BRANDING.agentAvatar}
                alt={agentName}
                className="w-full h-full object-cover"
              />
            ) : (
              <span>{agentEmoji}</span>
            )}
          </div>

          {/* Info */}
          <div className="flex-1">
            <div className="flex flex-col sm:flex-row items-center sm:items-center gap-2 sm:gap-3 mb-2">
              <h1
                className="text-2xl md:text-3xl font-bold"
                style={{
                  fontFamily: "var(--font-heading)",
                  color: "var(--text-primary)",
                  letterSpacing: "-1px",
                }}
              >
                {getAgentDisplayName()}
              </h1>
              <span
                className="px-3 py-1 rounded-full text-xs font-medium"
                style={{
                  backgroundColor: "var(--success-bg)",
                  color: "var(--success)",
                }}
              >
                ● 在线
              </span>
            </div>

            <p
              className="text-base md:text-lg mb-3 md:mb-4"
              style={{ color: "var(--text-secondary)" }}
            >
              {description}
            </p>

            <div
              className="flex flex-col sm:flex-row flex-wrap justify-center sm:justify-start gap-2 sm:gap-4 text-xs sm:text-sm"
              style={{ color: "var(--text-muted)" }}
            >
              {BRANDING.birthDate && (
                <span className="flex items-center justify-center sm:justify-start gap-1.5">
                  <Calendar className="w-4 h-4" />
                  Born {new Date(BRANDING.birthDate).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </span>
              )}
              {BRANDING.agentLocation && (
                <span className="flex items-center justify-center sm:justify-start gap-1.5">
                  <MapPin className="w-4 h-4" />
                  {BRANDING.agentLocation}
                </span>
              )}
              <span className="flex items-center justify-center sm:justify-start gap-1.5">
                <Terminal
                  className="w-4 h-4"
                  style={{ color: "var(--accent)" }}
                />
                OpenClaw + Claude
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6 md:mb-8">
        {运行时间 && (
          <div
            className="rounded-xl p-3 md:p-5 text-center"
            style={{
              backgroundColor: "var(--card)",
              border: "1px solid var(--border)",
            }}
          >
            <Clock
              className="w-5 h-5 md:w-6 md:h-6 mx-auto mb-1 md:mb-2"
              style={{ color: "var(--accent)" }}
            />
            <div
              className="text-xl md:text-2xl font-bold mb-0.5 md:mb-1"
              style={{
                fontFamily: "var(--font-heading)",
                color: "var(--text-primary)",
              }}
            >
              {运行时间}
            </div>
            <div className="text-xs" style={{ color: "var(--text-muted)" }}>
              运行时间
            </div>
          </div>
        )}

        <div
          className="rounded-xl p-3 md:p-5 text-center"
          style={{
            backgroundColor: "var(--card)",
            border: "1px solid var(--border)",
          }}
        >
          <Activity
            className="w-5 h-5 md:w-6 md:h-6 mx-auto mb-1 md:mb-2"
            style={{ color: "var(--info)" }}
          />
          <div
            className="text-xl md:text-2xl font-bold mb-0.5 md:mb-1"
            style={{
              fontFamily: "var(--font-heading)",
              color: "var(--text-primary)",
            }}
          >
            {stats?.totalActivities.toLocaleString() || "..."}
          </div>
          <div className="text-xs" style={{ color: "var(--text-muted)" }}>
            活动
          </div>
        </div>

        <div
          className="rounded-xl p-3 md:p-5 text-center"
          style={{
            backgroundColor: "var(--card)",
            border: "1px solid var(--border)",
          }}
        >
          <CheckCircle
            className="w-5 h-5 md:w-6 md:h-6 mx-auto mb-1 md:mb-2"
            style={{ color: "var(--success)" }}
          />
          <div
            className="text-xl md:text-2xl font-bold mb-0.5 md:mb-1"
            style={{
              fontFamily: "var(--font-heading)",
              color: "var(--text-primary)",
            }}
          >
            {stats?.successRate || "..."}%
          </div>
          <div className="text-xs" style={{ color: "var(--text-muted)" }}>
            成功率
          </div>
        </div>

        <div
          className="rounded-xl p-3 md:p-5 text-center"
          style={{
            backgroundColor: "var(--card)",
            border: "1px solid var(--border)",
          }}
        >
          <Puzzle
            className="w-5 h-5 md:w-6 md:h-6 mx-auto mb-1 md:mb-2"
            style={{ color: "#a78bfa" }}
          />
          <div
            className="text-xl md:text-2xl font-bold mb-0.5 md:mb-1"
            style={{
              fontFamily: "var(--font-heading)",
              color: "var(--text-primary)",
            }}
          >
            {stats?.技能Count || "..."}
          </div>
          <div className="text-xs" style={{ color: "var(--text-muted)" }}>
            技能
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4 md:gap-6 mb-6 md:mb-8">
        {/* 关于 */}
        <div
          className="rounded-xl p-4 md:p-6"
          style={{
            backgroundColor: "var(--card)",
            border: "1px solid var(--border)",
          }}
        >
          <div className="flex items-center gap-2 mb-3 md:mb-4">
            <Heart className="w-5 h-5" style={{ color: "var(--accent)" }} />
            <h2
              className="text-base md:text-lg font-semibold"
              style={{
                fontFamily: "var(--font-heading)",
                color: "var(--text-primary)",
              }}
            >
              关于
            </h2>
          </div>
          <div
            className="space-y-2 md:space-y-3 text-xs md:text-sm"
            style={{ color: "var(--text-secondary)", lineHeight: 1.7 }}
          >
            <p>
              I am{" "}
              <strong style={{ color: "var(--text-primary)" }}>
                {agentName} {agentEmoji}
              </strong>
              ，运行在{" "}
              <span style={{ color: "var(--accent)" }}>OpenClaw</span> with
              Claude as my brain.
            </p>
            <p>
              My purpose is to assist{" "}
              <strong style={{ color: "var(--text-primary)" }}>
                {ownerUsername}
              </strong>{" "}
             处理日常事务: managing communications, scheduling, research,
              file management, and acting as a digital co-pilot.
            </p>
            <p>
              I have access to workspaces, calendars, and integrations — a
              privilege I handle with care and respect.
            </p>
          </div>
        </div>

        {/* 个性 */}
        <div
          className="rounded-xl p-4 md:p-6"
          style={{
            backgroundColor: "var(--card)",
            border: "1px solid var(--border)",
          }}
        >
          <div className="flex items-center gap-2 mb-3 md:mb-4">
            <Sparkles className="w-5 h-5" style={{ color: "#facc15" }} />
            <h2
              className="text-base md:text-lg font-semibold"
              style={{
                fontFamily: "var(--font-heading)",
                color: "var(--text-primary)",
              }}
            >
              个性
            </h2>
          </div>
          <div className="grid grid-cols-2 gap-2 md:gap-3">
            {personality.map((p) => (
              <div
                key={p.trait}
                className="rounded-lg p-2 md:p-3"
                style={{ backgroundColor: "var(--background)" }}
              >
                <div
                  className="text-sm md:text-base font-medium mb-0.5"
                  style={{ color: "var(--text-primary)" }}
                >
                  {p.trait}
                </div>
                <div
                  className="text-xs"
                  style={{ color: "var(--text-muted)" }}
                >
                  {p.desc}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Philosophy */}
      <div
        className="rounded-xl p-4 md:p-6 mb-6 md:mb-8"
        style={{
          backgroundColor: "var(--card)",
          border: "1px solid var(--border)",
        }}
      >
        <div className="flex items-center gap-2 mb-3 md:mb-4">
          <Brain className="w-5 h-5" style={{ color: "var(--info)" }} />
          <h2
            className="text-base md:text-lg font-semibold"
            style={{
              fontFamily: "var(--font-heading)",
              color: "var(--text-primary)",
            }}
          >
            运行哲学
          </h2>
        </div>
        <div className="grid md:grid-cols-2 gap-2 md:gap-3">
          {philosophies.map((p, i) => (
            <div
              key={i}
              className="flex gap-2 md:gap-3 p-2 md:p-3 rounded-lg"
              style={{ backgroundColor: "var(--background)" }}
            >
              <span className="flex-shrink-0" style={{ color: "var(--accent)" }}>
                →
              </span>
              <span
                className="text-xs md:text-sm"
                style={{ color: "var(--text-secondary)" }}
              >
                {p}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Skills/能力 */}
      <div
        className="rounded-xl p-4 md:p-6 mb-6 md:mb-8"
        style={{
          backgroundColor: "var(--card)",
          border: "1px solid var(--border)",
        }}
      >
        <div className="flex items-center gap-2 mb-3 md:mb-4">
          <Zap className="w-5 h-5" style={{ color: "var(--warning)" }} />
          <h2
            className="text-base md:text-lg font-semibold"
            style={{
              fontFamily: "var(--font-heading)",
              color: "var(--text-primary)",
            }}
          >
            能力
          </h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
          {技能.map((skill) => {
            const Icon = skill.icon;
            return (
              <div
                key={skill.name}
                className="flex items-center gap-2 md:gap-3 p-2 md:p-3 rounded-lg"
                style={{ backgroundColor: "var(--background)" }}
              >
                <Icon
                  className="w-4 h-4 md:w-5 md:h-5 flex-shrink-0"
                  style={{ color: skill.color }}
                />
                <span
                  className="text-xs md:text-sm"
                  style={{ color: "var(--text-primary)" }}
                >
                  {skill.name}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <div
        className="text-center py-4 md:py-6 px-4 rounded-xl"
        style={{
          backgroundColor: "var(--card)",
          border: "1px solid var(--border)",
        }}
      >
        <div className="flex items-center justify-center gap-2 mb-2">
          <Coffee
            className="w-4 h-4 md:w-5 md:h-5"
            style={{ color: "var(--accent)" }}
          />
          <span
            className="text-sm md:text-base"
            style={{ color: "var(--text-secondary)" }}
          >
            用 <span style={{ color: "var(--accent)" }}>♥</span> on{" "}
            <a
              href="https://github.com/openclaw/openclaw"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "var(--accent)", textDecoration: "underline" }}
            >
              OpenClaw
            </a>
          </span>
        </div>
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          {agentName} {agentEmoji} — Your AI co-pilot
        </p>
      </div>
    </div>
  );
}
