"use client";

import { useState, useEffect } from "react";
import { Search, Bell, User, Command } from "lucide-react";
import { useIsMobile } from "@/hooks/useIsMobile";
import { GlobalSearch } from "@/components/GlobalSearch";
import { NotificationDropdown } from "@/components/NotificationDropdown";
import { BRANDING } from "@/config/branding";

export function TopBar() {
  const [showSearch, setShowSearch] = useState(false);
  const isMobile = useIsMobile();

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setShowSearch(true);
      }
      if (e.key === "Escape" && showSearch) {
        setShowSearch(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showSearch]);

  return (
    <>
      <div
        className="top-bar"
        style={{
          position: "fixed",
          top: 0,
          left: isMobile ? 0 : "68px",
          right: 0,
          height: "48px",
          backgroundColor: "var(--surface)",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: isMobile ? "0 12px" : "0 20px",
          zIndex: 45,
        }}
      >
        {/* Left: Logo & Title */}
        <div className="flex items-center gap-2" style={{ minWidth: 0 }}>
          <span style={{ fontSize: isMobile ? "18px" : "20px" }}>{BRANDING.agentEmoji}</span>
          <h1
            style={{
              fontFamily: "var(--font-heading)",
              fontSize: isMobile ? "14px" : "16px",
              fontWeight: 700,
              color: "var(--text-primary)",
              letterSpacing: "-0.5px",
              whiteSpace: "nowrap",
            }}
          >
            {BRANDING.appTitle}
          </h1>
          {!isMobile && (
            <div
              style={{
                backgroundColor: "var(--accent-soft)",
                borderRadius: "4px",
                padding: "2px 8px",
              }}
            >
              <span
                style={{
                  fontFamily: "var(--font-body)",
                  fontSize: "9px",
                  fontWeight: 700,
                  color: "var(--accent)",
                  letterSpacing: "1px",
                }}
              >
                v1.0
              </span>
            </div>
          )}
        </div>

        {/* Right: Search + Notifications + User */}
        <div className="flex items-center gap-2">
          {/* Search: icon-only on mobile, full on desktop */}
          {isMobile ? (
            <button
              onClick={() => setShowSearch(true)}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "36px",
                height: "36px",
                borderRadius: "8px",
                backgroundColor: "transparent",
                border: "none",
                cursor: "pointer",
              }}
            >
              <Search style={{ width: "18px", height: "18px", color: "var(--text-muted)" }} />
            </button>
          ) : (
            <button
              onClick={() => setShowSearch(true)}
              className="flex items-center gap-2 transition-all"
              style={{
                width: "240px",
                height: "32px",
                backgroundColor: "var(--surface-elevated)",
                borderRadius: "6px",
                padding: "0 12px",
              }}
            >
              <Search
                className="flex-shrink-0"
                style={{ width: "16px", height: "16px", color: "var(--text-muted)" }}
              />
              <span style={{ fontFamily: "var(--font-body)", fontSize: "12px", color: "var(--text-muted)" }}>
                搜索... 鈱楰
              </span>
            </button>
          )}

          {/* Notifications Dropdown */}
          <NotificationDropdown />

          {/* User Area - hide name on mobile */}
          <div className="flex items-center gap-2">
            <div
              style={{
                width: "28px",
                height: "28px",
                borderRadius: "14px",
                backgroundColor: "var(--accent)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <span style={{ fontFamily: "var(--font-heading)", fontSize: "12px", fontWeight: 700, color: "var(--text-primary)" }}>
                {BRANDING.ownerUsername.charAt(0).toUpperCase()}
              </span>
            </div>
            {!isMobile && (
              <span style={{ fontFamily: "var(--font-body)", fontSize: "12px", fontWeight: 500, color: "var(--text-secondary)" }}>
                {BRANDING.ownerUsername}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Global Search Modal */}
      {showSearch && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]"
          style={{ backgroundColor: "rgba(0, 0, 0, 0.8)" }}
          onClick={() => setShowSearch(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ width: "90%", maxWidth: "42rem" }}
          >
            <GlobalSearch />
          </div>
        </div>
      )}
    </>
  );
}
