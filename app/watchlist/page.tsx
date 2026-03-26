"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getSessionId } from "@/lib/session";

const API = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001";

const STYLES = ["단타", "스윙", "장기"] as const;
type Style = (typeof STYLES)[number];

const styleInfo: Record<Style, { icon: string; desc: string }> = {
  단타: { icon: "⚡", desc: "RSI/MACD 중심 단기 신호" },
  스윙: { icon: "🔄", desc: "중기 이격도 + 추세 신호" },
  장기: { icon: "🌱", desc: "밸류에이션 + 성장성 기준" },
};

export default function WatchlistPage() {
  const router = useRouter();
  const [sessionId, setSessionId] = useState("");
  useEffect(() => { setSessionId(getSessionId()); }, []);
  const [list, setList] = useState<string[]>([]);
  const [style, setStyle] = useState<Style>("스윙");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState("");
  const [dismissed, setDismissed] = useState<Set<number>>(new Set());

  // ── 알림 상태 ──────────────────────────────────────────
  type Alert = { emoji: string; title: string; desc: string; level: string; ticker: string };
  type StockStatus = { ticker: string; name: string; price: number | null; priceStr: string; changePct: number | null; rsi: number | null; score: number; verdict: string; suggestedAction: string; priceSource: string; error?: string };
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [stocks, setStocks] = useState<StockStatus[]>([]);
  const [alertLoading, setAlertLoading] = useState(false);
  const [alertUpdated, setAlertUpdated] = useState<Date | null>(null);

  async function fetchAlerts(refresh = false) {
    if (!sessionId) return;
    setAlertLoading(true);
    try {
      const url = `${API}/api/alerts/${sessionId}${refresh ? "?refresh=true" : ""}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.ok) {
        setAlerts(data.alerts || []);
        setStocks(data.stocks || []);
        setAlertUpdated(new Date());
      }
    } catch { /* 무시 */ } finally { setAlertLoading(false); }
  }

  useEffect(() => { if (sessionId) fetchAlerts(); }, [sessionId]);
  useEffect(() => {
    const t = setInterval(() => fetchAlerts(), 5 * 60 * 1000);
    return () => clearInterval(t);
  }, [sessionId]);

  async function load() {
    try {
      const res = await fetch(`${API}/api/watchlist/${sessionId}`);
      const data = await res.json();
      setList(data.list || []);
      const s = data.style;
      setStyle(STYLES.includes(s) ? s : "스윙");
    } catch { /* API 미연결 시 무시 */ }
  }

  useEffect(() => { load(); }, []);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 2200);
  }

  async function add() {
    if (!input.trim() || loading) return;
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/watchlist/${sessionId}/add`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticker: input.trim().toUpperCase() }),
      });
      const data = await res.json();
      setList(data.list || []);
      setInput("");
      if (data.result === true) showToast("✅ 추가 완료!");
      else if (data.result === "limit_reached") showToast("⚠️ 최대 개수 초과");
      else showToast("이미 등록된 종목");
    } finally { setLoading(false); }
  }

  async function remove(ticker: string) {
    await fetch(`${API}/api/watchlist/${sessionId}/remove`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticker }),
    });
    load();
  }

  async function changeStyle(s: Style) {
    await fetch(`${API}/api/watchlist/${sessionId}/style`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ style: s }),
    });
    setStyle(s);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "var(--bg-app)" }}>

      <div style={{
        padding: "14px 24px",
        background: "#fff",
        borderBottom: "1px solid var(--border)",
        flexShrink: 0,
        boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 16, color: "var(--text-primary)" }}>⭐ 관심종목</div>
            <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>
              브라우저 세션 기준 · 변화 자동 감지
            </div>
          </div>
          {/* 알림 새로고침 버튼 */}
          <button
            onClick={() => fetchAlerts(true)}
            disabled={alertLoading}
            style={{
              padding: "5px 12px", borderRadius: 20, border: "1px solid var(--border)",
              background: "#f5f7fa", color: "var(--text-secondary)",
              fontSize: 11, cursor: alertLoading ? "not-allowed" : "pointer",
              opacity: alertLoading ? 0.6 : 1, transition: "all 0.15s",
            }}
          >
            {alertLoading ? "스캔 중..." : "🔄 알림 새로고침"}
          </button>
        </div>
      </div>

      {alerts.length > 0 && (
        <div style={{
          padding: "12px 16px", background: "#fffbf0",
          borderBottom: "1px solid #fde68a",
          flexShrink: 0, maxHeight: 280, overflowY: "auto",
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#92400e", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
            🔔 새 변화 감지
            <span style={{ fontWeight: 400, color: "#b45309" }}>
              {alertUpdated && `(${alertUpdated.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })})`}
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {alerts.map((a, i) => {
              if (dismissed.has(i)) return null;

              // ── 레벨별 클래스 ──────────────────────────────
              const statusClass = a.level === "HIGH" ? "status-high" : a.level === "MEDIUM" ? "status-medium" : "status-info";
              const borderColor = a.level === "HIGH" ? "var(--status-high-text)" : a.level === "MEDIUM" ? "var(--status-medium-text)" : "var(--status-info-text)";

              return (
                <div key={i} className={statusClass} style={{
                  borderRadius: 12,
                  border: `1px solid ${borderColor}30`,
                  borderLeft: `4px solid ${borderColor}`,
                  padding: "10px 12px",
                  boxShadow: a.level === "HIGH" ? `0 2px 8px ${borderColor}20` : "none",
                }}>
                  {/* 상단: 이모지 + 제목 + 레벨 태그 */}
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                    <span style={{ fontSize: a.level === "HIGH" ? 18 : 15 }}>{a.emoji}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)", flex: 1 }}>
                      <span style={{
                        display: "inline-block", background: "#ecfdf5", color: "#059669",
                        borderRadius: 4, fontSize: 10, fontWeight: 700, padding: "1px 5px", marginRight: 5,
                      }}>{a.ticker}</span>
                      {a.title.replace(a.ticker, "").trim()}
                    </span>
                    <span className={`status-badge ${statusClass}`} style={{ flexShrink: 0 }}>{a.level}</span>
                  </div>

                  {/* 설명 */}
                  <div style={{ fontSize: 11, color: "var(--text-secondary)", marginBottom: 8, paddingLeft: 24 }}>
                    {a.desc}
                  </div>

                  {/* ── 액션 버튼 3개 ──────────────────────── */}
                  <div style={{ display: "flex", gap: 6, paddingLeft: 24 }}>
                    {/* 분석하기 */}
                    <button
                      onClick={() => router.push(`/chat?analyze=${a.ticker}`)}
                      style={{
                        padding: "4px 10px", borderRadius: 20, border: "none",
                        background: a.level === "HIGH" ? "#ef4444" : "var(--accent)",
                        color: "#fff", fontSize: 11, fontWeight: 700,
                        cursor: "pointer", transition: "opacity .15s",
                      }}
                      onMouseOver={e => (e.currentTarget.style.opacity = "0.82")}
                      onMouseOut={e  => (e.currentTarget.style.opacity = "1")}
                    >
                      🔍 분석하기
                    </button>

                    {/* 관심종목 추가 (이미 있는 경우 비활성) */}
                    {!list.includes(a.ticker) && (
                      <button
                        onClick={async () => {
                          await fetch(`${API}/api/watchlist/${sessionId}/add`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ ticker: a.ticker }),
                          });
                          load();
                          showToast(`⭐ ${a.ticker} 관심종목 추가!`);
                        }}
                        style={{
                          padding: "4px 10px", borderRadius: 20,
                          border: "1px solid var(--border)", background: "#fff",
                          color: "var(--text-secondary)", fontSize: 11, cursor: "pointer",
                        }}
                      >
                        ⭐ 관심종목 추가
                      </button>
                    )}

                    {/* 무시 */}
                    <button
                      onClick={() => setDismissed(prev => new Set([...prev, i]))}
                      style={{
                        padding: "4px 10px", borderRadius: 20,
                        border: "1px solid #e5e7eb", background: "transparent",
                        color: "#9ca3af", fontSize: 11, cursor: "pointer", marginLeft: "auto",
                      }}
                    >
                      무시
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 투자 스타일 탭 */}
      <div style={{
        padding: "14px 24px",
        background: "#fff",
        borderBottom: "1px solid var(--border)",
        flexShrink: 0,
      }}>
        <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 9, fontWeight: 600 }}>투자 스타일</div>
        <div style={{ display: "flex", gap: 6 }}>
          {STYLES.map((s) => (
            <button
              key={s}
              onClick={() => changeStyle(s)}
              style={{
                padding: "6px 14px",
                borderRadius: 20,
                border: style === s ? "1.5px solid var(--accent)" : "1.5px solid var(--border)",
                background: style === s ? "var(--accent-light)" : "#f5f7fa",
                color: style === s ? "var(--nav-active-color)" : "var(--text-secondary)",
                cursor: "pointer",
                fontSize: 12,
                fontWeight: style === s ? 700 : 400,
                transition: "all 0.15s",
              }}
            >
              {styleInfo[s].icon} {s}
            </button>

          ))}
        </div>
        <div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 8 }}>
          {styleInfo[style].icon} {styleInfo[style].desc}
        </div>
      </div>

      {/* 목록 */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 16px" }}>
        {alertLoading && !alertUpdated && list.length > 0 && (
          <div style={{ textAlign: "center", padding: "24px 0", color: "var(--text-muted)", fontSize: 12 }}>
            ⏳ 종목 데이터 불러오는 중...
          </div>
        )}
        {list.length === 0 ? (
          <div style={{ textAlign: "center", padding: "64px 0", color: "var(--text-muted)" }}>
            <div style={{ fontSize: 44, marginBottom: 14 }}>📭</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-secondary)" }}>관심 종목이 없어요</div>
            <div style={{ fontSize: 12, marginTop: 6 }}>
              아래 입력창에서 티커를 추가하면<br />가격·RSI·AI점수를 바로 확인할 수 있어요
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {list.map((ticker, i) => {
              const st = stocks.find(s => s.ticker === ticker);
              const hasAlert = alerts.some(a => a.ticker === ticker && !dismissed.has(alerts.indexOf(a)));
              const changePct = st?.changePct ?? null;
              const isUp = changePct !== null && changePct > 0;
              const isDown = changePct !== null && changePct < 0;
              const rsi = st?.rsi ?? null;
              const rsiColor = rsi !== null
                ? rsi < 30 ? "#059669" : rsi > 70 ? "#dc2626" : "var(--text-muted)"
                : "var(--text-muted)";

              return (
                <div key={ticker} style={{
                  background: "#fff",
                  borderRadius: 14,
                  border: hasAlert ? "1.5px solid #fca5a5" : "1px solid var(--border)",
                  boxShadow: hasAlert ? "0 2px 8px rgba(239,68,68,0.08)" : "0 1px 3px rgba(0,0,0,0.04)",
                  padding: "14px 16px",
                  transition: "box-shadow 0.15s",
                }}>
                  {/* 상단: 번호 + 티커 + 알림 도트 + 삭제 */}
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: st ? 10 : 0 }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: 8,
                      background: "var(--accent-light)", border: "1px solid #c8efd8",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      color: "var(--nav-active-color)", fontWeight: 800, fontSize: 11, flexShrink: 0,
                    }}>
                      {i + 1}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontWeight: 700, fontSize: 14, color: "var(--text-primary)" }}>{ticker}</span>
                        {hasAlert && (
                          <span style={{
                            width: 7, height: 7, borderRadius: "50%",
                            background: "#ef4444", display: "inline-block",
                            animation: "alertPulse 2s infinite",
                          }} title="새 알림 있음" />
                        )}
                      </div>
                      {st?.verdict && (
                        <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 1 }}>
                          {st.verdict} · {st.suggestedAction}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => remove(ticker)}
                      style={{
                        padding: "4px 10px", borderRadius: 20,
                        border: "1px solid #f5c2cc", background: "#fff8f8",
                        color: "#d64060", cursor: "pointer", fontSize: 11, fontWeight: 500, flexShrink: 0,
                      }}
                    >
                      삭제
                    </button>
                  </div>

                  {/* 하단: 가격/RSI/AI점수/분석하기 */}
                  {st && !st.error && (
                    <div style={{
                      display: "flex", alignItems: "center", gap: 8,
                      paddingTop: 8, borderTop: "1px solid #f3f4f6",
                      flexWrap: "wrap",
                    }}>
                      {/* 가격 */}
                      <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>
                        {st.priceStr || "N/A"}
                      </span>
                      {changePct !== null && (
                        <span style={{
                          fontSize: 11, fontWeight: 600,
                          color: isUp ? "#059669" : isDown ? "#dc2626" : "var(--text-muted)",
                          background: isUp ? "#ecfdf5" : isDown ? "#fff5f5" : "#f9fafb",
                          borderRadius: 5, padding: "1px 6px",
                        }}>
                          {isUp ? "+" : ""}{changePct.toFixed(2)}%
                        </span>
                      )}
                      {/* RSI */}
                      <span style={{
                        fontSize: 11, color: rsiColor, fontWeight: 600,
                        background: "#f9fafb", borderRadius: 5, padding: "1px 6px",
                      }}>
                        RSI {rsi !== null ? rsi.toFixed(1) : "—"}
                        {rsi !== null && rsi < 30 ? " 과매도" : rsi !== null && rsi > 70 ? " 과매수" : ""}
                      </span>
                      {/* AI점수 */}
                      <span style={{
                        fontSize: 11, color: "var(--text-muted)",
                        background: "#f9fafb", borderRadius: 5, padding: "1px 6px",
                      }}>
                        AI {st.score}/40
                      </span>
                      {/* 분석하기 */}
                      <button
                        onClick={() => router.push(`/chat?analyze=${ticker}`)}
                        style={{
                          marginLeft: "auto", padding: "3px 10px", borderRadius: 20, border: "none",
                          background: "var(--accent)", color: "#fff",
                          fontSize: 11, fontWeight: 700, cursor: "pointer",
                          transition: "opacity .15s",
                        }}
                        onMouseOver={e => (e.currentTarget.style.opacity = "0.82")}
                        onMouseOut={e => (e.currentTarget.style.opacity = "1")}
                      >
                        🔍 분석
                      </button>
                    </div>
                  )}
                  {/* 스캔 대기 상태 */}
                  {!st && alertUpdated && (
                    <div style={{ fontSize: 11, color: "var(--text-muted)", paddingTop: 6, borderTop: "1px solid #f3f4f6" }}>
                      데이터 준비 중 — 알림 새로고침 후 표시됩니다
                    </div>
                  )}
                  <style>{`@keyframes alertPulse { 0%,100% { box-shadow:0 0 0 0 rgba(239,68,68,.5); } 50% { box-shadow:0 0 0 5px rgba(239,68,68,0); } }`}</style>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 하단 입력창 */}
      <div style={{
        borderTop: "1px solid var(--border)",
        background: "#fff",
        padding: "12px 16px 14px",
        flexShrink: 0,
        boxShadow: "0 -1px 8px rgba(0,0,0,0.04)",
      }}>
        {toast && (
          <div style={{ fontSize: 12, color: "var(--nav-active-color)", marginBottom: 8, fontWeight: 500 }}>{toast}</div>
        )}
        <div style={{ display: "flex", gap: 8 }}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && add()}
            placeholder="티커 입력 (예: AAPL, 005930)"
            style={{
              flex: 1, padding: "10px 16px", borderRadius: 24,
              background: "#f5f7fa",
              border: "1.5px solid var(--border-input)",
              color: "var(--text-primary)",
              fontSize: 14, outline: "none", fontFamily: "inherit",
            }}
            onFocus={(e) => { e.target.style.borderColor = "var(--accent)"; }}
            onBlur={(e) => { e.target.style.borderColor = "var(--border-input)"; }}
          />
          <button
            onClick={add}
            disabled={loading || !input.trim()}
            style={{
              width: 42, height: 42, borderRadius: "50%", border: "none",
              background: input.trim() ? "var(--accent)" : "#e5e9f0",
              color: input.trim() ? "#fff" : "var(--text-muted)",
              fontWeight: 700, cursor: input.trim() ? "pointer" : "not-allowed",
              fontSize: 20,
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: input.trim() ? "0 2px 8px rgba(63,202,107,0.35)" : "none",
              transition: "all 0.15s",
            }}
          >
            +
          </button>
        </div>
      </div>
    </div>
  );
}
