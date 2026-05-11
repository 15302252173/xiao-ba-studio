"use client";

import { BRANDING } from "@/config/branding";

interface Workflow {
  id: string;
  emoji: string;
  name: string;
  description: string;
  schedule: string;
  steps: string[];
  status: "active" | "inactive";
  trigger: "cron" | "demand";
}

const WORKFLOWS: Workflow[] = [
  {
    id: "social-radar",
    emoji: "🔭",
    name: "Social Radar",
    description: "Monitors mentions, collaboration opportunities, and relevant conversations across social media and forums.",
    schedule: "9:30 AM & 5:30 PM (daily)",
    trigger: "cron",
    status: "active",
    steps: [
      `Search for mentions of ${BRANDING.twitterHandle} on Twitter/X, LinkedIn, and Instagram`,
      "Review Reddit threads in r/webdev, r/javascript, r/learnprogramming",
      `Detect collaboration opportunities and incoming collabs (${BRANDING.ownerCollabEmail})`,
      "Monitor aprendiendo.dev in conversations and mentions",
      "Send summary via Telegram if anything relevant is found",
    ],
  },
  {
    id: "ai-web-news",
    emoji: "📰",
    name: "AI & Web News",
    description: "Summarizes the most relevant AI and web development news from the Twitter timeline to start the day informed.",
    schedule: "7:45 AM (daily)",
    trigger: "cron",
    status: "active",
    steps: [
      "Read the Twitter/X timeline via bird CLI",
      "筛选 AI、Web 开发、架构与开发工具相关新闻",
      "Select the 5-7 most relevant news items for the owner's niche",
      "Generate a structured summary with links and context",
      "Send digest via Telegram",
    ],
  },
  {
    id: "trend-monitor",
    emoji: "🔥",
    name: "Trend Monitor",
    description: "Urgent trend radar for the tech niche. Detects viral topics before they explode to ride the content wave.",
    schedule: "7 AM, 10 AM, 3 PM & 8 PM (daily)",
    trigger: "cron",
    status: "active",
    steps: [
      "Monitor trending topics on Twitter/X related to tech and programming",
      "Search Hacker News, dev.to, and GitHub Trending",
      "Evaluate whether the trend is relevant to the owner's channel",
      "If something urgent is detected, notify immediately with context",
      "Suggest a content angle if the trend has potential",
    ],
  },
  {
    id: "daily-linkedin",
    emoji: "📊",
    name: "Daily LinkedIn Brief",
    description: "Generates the daily LinkedIn post based on the most relevant news from Hacker News, dev.to, and the tech web.",
    schedule: "9 AM (daily)",
    trigger: "cron",
    status: "active",
    steps: [
      "Collect top posts from Hacker News (front page tech/dev)",
      "Review trending articles on dev.to and featured posts",
      "Select the topic with highest engagement potential for the owner's audience",
      "Draft a LinkedIn post in the owner's voice (professional-approachable, no emojis or hashtags)",
      "Send draft via Telegram for review and publishing",
    ],
  },
  {
    id: "newsletter-digest",
    emoji: "📬",
    name: "Newsletter Digest",
    description: "Curated digest of the day's newsletters. Consolidates the best from subscriptions into an actionable summary.",
    schedule: "8 PM (daily)",
    trigger: "cron",
    status: "active",
    steps: [
      "Access Gmail and search for newsletters received today",
      "Filter by relevant senders (tech, AI, productivity, investments)",
      "Extract key takeaways from each newsletter",
      "Generate a structured digest organized by categories",
      "Send summary via Telegram",
    ],
  },
  {
    id: "email-categorization",
    emoji: "📧",
    name: "Email Categorization",
    description: "Categorizes and summarizes daily emails so the owner can start the day without inbox anxiety.",
    schedule: "7:45 AM (daily)",
    trigger: "cron",
    status: "active",
    steps: [
      "Access Gmail and read unread emails from today",
      "Categorize: urgent / collabs / invoices / university / newsletters / other",
      "Summary per category with recommended action",
      "Detect client emails with overdue invoices (>90 days)",
      "Send structured summary via Telegram",
    ],
  },
  {
    id: "weekly-newsletter",
    emoji: "📅",
    name: "Weekly Newsletter",
    description: "Automatic weekly recap of tweets and LinkedIn posts to use as the base for the newsletter.",
    schedule: "Sundays 6 PM",
    trigger: "cron",
    status: "active",
    steps: [
      `Collect tweets from the week (${BRANDING.twitterHandle} via bird CLI)`,
      "Collect published LinkedIn posts",
      "Organize by topics and relevance",
      "Generate a weekly recap draft in newsletter tone",
      "Send via Telegram for review before publishing",
    ],
  },
  {
    id: "advisory-board",
    emoji: "🏛️",
    name: "Advisory Board",
    description: "7 AI advisors with their own personalities and memories. Consult any advisor or convene the full board.",
    schedule: "个按需触发",
    trigger: "demand",
    status: "active",
    steps: [
      "User sends /cfo, /cmo, /cto, /legal, /growth, /coach, or /product",
      "Agent loads the advisory-board/SKILL.md skill",
      "Reads the corresponding advisor's memory file (memory/advisors/)",
      "Responds in the advisor's voice and personality with user context",
      "Updates the memory file with insights learned from the consultation",
      "/board convenes all 7 advisors in sequence and compiles a full board meeting",
    ],
  },
  {
    id: "git-backup",
    emoji: "🔄",
    name: "Git Backup",
    description: "Auto-commit and push the workspace every 4 hours to ensure nothing is lost.",
    schedule: "Every 4h",
    trigger: "cron",
    status: "active",
    steps: [
      "Check for changes in the agent workspace",
      "If changes exist: git add -A",
      "Generate an automatic commit message with timestamp and change summary",
      "git push to the remote repository",
      "Silent if no changes — only notifies on error",
    ],
  },
  {
    id: "nightly-evolution",
    emoji: "🌙",
    name: "Nightly Evolution",
    description: "Autonomous nightly session that implements improvements to Mission Control based on the ROADMAP or invents useful new features.",
    schedule: "3 AM (nightly)",
    trigger: "cron",
    status: "active",
    steps: [
      "Read ROADMAP.md from Mission Control to select the next feature",
      "If no clear features, analyze the current state and invent something useful",
      "Implement the complete feature (code, tests if applicable, UI)",
      "Verify that the Next.js build does not fail",
      "Notify the owner via Telegram with a summary of what was implemented",
    ],
  },
];

function StatusBadge({ status }: { status: "active" | "inactive" }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
      <div style={{
        width: "6px",
        height: "6px",
        borderRadius: "50%",
        backgroundColor: status === "active" ? "var(--positive)" : "var(--text-muted)",
      }} />
      <span style={{
        fontFamily: "var(--font-body)",
        fontSize: "10px",
        fontWeight: 600,
        color: status === "active" ? "var(--positive)" : "var(--text-muted)",
        textTransform: "uppercase",
        letterSpacing: "0.5px",
      }}>
        {status === "active" ? "活跃" : "未激活"}
      </span>
    </div>
  );
}

function TriggerBadge({ trigger }: { trigger: "cron" | "demand" }) {
  return (
    <div style={{
      padding: "2px 7px",
      backgroundColor: trigger === "cron"
        ? "rgba(59, 130, 246, 0.12)"
        : "rgba(168, 85, 247, 0.12)",
      border: `1px solid ${trigger === "cron" ? "rgba(59, 130, 246, 0.25)" : "rgba(168, 85, 247, 0.25)"}`,
      borderRadius: "5px",
      fontFamily: "var(--font-body)",
      fontSize: "10px",
      fontWeight: 600,
      color: trigger === "cron" ? "#60a5fa" : "var(--accent)",
      letterSpacing: "0.4px",
      textTransform: "uppercase" as const,
    }}>
      {trigger === "cron" ? "⏱ Cron" : "⚡ 个按需触发"}
    </div>
  );
}

export default function WorkflowsPage() {
  return (
    <div style={{ padding: "24px" }}>
      {/* Header */}
      <div style={{ marginBottom: "32px" }}>
        <h1 style={{
          fontFamily: "var(--font-heading)",
          fontSize: "24px",
          fontWeight: 700,
          letterSpacing: "-1px",
          color: "var(--text-primary)",
          marginBottom: "4px",
        }}>
          Workflows
        </h1>
        <p style={{ fontFamily: "var(--font-body)", fontSize: "13px", color: "var(--text-secondary)" }}>
          {WORKFLOWS.filter(w => w.status === "active").length} 个活跃流程 · {WORKFLOWS.filter(w => w.trigger === "cron").length} 个自动定时 · {WORKFLOWS.filter(w => w.trigger === "demand").length} 个按需触发
        </p>
      </div>

      {/* Stats row */}
      <div style={{ display: "flex", gap: "12px", marginBottom: "32px", flexWrap: "wrap" }}>
        {[
          { label: "总计 workflows", value: WORKFLOWS.length, color: "var(--text-primary)" },
          { label: "活跃 crons", value: WORKFLOWS.filter(w => w.trigger === "cron" && w.status === "active").length, color: "#60a5fa" },
          { label: "个按需触发", value: WORKFLOWS.filter(w => w.trigger === "demand").length, color: "var(--accent)" },
        ].map((stat) => (
          <div key={stat.label} style={{
            padding: "16px 20px",
            backgroundColor: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "12px",
            minWidth: "140px",
          }}>
            <div style={{
              fontFamily: "var(--font-heading)",
              fontSize: "28px",
              fontWeight: 700,
              color: stat.color,
              letterSpacing: "-1px",
            }}>
              {stat.value}
            </div>
            <div style={{
              fontFamily: "var(--font-body)",
              fontSize: "11px",
              color: "var(--text-muted)",
              marginTop: "2px",
            }}>
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      {/* Workflow cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {WORKFLOWS.map((workflow) => (
          <div key={workflow.id} style={{
            backgroundColor: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "16px",
            padding: "20px 24px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
          }}>
            {/* Card header */}
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "12px", gap: "12px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "10px",
                  backgroundColor: "var(--surface-elevated)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "20px",
                  border: "1px solid var(--border-strong)",
                  flexShrink: 0,
                }}>
                  {workflow.emoji}
                </div>
                <div>
                  <h3 style={{
                    fontFamily: "var(--font-heading)",
                    fontSize: "16px",
                    fontWeight: 700,
                    color: "var(--text-primary)",
                    letterSpacing: "-0.3px",
                    marginBottom: "2px",
                  }}>
                    {workflow.name}
                  </h3>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <TriggerBadge trigger={workflow.trigger} />
                    <StatusBadge status={workflow.status} />
                  </div>
                </div>
              </div>
              {/* Schedule */}
              <div style={{
                padding: "6px 12px",
                backgroundColor: "var(--surface-elevated)",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                fontFamily: "var(--font-body)",
                fontSize: "11px",
                color: "var(--text-secondary)",
                whiteSpace: "nowrap" as const,
                flexShrink: 0,
              }}>
                🕐 {workflow.schedule}
              </div>
            </div>

            {/* Description */}
            <p style={{
              fontFamily: "var(--font-body)",
              fontSize: "13px",
              color: "var(--text-secondary)",
              lineHeight: "1.6",
              marginBottom: "16px",
            }}>
              {workflow.description}
            </p>

            {/* Steps */}
            <div style={{
              backgroundColor: "var(--surface-elevated)",
              borderRadius: "10px",
              padding: "12px 16px",
              border: "1px solid var(--border)",
            }}>
              <div style={{
                fontFamily: "var(--font-body)",
                fontSize: "10px",
                fontWeight: 600,
                color: "var(--text-muted)",
                textTransform: "uppercase",
                letterSpacing: "0.7px",
                marginBottom: "8px",
              }}>
                Steps
              </div>
              <ol style={{ margin: 0, padding: "0 0 0 16px", display: "flex", flexDirection: "column", gap: "4px" }}>
                {workflow.steps.map((step, i) => (
                  <li key={i} style={{
                    fontFamily: "var(--font-body)",
                    fontSize: "12px",
                    color: "var(--text-secondary)",
                    lineHeight: "1.5",
                  }}>
                    {step}
                  </li>
                ))}
              </ol>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
