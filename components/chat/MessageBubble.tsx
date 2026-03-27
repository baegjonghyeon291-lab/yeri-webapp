// 말풍선 컴포넌트
export interface Message {
  role: "user" | "bot";
  content: string;
  time: string;
  date?: string;
  type?: string;
  candidates?: Array<{ ticker: string; name: string; similarity?: number; desc?: string; tier?: string }>;
}

interface Props {
  message: Message;
  showAvatar?: boolean;
  onSend?: (text: string) => void;
}

// 날짜 구분선
export function DateDivider({ label }: { label: string }) {
  return (
    <div className="date-divider">
      <span>{label}</span>
    </div>
  );
}

export default function MessageBubble({ message, showAvatar = true, onSend }: Props) {
  const isUser = message.role === "user";

  /* ── 유저 말풍선 (우측, 그린) ── */
  if (isUser) {
    return (
      <div style={{
        display: "flex", justifyContent: "flex-end",
        alignItems: "flex-end", gap: 5, margin: "1px 0",
      }}>
        <span style={{ fontSize: 10, color: "var(--text-muted)", flexShrink: 0, marginBottom: 1 }}>
          {message.time}
        </span>
        <div
          className="bubble-user-tail"
          style={{
            maxWidth: "66%",
            padding: "10px 14px",
            borderRadius: "18px 18px 4px 18px",
            background: "var(--bubble-user-bg)",
            color: "var(--bubble-user-text)",
            fontSize: 14,
            lineHeight: 1.65,
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            fontWeight: 400,
          }}
        >
          {message.content}
        </div>
      </div>
    );
  }

  /* ── 봇 말풍선 (좌측, 흰색 카드) ── */
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 8, margin: "1px 0" }}>
      {/* 아바타 */}
      <div style={{ width: 36, flexShrink: 0, paddingTop: showAvatar ? 0 : 0 }}>
        {showAvatar && (
          <div style={{
            width: 36, height: 36, borderRadius: 12,
            background: "linear-gradient(135deg, #2ea85a 0%, #3fca6b 100%)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 18,
            boxShadow: "0 2px 6px rgba(63,202,107,0.25)",
          }}>
            📈
          </div>
        )}
      </div>

      <div style={{ maxWidth: "66%" }}>
        {showAvatar && (
          <div style={{
            fontSize: 11, fontWeight: 700, color: "#3a4a5c",
            marginBottom: 5, paddingLeft: 1,
          }}>
            예리
          </div>
        )}
        <div
          className="bubble-bot-tail"
          style={{
            padding: "11px 15px",
            borderRadius: showAvatar ? "4px 18px 18px 18px" : "18px 18px 18px 4px",
            background: "var(--bubble-bot-bg)",
            color: "var(--bubble-bot-text)",
            fontSize: 14,
            lineHeight: 1.7,
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            boxShadow: "var(--bubble-bot-shadow)",
          }}
        >
          {message.content}
        </div>
        <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 4, paddingLeft: 1 }}>
          {message.time}
        </div>

        {/* ── 후보 종목 버튼 목록 ── */}
        {message.type === "candidates" && message.candidates && message.candidates.length > 0 && (
          <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 6 }}>
            {message.candidates.map((c, idx) => (
              <button
                key={idx}
                onClick={() => onSend?.(`${c.ticker} 분석해줘`)}
                style={{
                  padding: "10px 14px",
                  borderRadius: 14,
                  background: "#fff",
                  border: "1px solid #dae1e7",
                  color: "#2c3e50",
                  fontSize: 14,
                  fontWeight: 600,
                  textAlign: "left",
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  gap: 3,
                  boxShadow: "0 2px 4px rgba(0,0,0,0.03)",
                  transition: "all 0.2s",
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.borderColor = "#3fca6b";
                  e.currentTarget.style.transform = "translateY(-1px)";
                  e.currentTarget.style.boxShadow = "0 3px 6px rgba(63,202,107,0.15)";
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.borderColor = "#dae1e7";
                  e.currentTarget.style.transform = "none";
                  e.currentTarget.style.boxShadow = "0 2px 4px rgba(0,0,0,0.03)";
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span>
                    {c.name} <span style={{ color: "var(--text-muted)", fontSize: 12, fontWeight: 500 }}>({c.ticker})</span>
                  </span>
                  <span style={{ fontSize: 12, color: "var(--primary)", fontWeight: 700 }}>🔍 분석</span>
                </div>
                {c.desc && <div style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 500 }}>{c.desc}</div>}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
