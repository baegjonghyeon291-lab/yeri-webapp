"use client";
import { useState, useEffect } from "react";
import { getSessionId } from "@/lib/session";
import { getRiskLevel, getRiskStyle, getRiskClassName } from "@/lib/risk-level";
import LoadingOverlay from "@/components/LoadingOverlay";

const API = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001";

type Tab = "market" | "watchlist";

function ReportCard({ report, onRefresh, loading, portfolioTickers = [] }: {
  report: string;
  onRefresh: () => void;
  loading: boolean;
  portfolioTickers?: string[];
}) {
  const lines = report.split("\n");

  const highlightPortfolioTickers = (text: string, lineContext?: string) => {
    if (!portfolioTickers.length) return text;
    const parts = text.split(new RegExp(`(${portfolioTickers.join("|")})`, "gi"));
    return parts.map((part, i) => {
      if (portfolioTickers.some(t => t.toUpperCase() === part.toUpperCase())) {
        const ctx = lineContext || text;
        const isHighRisk = ctx.includes("⚠️") || ctx.includes("위험") || ctx.includes("HIGH") || ctx.includes("급락");
        return (
          <span key={i} style={{ 
            background: isHighRisk ? "rgba(239,68,68,0.12)" : "rgba(63,202,107,0.15)",
            color: isHighRisk ? "#991b1b" : "#166534", 
            padding: "2px 6px", borderRadius: 6, fontWeight: 700,
            display: "inline-flex", alignItems: "center", gap: 4,
            border: isHighRisk ? "1px solid rgba(239,68,68,0.3)" : "1px solid rgba(63,202,107,0.3)",
            margin: "0 2px"
          }}>
            {part}
            <span style={{ fontSize: 9, background: isHighRisk ? "#ef4444" : "var(--accent)", color: "#fff", padding: "1px 4px", borderRadius: 4 }}>
              {isHighRisk ? "⚠️ 보유중 주의" : "보유중"}
            </span>
          </span>
        );
      }
      return part;
    });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button onClick={onRefresh} disabled={loading} style={{
          padding: "8px 16px", borderRadius: 20, border: "1px solid var(--border)",
          background: "#fff", color: "var(--nav-active-color)", fontSize: 12, fontWeight: 600, cursor: "pointer",
          display: "flex", alignItems: "center", gap: 6,
        }}>🔄 새로 분석</button>
      </div>
      {/* 한줄 결론 카드 */}
      {(() => {
        const overallRisk = getRiskLevel(report);
        const rs = getRiskStyle(overallRisk);
        const conclusionLine = lines.find(l => l.includes("⚠️") || l.includes("👉") || l.includes("결론") || l.includes("요약")) || lines.find(l => l.trim().length > 10) || "";
        return conclusionLine ? (
          <div style={{
            background: overallRisk === 'HIGH' ? 'linear-gradient(135deg, #fff5f5 0%, #ffe4e6 100%)' : overallRisk === 'MEDIUM' ? 'linear-gradient(135deg, #fffcf0 0%, #fff8e1 100%)' : 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
            border: `1px solid ${rs.border}30`, borderRadius: 16, padding: 20, marginBottom: 16,
          }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: rs.color, display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
              {rs.icon} 오늘의 핵심
              <span className={`status-badge ${getRiskClassName(overallRisk)}`}>{overallRisk}</span>
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#1a2233", lineHeight: 1.6 }}>{conclusionLine}</div>
          </div>
        ) : null;
      })()}
      <div style={{ background: "#fff", borderRadius: 16, border: "1px solid var(--border)", boxShadow: "0 2px 8px rgba(0,0,0,0.04)", overflow: "hidden" }}>
        <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border)", background: "var(--accent-light)", display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 32, height: 32, borderRadius: 10, background: "linear-gradient(135deg, #2ea85a 0%, #3fca6b 100%)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>📈</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 13, color: "var(--text-primary)" }}>예리의 브리핑</div>
            <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>{new Date().toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric", weekday: "short" })}</div>
          </div>
        </div>
        <div style={{ padding: "20px 24px" }}>
          {lines.map((line, i) => {
            if (!line.trim()) return <div key={i} style={{ height: 8 }} />;
            if (line.startsWith("---")) return <hr key={i} style={{ border: "none", borderTop: "1px solid var(--border)", margin: "12px 0" }} />;
            
            const sectionEmojis = ["📌", "💹", "📰", "✅", "⚠️", "🧠", "👉", "1.", "2.", "3.", "4.", "5.", "6.", "7.", "8.", "9."];
            const isSection = sectionEmojis.some(e => line.startsWith(e));
            const getStatusClass = (text: string) => {
              if (text.includes("⚠️") || text.includes("위험") || text.includes("High")) return "status-high";
              if (text.includes("👉") || text.includes("주의") || text.includes("Medium")) return "status-medium";
              if (text.includes("💡") || text.includes("참고") || text.includes("Info")) return "status-info";
              return "";
            };
            const sClass = getStatusClass(line);

            if (isSection && line.includes(":")) {
              const colonIdx = line.indexOf(":");
              const label = line.slice(0, colonIdx + 1);
              const content = line.slice(colonIdx + 1).trim();
              return (
                <div key={i} className={`section-container ${sClass}`} style={{ marginBottom: 12, padding: sClass ? "10px 14px" : "0", borderRadius: 10, border: sClass ? "1px solid transparent" : "none" }}>
                  <span style={{ fontWeight: 700, color: "var(--text-primary)", fontSize: 14 }}>{label}</span>
                  {content && <span style={{ fontSize: 14, color: "var(--text-primary)", marginLeft: 4 }}>{highlightPortfolioTickers(content, line)}</span>}
                </div>
              );
            }
            if (line.startsWith("**") && line.endsWith("**")) {
              return <div key={i} style={{ fontWeight: 700, fontSize: 14, color: "var(--text-primary)", marginBottom: 6 }}>{highlightPortfolioTickers(line.slice(2, -2))}</div>;
            }
            if (line.startsWith("•") || line.startsWith("-")) {
              return <div key={i} style={{ fontSize: 13, color: "var(--text-secondary)", paddingLeft: 12, marginBottom: 4, lineHeight: 1.65 }}>{highlightPortfolioTickers(line)}</div>;
            }
            return <div key={i} style={{ fontSize: 14, color: "var(--text-primary)", lineHeight: 1.7, marginBottom: 4 }}>{highlightPortfolioTickers(line)}</div>;
          })}
        </div>
      </div>
    </div>
  );
}

function EmptyState({ tab, onFetch }: { tab: Tab; onFetch: () => void }) {
  return (
    <div style={{ textAlign: "center", padding: "64px 0", color: "var(--text-muted)" }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>📊</div>
      <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 8 }}>{tab === "market" ? "오늘 시장 브리핑을 불러오세요" : "관심종목 브리핑을 생성하세요"}</div>
      <div style={{ fontSize: 13, marginBottom: 24 }}>{tab === "market" ? "S&P500, NASDAQ, 거시경제 + 뉴스 기반 AI 분석" : "관심종목 페이지에서 종목을 추가한 후 생성해보세요"}</div>
      <button onClick={onFetch} style={{ padding: "12px 28px", borderRadius: 24, border: "none", background: "var(--accent)", color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer", boxShadow: "0 4px 14px rgba(63,202,107,0.35)" }}>✨ 브리핑 생성하기</button>
    </div>
  );
}

export default function BriefingPage() {
  const [sessionId, setSessionId] = useState("");
  useEffect(() => { setSessionId(getSessionId()); }, []);
  const [tab, setTab] = useState<Tab>("market");
  const [marketReport, setMarketReport] = useState("");
  const [watchlistReport, setWatchlistReport] = useState("");
  const [watchlist, setWatchlist] = useState<string[]>([]);
  const [portfolioTickers, setPortfolioTickers] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(1);
  const [error, setError] = useState("");

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (loading) {
      setLoadingStep(1);
      timer = setInterval(() => { setLoadingStep(s => (s < 3 ? s + 1 : s)); }, 8000);
    }
    return () => clearInterval(timer);
  }, [loading]);

  useEffect(() => {
    if (!sessionId) return;
    fetch(`${API}/api/watchlist/${sessionId}`).then((r) => r.json()).then((d) => setWatchlist(d.list || [])).catch(() => {});
    const savedPort = localStorage.getItem("yeri_portfolio") || localStorage.getItem("yeri_portfolio_items");
    if (savedPort) {
      try {
        const items = JSON.parse(savedPort);
        const tickers = items.map((i: any) => i.ticker).filter(Boolean);
        setPortfolioTickers(tickers);
      } catch (e) {}
    }
    
    // 브리핑 캐시 복원
    const savedBriefing = localStorage.getItem("yeri_briefing");
    if (savedBriefing) {
      try {
        const parsed = JSON.parse(savedBriefing);
        if (parsed.market) setMarketReport(parsed.market);
        if (parsed.watchlist) setWatchlistReport(parsed.watchlist);
      } catch {}
    }
  }, [sessionId]);

  // 브리핑 캐시 저장
  useEffect(() => {
    if (marketReport || watchlistReport) {
      localStorage.setItem("yeri_briefing", JSON.stringify({ market: marketReport, watchlist: watchlistReport }));
    }
  }, [marketReport, watchlistReport]);

  async function fetchMarket() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API}/api/briefing/market`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setMarketReport(data.report || "");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "알 수 없는 오류");
    } finally {
      setLoading(false);
    }
  }

  async function fetchWatchlist() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API}/api/briefing/${sessionId}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setWatchlistReport(data.report || "");
      setWatchlist(data.list || []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "알 수 없는 오류");
    } finally {
      setLoading(false);
    }
  }

  const currentReport = tab === "market" ? marketReport : watchlistReport;
  const onFetch = tab === "market" ? fetchMarket : fetchWatchlist;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "var(--bg-app)" }}>
      {loading && <LoadingOverlay step={loadingStep} />}
      <div style={{ padding: "14px 24px", background: "#fff", borderBottom: "1px solid var(--border)", flexShrink: 0, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
        <div style={{ fontWeight: 800, fontSize: 16, color: "var(--text-primary)" }}>📊 브리핑</div>
        <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>실제 시장 데이터 + 뉴스 기반 AI 분석</div>
      </div>
      <div style={{ display: "flex", gap: 0, borderBottom: "1px solid var(--border)", background: "#fff", flexShrink: 0 }}>
        {(["market", "watchlist"] as Tab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)} style={{ flex: 1, padding: "12px 0", border: "none", borderBottom: tab === t ? "2px solid var(--accent)" : "2px solid transparent", background: "transparent", color: tab === t ? "var(--nav-active-color)" : "var(--text-secondary)", fontWeight: tab === t ? 700 : 400, fontSize: 13, cursor: "pointer", transition: "all 0.15s" }}>
            {t === "market" ? "🌐 시장 브리핑" : `⭐ 관심종목 브리핑 ${watchlist.length > 0 ? `(${watchlist.length})` : ""}`}
          </button>
        ))}
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
        {tab === "watchlist" && watchlist.length > 0 && (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
            {watchlist.map((t) => (
              <span key={t} style={{ padding: "4px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600, background: "var(--accent-light)", color: "var(--nav-active-color)", border: "1px solid #c8efd8" }}>{t}</span>
            ))}
          </div>
        )}
        {error && (
          <div style={{ padding: "12px 16px", borderRadius: 12, background: "#fff8f8", border: "1px solid #f5c2cc", color: "#d64060", fontSize: 13, marginBottom: 16 }}>
            ⚠️ {error} — API 서버(포트 3001)가 실행 중인지 확인해주세요.
          </div>
        )}
        {!loading && currentReport && <ReportCard report={currentReport} onRefresh={onFetch} loading={loading} portfolioTickers={portfolioTickers} />}
        {!loading && !currentReport && !error && <EmptyState tab={tab} onFetch={onFetch} />}
      </div>
    </div>
  );
}
