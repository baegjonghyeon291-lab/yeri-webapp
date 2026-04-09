"use client";
import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { getSessionId } from "@/lib/session";
import LoadingOverlay from "@/components/LoadingOverlay";

const API = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001";

interface Suggestion {
  ticker: string;
  name: string;
}

interface Alerts {
  enabled: boolean;
  priceAbove: number | null;
  priceBelow: number | null;
  takeProfitPct: number | null;
  stopLossPct: number | null;
  totalValueAbove: number | null;
  maxWeight: number | null;
  badgeChange: boolean;
  predictEnabled: boolean;
  predictBreakout: boolean;
  predictMomentumUp: boolean;
  predictDump: boolean;
  predictBadgeDown: boolean;
  predictWeightRisk: boolean;
}

const DEFAULT_ALERTS: Alerts = {
  enabled: false,
  priceAbove: null,
  priceBelow: null,
  takeProfitPct: null,
  stopLossPct: null,
  totalValueAbove: null,
  maxWeight: null,
  badgeChange: true,
  predictEnabled: false,
  predictBreakout: false,
  predictMomentumUp: false,
  predictDump: false,
  predictBadgeDown: false,
  predictWeightRisk: false
};

interface HoldingStatus {
  badge: string;
  emoji: string;
  action: string;
  strategy: string;
  reasons: string[];
  scores: Record<string, number | null>;
  overall: number | null;
  priceZones?: {
    tp1: number; tp2: number; sl: number; observeMin: number; observeMax: number; trendBreak: number;
  };
}

interface Trade {
  id: string;
  type: 'buy' | 'sell';
  date: string;
  price: number;
  quantity: number;
  memo: string;
}

interface Holding {
  ticker: string;
  name: string;
  quantity: number;
  avgPrice: number;
  buyDate?: string | null;
  memo?: string | null;
  trades?: Trade[];
  currentPrice: number | null;
  changePct: number | null;
  investedAmount: number;
  currentValue: number | null;
  profitLoss: number | null;
  profitLossPct: number | null;
  weight: number | null;
  status: HoldingStatus | null;
  dataAsOf?: string;
  currency?: string;
  displayAvgPrice?: number;
  displayCurrentPrice?: number | null;
  displayInvested?: number;
  displayValue?: number | null;
  displayPL?: number | null;
  dividend?: {
    yield: number | null;
    rate: number | null;
    exDate: string | null;
  };
}

interface PortfolioStatus {
  bullishCount: number;
  normalCount: number;
  cautionCount: number;
  warningCount: number;
  riskTop3: { ticker: string; name: string; score: number; badge: string }[];
  strongTop3: { ticker: string; name: string; score: number; badge: string }[];
  needCheckTop3: { ticker: string; name: string; badge: string; reason: string }[];
}

interface PortfolioData {
  holdings: Holding[];
  summary: {
    holdingCount: number;
    totalInvested: number;
    uiCurrency?: string;
    totalValue: number;
    totalProfitLoss: number;
    totalProfitLossPct: number;
    totalAnnualDividend?: number;
    dividendYieldPct?: number;
  };
  portfolioStatus: PortfolioStatus;
  todayActions?: any[];
  message?: string;
  healthScore?: { score: number; label: string };
  diversification?: {
    score: number;
    label: string;
    messages: string[];
    sectors: { name: string; weight: number }[];
    themes: { name: string; weight: number }[];
    avgBeta: number;
  };
  userMode?: string;
}

interface HistoryComparison {
  current: number;
  yesterday: { diff: number; diffPct: number; value: number } | null;
  lastWeek: { diff: number; diffPct: number; value: number } | null;
  lastMonth: { diff: number; diffPct: number; value: number } | null;
  max30?: number;
  min30?: number;
}

// 상태 배지 스타일
function getBadgeStyle(badge: string) {
  switch (badge) {
    case "상승우세": return { bg: "#dcfce7", color: "#16a34a", border: "#86efac", icon: "📈" };
    case "보통":     return { bg: "#f0f9ff", color: "#2563eb", border: "#93c5fd", icon: "➡️" };
    case "주의":     return { bg: "#fffbeb", color: "#d97706", border: "#fcd34d", icon: "⚠️" };
    case "경고":     return { bg: "#fef2f2", color: "#dc2626", border: "#fca5a5", icon: "🚨" };
    default:        return { bg: "#f8fafc", color: "#64748b", border: "#e2e8f0", icon: "❓" };
  }
}

// 통화 포맷 유틸리티
function fmt(value: number | null | undefined, cur: string): string {
  if (value == null) return '-';
  if (cur === '₩' || cur === 'KRW') return '₩' + Math.round(value).toLocaleString();
  return '$' + value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtNum(value: number | null | undefined, cur: string): string {
  if (value == null) return '-';
  if (cur === '₩' || cur === 'KRW') return Math.round(value).toLocaleString();
  return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function PortfolioPage() {
  const [sessionId, setSessionId] = useState("");
  useEffect(() => { setSessionId(getSessionId()); }, []);

  // ── 상태 ──
  const [portfolio, setPortfolio] = useState<PortfolioData | null>(null);
  const [expandedTradeTicker, setExpandedTradeTicker] = useState<string | null>(null);
  const [simulateTicker, setSimulateTicker] = useState<string | null>(null);
  const [simulateData, setSimulateData] = useState<{before: PortfolioData, after: PortfolioData} | null>(null);
  const [simLoading, setSimLoading] = useState(false);
  const [historyData, setHistoryData] = useState<HistoryComparison | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("");
  const [addMode, setAddMode] = useState(false);
  const [briefing, setBriefing] = useState("");
  const [briefingLoading, setBriefingLoading] = useState(false);
  const [error, setError] = useState("");

  const [compareModalOpen, setCompareModalOpen] = useState(false);
  const [compareT1, setCompareT1] = useState("");
  const [compareT2, setCompareT2] = useState("");

  // ── 종목 추가 폼 ──
  const [newTicker, setNewTicker] = useState("");
  const [newName, setNewName] = useState("");
  const [newQty, setNewQty] = useState<number>(0);
  const [newPrice, setNewPrice] = useState<number>(0);
  const [newBuyDate, setNewBuyDate] = useState("");
  const [newMemo, setNewMemo] = useState("");
  const [newAlerts, setNewAlerts] = useState<Alerts>(DEFAULT_ALERTS);
  const [showAlertUI, setShowAlertUI] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isConfirmedSuggestion, setIsConfirmedSuggestion] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // ── 포트폴리오 로드 ──
  async function loadPortfolio() {
    if (!sessionId) return;
    setLoading(true);
    setLoadingMsg("실시간 데이터 수집 + 7팩터 분석 중...");
    setError("");
    try {
      const [resPortfolio, resHistory] = await Promise.all([
        fetch(`${API}/api/portfolio/${sessionId}`, { cache: 'no-store' }),
        fetch(`${API}/api/portfolio/${sessionId}/history`, { cache: 'no-store' })
      ]);
      const data = await resPortfolio.json();
      const hist = await resHistory.json();
      setPortfolio(data);
      if (hist.comparison) setHistoryData(hist.comparison);
    } catch (e: any) {
      setError(e.message || "포트폴리오를 불러올 수 없습니다.");
    } finally {
      setLoading(false);
      setLoadingMsg("");
    }
  }

  useEffect(() => { if (sessionId) loadPortfolio(); }, [sessionId]);

  // ── 자동완성 ──
  const fetchSuggestions = useCallback(async (query: string) => {
    if (query.length < 1) { setSuggestions([]); return; }
    try {
      const res = await fetch(`${API}/api/suggest?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (data.ok && data.candidates?.length > 0) setSuggestions(data.candidates.slice(0, 5));
      else setSuggestions([]);
    } catch { setSuggestions([]); }
  }, []);

  function handleTickerChange(val: string) {
    setSearchQuery(val);
    setNewTicker(val.toUpperCase());
    setNewName(val);
    setIsConfirmedSuggestion(false);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(val), 300);
  }

  function selectSuggestion(sug: Suggestion) {
    setNewTicker(sug.ticker);
    setNewName(sug.name);
    setSearchQuery("");
    setIsConfirmedSuggestion(true);
    setSuggestions([]);
  }

  // ── 종목 추가 ──
  async function addHolding() {
    if (!newTicker || newQty <= 0 || newPrice <= 0) return;
    setError("");
    try {
      const res = await fetch(`${API}/api/portfolio/${sessionId}/add`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticker: newTicker, name: newName || newTicker,
          quantity: newQty, avgPrice: newPrice,
          buyDate: newBuyDate || null, memo: newMemo || null,
          alerts: newAlerts
        }),
      });
      const data = await res.json();
      if (data.result === "limit_reached") {
        setError("최대 20개 종목까지 등록 가능합니다.");
        return;
      }
      // 초기화 & 재로드
      setNewTicker(""); setNewName(""); setSearchQuery(""); setIsConfirmedSuggestion(false);
      setNewQty(0); setNewPrice(0);
      setNewBuyDate(""); setNewMemo(""); setAddMode(false);
      setNewAlerts(DEFAULT_ALERTS); setShowAlertUI(false);
      await loadPortfolio();
    } catch (e: any) { setError(e.message); }
  }

  // ── 종목 삭제 ──
  async function removeHolding(ticker: string) {
    if (!confirm(`${ticker}를 포트폴리오에서 삭제하시겠습니까?`)) return;
    try {
      await fetch(`${API}/api/portfolio/${sessionId}/remove`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticker }),
      });
      await loadPortfolio();
    } catch (e: any) { setError(e.message); }
  }

  // ── 매매 기록 추가 ──
  async function handleAddTrade(ticker: string, type: 'buy' | 'sell', currentPrice: number | null) {
    const qtyStr = prompt(`[${type === 'buy' ? '매수' : '매도'} 추가]\n${ticker} 수량을 입력하세요:`, "1");
    if (!qtyStr) return;
    const qty = parseFloat(qtyStr);
    if (isNaN(qty) || qty <= 0) return alert("올바른 수량을 입력하세요.");

    const priceStr = prompt(`${ticker} 체결 단가를 입력하세요:`, String(currentPrice || 0));
    if (!priceStr) return;
    const price = parseFloat(priceStr);
    if (isNaN(price) || price <= 0) return alert("올바른 단가를 입력하세요.");

    const memo = prompt("메모를 입력하세요 (선택):", "") || "";

    try {
      const res = await fetch(`${API}/api/portfolio/${sessionId}/trades`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticker, type, date: new Date().toISOString().split('T')[0], price, quantity: qty, memo }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);
      await loadPortfolio();
    } catch (e: any) { alert(e.message); }
  }

  // ── 시뮬레이터 가상 매매 ──
  async function handleSimulate(ticker: string, type: 'buy'|'sell', currentPrice: number | null) {
    const qtyStr = prompt(`[시뮬레이션 - ${type === 'buy' ? '매수' : '매도'}]\n가상 거래 수량을 입력하세요:`, "10");
    if (!qtyStr) return;
    const quantity = parseFloat(qtyStr);
    if (isNaN(quantity) || quantity <= 0) return alert("올바른 수량을 입력하세요.");

    const priceStr = prompt(`예상 체결 단가를 입력하세요:`, String(currentPrice || 0));
    if (!priceStr) return;
    const price = parseFloat(priceStr);
    if (isNaN(price) || price <= 0) return alert("올바른 단가를 입력하세요.");

    setSimLoading(true);
    setSimulateData(null);
    setSimulateTicker(ticker);
    try {
      const res = await fetch(`${API}/api/portfolio/${sessionId}/simulate`, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({ ticker, type, quantity, price })
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);
      setSimulateData({ before: data.before, after: data.after });
    } catch(e: any) { alert(e.message); setSimulateTicker(null); }
    finally { setSimLoading(false); }
  }

  // ── 브리핑 ──
  async function getBriefing() {
    setBriefingLoading(true);
    setBriefing("");
    try {
      const res = await fetch(`${API}/api/portfolio/${sessionId}/briefing`);
      const data = await res.json();
      setBriefing(data.report || data.message || "브리핑 생성 실패");
    } catch (e: any) {
      setBriefing("브리핑 오류: " + e.message);
    } finally { setBriefingLoading(false); }
  }

  const holdings = portfolio?.holdings || [];
  const summary = portfolio?.summary;
  const ps = portfolio?.portfolioStatus;
  const hasHoldings = holdings.length > 0;

  return (
    <div style={{ height: "100%", overflowY: "auto", padding: "20px 24px 120px", background: "var(--bg-app)" }}>
      {loading && <LoadingOverlay step={1} />}

      {/* 헤더 */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
        <h1 style={{ fontSize: 20, fontWeight: 800, color: "var(--text-primary)" }}>🗂️ 내 포트폴리오</h1>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => setShowGuide(!showGuide)} style={{ padding: "6px 10px", borderRadius: 8, border: "none", background: "var(--accent-light)", color: "var(--accent)", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
            {showGuide ? "닫기" : "📋 설명서"}
          </button>
          <button onClick={loadPortfolio} disabled={loading} style={{ padding: "6px 14px", borderRadius: 8, border: "1px solid var(--border)", background: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", color: "var(--text-secondary)" }}>🔄 새로고침</button>
        </div>
      </div>
      <p style={{ color: "var(--text-secondary)", fontSize: 12, marginBottom: 12 }}>보유 종목을 등록하면 실시간 상태 분석과 전략 참고를 받을 수 있어요</p>

      {showGuide && (
        <div style={{ position: "relative", background: "#fdf8fa", borderRadius: 12, border: "1px solid #fce7f3", padding: "24px 24px 34px", marginBottom: 20, fontSize: 13, boxShadow: "0 2px 10px rgba(219,39,119,0.05)", maxHeight: "65vh", overflowY: "auto", overscrollBehavior: "contain" }}>
          <button onClick={() => setShowGuide(false)} style={{ position: "absolute", top: 16, right: 16, background: "rgba(219,39,119,0.1)", border: "none", borderRadius: "50%", width: 28, height: 28, cursor: "pointer", color: "#db2777", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700 }}>✕</button>
          
          <div style={{ fontWeight: 800, color: "#db2777", fontSize: 15, marginBottom: 16 }}>💖 귀요미 예리를 위한 포트폴리오 설명서 💖</div>
          
          <div style={{ display: "flex", flexDirection: "column", gap: 12, color: "var(--text-primary)", lineHeight: 1.6 }}>
            <p>주식 투자는 생물이라 타이밍이 생명! 내가 산 주식들을 언제 더 사고 언제 이익을 챙겨야 할지, 예리의 AI 엔진이 내 상황에 딱 맞춰서 실시간으로 1:1 과외를 해드립니다. 차근차근 살펴볼까요?</p>
            
            <div>
              <div style={{ fontWeight: 800, color: "#111827", marginBottom: 2 }}>1️⃣ 1번: 내 서랍장에 산 돈이랑 주식 채워 넣기</div>
              <div style={{ color: "var(--text-secondary)" }}>화면 돋보기 검색창에 내가 산 주식 이름(또는 영어 티커)을 검색해 보세요. 아래에 뜨는 초록색 종목 칩을 톡 누른 다음, 내가 가지고 있는 '주식 수량'과 '내가 산 평균 가격(평단가)'을 적고 아래 <b>추가</b> 버튼을 누르면 포트폴리오에 주식이 쏙 들어옵니다! (서버가 똑똑하게 분석을 감당하기 위해 최대 20개까지만 등록할 수 있어요.)</div>
            </div>

            <div>
              <div style={{ fontWeight: 800, color: "#111827", marginBottom: 2 }}>2️⃣ 2번: 건강 검진표! 알록달록 상태 배지 확인하기</div>
              <div style={{ color: "var(--text-secondary)" }}>주식을 등록해 두면 예리가 재무제표, 사람들의 관심도, 요새 주식 차트를 바탕으로 7가지 깐깐한 X-ray 검사를 해서 5단계의 배지를 척척 달아줍니다!</div>
              <ul style={{ paddingLeft: 16, margin: "6px 0 0 0", color: "var(--text-secondary)", display: "flex", flexDirection: "column", gap: 4 }}>
                <li>🟢 <b>상승 우세</b>: 오르는 힘이 아주 튼튼해요! 쭉 들고 가도 좋아요.</li>
                <li>🟡 <b>보통</b>: 오를지 내릴지 눈치 보며 얌전하게 횡보하고 있어요.</li>
                <li>🟠 <b>주의 (39점 이하)</b>: 상승하는 힘이 조금 빠지고 있어요.</li>
                <li>🔴 <b>경고 (29점 이하)</b>: 삐뽀삐뽀! 단기적으로 꽤 아플 수 있어요.</li>
                <li>🚨 <b>리스크 높음 (19점 이하)</b>: 매우 안 좋습니다! 당장 도망칠 각을 봐야 해요.</li>
              </ul>
            </div>

            <div>
              <div style={{ fontWeight: 800, color: "#111827", marginBottom: 2 }}>3️⃣ 3번: 내 돈 상황에 딱 맞춘 '예리의 특급 전략' 읽기</div>
              <div style={{ color: "var(--text-secondary)" }}>종목 카드 안쪽을 꼼꼼히 보면 예리가 써준 길쭉한 문장이 있어요. 이 글은 아무렇게나 뜨는 게 아니라, 내가 수익을 보는지 물렸는지 <b>평단가 상황</b>을 파악해서 <span style={{color:"#db2777", fontWeight:600}}>"수익이 크니까 얼른 챙기세요!"</span> 혹은 <span style={{color:"#059669", fontWeight:600}}>"물려있지만 반등 기미가 오니 조금 더 사보세요!"</span> 하고 방향을 1:1로 지도해주는 거랍니다. 제일 중요한 부분이에요!</div>
            </div>

            <div>
              <div style={{ fontWeight: 800, color: "#111827", marginBottom: 2 }}>4️⃣ 4번: 맨 윗단 '총 자산과 TOP 요약판' 구경하기</div>
              <div style={{ color: "var(--text-secondary)" }}>포트폴리오 화면 맨 위쪽 예쁜 그라데이션 박스를 보면 내 주식들의 총 가치가 얼마인지, 합쳐서 플러스인지 마이너스인지 한눈에 탁 보여줍니다. 그리고 스크롤을 좀 더 내리다 보면 예리가 콕 집어 조심하라고 경고하는 '위험 종목 TOP'이나, 알아서 잘 커주고 있는 '착한 상승 종목 TOP'을 따로 모아 친절하게 요약해 줍니다.</div>
            </div>

            <div style={{ marginTop: 8, padding: "10px 14px", background: "linear-gradient(135deg, #fce7f3, #fdf2f8)", borderRadius: 10, textAlign: "center" }}>
              <span style={{ fontSize: 14, fontWeight: 800, color: "#db2777" }}>✨ 예리가 좋아할 기능 ✨</span>
            </div>

            <div>
              <div style={{ fontWeight: 800, color: "#111827", marginBottom: 2 }}>5️⃣ 5번: 🔔 스마트 알림 — 내 주식 감시병 세우기</div>
              <div style={{ color: "var(--text-secondary)", marginBottom: 8 }}>종목 추가할 때 아래쪽 <b>'🔔 조건부 스마트 알림 설정'</b> 버튼을 눌러보세요! 알림은 두 종류로 나뉘어요:</div>
              
              <div style={{ background: "#fff", borderRadius: 8, padding: "10px 12px", marginBottom: 8, border: "1px solid #e2e8f0" }}>
                <div style={{ fontWeight: 800, color: "#111827", fontSize: 12, marginBottom: 6 }}>🎯 조건 도달 알림 — 실제로 내가 정한 조건에 딱 도달했을 때 알려줘요!</div>
                <ul style={{ paddingLeft: 16, margin: 0, color: "var(--text-secondary)", display: "flex", flexDirection: "column", gap: 3, fontSize: 12 }}>
                  <li>📈 <b>수익률 목표</b>: "수익률 +20% 찍으면 알려줘!"</li>
                  <li>📉 <b>손절 기준</b>: "-10% 되면 경고해줘!"</li>
                  <li>🚀 <b>가격 돌파</b>: "이 주식이 $50 넘으면 알려줘!"</li>
                  <li>🔻 <b>가격 이탈</b>: "$30 밑으로 빠지면 알려줘!"</li>
                  <li>💰 <b>총 평가금액</b>: "내 주식 합계 $5,000 넘으면 알려줘!"</li>
                  <li>⚖️ <b>비중 초과</b>: "포트폴리오 30% 넘으면 알려줘!"</li>
                  <li>🚨 <b>배지 악화</b>: 상태가 '경고'나 '리스크 높음'으로 떨어지면 자동 알림!</li>
                </ul>
              </div>

              <div style={{ background: "#fff", borderRadius: 8, padding: "10px 12px", marginBottom: 8, border: "1px solid #e2e8f0" }}>
                <div style={{ fontWeight: 800, color: "#111827", fontSize: 12, marginBottom: 6 }}>🔮 AI 예측/사전 경고 — 아직 조건에 안 닿았지만, 곧 닿을 것 같을 때 미리 알려줘요!</div>
                <ul style={{ paddingLeft: 16, margin: 0, color: "var(--text-secondary)", display: "flex", flexDirection: "column", gap: 3, fontSize: 12 }}>
                  <li>📈 <b>목표가 돌파 가능성</b>: 현재가가 내 목표가의 90%까지 올라왔을 때</li>
                  <li>🚀 <b>상승 모멘텀 강화</b>: 종합점수+추세가 강세 구간 돌입 시</li>
                  <li>📉 <b>하락 위험 확대</b>: 종합점수 급락 또는 당일 급락 감지 시</li>
                  <li>⚠️ <b>경고 단계 직전</b>: 종합점수가 경고 경계선(40~49)에 걸렸을 때</li>
                  <li>⚖️ <b>비중 위험 확대</b>: 비중이 내 한도의 85% 이상 근접했을 때</li>
                </ul>
              </div>

              <div style={{ color: "var(--text-secondary)", fontSize: 12 }}>
                💡 <b>풀패키지 추천값</b> 버튼을 누르면 예리가 추천하는 알림 조건이 한 번에 쫙 채워져요! 알림이 오면 화면 위쪽 🔔 종 아이콘에 빨간 숫자가 뜨니까 꼭 확인해 보세요!
              </div>
            </div>

            <div style={{ background: "#fff7ed", borderRadius: 8, padding: "12px 14px", border: "1px solid #fed7aa" }}>
              <div style={{ fontWeight: 800, color: "#c2410c", fontSize: 13, marginBottom: 8 }}>💬 예시: 이런 식으로 쓰면 돼요!</div>
              <div style={{ color: "var(--text-secondary)", fontSize: 12, marginBottom: 10, lineHeight: 1.6 }}>
                Q. "삼성전자 1주가 8만원인데 9주 가지고 있어. 90만원 넘으면 알려줘!"
              </div>
              <div style={{ color: "var(--text-secondary)", fontSize: 12, marginBottom: 6, fontWeight: 700 }}>👉 이때는 두 가지 방법이 있어요:</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.6 }}>
                <div><b>방법 1) 🚀 가격 돌파</b> — 1주 가격 기준<br/>→ '가격 돌파'에 <b>100000</b> 입력 → 삼성전자 1주가 10만원 넘는 순간 알림!</div>
                <div><b>방법 2) 💰 총 평가금액</b> — 내 보유 합계 기준<br/>→ '총 평가금액'에 <b>900000</b> 입력 → 9주 × 현재가 합계가 90만원 넘는 순간 알림!</div>
              </div>
              <div style={{ marginTop: 8, fontSize: 12, color: "#c2410c", fontWeight: 600 }}>💡 둘 다 동시에 설정할 수 있으니, 원하는 조건을 마음껏 걸어두세요!</div>
            </div>

            <div>
              <div style={{ fontWeight: 800, color: "#111827", marginBottom: 2 }}>6️⃣ 6번: VS 종목 대결하기</div>
              <div style={{ color: "var(--text-secondary)" }}>종목 목록 위쪽에 있는 '🆚 종목 비교' 버튼을 누르면, 내가 산 주식 두 개를 골라서 <b>수익률, 상태 배지, 재무 점수, 모멘텀</b> 등을 나란히 놓고 비교할 수 있어요. 어떤 주식을 더 살지 고민될 때 써보세요!</div>
            </div>

            <div>
              <div style={{ fontWeight: 800, color: "#111827", marginBottom: 2 }}>7️⃣ 7번: 📈 시간 여행! 히스토리 트래킹</div>
              <div style={{ color: "var(--text-secondary)" }}>맨 위 박스 바로 밑에 있는 '자산 흐름 리포트'에서 내 주식이 <b>어제부터, 1주일 전부터, 한 달 전부터</b> 얼마나 올랐는지 바로 파악할 수 있어요.</div>
            </div>

            <div>
              <div style={{ fontWeight: 800, color: "#111827", marginBottom: 2 }}>8️⃣ 8번: 📅 쏠쏠한 배당금 관리</div>
              <div style={{ color: "var(--text-secondary)" }}>내 주식이 배당금을 준다면, 연간 기대 배당률을 계산해드려요! 맨 위 박스에서는 총 배당금을 확인하고, <b>다가오는 배당 캘린더</b>를 통해 배당락일이 다가오는지 미리 체크할 수 있답니다.</div>
            </div>

            <div>
              <div style={{ fontWeight: 800, color: "#111827", marginBottom: 2 }}>9️⃣ 9번: 🛡️ 계란 나누어 담기! 포트폴리오 디펜스</div>
              <div style={{ color: "var(--text-secondary)" }}>내 주식들이 한 테마에만 너무 쏠려 있지 않은지, 시장이 흔들릴 때 방어가 될지 예리가 <b>100점 만점으로 계산</b>해서 알려주고 팁을 드립니다.</div>
            </div>

            <div>
              <div style={{ fontWeight: 800, color: "#111827", marginBottom: 2 }}>🔟 10번: 🌱 복잡한 게 싫다면 초보자 모드</div>
              <div style={{ color: "var(--text-secondary)" }}>숫자나 지표가 너무 많아 어지럽다면? 왼쪽 메뉴의 '설정'에서 <b>초보자 모드</b>를 켜시면 예리가 심플하게 핵심 요약만 보여드립니다.</div>
            </div>
          </div>
          
          <div style={{ marginTop: 18, paddingTop: 16, borderTop: "1px dashed #fbcfe8", color: "#b81d52", fontWeight: 700, fontSize: 13 }}>
            💌 포트폴리오 기능을 사용하면서 오류나 추가적인 기능이 필요하다면 예리남편 종현이한테 바로 카톡 보내주세요.
          </div>
        </div>
      )}

      {error && (
        <div style={{ padding: "12px 16px", borderRadius: 12, background: "#fff8f8", border: "1px solid #f5c2cc", color: "#d64060", fontSize: 13, marginBottom: 16 }}>⚠️ {error}</div>
      )}

      {portfolio?.userMode === 'beginner' && (
        <div style={{ background: "#ecfdf5", borderRadius: 12, padding: "12px 16px", border: "1px solid #a7f3d0", color: "#065f46", fontSize: 13, fontWeight: 700, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
          <span>🌱</span> 초보자 모드가 켜져 있습니다. 복잡한 지표는 숨기고 핵심만 간편하게 보여드려요! (설정에서 변경 가능)
        </div>
      )}

      {/* ═══ 오늘의 액션 (Today's Actions) ═══ */}
      {portfolio?.todayActions && portfolio.todayActions.length > 0 && (
        <div style={{ background: "#fff", borderRadius: 16, padding: 16, border: "1px solid #e2e8f0", marginBottom: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 12, color: "var(--text-primary)" }}>🔥 오늘 챙겨야 할 액션</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {portfolio.todayActions.map((action: any, idx: number) => (
              <div key={idx} style={{ background: "#f8fafc", padding: "12px 14px", borderRadius: 8, borderLeft: `3px solid ${action.priority === 'HIGH' ? '#e11d48' : action.priority === 'MEDIUM' ? '#f59e0b' : '#3b82f6'}` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 800, color: "#111827", background: "white", padding: "2px 6px", borderRadius: 6, border: "1px solid #cbd5e1" }}>
                    {action.ticker}
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 800, color: action.priority === 'HIGH' ? '#e11d48' : action.priority === 'MEDIUM' ? '#f59e0b' : '#3b82f6' }}>
                    {action.action}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5 }}>
                  {action.reason}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══ 총 자산 카드 ═══ */}
      {hasHoldings && summary && (
        <div style={{ background: "linear-gradient(135deg, #3d1f2e 0%, #d48aaa 100%)", borderRadius: 16, padding: "20px 24px", color: "#fff", marginBottom: 24, boxShadow: "0 4px 12px rgba(212,138,170,0.2)" }}>
          <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 4 }}>총 자산 가치</div>
          <div style={{ fontSize: 28, fontWeight: 800, marginBottom: 12 }}>{summary?.uiCurrency || '$'}{summary.totalValue.toLocaleString()}</div>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", rowGap: 12 }}>
            <div>
              <div style={{ fontSize: 11, opacity: 0.7 }}>총 손익</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: summary.totalProfitLoss >= 0 ? "#4ade80" : "#fb7185" }}>
                {summary.totalProfitLoss >= 0 ? "+" : ""}{summary?.uiCurrency || '$'}{Math.round(summary.totalProfitLoss).toLocaleString()}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, opacity: 0.7 }}>수익률</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: summary.totalProfitLossPct >= 0 ? "#4ade80" : "#fb7185" }}>
                {summary.totalProfitLossPct >= 0 ? "+" : ""}{summary.totalProfitLossPct}%
              </div>
            </div>
            {(summary.totalAnnualDividend || 0) > 0 && (
              <div>
                <div style={{ fontSize: 11, opacity: 0.7 }}>연 예상 배당금 (추정)</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: "#fef08a" }}>
                  {summary?.uiCurrency || '$'}{Math.round(summary.totalAnnualDividend!)} ({summary.dividendYieldPct || 0}%)
                </div>
              </div>
            )}
            <div>
              <div style={{ fontSize: 11, opacity: 0.7 }}>종목 수</div>
              <div style={{ fontSize: 15, fontWeight: 700 }}>{summary.holdingCount}개</div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ 포트폴리오 히스토리 ═══ */}
      {historyData && hasHoldings && (
        <div style={{ background: "#fff", borderRadius: 16, padding: 16, border: "1px solid var(--border)", marginBottom: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 12, color: "var(--text-primary)" }}>📈 자산 흐름 리포트</div>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
            {[
              { label: "어제 대비", data: historyData.yesterday },
              { label: "1주 전 대비", data: historyData.lastWeek },
              { label: "한 달 전 대비", data: historyData.lastMonth },
            ].map(item => (
              <div key={item.label} style={{ flex: 1, background: "#f8fafc", padding: "10px", borderRadius: 8, textAlign: "center" }}>
                <div style={{ fontSize: 11, color: "var(--text-secondary)", marginBottom: 4 }}>{item.label}</div>
                {item.data ? (
                  <div style={{ fontSize: 13, fontWeight: 800, color: item.data.diff >= 0 ? "#10b981" : "#ef4444" }}>
                    {item.data.diff >= 0 ? "▲" : "▼"}{summary?.uiCurrency || '$'}{Math.abs(Math.round(item.data.diff)).toLocaleString()}
                    <div style={{ fontSize: 10, marginTop: 2 }}>({item.data.diffPct >= 0 ? "+" : ""}{item.data.diffPct.toFixed(2)}%)</div>
                  </div>
                ) : (
                  <div style={{ fontSize: 11, color: "var(--text-muted)" }}>-</div>
                )}
              </div>
            ))}
          </div>
          {historyData.max30 !== undefined && historyData.min30 !== undefined && (
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12, paddingTop: 12, borderTop: "1px dashed var(--border)", fontSize: 11, color: "var(--text-muted)" }}>
              <div>최근 30일 최고점: <b style={{color: "#10b981"}}>{summary?.uiCurrency || '$'}{Math.round(historyData.max30).toLocaleString()}</b></div>
              <div>최근 30일 최저점: <b style={{color: "#ef4444"}}>{summary?.uiCurrency || '$'}{Math.round(historyData.min30).toLocaleString()}</b></div>
            </div>
          )}
        </div>
      )}

      {/* ═══ 포트폴리오 상태 요약 ═══ */}
      {hasHoldings && ps && (
        <div style={{ background: "#fff", borderRadius: 16, padding: 16, border: "1px solid var(--border)", marginBottom: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 12, color: "var(--text-primary)" }}>📋 포트폴리오 상태 요약</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
            {[
              { label: "📈 상승우세", count: ps.bullishCount, color: "#16a34a" },
              { label: "➡️ 보통", count: ps.normalCount, color: "#2563eb" },
              { label: "⚠️ 주의", count: ps.cautionCount, color: "#d97706" },
              { label: "🚨 경고", count: ps.warningCount, color: "#dc2626" },
            ].map(s => (
              <div key={s.label} style={{ padding: "6px 12px", borderRadius: 8, background: "#f8fafc", fontSize: 12, fontWeight: 600 }}>
                {s.label} <span style={{ color: s.color, fontWeight: 800 }}>{s.count}</span>
              </div>
            ))}
          </div>
          {/* 상태 배지 기준점수 안내문 추가 */}
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px dashed var(--border)", fontSize: 11, color: "var(--text-muted)", lineHeight: 1.6 }}>
            💡 <b>상태 배지 기준 (종목 종합 점수):</b> 상승우세(75~100) · 보통(55~74) · 주의(40~54) · 경고(25~39) · 리스크 높음(0~24)
          </div>
          {ps.needCheckTop3.length > 0 && (
            <div style={{ marginTop: 8, padding: "10px 12px", background: "#fffbeb", borderRadius: 8, border: "1px solid #fef3c7" }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#d97706", marginBottom: 6 }}>⚠️ 점검이 필요한 종목</div>
              <ul style={{ margin: 0, paddingLeft: 20, fontSize: 12, color: "#92400e", lineHeight: 1.6 }}>
                {ps.needCheckTop3.map((r, i) => (
                  <li key={i}><b>{r.ticker} ({r.badge})</b>: {r.reason}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* ═══ 포트폴리오 분산 점수 (Diversification Score) ═══ */}
      {hasHoldings && portfolio?.diversification && (
        <div style={{ background: "#fff", borderRadius: 16, padding: 16, border: "1px solid var(--border)", marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: "var(--text-primary)" }}>🛡️ 포트폴리오 디펜스 (리스크 분산)</div>
            <div style={{ fontSize: 13, fontWeight: 800, color: portfolio.diversification.score >= 80 ? "#10b981" : portfolio.diversification.score >= 60 ? "#3b82f6" : portfolio.diversification.score >= 40 ? "#f59e0b" : "#ef4444" }}>
              {portfolio.diversification.score}점 ({portfolio.diversification.label})
            </div>
          </div>
          
          <div style={{ display: "flex", flexWrap: "wrap", gap: 16, marginBottom: 12 }}>
            <div style={{ flex: 1, minWidth: "140px", background: "#f8fafc", padding: "10px", borderRadius: 8 }}>
              <div style={{ fontSize: 11, color: "var(--text-secondary)", marginBottom: 6 }}>📊 섹터 Top 3 비중</div>
              {portfolio.diversification.sectors.slice(0, 3).map((s, idx) => (
                <div key={idx} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                  <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>{s.name}</span>
                  <span style={{ fontWeight: 800 }}>{s.weight}%</span>
                </div>
              ))}
              {portfolio.diversification.sectors.length === 0 && <div style={{ fontSize: 11, color: "var(--text-muted)" }}>데이터 없음</div>}
            </div>
            {portfolio?.userMode !== 'beginner' && (
              <div style={{ flex: 1, minWidth: "140px", background: "#f8fafc", padding: "10px", borderRadius: 8 }}>
                <div style={{ fontSize: 11, color: "var(--text-secondary)", marginBottom: 6 }}>🌊 포트폴리오 변동성 (Beta)</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: portfolio.diversification.avgBeta > 1.5 ? "#ef4444" : portfolio.diversification.avgBeta < 0.8 ? "#10b981" : "var(--text-primary)" }}>
                  {portfolio.diversification.avgBeta.toFixed(2)}
                </div>
                <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 4 }}>※ 1.0 = 시장 평균 변동성</div>
              </div>
            )}
          </div>

          {portfolio.diversification.messages.length > 0 && (
            <div style={{ fontSize: 12, color: "#d97706", lineHeight: 1.6, background: "#fffbeb", padding: "10px 12px", borderRadius: 8 }}>
              {portfolio.diversification.messages.map((m, idx) => (
                <div key={idx}>⚠️ {m}</div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ═══ 다가오는 배당일 ═══ */}
      {hasHoldings && Math.max(...holdings.map(h => (h.dividend?.rate || 0))) > 0 && (
        <div style={{ background: "#fff", borderRadius: 16, padding: 16, border: "1px solid var(--border)", marginBottom: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: "var(--text-primary)", marginBottom: 12 }}>📅 배당 캘린더 (배당락일 기준)</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {holdings
              .filter(h => h.dividend?.exDate)
              .sort((a, b) => new Date(a.dividend!.exDate!).getTime() - new Date(b.dividend!.exDate!).getTime())
              .map(h => {
                const tickerCur = summary?.uiCurrency || '₩';
                return (
                <div key={`div-${h.ticker}`} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", background: "#fcf8eb", borderRadius: 8, borderLeft: "3px solid #facc15" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 800, color: "#111827" }}>{h.ticker}</span>
                    <span style={{ fontSize: 11, color: "var(--text-secondary)", background: "#fff", padding: "2px 6px", borderRadius: 4 }}>{h.dividend!.exDate}</span>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: "#ca8a04" }}>{fmt(h.dividend!.rate, tickerCur)} (연)</div>
                </div>
            ); })}
            {holdings.filter(h => h.dividend?.exDate).length === 0 && (
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>예정된 최신 배당락일 정보가 표기되지 않았습니다.</div>
            )}
          </div>
        </div>
      )}

      {/* ═══ 종목별 카드 영역 헤더 ═══ */}
      {hasHoldings && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: "var(--text-primary)" }}>내 보유 종목</div>
          <button onClick={() => setCompareModalOpen(true)} style={{ background: "#334155", color: "white", padding: "8px 12px", borderRadius: 8, fontSize: 12, fontWeight: 700, border: "none", display: "flex", alignItems: "center", gap: 6, cursor: "pointer", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>
            <span>🆚</span> 종목 비교
          </button>
        </div>
      )}

      {/* ═══ 종목별 카드 ═══ */}
      {hasHoldings && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 20 }}>
          {holdings.map(h => {
            const bs = h.status ? getBadgeStyle(h.status.badge) : null;
            const plSign = (h.profitLossPct ?? 0) >= 0 ? "+" : "";
            const isBeginner = portfolio?.userMode === 'beginner';
            const uCur = summary?.uiCurrency || '₩';
            return (
              <div key={h.ticker} style={{ background: "#fff", borderRadius: 16, padding: 16, border: `1px solid ${bs ? bs.border : "var(--border)"}`, boxShadow: "0 2px 8px rgba(0,0,0,0.03)" }}>
                {/* 상단: 종목명 + 배지 */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                      <span style={{ fontSize: 15, fontWeight: 800 }}>{h.ticker}</span>
                      {h.name && <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{h.name}</span>}
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "6px", fontSize: 11, color: "var(--text-muted)" }}>
                      <span>{h.quantity}주 · 평단 {fmt(h.displayAvgPrice ?? h.avgPrice, uCur)} · 현재 {h.displayCurrentPrice != null ? fmt(h.displayCurrentPrice, uCur) : (h.currentPrice != null ? fmt(h.currentPrice, uCur) : "조회중")}</span>
                      {h.changePct != null && (
                        <span style={{ color: h.changePct >= 0 ? "#10b981" : "#ef4444", fontWeight: 600 }}>
                          (당일 {h.changePct >= 0 ? "+" : ""}{h.changePct.toFixed(2)}%)
                        </span>
                      )}
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {bs && (
                      <span style={{ padding: "4px 10px", borderRadius: 20, background: bs.bg, color: bs.color, fontSize: 11, fontWeight: 700, border: `1px solid ${bs.border}`, whiteSpace: "nowrap" }}>
                        {bs.icon} {h.status!.badge}
                      </span>
                    )}
                    <button onClick={() => removeHolding(h.ticker)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, color: "#cbd5e1" }}>✕</button>
                  </div>
                </div>

                {/* 수익률 & 배당금 */}
                <div style={{ display: "flex", gap: 16, marginBottom: 10, flexWrap: "wrap", rowGap: 8 }}>
                  <div>
                    <div style={{ fontSize: 10, color: "var(--text-muted)" }}>평가손익</div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: (h.profitLossPct ?? 0) >= 0 ? "#10b981" : "#ef4444" }}>
                      {plSign}{fmt(h.displayPL ?? h.profitLoss, uCur)}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: "var(--text-muted)" }}>수익률</div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: (h.profitLossPct ?? 0) >= 0 ? "#10b981" : "#ef4444" }}>
                      {plSign}{h.profitLossPct ?? "-"}%
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: "var(--text-muted)" }}>비중</div>
                    <div style={{ fontSize: 15, fontWeight: 700 }}>{h.weight ?? "-"}%</div>
                  </div>
                  {(h.dividend?.rate || 0) > 0 && (
                    <div style={{ paddingLeft: 12, borderLeft: "1px solid var(--border)" }}>
                      <div style={{ fontSize: 10, color: "var(--text-muted)" }}>배당 (수익률)</div>
                      <div style={{ fontSize: 15, fontWeight: 800, color: "#ca8a04" }}>
                        {fmt(h.dividend!.rate, uCur)} ({h.dividend!.yield ? (h.dividend!.yield * 100).toFixed(2) : (((h.dividend!.rate || 0) / (h.currentPrice || 1)) * 100).toFixed(2)}%)
                      </div>
                    </div>
                  )}
                </div>

                {/* 전략 문구 + 이유 (데이터 오류 시 노출 방지) */}
                {h.status && (h.profitLossPct == null || (h.profitLossPct > -100 && h.profitLossPct <= 1000)) && (
                  <div style={{ background: bs ? `${bs.bg}` : "#f8fafc", borderRadius: 10, padding: "10px 14px", marginBottom: 6 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: bs?.color || "var(--text-primary)", lineHeight: 1.6, marginBottom: 4 }}>
                      💡 {h.status.strategy}
                    </div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {h.status.reasons.map((r, i) => (
                        <span key={i} style={{ padding: "2px 8px", borderRadius: 6, background: "#fff", border: "1px solid #e2e8f0", fontSize: 10, color: "var(--text-secondary)", fontWeight: 600 }}>
                          {r}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* 7팩터 점수 바 */}
                {!isBeginner && h.status?.scores && (
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 6 }}>
                    {[
                      { key: "trend", label: "추세" },
                      { key: "momentum", label: "모멘텀" },
                      { key: "financial", label: "재무" },
                      { key: "valuation", label: "밸류" },
                      { key: "sentiment", label: "뉴스" },
                      { key: "volatility", label: "변동성" },
                    ].map(f => {
                      const val = h.status!.scores[f.key];
                      const c = val == null ? "#94a3b8" : val >= 60 ? "#10b981" : val >= 40 ? "#f59e0b" : "#ef4444";
                      return (
                        <span key={f.key} style={{ fontSize: 9, color: c, fontWeight: 600 }}>
                          {f.label}{val ?? "-"}
                        </span>
                      );
                    })}
                    {h.status.overall != null && (
                      <span style={{ fontSize: 9, fontWeight: 800, color: "var(--text-primary)", marginLeft: 4 }}>종합{h.status.overall}</span>
                    )}
                  </div>
                )}

                {/* 동적 가격 구간 (Price Zones) */}
                {!isBeginner && h.status?.priceZones && (
                  <div style={{ marginTop: 12, padding: 12, background: "#f8fafc", borderRadius: 8, border: "1px dashed #cbd5e1" }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-primary)", marginBottom: 8 }}>🎯 동적 가격 구간 (매매 가이드)</div>
                    <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                      <div style={{ flex: "1 1 30%" }}>
                         <div style={{ fontSize: 10, color: "var(--text-muted)" }}>1차 목표가</div>
                         <div style={{ fontSize: 13, fontWeight: 700, color: "#10b981" }}>{fmt(h.status.priceZones.tp1, uCur)}</div>
                      </div>
                      <div style={{ flex: "1 1 30%" }}>
                         <div style={{ fontSize: 10, color: "var(--text-muted)" }}>2차 목표가 (Max)</div>
                         <div style={{ fontSize: 13, fontWeight: 700, color: "#059669" }}>{fmt(h.status.priceZones.tp2, uCur)}</div>
                      </div>
                      <div style={{ flex: "1 1 30%" }}>
                         <div style={{ fontSize: 10, color: "var(--text-muted)" }}>관찰 구간</div>
                         <div style={{ fontSize: 13, fontWeight: 700, color: "#f59e0b" }}>{fmt(h.status.priceZones.observeMin, uCur)} ~ {fmt(h.status.priceZones.observeMax, uCur)}</div>
                      </div>
                      <div style={{ flex: "1 1 30%" }}>
                         <div style={{ fontSize: 10, color: "var(--text-muted)" }}>추세 이탈점</div>
                         <div style={{ fontSize: 13, fontWeight: 700, color: "#ef4444" }}>{fmt(h.status.priceZones.trendBreak, uCur)}</div>
                      </div>
                      <div style={{ flex: "1 1 30%" }}>
                         <div style={{ fontSize: 10, color: "var(--text-muted)" }}>손절가 (SL)</div>
                         <div style={{ fontSize: 13, fontWeight: 700, color: "#b91c1c" }}>{fmt(h.status.priceZones.sl, uCur)}</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 📝 매수/매도 기록 (Trade History) */}
                <div style={{ marginTop: 12, borderTop: "1px solid #f1f5f9", paddingTop: 12 }}>
                  <div 
                    onClick={() => setExpandedTradeTicker(expandedTradeTicker === h.ticker ? null : h.ticker)}
                    style={{ fontSize: 12, fontWeight: 700, color: "var(--text-secondary)", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}
                  >
                    <span>📝 매매 기록 ({h.trades?.length || 0}건)</span>
                    <span>{expandedTradeTicker === h.ticker ? "▲" : "▼"}</span>
                  </div>
                  {expandedTradeTicker === h.ticker && (
                    <div style={{ marginTop: 10 }}>
                      {h.trades && h.trades.length > 0 ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 10 }}>
                          {[...h.trades].reverse().map((t, idx) => (
                            <div key={idx} style={{ display: "flex", justifyContent: "space-between", fontSize: 11, padding: "6px 8px", background: "#f8fafc", borderRadius: 6, borderLeft: `3px solid ${t.type === 'buy' ? '#10b981' : '#ef4444'}` }}>
                              <div>
                                <span style={{ fontWeight: 800, color: t.type === 'buy' ? '#10b981' : '#ef4444', marginRight: 6 }}>{t.type === 'buy' ? '매수' : '매도'}</span>
                                <span style={{ color: "var(--text-muted)" }}>{t.date}</span>
                              </div>
                              <div style={{ fontWeight: 600 }}>{t.quantity}주 @ {fmt(t.price, uCur)}</div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 10 }}>기록된 매매 내역이 없습니다.</div>
                      )}
                      <div style={{ display: "flex", gap: 8 }}>
                        <button onClick={() => handleAddTrade(h.ticker, 'buy', h.currentPrice)} style={{ flex: 1, padding: "6px", borderRadius: 6, border: "1px solid #10b981", background: "#ecfdf5", color: "#059669", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>+ 추가 매수</button>
                        <button onClick={() => handleAddTrade(h.ticker, 'sell', h.currentPrice)} style={{ flex: 1, padding: "6px", borderRadius: 6, border: "1px solid #ef4444", background: "#fef2f2", color: "#dc2626", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>- 분할 매도</button>
                      </div>
                    </div>
                  )}
                </div>

                {/* 🧪 시뮬레이터 */}
                <div style={{ marginTop: 12, borderTop: "1px solid #f1f5f9", paddingTop: 12 }}>
                  <div 
                    style={{ fontSize: 12, fontWeight: 700, color: "var(--text-secondary)", display: "flex", justifyContent: "space-between", alignItems: "center" }}
                  >
                    <span>🧪 시뮬레이터 (가상 매매)</span>
                  </div>
                  <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                    <button onClick={() => handleSimulate(h.ticker, 'buy', h.currentPrice)} disabled={simLoading} style={{ flex: 1, padding: "6px", borderRadius: 6, border: "1px solid #3b82f6", background: "#eff6ff", color: "#2563eb", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>{simLoading && simulateTicker === h.ticker ? "시뮬레이션 중..." : "+ 가상 매수"}</button>
                    <button onClick={() => handleSimulate(h.ticker, 'sell', h.currentPrice)} disabled={simLoading} style={{ flex: 1, padding: "6px", borderRadius: 6, border: "1px solid #8b5cf6", background: "#f5f3ff", color: "#7c3aed", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>{simLoading && simulateTicker === h.ticker ? "시뮬레이션 중..." : "- 가상 매도"}</button>
                  </div>
                  {simulateTicker === h.ticker && simulateData && (
                    <div style={{ marginTop: 12, padding: 12, background: "#f8fafc", borderRadius: 8, border: "1px dashed #cbd5e1" }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-primary)", marginBottom: 8, display: "flex", justifyContent: "space-between" }}>
                        <span>📊 시뮬레이션 결과 요약</span>
                        <span style={{ cursor: "pointer", color: "var(--text-muted)", fontSize: 14 }} onClick={() => setSimulateTicker(null)}>✕</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 4 }}>
                        <span style={{ color: "var(--text-muted)" }}>건강도 점수</span>
                        <span style={{ fontWeight: 700 }}>
                          {simulateData.before.healthScore?.score}점 ➡️ <span style={{ color: (simulateData.after.healthScore?.score || 0) > (simulateData.before.healthScore?.score || 0) ? "#10b981" : (simulateData.after.healthScore?.score || 0) < (simulateData.before.healthScore?.score || 0) ? "#ef4444" : "var(--text-primary)" }}>{simulateData.after.healthScore?.score}점</span>
                        </span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 4 }}>
                        <span style={{ color: "var(--text-muted)" }}>총 평가손익</span>
                        <span style={{ fontWeight: 700 }}>
                          {summary?.uiCurrency || '$'}{simulateData.after.summary.totalProfitLoss.toLocaleString()} ({simulateData.after.summary.totalProfitLossPct}%)
                        </span>
                      </div>
                      {(() => {
                        const targetBefore = simulateData.before.holdings.find((x: Holding) => x.ticker === h.ticker);
                        const targetAfter = simulateData.after.holdings.find((x: Holding) => x.ticker === h.ticker);
                        return targetAfter && (
                          <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid #e2e8f0", fontSize: 11 }}>
                            <div style={{ color: "var(--text-muted)", marginBottom: 4 }}>해당 종목 비중:</div>
                            <div style={{ display: "flex", justifyContent: "space-between" }}>
                              <span style={{ color: "var(--text-muted)" }}>포트 내 비중</span>
                              <span style={{ fontWeight: 700 }}>{targetBefore?.weight || 0}% ➡️ {targetAfter.weight}%</span>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 2 }}>
                              <span style={{ color: "var(--text-muted)" }}>평단가 변화</span>
                              <span style={{ fontWeight: 700 }}>{fmt(targetBefore?.avgPrice || 0, uCur)} ➡️ {fmt(targetAfter.avgPrice, uCur)}</span>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>

                {/* 데이터 시점 */}
                {h.dataAsOf && (
                  <div style={{ fontSize: 9, color: "#94a3b8", marginTop: 6 }}>
                    ⏰ {new Date(h.dataAsOf).toLocaleString("ko-KR")}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ═══ 종목 추가 폼 ═══ */}
      {addMode ? (
        <div style={{ background: "#fff", borderRadius: 16, padding: 20, border: "1px solid var(--border)", marginBottom: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 12 }}>📌 종목 추가</div>
          <div style={{ marginBottom: 12 }}>
            {isConfirmedSuggestion && newTicker ? (
              <div style={{ padding: "14px", background: "#edf9f0", border: "1px solid #c8efd8", borderRadius: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <span style={{ fontWeight: 800, color: "#16a34a", fontSize: 16 }}>✅ {newTicker}</span>
                  <span style={{ fontSize: 12, color: "#2ea85a", fontWeight: 600 }}>{newName}</span>
                </div>
                <button onClick={() => { setIsConfirmedSuggestion(false); setNewTicker(""); setNewName(""); setSearchQuery(""); }} 
                  style={{ background: "none", border: "none", color: "#16a34a", cursor: "pointer", padding: "8px", fontWeight: 700, fontSize: 13 }}>
                  ✕ 다시 검색
                </button>
              </div>
            ) : (
              <div style={{ position: "relative" }}>
                <input value={searchQuery} onChange={e => handleTickerChange(e.target.value)}
                  onBlur={() => setTimeout(() => setSuggestions([]), 200)}
                  placeholder="🔍 종목 검색 (예: NVDA, 애플)" autoComplete="off"
                  style={{ width: "100%", padding: "14px 16px", borderRadius: 12, background: "#f5f7fa", border: "1.5px solid var(--border)", fontSize: 15, fontWeight: 700 }} />
                
                {suggestions.length > 0 && (
                  <div style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 100, background: "#fff", borderRadius: 12, border: "1px solid var(--border)", boxShadow: "0 10px 30px rgba(0,0,0,0.15)", marginTop: 6, maxHeight: "280px", overflowY: "auto" }}>
                    {suggestions.map((sug, i) => (
                      <div key={i} onMouseDown={() => selectSuggestion(sug)}
                        style={{ padding: "12px 16px", cursor: "pointer", borderBottom: i < suggestions.length - 1 ? "1px solid #f3f4f6" : "none", display: "flex", flexDirection: "column", gap: 3 }}
                        onMouseOver={e => { e.currentTarget.style.background = "#f8fafc"; }}
                        onMouseOut={e => { e.currentTarget.style.background = "#fff"; }}>
                        <span style={{ fontWeight: 800, fontSize: 15, color: "#1e293b" }}>{sug.ticker}</span>
                        <span style={{ color: "var(--text-muted)", fontSize: 12, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{sug.name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
            <div>
              <div style={{ fontSize: 10, color: "var(--text-muted)", marginBottom: 4 }}>보유 수량</div>
              <input type="number" inputMode="decimal" value={newQty || ""} onChange={e => setNewQty(Number(e.target.value))}
                style={{ width: "100%", padding: "10px 12px", borderRadius: 8, background: "#f5f7fa", border: "1px solid var(--border)", fontSize: 14, fontWeight: 600 }} />
            </div>
            <div>
              <div style={{ fontSize: 10, color: "var(--text-muted)", marginBottom: 4 }}>평균 단가({newTicker?.endsWith('.KS') || /^[0-9]{6}$/.test(newTicker||'') ? '₩' : '$'})</div>
              <input type="number" inputMode="decimal" value={newPrice || ""} onChange={e => setNewPrice(Number(e.target.value))}
                style={{ width: "100%", padding: "10px 12px", borderRadius: 8, background: "#f5f7fa", border: "1px solid var(--border)", fontSize: 14, fontWeight: 600 }} />
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: 10, color: "var(--text-muted)", marginBottom: 4 }}>매수일 (선택)</div>
              <input type="date" value={newBuyDate} onChange={e => setNewBuyDate(e.target.value)}
                style={{ width: "100%", padding: "10px 12px", borderRadius: 8, background: "#f5f7fa", border: "1px solid var(--border)", fontSize: 13 }} />
            </div>
            <div>
              <div style={{ fontSize: 10, color: "var(--text-muted)", marginBottom: 4 }}>메모 (선택)</div>
              <input value={newMemo} onChange={e => setNewMemo(e.target.value)} placeholder="예: AI 대장주"
                style={{ width: "100%", padding: "10px 12px", borderRadius: 8, background: "#f5f7fa", border: "1px solid var(--border)", fontSize: 13 }} />
            </div>
          </div>
          {/* 알림 설정 아코디언 */}
          <div style={{ marginBottom: 14 }}>
            <button onClick={() => setShowAlertUI(!showAlertUI)}
              style={{ width: "100%", padding: "10px", borderRadius: 8, background: showAlertUI ? "#fdf2f8" : "#f1f5f9", border: "1px solid var(--border)", color: showAlertUI ? "#db2777" : "var(--text-secondary)", fontWeight: 700, fontSize: 13, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>🔔 조건부 스마트 알림 설정 (선택)</span>
              <span>{showAlertUI ? "▲ 접기" : "▼ 펼치기"}</span>
            </button>
            
            {showAlertUI && (
              <div style={{ padding: "14px", background: "#fdf8fa", border: "1px solid #fce7f3", borderRadius: 8, marginTop: 8, display: "flex", flexDirection: "column", gap: 16 }}>
                
                {/* 1. 조건 도달 알림 섹션 */}
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, paddingBottom: 6, borderBottom: "1px solid rgba(219,39,119,0.1)" }}>
                    <span style={{ fontSize: 13, fontWeight: 800, color: "var(--text-primary)" }}>🎯 조건 도달 알림 (실제 도달 시)</span>
                    <label style={{ display: "flex", alignItems: "center", cursor: "pointer", gap: 8 }}>
                      <input type="checkbox" checked={newAlerts.enabled} onChange={e => setNewAlerts({...newAlerts, enabled: e.target.checked})} style={{ width: 18, height: 18, accentColor: "#db2777" }} />
                      <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>활성화</span>
                    </label>
                  </div>
                  
                  {newAlerts.enabled && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                        <div>
                          <div style={{ fontSize: 11, color: "var(--text-secondary)", marginBottom: 4 }}>📈 수익률 목표 (%)</div>
                          <input type="number" placeholder="+20" value={newAlerts.takeProfitPct ?? ""} onChange={e => setNewAlerts({...newAlerts, takeProfitPct: e.target.value ? Number(e.target.value) : null})} style={{ width: "100%", padding: "8px", borderRadius: 6, border: "1px solid #fbcfe8", fontSize: 13 }} />
                        </div>
                        <div>
                          <div style={{ fontSize: 11, color: "var(--text-secondary)", marginBottom: 4 }}>📉 손절 기준 (%)</div>
                          <input type="number" placeholder="-10" value={newAlerts.stopLossPct ?? ""} onChange={e => setNewAlerts({...newAlerts, stopLossPct: e.target.value ? Number(e.target.value) : null})} style={{ width: "100%", padding: "8px", borderRadius: 6, border: "1px solid #fbcfe8", fontSize: 13 }} />
                        </div>
                      </div>
                      
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                        <div>
                          <div style={{ fontSize: 11, color: "var(--text-secondary)", marginBottom: 4 }}>🚀 가격 돌파({newTicker?.endsWith('.KS') || /^[0-9]{6}$/.test(newTicker||'') ? '₩' : '$'})</div>
                          <input type="number" placeholder="목표가" value={newAlerts.priceAbove ?? ""} onChange={e => setNewAlerts({...newAlerts, priceAbove: e.target.value ? Number(e.target.value) : null})} style={{ width: "100%", padding: "8px", borderRadius: 6, border: "1px solid #fbcfe8", fontSize: 13 }} />
                        </div>
                        <div>
                          <div style={{ fontSize: 11, color: "var(--text-secondary)", marginBottom: 4 }}>🔻 가격 이탈({newTicker?.endsWith('.KS') || /^[0-9]{6}$/.test(newTicker||'') ? '₩' : '$'})</div>
                          <input type="number" placeholder="이탈가" value={newAlerts.priceBelow ?? ""} onChange={e => setNewAlerts({...newAlerts, priceBelow: e.target.value ? Number(e.target.value) : null})} style={{ width: "100%", padding: "8px", borderRadius: 6, border: "1px solid #fbcfe8", fontSize: 13 }} />
                        </div>
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                        <div>
                          <div style={{ fontSize: 11, color: "var(--text-secondary)", marginBottom: 4 }}>💰 총 평가금액 달성({newTicker?.endsWith('.KS') || /^[0-9]{6}$/.test(newTicker||'') ? '₩' : '$'})</div>
                          <input type="number" placeholder="(수량×단가)" value={newAlerts.totalValueAbove ?? ""} onChange={e => setNewAlerts({...newAlerts, totalValueAbove: e.target.value ? Number(e.target.value) : null})} style={{ width: "100%", padding: "8px", borderRadius: 6, border: "1px solid #fbcfe8", fontSize: 13 }} />
                        </div>
                        <div>
                          <div style={{ fontSize: 11, color: "var(--text-secondary)", marginBottom: 4 }}>⚖️ 비중 초과 경고 (%)</div>
                          <input type="number" placeholder="30" value={newAlerts.maxWeight ?? ""} onChange={e => setNewAlerts({...newAlerts, maxWeight: e.target.value ? Number(e.target.value) : null})} style={{ width: "100%", padding: "8px", borderRadius: 6, border: "1px solid #fbcfe8", fontSize: 13 }} />
                        </div>
                      </div>

                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 8, borderTop: "1px dashed #fce7f3" }}>
                        <span style={{ fontSize: 12, color: "var(--text-primary)", fontWeight: 600 }}>🚨 배지 악화 시 즉시 알림 (경고/위험)</span>
                        <input type="checkbox" checked={newAlerts.badgeChange} onChange={e => setNewAlerts({...newAlerts, badgeChange: e.target.checked})} style={{ width: 16, height: 16, accentColor: "#db2777" }} />
                      </div>
                    </div>
                  )}
                </div>

                {/* 2. AI 예측/사전 경고 섹션 */}
                <div style={{ background: "rgba(255,255,255,0.6)", borderRadius: 8, padding: "12px", border: "1px solid rgba(219,39,119,0.2)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 800, color: "var(--accent)" }}>🔮 AI 예측/사전 경고 (도달 전 조기감지)</span>
                    <label style={{ display: "flex", alignItems: "center", cursor: "pointer", gap: 8 }}>
                      <input type="checkbox" checked={newAlerts.predictEnabled} onChange={e => setNewAlerts({...newAlerts, predictEnabled: e.target.checked})} style={{ width: 18, height: 18, accentColor: "var(--accent)" }} />
                      <span style={{ fontSize: 13, color: "var(--text-muted)" }}>활성화</span>
                    </label>
                  </div>
                  
                  {newAlerts.predictEnabled && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", cursor: "pointer" }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                          <span style={{ fontSize: 12, color: "var(--text-primary)", fontWeight: 600 }}>목표가 돌파 가능성 높아짐 📈</span>
                          <span style={{ fontSize: 10, color: "var(--text-muted)" }}>현재가가 설정 목표가에 90% 이상 근접 시</span>
                        </div>
                        <input type="checkbox" checked={newAlerts.predictBreakout} onChange={e => setNewAlerts({...newAlerts, predictBreakout: e.target.checked})} style={{ width: 16, height: 16, accentColor: "var(--accent)" }} />
                      </label>
                      <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", cursor: "pointer" }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                          <span style={{ fontSize: 12, color: "var(--text-primary)", fontWeight: 600 }}>상승 모멘텀 강화 🚀</span>
                          <span style={{ fontSize: 10, color: "var(--text-muted)" }}>종합점수+추세/모멘텀이 강세 구간 돌입 시</span>
                        </div>
                        <input type="checkbox" checked={newAlerts.predictMomentumUp} onChange={e => setNewAlerts({...newAlerts, predictMomentumUp: e.target.checked})} style={{ width: 16, height: 16, accentColor: "var(--accent)" }} />
                      </label>
                      <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", cursor: "pointer" }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                          <span style={{ fontSize: 12, color: "var(--text-primary)", fontWeight: 600 }}>하락 위험 확대 📉</span>
                          <span style={{ fontSize: 10, color: "var(--text-muted)" }}>종합점수 하락 또는 당일 급락 감지 시</span>
                        </div>
                        <input type="checkbox" checked={newAlerts.predictDump} onChange={e => setNewAlerts({...newAlerts, predictDump: e.target.checked})} style={{ width: 16, height: 16, accentColor: "var(--accent)" }} />
                      </label>
                      <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", cursor: "pointer" }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                          <span style={{ fontSize: 12, color: "var(--text-primary)", fontWeight: 600 }}>경고 단계 진입 직전 ⚠️</span>
                          <span style={{ fontSize: 10, color: "var(--text-muted)" }}>종합점수가 경고 경계선(40~49)에 진입 시</span>
                        </div>
                        <input type="checkbox" checked={newAlerts.predictBadgeDown} onChange={e => setNewAlerts({...newAlerts, predictBadgeDown: e.target.checked})} style={{ width: 16, height: 16, accentColor: "var(--accent)" }} />
                      </label>
                      <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", cursor: "pointer" }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                          <span style={{ fontSize: 12, color: "var(--text-primary)", fontWeight: 600 }}>비중 위험 확대 중 ⚖️</span>
                          <span style={{ fontSize: 10, color: "var(--text-muted)" }}>비중이 설정 한도의 85% 이상 근접 시</span>
                        </div>
                        <input type="checkbox" checked={newAlerts.predictWeightRisk} onChange={e => setNewAlerts({...newAlerts, predictWeightRisk: e.target.checked})} style={{ width: 16, height: 16, accentColor: "var(--accent)" }} />
                      </label>
                    </div>
                  )}
                </div>

                {newAlerts.enabled && (
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 4 }}>
                    <button onClick={() => setNewAlerts({...newAlerts, takeProfitPct: 20, stopLossPct: -10, maxWeight: 30, badgeChange: true, predictEnabled: true, predictBreakout: true, predictMomentumUp: true, predictDump: true, predictBadgeDown: true, predictWeightRisk: true})} style={{ padding: "6px 10px", fontSize: 11, fontWeight: 700, borderRadius: 12, background: "#fce7f3", color: "#be123c", border: "none", cursor: "pointer" }}>💡 예리의 풀패키지 추천값 채우기</button>
                  </div>
                )}
              </div>
            )}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={addHolding} disabled={!newTicker || newQty <= 0 || newPrice <= 0}
              style={{ flex: 1, padding: "12px", borderRadius: 12, border: "none", background: (!newTicker || newQty <= 0 || newPrice <= 0) ? "#e5e9f0" : "var(--accent)", color: (!newTicker || newQty <= 0 || newPrice <= 0) ? "var(--text-muted)" : "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
              ✅ 추가하기
            </button>
            <button onClick={() => setAddMode(false)}
              style={{ padding: "12px 20px", borderRadius: 12, border: "1px solid var(--border)", background: "#fff", color: "var(--text-secondary)", fontWeight: 600, fontSize: 14, cursor: "pointer" }}>
              취소
            </button>
          </div>
        </div>
      ) : (
        <button onClick={() => setAddMode(true)}
          style={{ width: "100%", padding: "14px", borderRadius: 12, border: "1.5px dashed var(--border)", background: "transparent", color: "var(--text-secondary)", fontSize: 13, fontWeight: 600, cursor: "pointer", marginBottom: 20 }}>
          + 종목 추가하기
        </button>
      )}

      {/* ═══ AI 브리핑 버튼 ═══ */}
      {hasHoldings && (
        <>
          <button onClick={getBriefing} disabled={briefingLoading}
            style={{ width: "100%", padding: "16px", borderRadius: 16, border: "none", background: briefingLoading ? "#e5e9f0" : "var(--accent)", color: briefingLoading ? "var(--text-muted)" : "#fff", fontWeight: 800, fontSize: 16, cursor: briefingLoading ? "not-allowed" : "pointer", boxShadow: briefingLoading ? "none" : "0 4px 14px rgba(63,202,107,0.3)", marginBottom: 20 }}>
            {briefingLoading ? "🔄 AI 자산관리 브리핑 생성 중..." : "🧠 AI 포트폴리오 브리핑"}
          </button>

          {/* 브리핑 결과 */}
          {briefing && (
            <div style={{ background: "#fff", borderRadius: 18, padding: "24px 20px", border: "1px solid var(--border)", boxShadow: "0 4px 20px rgba(0,0,0,0.02)", marginBottom: 20 }}>
              <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 16, display: "flex", alignItems: "center", gap: 6 }}>🧠 AI 자산관리 브리핑</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {briefing.split("\n").filter(l => l.trim()).map((line, i) => (
                  <div key={i} style={{ fontSize: 14, lineHeight: 1.8, color: "var(--text-primary)" }}>{line}</div>
                ))}
              </div>
              <button onClick={() => setBriefing("")}
                style={{ width: "100%", padding: "12px", marginTop: 16, borderRadius: 10, border: "1px solid var(--border)", background: "#fff", color: "var(--text-secondary)", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
                ✕ 브리핑 닫기
              </button>
            </div>
          )}
        </>
      )}

      {/* 비어있을 때 */}
      {!hasHoldings && !loading && (
        <div style={{ textAlign: "center", padding: "60px 20px", color: "var(--text-muted)" }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>📊</div>
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8, color: "var(--text-primary)" }}>포트폴리오가 비어있어요</div>
          <div style={{ fontSize: 13, marginBottom: 24 }}>보유 종목을 추가하면 실시간 수익률과 상태 분석을 받을 수 있어요</div>
          <button onClick={() => setAddMode(true)}
            style={{ padding: "12px 24px", borderRadius: 12, border: "none", background: "var(--accent)", color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
            + 첫 종목 추가하기
          </button>
        </div>
      )}

      {/* ═══ 종목 비교 모달 ═══ */}
      {compareModalOpen && portfolio && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.6)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ background: "#fff", width: "100%", maxWidth: 640, borderRadius: 20, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 10px 40px rgba(0,0,0,0.2)", position: "relative" }}>
            
            {/* Header */}
            <div style={{ position: "sticky", top: 0, background: "#fff", zIndex: 10, padding: "20px 24px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: "var(--text-primary)" }}>🆚 종목 비교</div>
              <button onClick={() => { setCompareModalOpen(false); setCompareT1(""); setCompareT2(""); }} style={{ background: "none", border: "none", fontSize: 24, cursor: "pointer", color: "var(--text-muted)" }}>✕</button>
            </div>

            {/* Content */}
            <div style={{ padding: "20px 24px" }}>
              {/* Selectors */}
              <div style={{ display: "flex", gap: 16, marginBottom: 24 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-secondary)", marginBottom: 6 }}>종목 1 선택</div>
                  <select value={compareT1} onChange={e => setCompareT1(e.target.value)} style={{ width: "100%", padding: "12px", borderRadius: 8, border: "1px solid var(--border)", background: "#f8fafc", fontSize: 14 }}>
                    <option value="">선택하세요</option>
                    {portfolio.holdings.map(h => <option key={`t1-${h.ticker}`} value={h.ticker}>{h.ticker} ({h.name})</option>)}
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-secondary)", marginBottom: 6 }}>종목 2 선택</div>
                  <select value={compareT2} onChange={e => setCompareT2(e.target.value)} style={{ width: "100%", padding: "12px", borderRadius: 8, border: "1px solid var(--border)", background: "#f8fafc", fontSize: 14 }}>
                    <option value="">선택하세요</option>
                    {portfolio.holdings.map(h => <option key={`t2-${h.ticker}`} value={h.ticker}>{h.ticker} ({h.name})</option>)}
                  </select>
                </div>
              </div>

              {/* Comparison Table */}
              {compareT1 && compareT2 && compareT1 !== compareT2 ? (() => {
                const h1 = portfolio.holdings.find(h => h.ticker === compareT1);
                const h2 = portfolio.holdings.find(h => h.ticker === compareT2);
                if (!h1 || !h2) return null;

                const makeRow = (label: string, v1: any, v2: any, isWinner1: boolean, isWinner2: boolean) => (
                  <div style={{ display: "grid", gridTemplateColumns: "100px 1fr 1fr", gap: 12, padding: "12px 0", borderBottom: "1px solid #f1f5f9" }}>
                    <div style={{ fontSize: 12, color: "var(--text-secondary)", fontWeight: 600, alignSelf: "center", lineHeight: 1.2 }}>{label}</div>
                    <div style={{ fontSize: 13, background: isWinner1 ? "#eff6ff" : "transparent", color: isWinner1 ? "#1d4ed8" : "var(--text-primary)", fontWeight: isWinner1 ? 800 : 500, padding: "8px", borderRadius: 6, textAlign: "center" }}>{v1}</div>
                    <div style={{ fontSize: 13, background: isWinner2 ? "#eff6ff" : "transparent", color: isWinner2 ? "#1d4ed8" : "var(--text-primary)", fontWeight: isWinner2 ? 800 : 500, padding: "8px", borderRadius: 6, textAlign: "center" }}>{v2}</div>
                  </div>
                );

                return (
                  <div>
                    {/* Headers */}
                    <div style={{ display: "grid", gridTemplateColumns: "100px 1fr 1fr", gap: 12, paddingBottom: 12, borderBottom: "2px solid var(--border)", textAlign: "center" }}>
                      <div></div>
                      <div style={{ fontSize: 18, fontWeight: 800 }}>{h1.ticker}</div>
                      <div style={{ fontSize: 18, fontWeight: 800 }}>{h2.ticker}</div>
                    </div>

                    {/* Data */}
                    <div style={{ marginTop: 12 }}>
                      {makeRow("현재가", fmt(h1.displayCurrentPrice ?? h1.currentPrice, summary?.uiCurrency || '₩'), fmt(h2.displayCurrentPrice ?? h2.currentPrice, summary?.uiCurrency || '₩'), false, false)}
                      {makeRow("당일 등락", `${h1.changePct}%`, `${h2.changePct}%`, (h1.changePct||0) > (h2.changePct||0), (h2.changePct||0) > (h1.changePct||0))}
                      {makeRow("평가 손익(%)", `${h1.profitLossPct}%`, `${h2.profitLossPct}%`, (h1.profitLossPct||0) > (h2.profitLossPct||0), (h2.profitLossPct||0) > (h1.profitLossPct||0))}
                      {makeRow("포트폴리오 비중", `${h1.weight ?? 0}%`, `${h2.weight ?? 0}%`, false, false)}
                      {makeRow("종합 건강도", h1.status?.overall ? `${h1.status.overall}점` : "-", h2.status?.overall ? `${h2.status.overall}점` : "-", (h1.status?.overall||0) > (h2.status?.overall||0), (h2.status?.overall||0) > (h1.status?.overall||0))}
                      {makeRow("상태 배지", h1.status?.badge || "-", h2.status?.badge || "-", h1.status?.badge === '상승우세', h2.status?.badge === '상승우세')}
                      {makeRow("모멘텀 점수", h1.status?.scores?.momentum, h2.status?.scores?.momentum, (h1.status?.scores?.momentum||0) > (h2.status?.scores?.momentum||0), (h2.status?.scores?.momentum||0) > (h1.status?.scores?.momentum||0))}
                      {makeRow("재무/펀더멘탈", h1.status?.scores?.financial, h2.status?.scores?.financial, (h1.status?.scores?.financial||0) > (h2.status?.scores?.financial||0), (h2.status?.scores?.financial||0) > (h1.status?.scores?.financial||0))}
                    </div>

                    {/* Strategy compare */}
                    <div style={{ marginTop: 20, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                      <div style={{ background: "#f8fafc", padding: "12px", borderRadius: 8, fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.6 }}>
                        <div style={{ fontWeight: 800, color: "#111827", marginBottom: 6 }}>💡 {h1.ticker} 전략 요약</div>
                        {h1.status?.strategy || "데이터 없음"}
                      </div>
                      <div style={{ background: "#f8fafc", padding: "12px", borderRadius: 8, fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.6 }}>
                        <div style={{ fontWeight: 800, color: "#111827", marginBottom: 6 }}>💡 {h2.ticker} 전략 요약</div>
                        {h2.status?.strategy || "데이터 없음"}
                      </div>
                    </div>
                  </div>
                );
              })() : compareT1 && compareT2 && compareT1 === compareT2 ? (
                 <div style={{ textAlign: "center", padding: "40px 20px", color: "#ef4444", fontSize: 13, background: "#fef2f2", borderRadius: 12, border: "1px solid #fca5a5" }}>
                  서로 다른 두 종목을 선택해주세요.
                </div>
              ) : (
                <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--text-muted)", fontSize: 13, background: "#f8fafc", borderRadius: 12, border: "1px dashed #cbd5e1" }}>
                  비교할 두 종목을 위에서 선택해주세요.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
