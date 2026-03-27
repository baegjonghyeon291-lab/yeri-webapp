// 채팅 레이아웃 — 카카오톡형 고정 레이아웃 (모바일 완전 대응)
// 전략: position:fixed + dvh로 height 체인 문제를 완전히 우회
"use client";
import { useEffect, useRef } from "react";
import MessageBubble, { DateDivider, type Message } from "./MessageBubble";
import ChatInput from "./ChatInput";

interface Props {
  messages: Message[];
  loading: boolean;
  input: string;
  onInputChange: (val: string) => void;
  onSend: (text?: string) => void;
  quickButtons?: string[];
  title?: string;
  recentTickers?: string[];
}

function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr);
  const days = ["일", "월", "화", "수", "목", "금", "토"];
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 ${days[d.getDay()]}요일`;
}

export default function ChatLayout({
  messages, loading, input, onInputChange, onSend, quickButtons, title = "예리 AI", recentTickers = [],
}: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  return (
    /*
      position:fixed + inset:0 → viewport 전체를 직접 점유.
      body/main의 height 체인과 완전히 분리되어 항상 화면 꽉 채움.
      Sidebar의 spacer div를 덮기 위해 z-index를 사용.
    */
    <div style={{
      position: "fixed",
      inset: 0,
      display: "flex",
      flexDirection: "column",
      background: "var(--bg-chat)",
      zIndex: 10,
    }}>

      {/* ── 채팅 자체 헤더 ── */}
      <div style={{
        paddingTop: "calc(env(safe-area-inset-top, 0px) + 13px)",
        paddingBottom: "13px",
        paddingLeft: "16px",
        paddingRight: "16px",
        background: "var(--bg-header)",
        borderBottom: "1px solid var(--border)",
        display: "flex",
        alignItems: "center",
        gap: 10,
        flexShrink: 0,
        minHeight: 0,
        boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
      }}>
        {/* ≡ 햄버거 버튼 — 모바일에서 사이드바 드로어 오픈 */}
        <button
          onClick={() => window.dispatchEvent(new CustomEvent("open-sidebar"))}
          aria-label="메뉴 열기"
          data-no-min-height
          style={{
            width: 40, height: 40, minHeight: 40, borderRadius: 10,
            border: "none", background: "#f5f7fa",
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            gap: 5, cursor: "pointer", flexShrink: 0,
            WebkitTapHighlightColor: "transparent",
            touchAction: "manipulation",
            padding: 0,
          }}
        >
          {[0,1,2].map(i => (
            <span key={i} style={{
              width: 18, height: 2, borderRadius: 2,
              background: "var(--text-secondary)", display: "block",
            }} />
          ))}
        </button>

        {/* 예리♡ 타이틀 */}
        <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
          <span style={{
            fontFamily: "'Georgia', 'Noto Serif KR', serif",
            fontStyle: "italic",
            fontWeight: 800,
            fontSize: 20,
            color: "#1a3a2a",
            letterSpacing: "-0.3px",
            lineHeight: 1,
          }}>예리</span>
          <span style={{
            fontSize: 18, color: "var(--accent)", marginLeft: 1,
            filter: "drop-shadow(0 1px 2px rgba(63,202,107,0.4))",
          }}>♥</span>
        </div>

        {/* 가운데: 봇 상태 정보 */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: "#1a2233", letterSpacing: "-0.02em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{title}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 1 }}>
            <div style={{
              width: 6, height: 6, borderRadius: "50%",
              background: "#3fca6b",
              boxShadow: "0 0 5px rgba(63,202,107,0.7)",
            }} />
            <span style={{ fontSize: 10, color: "#3fca6b", fontWeight: 500 }}>분석 가능</span>
            <span style={{ fontSize: 9, color: "var(--text-muted)", marginLeft: 2, fontWeight: 500 }}>
              v:{process.env.NEXT_PUBLIC_BUILD_HASH || "dev"}
            </span>
          </div>
        </div>

        {/* 관심종목 바로가기 */}
        <a href="/watchlist" style={{
          padding: "6px 11px",
          borderRadius: 20,
          background: "var(--accent-light)",
          color: "var(--nav-active-color)",
          fontSize: 11,
          fontWeight: 600,
          border: "1px solid #c8efd8",
          cursor: "pointer",
          textDecoration: "none",
          whiteSpace: "nowrap",
          flexShrink: 0,
        }}>
          ⭐ 관심
        </a>
      </div>


      {/* ── 최근 분석 바 ── */}
      {recentTickers.length > 0 && (
        <div style={{
          padding: "8px 16px",
          background: "#fff",
          borderBottom: "1px solid var(--border)",
          display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap",
          flexShrink: 0,
        }}>
          <span style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 600, flexShrink: 0 }}>
            최근 분석:
          </span>
          {recentTickers.map(t => (
            <button
              key={t}
              onClick={() => onSend(`${t} 분석해줘`)}
              disabled={loading}
              style={{
                padding: "3px 9px", borderRadius: 12,
                border: "1px solid var(--border)", background: "#f5f7fa",
                color: "var(--text-secondary)", fontSize: 11, cursor: "pointer",
                fontWeight: 600, transition: "all 0.15s",
              }}
            >
              {t}
            </button>
          ))}
        </div>
      )}

      {/* ── 메시지 목록 (flex:1 + overflow:auto → 나머지 공간 모두 차지) ── */}
      <div
        ref={scrollRef}
        style={{
          flex: 1,
          overflowY: "auto",
          overflowX: "hidden",
          padding: "20px 16px",
          display: "flex",
          flexDirection: "column",
          gap: 6,
          WebkitOverflowScrolling: "touch",
          overscrollBehavior: "contain",
        }}
      >
        {messages.map((m, i) => {
          const prevM = messages[i - 1];
          const isConsecutiveBot = m.role === "bot" && prevM?.role === "bot";
          const showAvatar = !isConsecutiveBot;
          const showDateDivider = m.date && (!prevM?.date || prevM.date !== m.date);

          return (
            <div key={i}>
              {showDateDivider && m.date && <DateDivider label={formatDateLabel(m.date)} />}
              <MessageBubble message={m} showAvatar={showAvatar} onSend={onSend} />
            </div>
          );
        })}

        {/* 로딩 말풍선 */}
        {loading && (
          <div style={{ display: "flex", alignItems: "flex-start", gap: 8, marginTop: 4 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 12,
              background: "linear-gradient(135deg, #2ea85a 0%, #3fca6b 100%)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 18, flexShrink: 0,
              boxShadow: "0 2px 6px rgba(63,202,107,0.25)",
            }}>📈</div>
            <div style={{ paddingTop: 22 }}>
              <div style={{
                padding: "11px 16px",
                background: "var(--bubble-bot-bg)",
                borderRadius: "4px 18px 18px 18px",
                display: "flex", gap: 5, alignItems: "center",
                boxShadow: "var(--bubble-bot-shadow)",
              }}>
                {[0, 1, 2].map((i) => (
                  <div key={i} style={{
                    width: 7, height: 7, borderRadius: "50%",
                    background: "#aab4c0",
                    animation: `chatBounce 1.2s ease-in-out ${i * 0.2}s infinite`,
                  }} />
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* ── 입력창 (flexShrink:0 → 절대 줄어들지 않음) ── */}
      <ChatInput
        value={input}
        onChange={onInputChange}
        onSend={() => onSend()}
        onSendText={(text) => onSend(text)}
        loading={loading}
        quickButtons={quickButtons}
        onQuick={(q) => onSend(q)}
      />
    </div>
  );
}
