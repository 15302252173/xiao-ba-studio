"use client";

import { useEffect, useState } from "react";
import { DollarSign, TrendingUp, TrendingDown, AlertTriangle, Calendar, PieChart } from "lucide-react";
import { LineChart, Line, BarChart, Bar, PieChart as RePieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface CostData {
  today: number;
  yesterday: number;
  thisMonth: number;
  lastMonth: number;
  projected: number;
  budget: number;
  byAgent: Array<{ agent: string; cost: number; tokens: number; inputTokens?: number; outputTokens?: number; cacheRead?: number; cacheWrite?: number; percentOfTotal?: number; messages?: number }>;
  byModel: Array<{ model: string; cost: number; tokens: number; inputTokens?: number; outputTokens?: number; percentOfTotal?: number; messages?: number }>;
  daily: Array<{ date: string; cost: number; input: number; output: number }>;
  hourly: Array<{ hour: string; cost: number }>;
  totalTokens?: number;
  totalMessages?: number;
  liveEstimate?: boolean;
  note?: string;
  message?: string;
}

const COLORS = ['#FF3B30', '#FF9500', '#FFCC00', '#34C759', '#00C7BE', '#30B0C7', '#32ADE6', '#007AFF', '#5856D6', '#AF52DE', '#FF2D55'];

const MODEL_PRICES = {
  "Claude Opus 4.6": { input: 5, output: 25, cacheRead: 0.5, cacheWrite: 6.25 },
  "Claude Sonnet 4.6": { input: 3, output: 15, cacheRead: 0.3, cacheWrite: 3.75 },
  "Claude Haiku 4.5": { input: 1, output: 5, cacheRead: 0.1, cacheWrite: 1.25 },
};

export default function CostsPage() {
  const [costData, setCostData] = useState<CostData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState<"7d" | "30d" | "90d">("30d");

  useEffect(() => {
    fetchCostData();
    const interval = setInterval(fetchCostData, 60000); // Update every minute
    return () => clearInterval(interval);
  }, [timeframe]);

  const fetchCostData = async () => {
    try {
      const res = await fetch(`/api/costs?timeframe=${timeframe}`);
      if (res.ok) {
        const data = await res.json();
        setCostData(data);
      }
    } catch (error) {
      console.error("Failed to fetch cost data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4" style={{ borderColor: "var(--accent)" }}></div>
          <p style={{ color: "var(--text-secondary)" }}>加载费用数据...</p>
        </div>
      </div>
    );
  }

  if (!costData) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <DollarSign className="w-16 h-16 mx-auto mb-4" style={{ color: "var(--text-muted)" }} />
          <p style={{ color: "var(--text-secondary)" }}>Unable to load cost data</p>
        </div>
      </div>
    );
  }

  const budgetPercent = costData.budget > 0 ? (costData.thisMonth / costData.budget) * 100 : 0;
  const budgetColor = budgetPercent < 60 ? "var(--success)" : budgetPercent < 85 ? "var(--warning)" : "var(--error)";
  const todayChange = costData.yesterday > 0 ? ((costData.today - costData.yesterday) / costData.yesterday) * 100 : 0;
  const monthChange = costData.lastMonth > 0 ? ((costData.thisMonth - costData.lastMonth) / costData.lastMonth) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="text-3xl font-bold mb-2"
            style={{
              fontFamily: "var(--font-heading)",
              color: "var(--text-primary)",
            }}
          >
            Cost Analysis
          </h1>
          <p style={{ color: "var(--text-secondary)" }}>
            Token usage and cost tracking across all agents
          </p>
        </div>

        {/* Timeframe selector */}
        <div className="flex gap-2 p-1 rounded-lg" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
          {(["7d", "30d", "90d"] as const).map((tf) => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className="px-4 py-2 rounded-md text-sm font-medium transition-all"
              style={{
                backgroundColor: timeframe === tf ? "var(--accent)" : "transparent",
                color: timeframe === tf ? "white" : "var(--text-secondary)",
              }}
            >
              {tf === "7d" ? "7 days" : tf === "30d" ? "30 days" : "90 days"}
            </button>
          ))}
        </div>
      </div>

      {/* Estimated cost banner */}
      {costData.note && (
        <div className="flex items-center gap-3 p-4 rounded-xl" style={{ backgroundColor: "rgba(10,132,255,0.1)", border: "1px solid rgba(10,132,255,0.3)" }}>
          <span style={{ fontSize: 20 }}>💡</span>
          <p className="text-sm" style={{ color: "var(--accent)" }}>{costData.note}</p>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Today */}
        <div className="p-6 rounded-xl" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm" style={{ color: "var(--text-secondary)" }}>Today</span>
            {todayChange !== 0 && isFinite(todayChange) && (
              <div className="flex items-center gap-1">
                {todayChange > 0 ? (
                  <TrendingUp className="w-3 h-3" style={{ color: "var(--error)" }} />
                ) : (
                  <TrendingDown className="w-3 h-3" style={{ color: "var(--success)" }} />
                )}
                <span
                  className="text-xs font-medium"
                  style={{ color: todayChange > 0 ? "var(--error)" : "var(--success)" }}
                >
                  {Math.abs(todayChange).toFixed(1)}%
                </span>
              </div>
            )}
          </div>
          <div className="text-3xl font-bold" style={{ color: "var(--text-primary)" }}>
            ${(costData.today ?? 0).toFixed(2)}
          </div>
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
            vs ${(costData.yesterday ?? 0).toFixed(2)} yesterday
          </p>
        </div>

        {/* This Month */}
        <div className="p-6 rounded-xl" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm" style={{ color: "var(--text-secondary)" }}>This Month</span>
            {monthChange !== 0 && isFinite(monthChange) && (
              <div className="flex items-center gap-1">
                {monthChange > 0 ? (
                  <TrendingUp className="w-3 h-3" style={{ color: "var(--error)" }} />
                ) : (
                  <TrendingDown className="w-3 h-3" style={{ color: "var(--success)" }} />
                )}
                <span
                  className="text-xs font-medium"
                  style={{ color: monthChange > 0 ? "var(--error)" : "var(--success)" }}
                >
                  {Math.abs(monthChange).toFixed(1)}%
                </span>
              </div>
            )}
          </div>
          <div className="text-3xl font-bold" style={{ color: "var(--text-primary)" }}>
            ${(costData.thisMonth ?? 0).toFixed(2)}
          </div>
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
            vs ${(costData.lastMonth ?? 0).toFixed(2)} last month
          </p>
        </div>

        {/* Projected */}
        <div className="p-6 rounded-xl" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm" style={{ color: "var(--text-secondary)" }}>Projected Monthly</span>
          </div>
          <div className="text-3xl font-bold" style={{ color: "var(--warning)" }}>
            ${(costData.projected ?? 0).toFixed(2)}
          </div>
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
            Based on current pace
          </p>
        </div>

        {/* Budget */}
        <div className="p-6 rounded-xl" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm" style={{ color: "var(--text-secondary)" }}>Budget</span>
            {budgetPercent > 80 && (
              <AlertTriangle className="w-4 h-4" style={{ color: "var(--error)" }} />
            )}
          </div>
          <div className="text-3xl font-bold" style={{ color: budgetColor }}>
            {budgetPercent.toFixed(0)}%
          </div>
          <div className="mt-2 h-2 rounded-full overflow-hidden" style={{ backgroundColor: "var(--card-elevated)" }}>
            <div
              className="h-full transition-all duration-500"
              style={{ width: `${Math.min(budgetPercent, 100)}%`, backgroundColor: budgetColor }}
            />
          </div>
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
            ${(costData.thisMonth ?? 0).toFixed(2)} / ${(costData.budget ?? 0).toFixed(2)}
          </p>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Trend */}
        <div className="p-6 rounded-xl" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
          <h3 className="text-lg font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
            Daily Cost Trend
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={costData.daily}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="date" stroke="var(--text-muted)" style={{ fontSize: "12px" }} />
              <YAxis stroke="var(--text-muted)" style={{ fontSize: "12px" }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--card-elevated)",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                }}
              />
              <Legend />
              <Line type="monotone" dataKey="cost" stroke="var(--accent)" strokeWidth={2} name="Cost ($)" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Cost by Agent */}
        <div className="p-6 rounded-xl" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
          <h3 className="text-lg font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
            Cost by Agent
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={costData.byAgent}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="agent" stroke="var(--text-muted)" style={{ fontSize: "12px" }} />
              <YAxis stroke="var(--text-muted)" style={{ fontSize: "12px" }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--card-elevated)",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                }}
              />
              <Bar dataKey="cost" fill="var(--accent)" name="Cost ($)" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Cost by Model */}
        <div className="p-6 rounded-xl" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
          <h3 className="text-lg font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
            Cost by Model
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <RePieChart>
              <Pie
                data={costData.byModel}
                dataKey="cost"
                nameKey="model"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label={(entry) => `${entry.model}: $${(entry.cost ?? 0).toFixed(2)}`}
              >
                {costData.byModel.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--card-elevated)",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                }}
              />
            </RePieChart>
          </ResponsiveContainer>
        </div>

        {/* Token Usage */}
        <div className="p-6 rounded-xl" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
          <h3 className="text-lg font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
            Token Usage (Daily)
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={costData.daily}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="date" stroke="var(--text-muted)" style={{ fontSize: "12px" }} />
              <YAxis stroke="var(--text-muted)" style={{ fontSize: "12px" }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--card-elevated)",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                }}
              />
              <Legend />
              <Bar dataKey="input" stackId="a" fill="#60A5FA" name="Input Tokens" />
              <Bar dataKey="output" stackId="a" fill="#F59E0B" name="Output Tokens" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Model Pricing Table */}
      <div className="p-6 rounded-xl" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
        <h3 className="text-lg font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
          Model Pricing (per 1M tokens)
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                <th className="text-left py-3 px-4 text-sm font-medium" style={{ color: "var(--text-secondary)" }}>Model</th>
                <th className="text-right py-3 px-4 text-sm font-medium" style={{ color: "var(--text-secondary)" }}>Input</th>
                <th className="text-right py-3 px-4 text-sm font-medium" style={{ color: "var(--text-secondary)" }}>Output</th>
                <th className="text-right py-3 px-4 text-sm font-medium" style={{ color: "var(--text-secondary)" }}>Cache Read</th>
                <th className="text-right py-3 px-4 text-sm font-medium" style={{ color: "var(--text-secondary)" }}>Cache Write</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(MODEL_PRICES).map(([model, prices]) => (
                <tr key={model} style={{ borderBottom: "1px solid var(--border)" }}>
                  <td className="py-3 px-4">
                    <span className="font-medium" style={{ color: "var(--text-primary)" }}>{model}</span>
                  </td>
                  <td className="py-3 px-4 text-right" style={{ color: "var(--text-primary)" }}>${prices.input}</td>
                  <td className="py-3 px-4 text-right" style={{ color: "var(--text-primary)" }}>${prices.output}</td>
                  <td className="py-3 px-4 text-right" style={{ color: "var(--text-secondary)" }}>${prices.cacheRead}</td>
                  <td className="py-3 px-4 text-right" style={{ color: "var(--text-secondary)" }}>${prices.cacheWrite}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detailed table by agent */}
      <div className="p-6 rounded-xl" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
        <h3 className="text-lg font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
          Detailed Breakdown by Agent
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                <th className="text-left py-3 px-4 text-sm font-medium" style={{ color: "var(--text-secondary)" }}>Agent</th>
                <th className="text-right py-3 px-4 text-sm font-medium" style={{ color: "var(--text-secondary)" }}>Tokens</th>
                <th className="text-right py-3 px-4 text-sm font-medium" style={{ color: "var(--text-secondary)" }}>Cost</th>
                <th className="text-right py-3 px-4 text-sm font-medium" style={{ color: "var(--text-secondary)" }}>% of 总计</th>
              </tr>
            </thead>
            <tbody>
              {costData.byAgent.map((agent) => {
                const totalMonth = costData.thisMonth || 1;
                const percent = (agent.cost / totalMonth) * 100;
                return (
                  <tr key={agent.agent} style={{ borderBottom: "1px solid var(--border)" }}>
                    <td className="py-3 px-4">
                      <span className="font-medium" style={{ color: "var(--text-primary)" }}>{agent.agent}</span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-sm" style={{ color: "var(--text-secondary)" }}>
                      {(agent.tokens ?? 0).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right font-semibold" style={{ color: "var(--text-primary)" }}>
                      ${(agent.cost ?? 0).toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-right" style={{ color: "var(--text-secondary)" }}>
                      {isFinite(percent) ? percent.toFixed(1) : '0.0'}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
