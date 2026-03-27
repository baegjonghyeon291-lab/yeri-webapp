// 말풍선 컴포넌트 — 예리 채팅 UI 통합 스타일
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

function fmtCurrency(ticker: string) {
  return ticker.endsWith('.KS') || ticker.endsWith('.KQ') ? '₩' : '$';
}

function ChangeText({ pct }: { pct?: number | null }) {
  if (pct == null) return null;
  const color = pct >= 0 ? '#059669' : '#dc2626';
  const sign = pct > 0 ? '+' : '';
  return <span style={{ color, fontWeight: 600 }}>{sign}{pct.toFixed(2)}%</span>;
}

export default function MessageBubble({ message, showAvatar = true, onSend }: Props) {
  const isUser = message.role === "user";
  const hasRichContent = message.type === "candidates" || message.type === "recommendation" || (message.expectedQuestions && message.expectedQuestions.length > 0);

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
      <div style={{ width: 36, flexShrink: 0 }}>
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

      {/* 리치 콘텐츠(후보/추천/예상질문)가 있으면 더 넓게 */}
      <div style={{ maxWidth: hasRichContent ? "min(88%, 420px)" : "66%", minWidth: hasRichContent ? 260 : undefined }}>
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

        {/* ── 후보 종목 카드 ── */}
        {message.type === "candidates" && message.candidates && message.candidates.length > 0 && (
          <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 6 }}>
            {message.candidates.map((c, idx) => {
              const cur = fmtCurrency(c.ticker);
              return (
                <button
                  key={idx}
                  onClick={() => onSend?.(`${c.ticker} 분석해줘`)}
                  style={{
                    padding: "11px 14px",
                    borderRadius: 16,
                    background: "#fff",
                    border: "1.5px solid var(--border)",
                    color: "var(--text-primary)",
                    fontSize: 13,
                    textAlign: "left",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                    transition: "all 0.2s ease",
                    minHeight: 0,
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.borderColor = "var(--accent)";
                    e.currentTarget.style.transform = "translateY(-1px)";
                    e.currentTarget.style.boxShadow = "0 3px 10px rgba(63,202,107,0.15)";
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.borderColor = "var(--border)";
                    e.currentTarget.style.transform = "none";
                    e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.06)";
                  }}
                >
                  {/* 왼쪽: 티커 뱃지 */}
                  <span style={{
                    background: "var(--accent-light)", color: "var(--nav-active-color)",
                    fontWeight: 700, fontSize: 11, padding: "3px 8px",
                    borderRadius: 8, flexShrink: 0, letterSpacing: "0.02em",
                  }}>{c.ticker}</span>

                  {/* 가운데: 이름 + 설명 + 가격 */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, lineHeight: 1.3 }}>
                      {c.name}
                    </div>
                    {c.desc && (
                      <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {c.desc}
                      </div>
                    )}
                    {c.price != null && (
                      <div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 2 }}>
                        {cur}{c.price.toLocaleString()} <ChangeText pct={c.changePct} />
                      </div>
                    )}
                  </div>

                  {/* 오른쪽: 분석 아이콘 */}
                  <span style={{
                    fontSize: 11, color: "var(--accent)", fontWeight: 700, flexShrink: 0,
                    display: "flex", alignItems: "center", gap: 3,
                  }}>
                    분석 →
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* ── 추천 종목 카드 ── */}
        {message.type === "recommendation" && message.recData && (
          <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 6 }}>
            {message.recData.strongPicks && message.recData.strongPicks.length > 0 ? (
              message.recData.strongPicks.map((item, j) => (
                <button
                  key={`sp-${j}`}
                  onClick={() => onSend?.(`${item.ticker} 분석해줘`)}
                  style={{
                    padding: "12px 14px", borderRadius: 16,
                    background: "linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)",
                    border: "1.5px solid #a7f3d0",
                    textAlign: "left", cursor: "pointer",
                    display: "flex", flexDirection: "column", gap: 5,
                    boxShadow: "0 1px 4px rgba(34,197,94,0.08)",
                    transition: "all 0.2s ease",
                    minHeight: 0,
                  }}
                  onMouseOver={e => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 4px 12px rgba(34,197,94,0.15)"; }}
                  onMouseOut={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "0 1px 4px rgba(34,197,94,0.08)"; }}
                >
                  {/* 상단: 배지 + 점수 */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{
                      fontSize: 10, fontWeight: 700, color: "#059669",
                      background: "#d1fae5", padding: "2px 8px", borderRadius: 6,
                    }}>🟢 STRONG PICK</span>
                    <span style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600 }}>{item.totalScore}/20</span>
                  </div>
                  {/* 종목 정보 */}
                  <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                    <span style={{ fontWeight: 800, fontSize: 15, color: "#1a2233" }}>{item.ticker}</span>
                    <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{item.name}</span>
                  </div>
                  {item.price != null && (
                    <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                      ${item.price.toLocaleString()} <ChangeText pct={item.changePct} />
                    </div>
                  )}
                  {item.reason && (
                    <div style={{
                      fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5,
                      background: "rgba(255,255,255,0.6)", borderRadius: 10,
                      padding: "6px 10px", marginTop: 2,
                    }}>{item.reason}</div>
                  )}
                </button>
              ))
            ) : (
              <div style={{
                padding: "14px 16px", fontSize: 13, color: "var(--text-muted)",
                textAlign: "center", background: "#fafafa", borderRadius: 14,
                border: "1px dashed var(--border)",
              }}>
                엄격한 필터 기준을 통과한 추천 종목이 없습니다.
              </div>
            )}
            {message.recData.meta && (
              <div style={{ fontSize: 10, color: "var(--text-muted)", textAlign: "right", paddingRight: 4 }}>
                스캔: {message.recData.meta.scannedCount}종목 · {(message.recData.meta.elapsedMs / 1000).toFixed(1)}초
              </div>
            )}
          </div>
        )}

        {/* ── 예상 질문 버튼 ── */}
        {message.expectedQuestions && message.expectedQuestions.length > 0 && (
          <div style={{ marginTop: 10 }}>
            <div style={{
              fontSize: 11, fontWeight: 600, color: "var(--text-muted)",
              marginBottom: 6, paddingLeft: 2,
            }}>💡 이어서 물어보기</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {message.expectedQuestions.map((q, j) => (
                <button
                  key={j}
                  onClick={() => onSend?.(q)}
                  style={{
                    padding: "7px 14px", borderRadius: 20,
                    background: "var(--accent-light)", border: "1px solid #c8efd8",
                    color: "var(--nav-active-color)", fontSize: 12, fontWeight: 500,
                    cursor: "pointer", textAlign: "left",
                    transition: "all 0.15s ease",
                    whiteSpace: "nowrap",
                    minHeight: 0,
                  }}
                  onMouseOver={e => { e.currentTarget.style.background = "#d4f5e0"; e.currentTarget.style.transform = "translateY(-1px)"; }}
                  onMouseOut={e => { e.currentTarget.style.background = "var(--accent-light)"; e.currentTarget.style.transform = "none"; }}
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
