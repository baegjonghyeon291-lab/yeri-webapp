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

export default function NotificationDropdown() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const sessionId = getSessionId();

  // Polling notifications
  useEffect(() => {
    if (!sessionId) return;
    const fetchNotifications = async () => {
      try {
        const res = await fetch(`${API}/api/notifications/${sessionId}`);
        const data = await res.json();
        if (data.notifications) setNotifications(data.notifications);
      } catch (e) {}
    };
    fetchNotifications();
    const t = setInterval(fetchNotifications, 10000); // 10초마다 갱신
    return () => clearInterval(t);
  }, [sessionId]);

  // 외부 클릭 시 닫기
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (isOpen && dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isOpen]);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const markAsRead = async (id: string | "all") => {
    try {
      if (id === "all") {
        setNotifications(notifications.map(n => ({...n, isRead: true})));
      } else {
        setNotifications(notifications.map(n => n.id === id ? {...n, isRead: true} : n));
      }
      await fetch(`${API}/api/notifications/${sessionId}/read`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationId: id })
      });
    } catch (e) {}
  };

  return (
    <div style={{ position: "relative" }} ref={dropdownRef}>
      {/* 🔔 벨 아이콘 트리거 */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: 36, height: 36, borderRadius: "50%", border: "none",
          background: unreadCount > 0 ? "#fff5f5" : "#f1f5f9",
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer", position: "relative",
          marginRight: "4px"
        }}
      >
        <span style={{ fontSize: 18 }}>🔔</span>
        {unreadCount > 0 && (
          <span style={{
            position: "absolute", top: -2, right: -2,
            background: "#e11d48", color: "#fff",
            fontSize: 10, fontWeight: 800,
            width: 18, height: 18, borderRadius: "50%",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 2px 4px rgba(225,29,72,0.4)"
          }}>{unreadCount}</span>
        )}
      </button>

      {/* 📜 알림 드롭다운 패널 */}
      {isOpen && (
        <div style={{
          position: "absolute", top: "calc(100% + 8px)", right: 0, zIndex: 9999,
          width: "calc(100vw - 20px)", maxWidth: 320, maxHeight: 400, background: "#fff", borderRadius: 16,
          boxShadow: "0 10px 40px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.03)",
          display: "flex", flexDirection: "column", overflow: "hidden"
        }}>
          <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f8fafc" }}>
            <span style={{ fontWeight: 800, fontSize: 14 }}>스마트 알림 센터</span>
            {unreadCount > 0 && (
              <button onClick={() => markAsRead("all")} style={{ background: "none", border: "none", color: "var(--accent)", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>모두 읽음</button>
            )}
          </div>
          
          <div style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>
            {notifications.length === 0 ? (
              <div style={{ padding: "30px", textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>도착한 알림이 없습니다.</div>
            ) : (
              notifications.map((n) => (
                <div key={n.id} 
                  onClick={() => !n.isRead && markAsRead(n.id)}
                  style={{ 
                    padding: "12px 16px", cursor: "pointer",
                    background: n.isRead ? "#fff" : "#fdf8fa",
                    borderBottom: "1px solid #f1f5f9",
                    transition: "background 0.2s"
                  }}
                >
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                    {!n.isRead && <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#e11d48", flexShrink: 0, marginTop: 6 }} />}
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
                      <span style={{ fontSize: 13, lineHeight: 1.5, color: n.isRead ? "var(--text-secondary)" : "var(--text-primary)", fontWeight: n.isRead ? 400 : 600 }}>{n.message}</span>
                      <span style={{ fontSize: 10, color: "var(--text-muted)" }}>{new Date(n.createdAt).toLocaleString("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
