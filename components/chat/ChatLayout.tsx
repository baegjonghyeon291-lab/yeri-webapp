// 채팅 레이아웃 — 헤더+메시지+입력창 배치
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
}

function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr);
  const days = ["일", "월", "화", "수", "목", "금", "토"];
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 ${days[d.getDay()]}요일`;
}

export default function ChatLayout({
  messages, loading, input, onInputChange, onSend, quickButtons, title = "예리 AI",
}: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "var(--bg-chat)" }}>

      {/* ── 헤더 ── */}
      <div style={{
        padding: "13px 20px",
        background: "var(--bg-header)",
        borderBottom: "1px solid var(--border)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexShrink: 0,
        boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 38, height: 38, borderRadius: 12,
            background: "linear-gradient(135deg, #2ea85a 0%, #3fca6b 100%)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 20,
            boxShadow: "0 2px 8px rgba(63,202,107,0.25)",
            flexShrink: 0,
          }}>
            📈
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 15, color: "#1a2233", letterSpacing: "-0.02em" }}>{title}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 1 }}>
              <div style={{
                width: 6, height: 6, borderRadius: "50%",
                background: "#3fca6b",
                boxShadow: "0 0 5px rgba(63,202,107,0.7)",
              }} />
              <span style={{ fontSize: 11, color: "#3fca6b", fontWeight: 500 }}>분석 가능</span>
            </div>
          </div>
        </div>
        {/* 관심종목 바로가기 */}
        <a href="/watchlist" style={{
          padding: "6px 12px",
          borderRadius: 20,
          background: "var(--accent-light)",
          color: "var(--nav-active-color)",
          fontSize: 12,
          fontWeight: 600,
          border: "1px solid #c8efd8",
          cursor: "pointer",
          textDecoration: "none",
        }}>
          ⭐ 관심종목
        </a>
      </div>

      {/* ── 메시지 목록 ── */}
      <div style={{
        flex: 1, overflowY: "auto",
        padding: "20px 24px",
        display: "flex", flexDirection: "column", gap: 6,
      }}>
        {messages.map((m, i) => {
          const prevM = messages[i - 1];
          const isConsecutiveBot = m.role === "bot" && prevM?.role === "bot";
          const showAvatar = !isConsecutiveBot;
          const showDateDivider = m.date && (!prevM?.date || prevM.date !== m.date);

          return (
            <div key={i}>
              {showDateDivider && m.date && <DateDivider label={formatDateLabel(m.date)} />}
              <MessageBubble message={m} showAvatar={showAvatar} />
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

      {/* ── 입력창 ── */}
      <ChatInput
        value={input}
        onChange={onInputChange}
        onSend={() => onSend()}
        loading={loading}
        quickButtons={quickButtons}
        onQuick={(q) => onSend(q)}
      />
    </div>
  );
}
