"use client";
import { useState } from "react";

const API = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001";

interface PortfolioItem {
  name: string;
  ticker: string;
  weight: number;
}

const PRESETS: PortfolioItem[][] = [
  [{ name: "NVDA", ticker: "NVDA", weight: 40 }, { name: "AAPL", ticker: "AAPL", weight: 30 }, { name: "TSLA", ticker: "TSLA", weight: 30 }],
  [{ name: "SPY", ticker: "SPY", weight: 50 }, { name: "QQQ", ticker: "QQQ", weight: 30 }, { name: "TLT", ticker: "TLT", weight: 20 }],
];

export default function PortfolioPage() {
  const [items, setItems] = useState<PortfolioItem[]>([
    { name: "", ticker: "", weight: 50 },
    { name: "", ticker: "", weight: 50 },
  ]);
  const [report, setReport] = useState("");
  const [loading, setLoading] = useState(false);

  const totalWeight = items.reduce((s, i) => s + Number(i.weight), 0);

  function addItem() {
    setItems((p) => [...p, { name: "", ticker: "", weight: 0 }]);
  }

  function removeItem(idx: number) {
    setItems((p) => p.filter((_, i) => i !== idx));
  }

  function update(idx: number, field: keyof PortfolioItem, val: string | number) {
    setItems((p) => p.map((item, i) => i === idx ? { ...item, [field]: val } : item));
  }

  async function analyze() {
    if (totalWeight !== 100) return alert("비중 합계가 100%가 되어야 합니다.");
    const valid = items.filter(i => i.ticker.trim());
    if (valid.length < 2) return alert("최소 2개 종목이 필요합니다.");
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/portfolio/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: valid }),
      });
      const data = await res.json();
      setReport(data.report || data.error || "분석 실패");
    } finally { setLoading(false); }
  }

  function applyPreset(preset: PortfolioItem[]) {
    setItems(preset);
    setReport("");
  }

  return (
    <div style={{ height: "100vh", overflowY: "auto", padding: 32, background: "var(--bg-primary)" }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>🗂️ 포트폴리오 분석</h1>
      <p style={{ color: "var(--text-secondary)", fontSize: 14, marginBottom: 24 }}>구성 종목과 비중을 입력하면 AI가 전체 포트폴리오를 분석합니다</p>

      {/* 프리셋 */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 8 }}>빠른 프리셋</div>
        <div style={{ display: "flex", gap: 8 }}>
          {["성장형 (NVDA/AAPL/TSLA)", "안정형 (SPY/QQQ/TLT)"].map((label, i) => (
            <button key={label} onClick={() => applyPreset(PRESETS[i])}
              style={{ padding: "6px 14px", borderRadius: 8, border: "1px solid var(--border)", background: "transparent", color: "var(--text-secondary)", cursor: "pointer", fontSize: 12 }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* 종목 입력 */}
      <div style={{ marginBottom: 20 }}>
        {items.map((item, i) => (
          <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "center" }}>
            <input value={item.ticker} onChange={(e) => update(i, "ticker", e.target.value.toUpperCase())}
              placeholder="티커 (예: AAPL)"
              style={{ width: 110, padding: "10px 12px", borderRadius: 8, background: "var(--bg-input)", border: "1px solid var(--border)", color: "var(--text-primary)", fontSize: 13, outline: "none" }} />
            <input value={item.name} onChange={(e) => update(i, "name", e.target.value)}
              placeholder="이름 (선택)"
              style={{ flex: 1, padding: "10px 12px", borderRadius: 8, background: "var(--bg-input)", border: "1px solid var(--border)", color: "var(--text-primary)", fontSize: 13, outline: "none" }} />
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <input type="number" value={item.weight} onChange={(e) => update(i, "weight", Number(e.target.value))}
                style={{ width: 64, padding: "10px 8px", borderRadius: 8, background: "var(--bg-input)", border: "1px solid var(--border)", color: "var(--text-primary)", fontSize: 13, outline: "none", textAlign: "right" }} />
              <span style={{ color: "var(--text-secondary)", fontSize: 13 }}>%</span>
            </div>
            {items.length > 2 && (
              <button onClick={() => removeItem(i)} style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #ef4444", background: "transparent", color: "#ef4444", cursor: "pointer", fontSize: 12 }}>✕</button>
            )}
          </div>
        ))}

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12 }}>
          <button onClick={addItem} style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid var(--border)", background: "transparent", color: "var(--text-secondary)", cursor: "pointer", fontSize: 13 }}>+ 종목 추가</button>
          <div style={{ fontSize: 14, color: totalWeight === 100 ? "var(--accent)" : "#ef4444", fontWeight: 600 }}>
            합계: {totalWeight}% {totalWeight !== 100 && "(100%가 되어야 합니다)"}
          </div>
        </div>
      </div>

      <button onClick={analyze} disabled={loading || totalWeight !== 100}
        style={{
          width: "100%", padding: "14px", borderRadius: 12, border: "none",
          background: loading || totalWeight !== 100 ? "var(--bg-input)" : "var(--accent)",
          color: loading || totalWeight !== 100 ? "var(--text-secondary)" : "#000",
          fontWeight: 700, cursor: loading || totalWeight !== 100 ? "not-allowed" : "pointer",
          fontSize: 15, marginBottom: 28,
        }}>
        {loading ? "AI 분석 중... (30~60초)" : "🔍 포트폴리오 분석"}
      </button>

      {report && (
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 14, padding: 24 }}>
          <div style={{ color: "var(--text-primary)", fontSize: 14, lineHeight: 1.8, whiteSpace: "pre-wrap" }}>
            {report}
          </div>
        </div>
      )}
    </div>
  );
}
