/**
 * Branding Configuration
 *
 * All values are driven by environment variables so no personal or
 * instance-specific information is baked into the codebase.
 * Set the corresponding NEXT_PUBLIC_* variables in your .env.local file.
 */

export const BRANDING = {
  // Main agent name and emoji
  agentName: process.env.NEXT_PUBLIC_AGENT_NAME || "牛二",
  agentEmoji: process.env.NEXT_PUBLIC_AGENT_EMOJI || "🐮",

  // About page — agent identity
  agentLocation: process.env.NEXT_PUBLIC_AGENT_LOCATION || "",
  birthDate: process.env.NEXT_PUBLIC_BIRTH_DATE || "",
  agentAvatar: process.env.NEXT_PUBLIC_AGENT_AVATAR || "",
  agentDescription: process.env.NEXT_PUBLIC_AGENT_DESCRIPTION || "基于 OpenClaw 的 AI 助手",

  // User/owner information
  ownerUsername: process.env.NEXT_PUBLIC_OWNER_USERNAME || "admin",
  ownerEmail: process.env.NEXT_PUBLIC_OWNER_EMAIL || "",
  ownerCollabEmail: process.env.NEXT_PUBLIC_OWNER_COLLAB_EMAIL || "",

  // Social media handles
  twitterHandle: process.env.NEXT_PUBLIC_TWITTER_HANDLE || "",

  // Company/organization name (shown in office 3D view)
  companyName: process.env.NEXT_PUBLIC_COMPANY_NAME || "牛二控制中心",

  // App title (shown in browser tab)
  appTitle: process.env.NEXT_PUBLIC_APP_TITLE || "牛二控制中心",
} as const;

// Helper to get full agent display name
export function getAgentDisplayName(): string {
  return `${BRANDING.agentName} ${BRANDING.agentEmoji}`;
}
