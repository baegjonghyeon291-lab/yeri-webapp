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
}

interface Holding {
  ticker: string;
  name: string;
  quantity: number;
  avgPrice: number;
  buyDate?: string | null;
  memo?: string | null;
  currentPrice: number | null;
  changePct: number | null;
  investedAmount: number;
  currentValue: number | null;
  profitLoss: number | null;
  profitLossPct: number | null;
  weight: number | null;
  status: HoldingStatus | null;
  dataAsOf?: string;
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
    totalValue: number;
    totalProfitLoss: number;
    totalProfitLossPct: number;
  };
  portfolioStatus: PortfolioStatus;
  message?: string;
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

export default function PortfolioPage() {
  const [sessionId, setSessionId] = useState("");
  useEffect(() => { setSessionId(getSessionId()); }, []);

  // ── 상태 ──
  const [portfolio, setPortfolio] = useState<PortfolioData | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("");
  const [addMode, setAddMode] = useState(false);
  const [briefing, setBriefing] = useState("");
  const [briefingLoading, setBriefingLoading] = useState(false);
  const [error, setError] = useState("");

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
      const res = await fetch(`${API}/api/portfolio/${sessionId}`);
      const data = await res.json();
      setPortfolio(data);
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
          </div>
          
          <div style={{ marginTop: 18, paddingTop: 16, borderTop: "1px dashed #fbcfe8", color: "#b81d52", fontWeight: 700, fontSize: 13 }}>
            💌 포트폴리오 기능을 사용하면서 오류나 추가적인 기능이 필요하다면 예리남편 종현이한테 바로 카톡 보내주세요.
          </div>
        </div>
      )}

      {error && (
        <div style={{ padding: "12px 16px", borderRadius: 12, background: "#fff8f8", border: "1px solid #f5c2cc", color: "#d64060", fontSize: 13, marginBottom: 16 }}>⚠️ {error}</div>
      )}

      {/* ═══ 총 자산 카드 ═══ */}
      {hasHoldings && summary && (
        <div style={{ background: "linear-gradient(135deg, #3d1f2e 0%, #d48aaa 100%)", borderRadius: 16, padding: "20px 24px", color: "#fff", marginBottom: 24, boxShadow: "0 4px 12px rgba(212,138,170,0.2)" }}>
          <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 4 }}>총 자산 가치</div>
          <div style={{ fontSize: 28, fontWeight: 800, marginBottom: 12 }}>${summary.totalValue.toLocaleString()}</div>
          <div style={{ display: "flex", gap: 16 }}>
            <div>
              <div style={{ fontSize: 11, opacity: 0.7 }}>총 손익</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: summary.totalProfitLoss >= 0 ? "#4ade80" : "#fb7185" }}>
                {summary.totalProfitLoss >= 0 ? "+" : ""}${Math.round(summary.totalProfitLoss).toLocaleString()}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, opacity: 0.7 }}>수익률</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: summary.totalProfitLossPct >= 0 ? "#4ade80" : "#fb7185" }}>
                {summary.totalProfitLossPct >= 0 ? "+" : ""}{summary.totalProfitLossPct}%
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, opacity: 0.7 }}>종목 수</div>
              <div style={{ fontSize: 15, fontWeight: 700 }}>{summary.holdingCount}개</div>
            </div>
          </div>
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
            <div style={{ fontSize: 12, color: "#d97706", lineHeight: 1.8 }}>
              ⚠️ 점검 필요: {ps.needCheckTop3.map(r => `${r.ticker}(${r.badge})`).join(", ")}
            </div>
          )}
        </div>
      )}

      {/* ═══ 종목별 카드 ═══ */}
      {hasHoldings && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 20 }}>
          {holdings.map(h => {
            const bs = h.status ? getBadgeStyle(h.status.badge) : null;
            const plSign = (h.profitLoss ?? 0) >= 0 ? "+" : "";
            return (
              <div key={h.ticker} style={{ background: "#fff", borderRadius: 16, padding: 16, border: `1px solid ${bs ? bs.border : "var(--border)"}`, boxShadow: "0 2px 8px rgba(0,0,0,0.03)" }}>
                {/* 상단: 종목명 + 배지 */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                      <span style={{ fontSize: 15, fontWeight: 800 }}>{h.ticker}</span>
                      {h.name && <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{h.name}</span>}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                      {h.quantity}주 · 평단 ${h.avgPrice} · 현재 {h.currentPrice != null ? `$${h.currentPrice.toFixed(2)}` : "조회중"}
                      {h.changePct != null && <span style={{ color: h.changePct >= 0 ? "#10b981" : "#ef4444", marginLeft: 4 }}>(당일 {h.changePct >= 0 ? "+" : ""}{h.changePct.toFixed(2)}%)</span>}
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

                {/* 수익률 */}
                <div style={{ display: "flex", gap: 16, marginBottom: 10 }}>
                  <div>
                    <div style={{ fontSize: 10, color: "var(--text-muted)" }}>평가손익</div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: (h.profitLoss ?? 0) >= 0 ? "#10b981" : "#ef4444" }}>
                      {plSign}${h.profitLoss != null ? Math.round(h.profitLoss).toLocaleString() : "-"}
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
                </div>

                {/* 전략 문구 + 이유 */}
                {h.status && (
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
                {h.status?.scores && (
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
              <div style={{ fontSize: 10, color: "var(--text-muted)", marginBottom: 4 }}>평균 단가 ($)</div>
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
                          <div style={{ fontSize: 11, color: "var(--text-secondary)", marginBottom: 4 }}>🚀 가격 돌파 ($)</div>
                          <input type="number" placeholder="목표가" value={newAlerts.priceAbove ?? ""} onChange={e => setNewAlerts({...newAlerts, priceAbove: e.target.value ? Number(e.target.value) : null})} style={{ width: "100%", padding: "8px", borderRadius: 6, border: "1px solid #fbcfe8", fontSize: 13 }} />
                        </div>
                        <div>
                          <div style={{ fontSize: 11, color: "var(--text-secondary)", marginBottom: 4 }}>🔻 가격 이탈 ($)</div>
                          <input type="number" placeholder="이탈가" value={newAlerts.priceBelow ?? ""} onChange={e => setNewAlerts({...newAlerts, priceBelow: e.target.value ? Number(e.target.value) : null})} style={{ width: "100%", padding: "8px", borderRadius: 6, border: "1px solid #fbcfe8", fontSize: 13 }} />
                        </div>
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                        <div>
                          <div style={{ fontSize: 11, color: "var(--text-secondary)", marginBottom: 4 }}>💰 총 평가금액 달성 ($)</div>
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
    </div>
  );
}
