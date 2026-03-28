"use client";
import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { getSessionId } from "@/lib/session";
import { getRiskLevel, getRiskLevelByPnl, getRiskStyle, getRiskClassName } from "@/lib/risk-level";
import LoadingOverlay from "@/components/LoadingOverlay";

const API = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001";
const STORAGE_KEY = "yeri_portfolio";
const REPORT_KEY = "yeri_portfolio_report";
const STORAGE_VERSION = 1;

interface PortfolioItem {
  ticker: string;
  name: string;
  quantity: number;
  avgPrice: number;
}

interface ProcessedItem extends PortfolioItem {
  currentPrice: number;
  invested: number;
  current: number;
  pnl: number;
  pnlPct: number;
  currency: string;
}

interface Suggestion {
  ticker: string;
  name: string;
}

export default function PortfolioPage() {
  const [sessionId, setSessionId] = useState("");
  useEffect(() => { setSessionId(getSessionId()); }, []);

  const [items, setItems] = useState<PortfolioItem[]>([
    { ticker: "", name: "", quantity: 0, avgPrice: 0 },
  ]);
  const [marketData, setMarketData] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [report, setReport] = useState("");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const resultRef = useRef<HTMLDivElement>(null);

  // ── 티커 자동완성 ──────────────────────────────────
  const [suggestions, setSuggestions] = useState<Record<number, Suggestion[]>>({});
  const [activeSugIdx, setActiveSugIdx] = useState<number | null>(null);
  const debounceTimers = useRef<Record<number, NodeJS.Timeout>>({});
  const searchCacheRef = useRef<Map<string, any>>(typeof window !== "undefined" ? new Map() : null as any);

  const fetchSuggestions = useCallback(async (idx: number, query: string) => {
    if (query.length < 1) { setSuggestions(p => { const n = { ...p }; delete n[idx]; return n; }); return; }
    
    const cache = searchCacheRef.current;
    if (cache && cache.has(query)) {
      const data = cache.get(query);
      if (data.ok && data.candidates?.length > 0) {
        setSuggestions(p => ({ ...p, [idx]: data.candidates.slice(0, 5) }));
        setActiveSugIdx(idx);
      } else {
        setSuggestions(p => { const n = { ...p }; delete n[idx]; return n; });
      }
      return;
    }

    try {
      const res = await fetch(`${API}/api/suggest?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (cache) cache.set(query, data);
      if (data.ok && data.candidates?.length > 0) {
        setSuggestions(p => ({ ...p, [idx]: data.candidates.slice(0, 5) }));
        setActiveSugIdx(idx);
      } else {
        setSuggestions(p => { const n = { ...p }; delete n[idx]; return n; });
      }
    } catch { setSuggestions(p => { const n = { ...p }; delete n[idx]; return n; }); }
  }, []);

  // 데이터 로드
  useEffect(() => {
    // 하위 버환성 유지
    const savedPort = localStorage.getItem(STORAGE_KEY) || localStorage.getItem("yeri_portfolio_items");
    if (savedPort) {
      try {
        const parsed = JSON.parse(savedPort);
        if (Array.isArray(parsed) && parsed.length > 0) setItems(parsed);
      } catch { /* ignore */ }
    }
    const savedReport = localStorage.getItem(REPORT_KEY);
    if (savedReport) setReport(savedReport);
  }, []);

  // 데이터 저장 (항목)
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    setSaved(true);
    const t = setTimeout(() => setSaved(false), 2000);
    return () => clearTimeout(t);
  }, [items]);

  // 데이터 저장 (리포트)
  useEffect(() => {
    if (report) localStorage.setItem(REPORT_KEY, report);
    else localStorage.removeItem(REPORT_KEY);
  }, [report]);

  // 실시간 시세 조회
  useEffect(() => {
    const tickers = items.map(i => i.ticker).filter(t => t.trim().length > 0);
    if (tickers.length === 0) return;
    async function fetchPrices() {
      try {
        const res = await fetch(`${API}/api/stocks/min-data?tickers=${tickers.join(",")}`);
        const data = await res.json();
        if (data.ok) setMarketData(data.data);
      } catch { /* ignore */ }
    }
    fetchPrices();
    const t = setInterval(fetchPrices, 30000);
    return () => clearInterval(t);
  }, [items.map(i => i.ticker).join(",")]);

  // 자동 계산 통계
  const stats = useMemo(() => {
    let totalInvested = 0;
    let totalCurrent = 0;
    const processed: ProcessedItem[] = items.map(item => {
      const live = marketData[item.ticker] || {};
      const currentPrice = live.price || 0;
      const currency = live.currency === "KRW" ? "₩" : "$";
      const invested = item.quantity * item.avgPrice;
      const current = item.quantity * currentPrice;
      const pnl = current > 0 ? current - invested : 0;
      const pnlPct = invested > 0 && current > 0 ? (pnl / invested) * 100 : 0;
      totalInvested += invested;
      totalCurrent += current;
      return { ...item, currentPrice, invested, current, pnl, pnlPct, currency };
    });
    const totalPnl = totalCurrent > 0 ? totalCurrent - totalInvested : 0;
    const totalPnlPct = totalInvested > 0 && totalCurrent > 0 ? (totalCurrent / totalInvested - 1) * 100 : 0;
    return { items: processed, totalInvested, totalCurrent, totalPnl, totalPnlPct };
  }, [items, marketData]);

  // 시세 수신 완료 여부
  const allPricesLoaded = useMemo(() => {
    const activeTickers = items.filter(i => i.ticker.trim().length > 0);
    if (activeTickers.length === 0) return false;
    return activeTickers.every(i => {
      const live = marketData[i.ticker];
      return live && live.price > 0;
    });
  }, [items, marketData]);

  // 유효성 검사
  const isValid = useMemo(() => {
    if (items.length === 0) return false;
    return items.every(item => item.ticker.trim() !== "" && item.quantity > 0 && item.avgPrice > 0);
  }, [items]);

  // 중복 티커 검사
  const duplicateTickers = useMemo(() => {
    const tickers = items.map(i => i.ticker.toUpperCase()).filter(Boolean);
    const seen = new Set<string>();
    const dupes = new Set<string>();
    tickers.forEach(t => { if (seen.has(t)) dupes.add(t); seen.add(t); });
    return dupes;
  }, [items]);

  function addItem() {
    setItems(p => [...p, { ticker: "", name: "", quantity: 0, avgPrice: 0 }]);
  }

  function removeItem(idx: number) {
    setItems(p => p.filter((_, i) => i !== idx));
    setSuggestions(p => { const n = { ...p }; delete n[idx]; return n; });
  }

  function update(idx: number, field: keyof PortfolioItem, val: string | number) {
    setItems(p => p.map((item, i) => i === idx ? { ...item, [field]: val } : item));
    // 티커 변경 시 자동완성 트리거
    if (field === "ticker" && typeof val === "string") {
      clearTimeout(debounceTimers.current[idx]);
      debounceTimers.current[idx] = setTimeout(() => fetchSuggestions(idx, val), 300);
    }
  }

  function selectSuggestion(idx: number, sug: Suggestion) {
    setItems(p => p.map((item, i) => i === idx ? { ...item, ticker: sug.ticker, name: sug.name } : item));
    setSuggestions(p => { const n = { ...p }; delete n[idx]; return n; });
    setActiveSugIdx(null);
  }

  function resetPortfolio() {
    if (!confirm("포트폴리오를 초기화하시겠습니까?\n입력한 종목과 분석 결과가 모두 삭제됩니다.")) return;
    setItems([{ ticker: "", name: "", quantity: 0, avgPrice: 0 }]);
    setReport("");
    setMarketData({});
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(REPORT_KEY);
  }

  async function analyze() {
    if (!isValid) return;
    setLoading(true);
    setError("");
    setLoadingStep(1);

    const controller = new AbortController();
    const timeout = setTimeout(() => { controller.abort(); }, 45000);

    try {
      setTimeout(() => setLoadingStep(2), 2000);
      setTimeout(() => setLoadingStep(3), 5000);

      // ── 시세 강제 최신화 (AI에 정확한 데이터 전달 보장) ──
      const activeTickers = items.filter(i => i.ticker.trim() && i.quantity > 0 && i.avgPrice > 0).map(i => i.ticker);
      let freshMarket = { ...marketData };
      try {
        const priceRes = await fetch(`${API}/api/stocks/min-data?tickers=${activeTickers.join(",")}`);
        const priceData = await priceRes.json();
        if (priceData.ok) {
          freshMarket = { ...freshMarket, ...priceData.data };
          setMarketData(freshMarket);
        }
      } catch { /* 기존 데이터로 진행 */ }

      const processedItems = items
        .filter(i => i.ticker.trim() && i.quantity > 0 && i.avgPrice > 0)
        .map(i => {
          const live = freshMarket[i.ticker] || {};
          const currentPrice = live.price || 0;
          const invested = i.quantity * i.avgPrice;
          const current = i.quantity * currentPrice;
          return { ...i, currentPrice, invested, current };
        });

      const totalVal = processedItems.reduce((sum, i) => sum + (i.current || i.invested), 0);
      const itemsWithWeight = processedItems.map(i => ({
        ...i,
        weight: totalVal > 0 ? Math.round(((i.current || i.invested) / totalVal) * 100) : 0
      }));

      // 시세 미수신 종목이 있으면 경고
      const missingPrice = itemsWithWeight.filter(i => !i.currentPrice || i.currentPrice <= 0);
      if (missingPrice.length > 0) {
        setError(`${missingPrice.map(i => i.ticker).join(", ")} 시세를 가져오지 못했습니다. 잠시 후 다시 시도해주세요.`);
        setLoading(false);
        setLoadingStep(0);
        clearTimeout(timeout);
        return;
      }

      const res = await fetch(`${API}/api/portfolio/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: itemsWithWeight }),
        signal: controller.signal,
      });
      const data = await res.json();
      setReport(data.report || data.error || "분석 실패");

      // 결과 위치로 스크롤
      setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 300);
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === "AbortError") {
        setError("분석 시간이 초과되었습니다. 다시 시도해주세요.");
      } else {
        setError(err instanceof Error ? err.message : "분석 중 오류가 발생했습니다.");
      }
    } finally {
      clearTimeout(timeout);
      setLoading(false);
      setLoadingStep(0);
    }
  }

  const ResultDashboard = () => {
    if (!report) return null;
    const lines = report.split("\n");

    // 한줄 결론 추출: 상태 + 전략
    const statusLine = lines.find(l => l.includes("⚠️") || l.includes("✅") || l.includes("현재") || l.includes("포트폴리오")) || "";
    const strategyLine = lines.find(l => l.includes("👉") || l.includes("전략") || l.includes("추천")) || "";
    const overallRisk = getRiskLevel(report);
    const riskStyle = getRiskStyle(overallRisk);

    return (
      <div ref={resultRef} style={{ paddingBottom: 40 }}>
        {/* [10] 한줄 결론 카드 (위험도 연동) */}
        <div style={{
          background: overallRisk === 'HIGH' ? 'linear-gradient(135deg, #fff5f5 0%, #ffe4e6 100%)'
            : overallRisk === 'MEDIUM' ? 'linear-gradient(135deg, #fffcf0 0%, #fff8e1 100%)'
            : 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
          border: `1px solid ${riskStyle.border}30`,
          borderRadius: 20, padding: "24px",
          marginBottom: 28, boxShadow: `0 10px 25px -5px ${riskStyle.border}20`,
          position: "relative", overflow: "hidden",
        }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: riskStyle.color, marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 18 }}>{riskStyle.icon}</span> AI 핵심 결론
            <span className={`status-badge ${getRiskClassName(overallRisk)}`} style={{ marginLeft: 8 }}>{overallRisk}</span>
          </div>
          {statusLine && (
            <div style={{ fontSize: 16, fontWeight: 800, color: "#1a2233", lineHeight: 1.6, marginBottom: 4 }}>
              {statusLine}
            </div>
          )}
          {strategyLine && (
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-secondary)", lineHeight: 1.6 }}>
              {strategyLine}
            </div>
          )}
        </div>

        {/* 상단 요약 4칸 카드 */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 24 }}>
          <div style={{ background: "#fff", borderRadius: 16, padding: 16, border: "1px solid var(--border)" }}>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>총 매입액</div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>{stats.totalInvested.toLocaleString()}</div>
          </div>
          <div style={{ background: "#fff", borderRadius: 16, padding: 16, border: "1px solid var(--border)" }}>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>총 평가액</div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>{stats.totalCurrent.toLocaleString()}</div>
          </div>
          <div style={{ background: "#fff", borderRadius: 16, padding: 16, border: "1px solid var(--border)" }}>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>총 손익</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: stats.totalPnl >= 0 ? "#10b981" : "#ef4444" }}>
              {stats.totalPnl >= 0 ? "+" : ""}{stats.totalPnl.toLocaleString()}
            </div>
          </div>
          <div style={{ background: "#fff", borderRadius: 16, padding: 16, border: "1px solid var(--border)" }}>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>총 수익률</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: stats.totalPnlPct >= 0 ? "#10b981" : "#ef4444" }}>
              {stats.totalPnlPct >= 0 ? "+" : ""}{stats.totalPnlPct.toFixed(2)}%
            </div>
          </div>
        </div>

        {/* 비중 차트 */}
        <div style={{ background: "#fff", borderRadius: 18, padding: 24, border: "1px solid var(--border)", marginBottom: 24 }}>
          <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 16, color: "var(--text-primary)" }}>📊 포트폴리오 비중</div>
          <div style={{ height: 24, display: "flex", borderRadius: 8, overflow: "hidden", background: "#f1f5f9", marginBottom: 20 }}>
            {stats.items.filter(i => i.ticker).map((item, idx) => {
              const weight = stats.totalCurrent > 0 ? (item.current / stats.totalCurrent) * 100 : (item.invested / stats.totalInvested) * 100;
              if (weight <= 0) return null;
              const colors = ["#3fca6b", "#3b82f6", "#f59e0b", "#6366f1", "#ec4899", "#14b8a6", "#f43f5e"];
              return <div key={item.ticker} style={{ width: `${weight}%`, background: colors[idx % colors.length], transition: "width 0.5s ease" }} />;
            })}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
            {stats.items.filter(i => i.ticker).map((item, idx) => {
              const weight = stats.totalCurrent > 0 ? (item.current / stats.totalCurrent) * 100 : (item.invested / stats.totalInvested) * 100;
              const colors = ["#3fca6b", "#3b82f6", "#f59e0b", "#6366f1", "#ec4899", "#14b8a6", "#f43f5e"];
              return (
                <div key={item.ticker} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: colors[idx % colors.length] }} />
                  <span style={{ fontSize: 12, fontWeight: 600 }}>{item.ticker}</span>
                  <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{weight.toFixed(1)}%</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* 종목별 성과 (위험도 배지 포함) */}
        <div style={{ background: "#fff", borderRadius: 18, padding: 20, border: "1px solid var(--border)", marginBottom: 24 }}>
          <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 16 }}>📈 종목 성과</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {stats.items.filter(i => i.ticker).map((item) => {
              const level = getRiskLevelByPnl(item.pnlPct);
              const rs = getRiskStyle(level);
              return (
                <div key={item.ticker} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 14, fontWeight: 700 }}>{item.ticker}</span>
                      {item.name && <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{item.name}</span>}
                      <span className={`status-badge ${getRiskClassName(level)}`} style={{ fontSize: 9 }}>{rs.icon} {level}</span>
                    </div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{item.quantity}주 · 평단 {item.currency}{item.avgPrice.toLocaleString()} · 현재 {item.currency}{item.currentPrice.toLocaleString()}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: item.pnl >= 0 ? "#10b981" : "#ef4444" }}>{item.pnl >= 0 ? "+" : ""}{item.currency}{Math.abs(item.pnl).toLocaleString()}</div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: item.pnl >= 0 ? "#10b981" : "#ef4444" }}>{item.pnlPct >= 0 ? "+" : ""}{item.pnlPct.toFixed(2)}%</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* AI 상세 전략 코멘트 */}
        <div style={{ background: "#fff", borderRadius: 18, padding: "24px 20px", border: "1px solid var(--border)", boxShadow: "0 4px 20px rgba(0,0,0,0.02)" }}>
          <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 16, display: "flex", alignItems: "center", gap: 6 }}><span>🧠</span> AI 상세 전략 코멘트</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {report.split("\n").filter(l => l.trim()).map((line, i) => {
              const level = getRiskLevel(line);
              const hasRisk = level !== 'INFO' || line.includes("💡") || line.includes("참고");
              const sClass = level === 'HIGH' ? 'status-high' : level === 'MEDIUM' ? 'status-medium' : (line.includes("💡") || line.includes("참고")) ? 'status-info' : '';
              return (
                <div key={i} className={sClass} style={{ padding: sClass ? "12px 16px" : "0", borderRadius: sClass ? 12 : 0, fontSize: 14, lineHeight: 1.8, color: "var(--text-primary)", border: sClass ? "1px solid transparent" : "none" }}>{line}</div>
              );
            })}
          </div>
        </div>
        <button onClick={() => setReport("")} style={{ width: "100%", padding: "14px", marginTop: 24, borderRadius: 12, border: "1px solid var(--border)", background: "#fff", color: "var(--text-secondary)", fontWeight: 600, fontSize: 14, cursor: "pointer" }}>✏️ 포트폴리오 수정하기</button>
      </div>
    );
  };

  return (
    <div style={{ height: "100%", overflowY: "auto", padding: "20px 24px 120px", background: "var(--bg-app)" }}>
      {loading && <LoadingOverlay step={loadingStep} />}

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
        <h1 style={{ fontSize: 20, fontWeight: 800, color: "var(--text-primary)" }}>🗂️ 내 포트폴리오</h1>
        {saved && <span style={{ fontSize: 11, color: "var(--accent)", fontWeight: 600, animation: "fadeIn 0.3s" }}>💾 자동 저장됨</span>}
      </div>
      <p style={{ color: "var(--text-secondary)", fontSize: 12, marginBottom: 20 }}>실제 보유 수량과 평단을 입력하여 수익률을 관리하세요</p>

      {/* 상단 총 자산 카드 */}
      <div style={{ background: "linear-gradient(135deg, #1a3a2a 0%, #2ea85a 100%)", borderRadius: 16, padding: "20px 24px", color: "#fff", marginBottom: 24, boxShadow: "0 4px 12px rgba(46,168,90,0.2)" }}>
        <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 4 }}>총 자산 가치</div>
        <div style={{ fontSize: 28, fontWeight: 800, marginBottom: 12 }}>{(stats.totalCurrent || stats.totalInvested).toLocaleString()} <span style={{ fontSize: 14, fontWeight: 400 }}>{stats.totalCurrent > 0 ? "원/달러 합산" : "매입액 기준"}</span></div>
        <div style={{ display: "flex", gap: 16 }}>
          <div>
            <div style={{ fontSize: 11, opacity: 0.7 }}>총 손익</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: stats.totalPnl >= 0 ? "#4ade80" : "#fb7185" }}>{stats.totalPnl >= 0 ? "+" : ""}{stats.totalPnl.toLocaleString()}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, opacity: 0.7 }}>수익률</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: stats.totalPnlPct >= 0 ? "#4ade80" : "#fb7185" }}>{stats.totalPnlPct >= 0 ? "+" : ""}{stats.totalPnlPct.toFixed(2)}%</div>
          </div>
        </div>
      </div>

      {error && (
        <div style={{ padding: "12px 16px", borderRadius: 12, background: "#fff8f8", border: "1px solid #f5c2cc", color: "#d64060", fontSize: 13, marginBottom: 16 }}>
          ⚠️ {error}
        </div>
      )}

      {!report ? (
        <>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 24 }}>
            {items.map((item, i) => {
              const s = stats.items[i];
              const hasPrice = s?.currentPrice > 0;
              const isInvalid = item.ticker && (item.quantity <= 0 || item.avgPrice <= 0);
              const isDuplicate = item.ticker && duplicateTickers.has(item.ticker.toUpperCase());
              const sugs = suggestions[i];

              return (
                <div key={i} className="card" style={{ background: "#fff", borderRadius: 14, padding: 16, border: "1px solid var(--border)", boxShadow: "0 1px 3px rgba(0,0,0,0.02)", borderColor: isDuplicate ? "#fbbf24" : isInvalid ? "#fca5a5" : "var(--border)" }}>
                  <div className="mobile-stack" style={{ display: "flex", gap: 8, marginBottom: 12, position: "relative" }}>
                    <div style={{ position: "relative", width: "100%", maxWidth: 100 }}>
                      <input
                        value={item.ticker}
                        onChange={(e) => update(i, "ticker", e.target.value.toUpperCase())}
                        onFocus={() => item.ticker && fetchSuggestions(i, item.ticker)}
                        onBlur={() => setTimeout(() => { setSuggestions(p => { const n = { ...p }; delete n[i]; return n; }); setActiveSugIdx(null); }, 200)}
                        placeholder="티커"
                        autoComplete="off"
                        style={{ width: "100%", padding: "10px 12px", borderRadius: 8, background: "#f5f7fa", border: "1px solid var(--border)", borderColor: item.ticker.trim() === "" ? "#fca5a5" : isDuplicate ? "#fbbf24" : "var(--border)", fontSize: 13, fontWeight: 700 }}
                      />
                      {sugs && sugs.length > 0 && activeSugIdx === i && (
                        <div style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 100, background: "#fff", borderRadius: 8, border: "1px solid var(--border)", boxShadow: "0 4px 12px rgba(0,0,0,0.1)", marginTop: 4, maxHeight: 200, overflowY: "auto" }}>
                          {sugs.map((sug, si) => (
                            <div key={si}
                              onMouseDown={() => selectSuggestion(i, sug)}
                              style={{ padding: "8px 12px", cursor: "pointer", fontSize: 12, borderBottom: si < sugs.length - 1 ? "1px solid #f3f4f6" : "none", display: "flex", justifyContent: "space-between" }}
                              onMouseOver={(e) => { (e.currentTarget as HTMLDivElement).style.background = "var(--accent-light)"; }}
                              onMouseOut={(e) => { (e.currentTarget as HTMLDivElement).style.background = "#fff"; }}
                            >
                              <span style={{ fontWeight: 700 }}>{sug.ticker}</span>
                              <span style={{ color: "var(--text-muted)" }}>{sug.name}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <input value={item.name} onChange={(e) => update(i, "name", e.target.value)} placeholder="종목명 (자동)" style={{ flex: 1, padding: "10px 12px", borderRadius: 8, background: "#f5f7fa", border: "1px solid var(--border)", fontSize: 13 }} />
                    {items.length > 1 && <button onClick={() => removeItem(i)} style={{ padding: "0 10px", color: "#fb7185", background: "none", border: "none", fontSize: 18, cursor: "pointer", minHeight: 0 }}>✕</button>}
                  </div>
                  {isDuplicate && <div style={{ fontSize: 11, color: "#d97706", marginBottom: 8, fontWeight: 600 }}>⚠️ 동일 종목이 중복 입력되었습니다</div>}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, alignItems: "center" }}>
                    <div>
                      <div style={{ fontSize: 10, color: "var(--text-muted)", marginBottom: 4 }}>보유 수량</div>
                      <input type="number" inputMode="decimal" value={item.quantity || ""} onChange={(e) => update(i, "quantity", Number(e.target.value))} style={{ width: "100%", padding: "8px 0", border: "none", borderBottom: "1px solid var(--border)", borderColor: item.ticker && item.quantity <= 0 ? "#ef4444" : "var(--border)", fontSize: 15, fontWeight: 600, outline: "none", background: "transparent" }} />
                      {item.ticker && item.quantity < 0 && <div style={{ fontSize: 10, color: "#ef4444", marginTop: 2 }}>음수 불가</div>}
                    </div>
                    <div>
                      <div style={{ fontSize: 10, color: "var(--text-muted)", marginBottom: 4 }}>평균 단가</div>
                      <input type="number" inputMode="decimal" value={item.avgPrice || ""} onChange={(e) => update(i, "avgPrice", Number(e.target.value))} style={{ width: "100%", padding: "8px 0", border: "none", borderBottom: "1px solid var(--border)", borderColor: item.ticker && item.avgPrice <= 0 ? "#ef4444" : "var(--border)", fontSize: 15, fontWeight: 600, outline: "none", background: "transparent" }} />
                      {item.ticker && item.avgPrice < 0 && <div style={{ fontSize: 10, color: "#ef4444", marginTop: 2 }}>음수 불가</div>}
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 10, color: "var(--text-muted)", marginBottom: 4 }}>수익률</div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: s?.pnl >= 0 ? "#10b981" : "#ef4444" }}>{hasPrice ? `${s.pnlPct.toFixed(1)}%` : "-"}</div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{hasPrice ? s.currency + s.currentPrice.toLocaleString() : "조회중..."}</div>
                    </div>
                  </div>
                </div>
              );
            })}
            <button onClick={addItem} style={{ width: "100%", padding: "12px", borderRadius: 12, border: "1.5px dashed var(--border)", background: "transparent", color: "var(--text-secondary)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>+ 종목 추가하기</button>
          </div>
          <button onClick={analyze} disabled={loading || !isValid || duplicateTickers.size > 0} style={{ width: "100%", padding: "16px", borderRadius: 16, border: "none", background: (!isValid || duplicateTickers.size > 0) ? "#e5e9f0" : "var(--accent)", color: (!isValid || duplicateTickers.size > 0) ? "var(--text-muted)" : "#fff", fontWeight: 800, fontSize: 16, cursor: isValid && duplicateTickers.size === 0 ? "pointer" : "not-allowed", boxShadow: isValid && duplicateTickers.size === 0 ? "0 4px 14px rgba(63,202,107,0.3)" : "none" }}>{isValid && !allPricesLoaded ? "🚀 AI 분석 (시세 로딩 중...)" : "🚀 AI 포트폴리오 정밀 분석"}</button>
          {!isValid && <p style={{ textAlign: "center", fontSize: 11, color: "#fb7185", marginTop: 12, fontWeight: 500 }}>* 모든 티커와 보유 수량, 평단을 올바르게 입력해주세요.</p>}
          {duplicateTickers.size > 0 && <p style={{ textAlign: "center", fontSize: 11, color: "#d97706", marginTop: 8, fontWeight: 500 }}>* 중복 종목을 정리해주세요: {[...duplicateTickers].join(", ")}</p>}
          <button onClick={resetPortfolio} style={{ width: "100%", padding: "12px", marginTop: 16, borderRadius: 12, border: "1px solid #fca5a5", background: "#fff8f8", color: "#d64060", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>🗑️ 포트폴리오 초기화</button>
        </>
      ) : <ResultDashboard />}
    </div>
  );
}
