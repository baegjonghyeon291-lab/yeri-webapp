"use client";

import { useEffect, useState } from "react";
import { getSessionId } from "@/lib/session";

interface HotStock {
  ticker: string;
  name: string;
  price: number | null;
  changePct: number | null;
}

interface MarketMood {
  fearGreed: { score: number; ratingKr: string; prev1Week: number } | null;
  vix: string | null;
  usdKrw: number | null;
  status: string;
}

interface Props {
  onAnalyze: (ticker: string) => void;
  recentTickers: string[];
}

function FearGreedBar({ score }: { score: number }) {
  const color = score >= 76 ? "#dc2626" : score >= 56 ? "#f97316" : score >= 46 ? "#eab308" : score >= 26 ? "#3b82f6" : "#6366f1";
  const label = score >= 76 ? "극도의 탐욕" : score >= 56 ? "탐욕" : score >= 46 ? "중립" : score >= 26 ? "공포" : "극도의 공포";
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 12, fontWeight: 700, color }}>Fear & Greed: {score}</span>
        <span style={{ fontSize: 11, color, fontWeight: 600 }}>{label}</span>
      </div>
      <div style={{ height: 6, background: "#f1f5f9", borderRadius: 99, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${score}%`, background: color, borderRadius: 99, transition: "width 0.6s ease" }} />
      </div>
    </div>
  );
}

export default function HomeDashboard({ onAnalyze, recentTickers }: Props) {
  const [hotStocks, setHotStocks] = useState<HotStock[]>([]);
  const [watchlist, setWatchlist] = useState<{ ticker: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [mood, setMood] = useState<MarketMood | null>(null);

  useEffect(() => {
    const API = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001";
    const userId = getSessionId();

    // 1. 핫 종목 + 대시보드 동시 패치
    Promise.allSettled([
      fetch(`${API}/api/hot-stocks`).then(r => r.json()),
      fetch(`${API}/api/dashboard/${userId}`).then(r => r.json()),
    ]).then(([hotRes, dashRes]) => {
      if (hotRes.status === 'fulfilled' && hotRes.value.ok) setHotStocks(hotRes.value.data);
      if (dashRes.status === 'fulfilled' && dashRes.value.ok) {
        const m = dashRes.value.market;
        setMood({ fearGreed: m?.fearGreed ?? null, vix: m?.vix ?? null, usdKrw: m?.usdKrw ?? null, status: m?.status ?? '보통 (중립)' });
      }
    }).finally(() => setLoading(false));

    // 2. 관심종목 로드
    try {
      const ls = JSON.parse(localStorage.getItem('yeri_watchlist') || '[]');
      setWatchlist(ls);
    } catch (e) {}
  }, []);

  return (
    <div style={{ padding: "10px 16px 20px 16px", display: "flex", flexDirection: "column", gap: 24 }}>
      {/* 0. 시장 심리 위젯 */}
      {mood && (
        <section>
          <div style={{ background: "linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)", border: "1px solid rgba(0,0,0,0.06)", borderRadius: 16, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 13, fontWeight: 800, color: "#1a2233" }}>오늘 시장 분위기</span>
              <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{mood.status}</span>
            </div>
            {mood.fearGreed && <FearGreedBar score={mood.fearGreed.score} />}
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              {mood.vix != null && (
                <span style={{ fontSize: 11, color: "var(--text-secondary)", background: "#f1f5f9", borderRadius: 8, padding: "3px 8px" }}>
                  VIX <b style={{ color: "#1a2233" }}>{mood.vix}</b>
                </span>
              )}
              {mood.usdKrw != null && (
                <span style={{ fontSize: 11, color: "var(--text-secondary)", background: "#f1f5f9", borderRadius: 8, padding: "3px 8px" }}>
                  달러 <b style={{ color: "#1a2233" }}>{mood.usdKrw.toLocaleString()}원</b>
                </span>
              )}
              {mood.fearGreed?.prev1Week != null && (
                <span style={{ fontSize: 11, color: "var(--text-secondary)", background: "#f1f5f9", borderRadius: 8, padding: "3px 8px" }}>
                  1주전 <b style={{ color: "#1a2233" }}>{mood.fearGreed.prev1Week}</b>
                </span>
              )}
            </div>
          </div>
        </section>
      )}

      {/* 1. 오늘 핫 종목 */}
      <section>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
          <span style={{ fontSize: 18 }}>🔥</span>
          <h3 style={{ fontSize: 16, fontWeight: 800, color: "#1a2233", margin: 0 }}>지금 가장 핫한 종목</h3>
        </div>
        
        {loading ? (
          <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 4 }}>
            {[1, 2, 3].map((i) => (
              <div key={i} style={{ minWidth: 140, height: 90, background: "#f3f4f6", borderRadius: 16, flexShrink: 0, animation: "pulse 1.5s infinite" }} />
            ))}
          </div>
        ) : (
          <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 8, WebkitOverflowScrolling: "touch", paddingRight: 16 }}>
            {hotStocks.map((stock) => (
              <button
                key={stock.ticker}
                onClick={() => onAnalyze(`${stock.ticker} 분석해줘`)}
                style={{
                  minWidth: 145,
                  padding: "14px",
                  borderRadius: 16,
                  background: "linear-gradient(145deg, #ffffff 0%, #fcfcfd 100%)",
                  border: "1px solid rgba(0,0,0,0.04)",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.03)",
                  textAlign: "left",
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                  flexShrink: 0
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
                  <span style={{ fontSize: 15, fontWeight: 800, color: "#1a2233" }}>{stock.ticker}</span>
                  {stock.changePct != null && (
                    <span style={{ fontSize: 13, fontWeight: 700, color: stock.changePct >= 0 ? "#059669" : "#dc2626" }}>
                      {stock.changePct > 0 ? "+" : ""}{stock.changePct.toFixed(2)}%
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 12, color: "var(--text-secondary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", width: "100%" }}>
                  {stock.name}
                </div>
                {stock.price != null && (
                  <div style={{ fontSize: 13, color: "var(--text-primary)", fontWeight: 600, marginTop: 4 }}>
                    {stock.ticker.includes('.KS') || stock.ticker.includes('.KQ') ? '₩' : '$'}
                    {stock.price.toLocaleString()}
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </section>

      {/* 2. 관심종목 */}
      <section>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 18 }}>⭐</span>
            <h3 style={{ fontSize: 16, fontWeight: 800, color: "#1a2233", margin: 0 }}>내 관심종목</h3>
          </div>
          {watchlist.length > 0 && <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{watchlist.length}개</span>}
        </div>
        
        {watchlist.length === 0 ? (
          <div style={{ padding: "16px", background: "#f8fafc", borderRadius: 14, textAlign: "center", border: "1px dashed #cbd5e1", color: "var(--text-secondary)" }}>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>아직 관심종목이 없어요!</p>
            <p style={{ margin: "4px 0 0 0", fontSize: 12, color: "var(--text-muted)" }}>종목 리포트에서 ⭐을 눌러 추가해보세요.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {watchlist.slice(0, 10).map((w) => (
              <button
                key={w.ticker}
                onClick={() => onAnalyze(`${w.ticker} 분석해줘`)}
                style={{
                  padding: "8px 14px",
                  borderRadius: 20,
                  background: "#fff",
                  border: "1px solid var(--border)",
                  color: "#1a2233",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  boxShadow: "0 1px 3px rgba(0,0,0,0.02)"
                }}
              >
                {w.ticker} <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{w.name}</span>
              </button>
            ))}
          </div>
        )}
      </section>

      {/* 3. 최근 분석 히스토리 */}
      {recentTickers.length > 0 && (
        <section>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
            <span style={{ fontSize: 18 }}>🕒</span>
            <h3 style={{ fontSize: 16, fontWeight: 800, color: "#1a2233", margin: 0 }}>최근 찾아본 종목</h3>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {recentTickers.map((t) => (
              <button
                key={t}
                onClick={() => onAnalyze(`${t} 분석해줘`)}
                style={{
                  padding: "6px 12px",
                  borderRadius: 12,
                  background: "#f1f5f9",
                  border: "none",
                  color: "var(--text-secondary)",
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: "pointer",
                }}
              >
                {t}
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
