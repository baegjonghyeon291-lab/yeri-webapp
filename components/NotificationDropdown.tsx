"use client";

import { useState, useEffect, useRef } from "react";
import { getSessionId } from "@/lib/session";

const API = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001";

interface Notification {
  id: string;
  type: string;
  message: string;
  ticker: string;
  isRead: boolean;
  createdAt: string;
}

const TYPE_META: Record<string, { icon: string; color: string; bg: string; label: string }> = {
  TAKE_PROFIT:    { icon: "🎯", color: "#166534", bg: "#f0fdf4", label: "수익 목표 달성" },
  STOP_LOSS:      { icon: "🚨", color: "#991b1b", bg: "#fff1f2", label: "손절 경보" },
  PRICE_ABOVE:    { icon: "🚀", color: "#1d4ed8", bg: "#eff6ff", label: "목표가 돌파" },
  PRICE_BELOW:    { icon: "📉", color: "#92400e", bg: "#fffbeb", label: "이탈가 하락" },
  TOTAL_VALUE:    { icon: "💰", color: "#5b21b6", bg: "#faf5ff", label: "평가금액 달성" },
  WEIGHT_WARNING: { icon: "⚖️", color: "#b45309", bg: "#fffbeb", label: "비중 초과" },
  STATUS_WARNING: { icon: "⚠️", color: "#991b1b", bg: "#fff1f2", label: "상태 악화" },
};

export default function NotificationDropdown() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [dropPos, setDropPos] = useState({ top: 0, right: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);
  const sessionId = getSessionId();

  useEffect(() => {
    if (!sessionId) return;
    const fetch_ = async () => {
      try {
        const res = await fetch(`${API}/api/notifications/${sessionId}`);
        const data = await res.json();
        if (data.notifications) setNotifications(data.notifications);
      } catch {}
    };
    fetch_();
    const t = setInterval(fetch_, 10000);
    return () => clearInterval(t);
  }, [sessionId]);

  // 외부 클릭 시 닫기
  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (!isOpen) return;
      if (dropRef.current?.contains(e.target as Node)) return;
      if (btnRef.current?.contains(e.target as Node)) return;
      setIsOpen(false);
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [isOpen]);

  const openDropdown = () => {
    if (isOpen) { setIsOpen(false); return; }
    if (btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      // right: 화면 오른쪽 끝에서 버튼 오른쪽까지 거리
      const rightGap = window.innerWidth - r.right;
      setDropPos({ top: r.bottom + 8, right: Math.max(rightGap, 8) });
    }
    setIsOpen(true);
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const markAsRead = async (id: string | "all") => {
    try {
      setNotifications(prev =>
        id === "all" ? prev.map(n => ({ ...n, isRead: true }))
                     : prev.map(n => n.id === id ? { ...n, isRead: true } : n)
      );
      await fetch(`${API}/api/notifications/${sessionId}/read`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationId: id }),
      });
    } catch {}
  };

  const dropWidth = Math.min(340, window.innerWidth - 24);

  return (
    <div style={{ position: "relative" }}>
      {/* 🔔 벨 버튼 */}
      <button
        ref={btnRef}
        onClick={openDropdown}
        style={{
          width: 36, height: 36, borderRadius: "50%", border: "none",
          background: unreadCount > 0 ? "#fff0f6" : "#f1f5f9",
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer", position: "relative",
        }}
        aria-label="알림 열기"
      >
        <span style={{ fontSize: 18 }}>🔔</span>
        {unreadCount > 0 && (
          <span style={{
            position: "absolute", top: -2, right: -2,
            background: "#e11d48", color: "#fff",
            fontSize: 10, fontWeight: 800,
            width: 18, height: 18, borderRadius: "50%",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 2px 4px rgba(225,29,72,0.4)",
          }}>{unreadCount}</span>
        )}
      </button>

      {/* 📜 드롭다운 — position:fixed로 overflow 잘림 방지 */}
      {isOpen && (
        <div
          ref={dropRef}
          style={{
            position: "fixed",
            top: dropPos.top,
            right: dropPos.right,
            zIndex: 99999,
            width: dropWidth,
            maxHeight: "70vh",
            background: "#fff",
            borderRadius: 18,
            boxShadow: "0 12px 48px rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.04)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          {/* 헤더 */}
          <div style={{
            padding: "14px 16px",
            borderBottom: "1px solid #f1f5f9",
            display: "flex", justifyContent: "space-between", alignItems: "center",
            background: "linear-gradient(135deg, #fff5f9 0%, #fff 100%)",
            flexShrink: 0,
          }}>
            <div>
              <span style={{ fontWeight: 800, fontSize: 14, color: "#1a2233" }}>🔔 스마트 알림</span>
              {unreadCount > 0 && (
                <span style={{ marginLeft: 8, background: "#e11d48", color: "#fff", fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 99 }}>
                  {unreadCount}개 새 알림
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={() => markAsRead("all")}
                style={{ background: "none", border: "none", color: "#be185d", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
              >
                모두 읽음
              </button>
            )}
          </div>

          {/* 알림 목록 */}
          <div style={{ flex: 1, overflowY: "auto" }}>
            {notifications.length === 0 ? (
              <div style={{ padding: "36px 20px", textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
                <div style={{ fontSize: 32, marginBottom: 10 }}>🔕</div>
                도착한 알림이 없어요
              </div>
            ) : (
              notifications.map((n) => {
                const meta = TYPE_META[n.type] || { icon: "📢", color: "#374151", bg: "#f9fafb", label: "알림" };
                return (
                  <div
                    key={n.id}
                    onClick={() => !n.isRead && markAsRead(n.id)}
                    style={{
                      padding: "14px 16px",
                      cursor: n.isRead ? "default" : "pointer",
                      background: n.isRead ? "#fff" : meta.bg,
                      borderBottom: "1px solid #f1f5f9",
                      transition: "background 0.15s",
                    }}
                  >
                    <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                      {/* 아이콘 */}
                      <div style={{
                        width: 34, height: 34, borderRadius: 10, flexShrink: 0,
                        background: n.isRead ? "#f1f5f9" : meta.bg,
                        border: `1px solid ${n.isRead ? "#e2e8f0" : meta.color + "30"}`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 16,
                      }}>{meta.icon}</div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        {/* 라벨 + 티커 */}
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                          <span style={{
                            fontSize: 10, fontWeight: 700,
                            color: n.isRead ? "#94a3b8" : meta.color,
                            background: n.isRead ? "#f1f5f9" : meta.bg,
                            border: `1px solid ${n.isRead ? "#e2e8f0" : meta.color + "30"}`,
                            padding: "1px 6px", borderRadius: 6,
                          }}>{meta.label}</span>
                          <span style={{ fontSize: 11, fontWeight: 700, color: n.isRead ? "#94a3b8" : "#374151" }}>
                            {n.ticker}
                          </span>
                          {!n.isRead && (
                            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#e11d48", display: "inline-block", marginLeft: "auto", flexShrink: 0 }} />
                          )}
                        </div>

                        {/* 메시지 */}
                        <div style={{
                          fontSize: 13, lineHeight: 1.55,
                          color: n.isRead ? "#94a3b8" : "#1a2233",
                          fontWeight: n.isRead ? 400 : 500,
                          wordBreak: "keep-all",
                          whiteSpace: "pre-wrap",
                        }}>
                          {n.message}
                        </div>

                        {/* 시간 */}
                        <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 5 }}>
                          {new Date(n.createdAt).toLocaleString("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
