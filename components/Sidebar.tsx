"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/chat", icon: "💬", label: "채팅 분석" },
  { href: "/watchlist", icon: "⭐", label: "관심종목" },
  { href: "/briefing", icon: "📊", label: "브리핑" },
  { href: "/portfolio", icon: "🗂️", label: "포트폴리오" },
];

export default function Sidebar() {
  const pathname = usePathname();
  return (
    <aside
      style={{
        width: 192,
        background: "var(--bg-sidebar)",
        borderRight: "1px solid var(--border)",
        display: "flex",
        flexDirection: "column",
        padding: "20px 0 16px",
        flexShrink: 0,
      }}
    >
      {/* 로고 */}
      <div style={{ padding: "0 16px 24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 10,
              background: "linear-gradient(135deg, #2ea85a 0%, #3fca6b 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 18,
              boxShadow: "0 2px 8px rgba(63,202,107,0.3)",
              flexShrink: 0,
            }}
          >
            📈
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 14, color: "#1a2233", letterSpacing: "-0.02em" }}>예리</div>
            <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 1 }}>AI 투자 비서</div>
          </div>
        </div>
      </div>

      {/* 네비 */}
      <nav style={{ flex: 1, padding: "0 8px" }}>
        {navItems.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link key={item.href} href={item.href}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 9,
                  padding: "9px 10px",
                  borderRadius: 10,
                  marginBottom: 2,
                  background: active ? "var(--nav-active-bg)" : "transparent",
                  color: active ? "var(--nav-active-color)" : "var(--text-secondary)",
                  fontWeight: active ? 700 : 400,
                  fontSize: 13,
                  cursor: "pointer",
                  transition: "background 0.15s, color 0.15s",
                }}
              >
                <span style={{ fontSize: 16 }}>{item.icon}</span>
                {item.label}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* 푸터 */}
      <div style={{ padding: "0 16px", fontSize: 10, color: "var(--text-muted)", lineHeight: 1.6 }}>
        GPT-4.1 · o3 분석
      </div>
    </aside>
  );
}
