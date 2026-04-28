"use client";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { getSessionId } from "@/lib/session";
import { forceUpdate } from "@/lib/forceUpdate";
import NotificationDropdown from "@/components/NotificationDropdown";

const API = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001";

const navItems = [
  { href: "/",          icon: "🏠", label: "홈 요약" },
  { href: "/chat",      icon: "💬", label: "채팅 분석" },
  { href: "/watchlist", icon: "⭐", label: "관심종목" },
  { href: "/briefing",  icon: "📊", label: "브리핑" },
  { href: "/portfolio", icon: "🗂️", label: "포트폴리오" },
  { href: "/settings",  icon: "⚙️", label: "설정" },
];

export default function Sidebar() {
  const pathname  = usePathname();
  const [open, setOpen]         = useState(false);
  const [alertCount, setAlertCount] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const [devModalOpen, setDevModalOpen] = useState(false);

  // 모바일 감지
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // 라우트 변경 시 드로어 닫기
  useEffect(() => { setOpen(false); }, [pathname]);

  // ChatLayout의 ≡ 버튼에서 발생하는 커스텀 이벤트 수신
  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener("open-sidebar", handler);
    return () => window.removeEventListener("open-sidebar", handler);
  }, []);

  // 알림 배지 폴링
  useEffect(() => {
    const sessionId = getSessionId();
    async function fetchBadge() {
      try {
        const res = await fetch(`${API}/api/alerts/${sessionId}/summary`);
        const data = await res.json();
        if (data.ok) setAlertCount(data.alertCount || 0);
      } catch { /* 무시 */ }
    }
    fetchBadge();
    const t = setInterval(fetchBadge, 5 * 60 * 1000);
    return () => clearInterval(t);
  }, []);

  // ── 공통 nav 아이템 ────────────────────────────────────────────
  const NavItem = ({ item }: { item: typeof navItems[0] }) => {
    const active      = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
    const isWatchlist = item.href === "/watchlist";

    // ChatLayout의 position:fixed 레이아웃이 Next.js App Router의
    // 클라이언트 사이드 전환과 충돌 → 모든 라우트를 full page reload로 처리
    const navigate = (href: string) => {
      window.location.href = href;
    };

    return (
      <div
        role="button"
        tabIndex={0}
        onClick={() => navigate(item.href)}
        onKeyDown={e => e.key === "Enter" && navigate(item.href)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "12px 16px",
          borderRadius: 12,
          marginBottom: 4,
          background: active ? "var(--nav-active-bg)" : "transparent",
          color: active ? "var(--nav-active-color)" : "var(--text-secondary)",
          fontWeight: active ? 700 : 400,
          fontSize: 14,
          cursor: "pointer",
          userSelect: "none",
          WebkitTapHighlightColor: "transparent",
          transition: "background 0.15s, color 0.15s",
          // 터치 영역 최소 48px 확보
          minHeight: 48,
          // 활성 탭 왼쪽 강조 바
          borderLeft: active ? "3px solid var(--accent)" : "3px solid transparent",
          paddingLeft: active ? 13 : 16,
          position: "relative",
        }}
      >
        <span style={{ fontSize: 20, lineHeight: 1, flexShrink: 0 }}>{item.icon}</span>
        <span style={{ flex: 1 }}>{item.label}</span>

        {/* 알림 배지 */}
        {isWatchlist && alertCount > 0 && (
          <span style={{
            background: "#ef4444", color: "#fff",
            borderRadius: 999, fontSize: 10, fontWeight: 700,
            minWidth: 18, height: 18,
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: "0 5px", animation: "alertPulse 2s infinite",
          }}>
            {alertCount}
          </span>
        )}

        {/* 현재 탭 활성 도트 */}
        {active && (
          <span style={{
            position: "absolute", right: 10,
            width: 6, height: 6, borderRadius: "50%",
            background: "var(--accent)",
          }} />
        )}
      </div>
    );
  };

  // ── 데스크톱 사이드바 ────────────────────────────────────────────
  if (!isMobile) {
    return (
      <aside style={{
        width: 192, background: "var(--bg-sidebar)",
        borderRight: "1px solid var(--border)",
        display: "flex", flexDirection: "column",
        padding: "20px 0 16px", flexShrink: 0,
      }}>
        {/* 데스크톱 로고 */}
        <div style={{ padding: "0 14px 24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{
              display: "flex", alignItems: "center", gap: 0,
              cursor: "default",
            }}>
              <span style={{
                fontFamily: "'Georgia', 'Noto Serif KR', serif",
                fontStyle: "italic",
                fontWeight: 800,
                fontSize: 22,
                letterSpacing: "-0.5px",
                color: "#3d1f2e",
                lineHeight: 1,
                transition: "transform 0.2s",
              }}>JH</span>
            </div>
            {/* 데스크톱 알림 센터 벨 */}
            <NotificationDropdown />
          </div>
          <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 3, paddingLeft: 1, letterSpacing: "0.04em" }}>AI 투자 어시스턴트</div>
        </div>

        <nav style={{ flex: 1, padding: "0 8px" }}>
          {navItems.map(item => <NavItem key={item.href} item={item} />)}
          {/* 개발자의 한마디 */}
          <button
            onClick={() => setDevModalOpen(true)}
            style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "12px 16px", borderRadius: 12, marginBottom: 4,
              background: "transparent", color: "var(--text-secondary)",
              fontWeight: 400, fontSize: 14, cursor: "pointer",
              userSelect: "none", WebkitTapHighlightColor: "transparent",
              transition: "background 0.15s, color 0.15s",
              minHeight: 48, borderLeft: "3px solid transparent", paddingLeft: 16,
              border: "none", width: "100%", textAlign: "left",
            }}
            onMouseOver={e => { e.currentTarget.style.background = "#fff0f9"; e.currentTarget.style.color = "#be185d"; }}
            onMouseOut={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text-secondary)"; }}
          >
            <span style={{ fontSize: 20, lineHeight: 1, flexShrink: 0 }}>💌</span>
            <span style={{ flex: 1 }}>개발자의 한마디</span>
          </button>
          {/* 강제 업데이트 비상 버튼 (데스크톱) */}
          <button
            onClick={() => forceUpdate()}
            style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "12px 16px", borderRadius: 12, marginBottom: 4, marginTop: 8,
              background: "transparent", color: "#e65100",
              fontWeight: 500, fontSize: 13, cursor: "pointer",
              userSelect: "none", WebkitTapHighlightColor: "transparent",
              transition: "background 0.15s, color 0.15s",
              minHeight: 44, borderLeft: "3px solid transparent", paddingLeft: 16,
              border: "1px dashed #ffcc80", width: "100%", textAlign: "left",
            }}
            onMouseOver={e => { e.currentTarget.style.background = "#fff3e0"; }}
            onMouseOut={e => { e.currentTarget.style.background = "transparent"; }}
          >
            <span style={{ fontSize: 18, lineHeight: 1, flexShrink: 0 }}>🔄</span>
            <span style={{ flex: 1 }}>강제 업데이트</span>
          </button>
        </nav>
        <div style={{ padding: "0 16px", fontSize: 10, color: "var(--text-muted)" }}>GPT-4.1 · o3 분석 · build:{process.env.NEXT_PUBLIC_BUILD_HASH || "dev"}</div>

        <style>{`
          @keyframes alertPulse {
            0%,100% { box-shadow:0 0 0 0 rgba(239,68,68,.5); }
            50%      { box-shadow:0 0 0 5px rgba(239,68,68,0); }
          }
        `}</style>
      </aside>
    );
  }

  // ── 모바일: 드로어 ────────────────────────────────────────────────
  const currentPage = navItems.find(n => pathname.startsWith(n.href));
  // /chat 페이지는 ChatLayout이 자체 헤더를 보유(position:fixed) → Sidebar 헤더 생략
  const isChatPage = pathname.startsWith("/chat");

  return (
    <>
      {/* 모바일 상단 헤더 — /chat 페이지에선 숨김 (ChatLayout이 자체 헤더 보유) */}
      {!isChatPage && (
        <header style={{
          position: "fixed", top: 0, left: 0, right: 0, zIndex: 200,
          height: "calc(56px + env(safe-area-inset-top, 0px))",
          paddingTop: "env(safe-area-inset-top, 0px)",
          paddingLeft: 16, paddingRight: 16, paddingBottom: 8,
          background: "#fff",
          borderBottom: "1px solid var(--border)",
          display: "flex", alignItems: "center",
          gap: 12,
          boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
        }}>
          {/* 햄버거 버튼 */}
          <button
            onClick={() => setOpen(true)}
            style={{
              width: 40, height: 40, borderRadius: 10,
              border: "none", background: "#f5f7fa",
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              gap: 5, cursor: "pointer", flexShrink: 0,
              WebkitTapHighlightColor: "transparent",
            }}
            aria-label="메뉴 열기"
          >
            {[0,1,2].map(i => (
              <span key={i} style={{
                width: 18, height: 2, borderRadius: 2,
                background: "var(--text-secondary)", display: "block",
              }} />
            ))}
          </button>

          {/* 모바일 헤더 로고 */}
          <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
            <span style={{
              fontFamily: "'Georgia', 'Noto Serif KR', serif",
              fontStyle: "italic",
              fontWeight: 800,
              fontSize: 20,
              color: "#3d1f2e",
              letterSpacing: "-0.3px",
              lineHeight: 1,
            }}>JH</span>
          </div>

          {/* 현재 페이지 이름 */}
          {currentPage && (
            <span style={{
              marginLeft: "auto", fontSize: 12, fontWeight: 600,
              color: "var(--nav-active-color)",
              background: "var(--nav-active-bg)",
              borderRadius: 8, padding: "3px 10px",
            }}>
              {currentPage.icon} {currentPage.label}
            </span>
          )}

          {/* 신규 알림 센터 드롭다운 */}
          <div style={{ marginLeft: !currentPage ? "auto" : 0 }}>
            <NotificationDropdown />
          </div>
        </header>
      )}

      {/* 드로어 오버레이 */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: "fixed", inset: 0, zIndex: 9000,
            background: "rgba(0,0,0,0.45)",
            animation: "fadeIn 0.2s ease",
          }}
        />
      )}

      {/* 드로어 패널 */}
      <div style={{
        position: "fixed", top: 0, left: 0, bottom: 0, zIndex: 9999,
        width: 240, background: "#fff",
        boxShadow: "4px 0 20px rgba(0,0,0,0.15)",
        transform: open ? "translateX(0)" : "translateX(-100%)",
        transition: "transform 0.25s cubic-bezier(0.4,0,0.2,1)",
        display: "flex", flexDirection: "column",
        padding: "20px 0",
        overflowY: "auto",
      }}>
        {/* 드로어 헤더 */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "0 16px 20px",
          borderBottom: "1px solid var(--border)", marginBottom: 12,
        }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
              <span style={{
                fontFamily: "'Georgia', 'Noto Serif KR', serif",
                fontStyle: "italic",
                fontWeight: 800, fontSize: 22,
                color: "#3d1f2e", letterSpacing: "-0.5px", lineHeight: 1,
              }}>JH</span>
            </div>
            <div style={{ fontSize: 10, color: "var(--text-muted)", letterSpacing: "0.04em" }}>AI 투자 어시스턴트</div>
          </div>
          {/* 닫기 버튼 */}
          <button
            onClick={() => setOpen(false)}
            data-no-min-height
            style={{
              width: 32, height: 32, minHeight: 32, borderRadius: 8, border: "none",
              background: "#f5f7fa", fontSize: 16, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              padding: 0,
            }}
          >✕</button>
        </div>

        {/* 네비 */}
        <nav style={{ flex: 1, padding: "0 12px" }}>
          {navItems.map(item => <NavItem key={item.href} item={item} />)}
          {/* 개발자의 한마디 (모바일 드로어) */}
          <button
            onClick={() => { setOpen(false); setTimeout(() => setDevModalOpen(true), 300); }}
            style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "12px 16px", borderRadius: 12, marginBottom: 4,
              background: "transparent", color: "var(--text-secondary)",
              fontWeight: 400, fontSize: 14, cursor: "pointer",
              userSelect: "none", WebkitTapHighlightColor: "transparent",
              transition: "background 0.15s, color 0.15s",
              minHeight: 48, borderLeft: "3px solid transparent", paddingLeft: 16,
              border: "none", width: "100%", textAlign: "left",
            }}
          >
            <span style={{ fontSize: 20, lineHeight: 1, flexShrink: 0 }}>💌</span>
            <span style={{ flex: 1 }}>개발자의 한마디</span>
          </button>
          {/* 강제 업데이트 비상 버튼 (모바일 드로어) */}
          <button
            onClick={() => { setOpen(false); setTimeout(() => forceUpdate(), 300); }}
            style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "12px 16px", borderRadius: 12, marginBottom: 4, marginTop: 8,
              background: "transparent", color: "#e65100",
              fontWeight: 500, fontSize: 13, cursor: "pointer",
              userSelect: "none", WebkitTapHighlightColor: "transparent",
              transition: "background 0.15s",
              minHeight: 44, borderLeft: "3px solid transparent", paddingLeft: 16,
              border: "1px dashed #ffcc80", width: "100%", textAlign: "left",
            }}
          >
            <span style={{ fontSize: 18, lineHeight: 1, flexShrink: 0 }}>🔄</span>
            <span style={{ flex: 1 }}>강제 업데이트</span>
          </button>
        </nav>

        <div style={{ padding: "16px", fontSize: 10, color: "var(--text-muted)", borderTop: "1px solid var(--border)", marginTop: 12 }}>
          GPT-4.1 · o3 분석 · build:{process.env.NEXT_PUBLIC_BUILD_HASH || "dev"}
        </div>
      </div>

      {/* 모바일 본문 상단 여백 — /chat 페이지는 ChatLayout이 직접 처리 */}
      {!isChatPage && <div style={{ height: "calc(56px + env(safe-area-inset-top, 0px))", flexShrink: 0 }} />}

      <style>{`
        @keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
        @keyframes alertPulse {
          0%,100% { box-shadow:0 0 0 0 rgba(239,68,68,.5); }
          50%      { box-shadow:0 0 0 5px rgba(239,68,68,0); }
        }
        [role=button]:active { opacity: 0.75; }
      `}</style>

      {/* ── 개발자의 한마디 모달 (전역) ── */}
      {devModalOpen && (
        <>
          <div
            onClick={() => setDevModalOpen(false)}
            style={{
              position: "fixed", inset: 0, zIndex: 9998,
              background: "rgba(0,0,0,0.45)",
              animation: "devFadeIn 0.25s ease",
            }}
          />
          <div style={{
            position: "fixed", zIndex: 9999,
            top: "50%", left: "50%",
            transform: "translate(-50%, -50%)",
            width: "min(420px, 92vw)",
            maxHeight: "85vh", overflowY: "auto",
            background: "linear-gradient(170deg, #fff5f9 0%, #ffffff 40%, #fdf2f8 100%)",
            borderRadius: 28,
            padding: "32px 28px 28px",
            boxShadow: "0 20px 60px rgba(190,24,93,0.18), 0 0 0 1px rgba(244,114,182,0.2)",
            animation: "devPopIn 0.3s cubic-bezier(0.34,1.56,0.64,1)",
          }}>
            <button
              onClick={() => setDevModalOpen(false)}
              style={{
                position: "absolute", top: 16, right: 16,
                width: 36, height: 36, borderRadius: "50%",
                border: "none", background: "#fce7f3",
                color: "#be185d", fontSize: 18, fontWeight: 700,
                cursor: "pointer", display: "flex",
                alignItems: "center", justifyContent: "center",
                transition: "background 0.15s",
              }}
              onMouseOver={e => { e.currentTarget.style.background = "#fbcfe8"; }}
              onMouseOut={e => { e.currentTarget.style.background = "#fce7f3"; }}
            >✕</button>

            <div style={{ textAlign: "center", marginBottom: 24 }}>
              <div style={{ fontSize: 42, marginBottom: 10 }}>💌</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: "#831843" }}>개발자의 한마디</div>
              <div style={{ fontSize: 12, color: "#9d174d", marginTop: 5 }}>from. 종현 ♥</div>
            </div>

            <div style={{
              background: "rgba(255,255,255,0.7)",
              borderRadius: 18, padding: "24px 22px",
              border: "1px solid #fce7f3",
              fontSize: 14, lineHeight: 2.1,
              color: "#1a2233",
            }}>
              <p>이 앱은 오로지 한명 귀염둥이 종현만을 위한 앱이며,<br />수정사항은 밑에 고객센터로 문의 주시기 바랍니다.</p>
              <div style={{ height: 14 }} />
              <p>하루 이용료는 <b style={{ color: "#be185d" }}>94973억원</b>이며<br />한달 이용료는 <b style={{ color: "#be185d" }}>79494343663억원</b>입니다.</p>
              <div style={{ height: 14 }} />
              <p style={{ background: "#fdf2f8", borderRadius: 12, padding: "12px 14px", border: "1px solid #fce7f3" }}>
                📌 <b>937702-00-770267</b> (국민)<br />
                이 계좌로 입금 바랍니다.
              </p>
              <div style={{ height: 14 }} />
              <p style={{ background: "#fdf2f8", borderRadius: 12, padding: "12px 14px", border: "1px solid #fce7f3" }}>
                📞 고객센터: <b>010-6617-4707</b> (종현)<br />
                <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>고객센터 직원이 1명이라 문의 고객이 많을 시 대기 시간이 발생할 수 있습니다 ㅎ</span>
              </p>
            </div>

            <div style={{ textAlign: "center", marginTop: 20, fontSize: 26, letterSpacing: 8 }}>♥ ♥ ♥</div>
          </div>

          <style>{`
            @keyframes devFadeIn { from { opacity: 0; } to { opacity: 1; } }
            @keyframes devPopIn {
              from { opacity: 0; transform: translate(-50%, -50%) scale(0.85); }
              to   { opacity: 1; transform: translate(-50%, -50%) scale(1); }
            }
          `}</style>
        </>
      )}
    </>
  );
}
