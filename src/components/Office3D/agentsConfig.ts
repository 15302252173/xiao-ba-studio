/**
 * Office 3D — Agent Configuration v3 (Cross-Border E-Commerce Team)
 *
 * Layout:
 *   Back row (supervisor):   小牛 (Director) — center, elevated
 *   Front row (left → right): 设计师, 程序员, 高级运营, 经理
 *   Each agent walks to the round table when working/thinking.
 *   All agents rest at the break room when sleeping.
 */

export interface AgentConfig {
  id: string;
  name: string;
  emoji: string;
  deskPosition: [number, number, number];   // desk furniture position
  seatPosition: [number, number, number];   // avatar idle position (in front of desk)
  tablePosition: [number, number, number];  // round table standing position (working)
  restPosition?: [number, number, number];  // lounge position for sleeping
  restRotation?: number;                    // lounge rotation when sleeping
  restPose?: 'sit' | 'lie';
  faceDirection: number;                     // idle rotation.y (face toward center)
  color: string;
  role: string;
  department: string;                        // team department label
  isMain?: boolean;
  scale?: number;                            // default 1, director 1.5
  // Keep legacy alias for AgentDesk compatibility
  position: [number, number, number];
}

export const AGENTS: AgentConfig[] = [
  // ════════════════════════════════════════════
  // 小牛 — 总控 (Director / General Manager)
  // ════════════════════════════════════════════
  {
    id: "main",
    name: "小牛",
    emoji: "🐮",
    deskPosition: [0, 0, -9.2],
    seatPosition: [0, 1.0, -6.5],
    tablePosition: [0, 1.0, -2.0],   // joins round table when working
    restPosition: [12.95, 0.42, 7.25],
    restRotation: -Math.PI / 2,
    restPose: 'lie',
    faceDirection: Math.PI, // face desk/monitor (-z direction)
    position: [0, 0, -9.2],
    color: "#8B0000",
    role: "总控 Director",
    department: "管理层",
    isMain: true,
    scale: 1.5,
  },

  // ════════════════════════════════════════════
  // 设计师 — Designer (UI/Visual)
  // ════════════════════════════════════════════
  {
    id: "designer",
    name: "设计师",
    emoji: "🎨",
    deskPosition: [-5.5, 0, -4],
    seatPosition: [-5.5, 0.62, -3.0],
    tablePosition: [-2.17, 0.6, -1.25],
    restPosition: [9.87, 0.79, 8.42],
    restRotation: Math.PI,
    restPose: 'sit',
    faceDirection: Math.atan2(5.5, 4),
    position: [-5.5, 0, -4],
    color: "#FF6B6B",
    role: "设计师 Designer",
    department: "创意设计部",
  },

  // ════════════════════════════════════════════
  // 程序员 — Developer (Full-Stack / Tech)
  // ════════════════════════════════════════════
  {
    id: "developer",
    name: "程序员",
    emoji: "💻",
    deskPosition: [5.5, 0, -4],
    seatPosition: [5.5, 0.62, -3.0],
    tablePosition: [2.17, 0.6, -1.25],
    restPosition: [11.05, 0.79, 8.42],
    restRotation: Math.PI,
    restPose: 'sit',
    faceDirection: Math.atan2(-5.5, 4),
    position: [5.5, 0, -4],
    color: "#4CAF50",
    role: "程序员 Developer",
    department: "技术研发部",
  },

  // ════════════════════════════════════════════
  // 高级运营 — Senior Operator (B2C + B2B ops)
  // ════════════════════════════════════════════
  {
    id: "operator",
    name: "高级运营",
    emoji: "📈",
    deskPosition: [-5.5, 0, 3],
    seatPosition: [-5.5, 0.62, 4.0],
    tablePosition: [-2.5, 0.6, 0],
    restPosition: [12.23, 0.79, 8.42],
    restRotation: Math.PI,
    restPose: 'sit',
    faceDirection: Math.atan2(5.5, -3),
    position: [-5.5, 0, 3],
    color: "#FB8C00",
    role: "高级运营 Sr. Operator",
    department: "运营部",
  },

  // ════════════════════════════════════════════
  // 经理 — Manager (Team Lead / PM)
  // ════════════════════════════════════════════
  {
    id: "manager",
    name: "经理",
    emoji: "👔",
    deskPosition: [5.5, 0, 3],
    seatPosition: [5.5, 0.62, 4.0],
    tablePosition: [2.5, 0.6, 0],
    restPosition: [9.55, 0.62, 6.45],
    restRotation: 2.35,
    restPose: 'sit',
    faceDirection: Math.atan2(-5.5, -3),
    position: [5.5, 0, 3],
    color: "#9C27B0",
    role: "经理 Manager",
    department: "项目管理部",
  },

];

export type AgentStatus = "idle" | "working" | "thinking" | "sleeping" | "error";

export interface AgentState {
  id: string;
  status: AgentStatus;
  currentTask?: string;
  model?: string;
  sessionCount?: number;
  totalTokens?: number;
  totalMessages?: number;
  lastActivity?: string;
  recentSessions?: Array<{ id: string; task: string; time: string }>;
}
