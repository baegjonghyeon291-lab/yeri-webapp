// 말풍선 컴포넌트
export interface RecItem {
  ticker: string; name: string; desc?: string;
  totalScore?: number; reason?: string;
  price?: number; changePct?: number;
}
export interface RecData {
  strongPicks?: RecItem[];
  excluded?: Array<{ ticker: string; reason: string }>;
  meta?: { scannedCount: number; elapsedMs: number };
}
export interface Message {
  role: "user" | "bot";
  content: string;
  time: string;
  date?: string;
  type?: string;
  candidates?: Array<{ ticker: string; name: string; similarity?: number; confidence?: number; desc?: string; tier?: string; price?: number; changePct?: number }>;
  expectedQuestions?: string[];
  recData?: RecData;
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
            {message.candidates.map((c, idx) => {
              const currency = c.ticker.endsWith('.KS') || c.ticker.endsWith('.KQ') ? '₩' : '$';
              return (
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
                {c.price != null && (
                  <div style={{ fontSize: 12, fontWeight: 500, color: (c.changePct ?? 0) >= 0 ? '#059669' : '#dc2626' }}>
                    {currency}{c.price.toLocaleString()}
                    {c.changePct != null && ` (${c.changePct > 0 ? '+' : ''}${c.changePct.toFixed(2)}%)`}
                  </div>
                )}
              </button>
              );
            })}
          </div>
        )}

        {/* ── 추천 종목 카드 ── */}
        {message.type === "recommendation" && message.recData && (
          <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
            {message.recData.strongPicks && message.recData.strongPicks.length > 0 ? (
              message.recData.strongPicks.map((item, j) => (
                <button
                  key={`sp-${j}`}
                  onClick={() => onSend?.(`${item.ticker} 분석해줘`)}
                  style={{
                    padding: "12px 14px", borderRadius: 14,
                    background: "linear-gradient(135deg, #ecfdf5, #f0fdf4)",
                    border: "1.5px solid #86efac",
                    textAlign: "left", cursor: "pointer",
                    display: "flex", flexDirection: "column", gap: 4,
                    boxShadow: "0 2px 8px rgba(34,197,94,0.1)",
                    transition: "all 0.2s",
                  }}
                  onMouseOver={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 4px 12px rgba(34,197,94,0.2)"; }}
                  onMouseOut={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "0 2px 8px rgba(34,197,94,0.1)"; }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: "#059669", background: "#d1fae5", padding: "2px 8px", borderRadius: 8 }}>🟢 STRONG PICK</span>
                    <span style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600 }}>{item.totalScore}/20</span>
                  </div>
                  <div style={{ fontWeight: 800, fontSize: 15, color: "#1a2233" }}>{item.ticker}</div>
                  <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>{item.name}{item.desc ? ` — ${item.desc}` : ''}</div>
                  {item.price != null && (
                    <div style={{ fontSize: 12, fontWeight: 600, color: (item.changePct ?? 0) >= 0 ? '#059669' : '#dc2626' }}>
                      ${item.price.toLocaleString()}
                      {item.changePct != null && ` (${item.changePct >= 0 ? '+' : ''}${item.changePct.toFixed(2)}%)`}
                    </div>
                  )}
                  {item.reason && <div style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5 }}>{item.reason}</div>}
                </button>
              ))
            ) : (
              <div style={{ padding: 12, fontSize: 13, color: "var(--text-muted)", textAlign: "center" }}>
                엄격한 필터 기준을 통과한 추천 종목이 없습니다.
              </div>
            )}
            {message.recData.meta && (
              <div style={{ fontSize: 10, color: "var(--text-muted)", textAlign: "right" }}>
                스캔: {message.recData.meta.scannedCount}종목 | {(message.recData.meta.elapsedMs / 1000).toFixed(1)}초
              </div>
            )}
          </div>
        )}

        {/* ── 예상 질문 버튼 ── */}
        {message.expectedQuestions && message.expectedQuestions.length > 0 && (
          <div style={{ marginTop: 10 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", marginBottom: 6 }}>💡 더 궁금한 점이 있으신가요?</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {message.expectedQuestions.map((q, j) => (
                <button
                  key={j}
                  onClick={() => onSend?.(q)}
                  style={{
                    padding: "8px 12px", borderRadius: 12,
                    background: "#f5f7fa", border: "1px solid var(--border)",
                    color: "var(--text-secondary)", fontSize: 12, fontWeight: 500,
                    cursor: "pointer", textAlign: "left",
                    transition: "all 0.15s",
                  }}
                  onMouseOver={e => { e.currentTarget.style.background = "var(--accent-light)"; e.currentTarget.style.borderColor = "#c8efd8"; }}
                  onMouseOut={e => { e.currentTarget.style.background = "#f5f7fa"; e.currentTarget.style.borderColor = "var(--border)"; }}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
