"use client";
import { useState, useEffect } from "react";

const API = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001";
const CHAT_ID = "web-default";

const STYLES = ["단타", "스윙", "장기"] as const;
type Style = (typeof STYLES)[number];

const styleInfo: Record<Style, { icon: string; desc: string }> = {
  단타: { icon: "⚡", desc: "RSI/MACD 중심 단기 신호" },
  스윙: { icon: "🔄", desc: "중기 이격도 + 추세 신호" },
  장기: { icon: "🌱", desc: "밸류에이션 + 성장성 기준" },
};

export default function WatchlistPage() {
  const [list, setList] = useState<string[]>([]);
  const [style, setStyle] = useState<Style>("스윙");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState("");

  async function load() {
    try {
      const res = await fetch(`${API}/api/watchlist/${CHAT_ID}`);
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
      const res = await fetch(`${API}/api/watchlist/${CHAT_ID}/add`, {
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
    await fetch(`${API}/api/watchlist/${CHAT_ID}/remove`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticker }),
    });
    load();
  }

  async function changeStyle(s: Style) {
    await fetch(`${API}/api/watchlist/${CHAT_ID}/style`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ style: s }),
    });
    setStyle(s);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "var(--bg-app)" }}>

      {/* 헤더 */}
      <div style={{
        padding: "14px 24px",
        background: "#fff",
        borderBottom: "1px solid var(--border)",
        flexShrink: 0,
        boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
      }}>
        <div style={{ fontWeight: 800, fontSize: 16, color: "var(--text-primary)" }}>⭐ 관심종목</div>
        <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>
          30분마다 자동 감시 · 신호 발생 시 알림
        </div>
      </div>

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
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 24px" }}>
        {list.length === 0 ? (
          <div style={{
            textAlign: "center", padding: "64px 0",
            color: "var(--text-muted)",
          }}>
            <div style={{ fontSize: 44, marginBottom: 14 }}>📭</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-secondary)" }}>관심 종목이 없어요</div>
            <div style={{ fontSize: 12, marginTop: 6 }}>아래 입력창에서 티커를 추가해보세요</div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {list.map((ticker, i) => (
              <div key={ticker} style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "14px 16px",
                background: "#fff",
                borderRadius: 14,
                border: "1px solid var(--border)",
                boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{
                    width: 30, height: 30, borderRadius: 10,
                    background: "var(--accent-light)",
                    border: "1px solid #c8efd8",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: "var(--nav-active-color)",
                    fontWeight: 800, fontSize: 12, flexShrink: 0,
                  }}>
                    {i + 1}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: "var(--text-primary)", letterSpacing: "0.02em" }}>
                      {ticker}
                    </div>
                    <span style={{
                      display: "inline-block", marginTop: 3,
                      fontSize: 10, padding: "1px 7px", borderRadius: 10,
                      background: "var(--accent-light)", border: "1px solid #c8efd8",
                      color: "var(--nav-active-color)", fontWeight: 600,
                    }}>
                      감시 중
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => remove(ticker)}
                  style={{
                    padding: "5px 11px", borderRadius: 20,
                    border: "1px solid #f5c2cc", background: "#fff8f8",
                    color: "#d64060", cursor: "pointer", fontSize: 11, fontWeight: 500,
                  }}
                >
                  삭제
                </button>
              </div>
            ))}
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
