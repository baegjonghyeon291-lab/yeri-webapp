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
          <div style={{ width: 32, height: 32, borderRadius: 10, background: "linear-gradient(135deg, #d48aaa 0%, #e8a0bf 100%)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>📈</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 13, color: "var(--text-primary)" }}>종현의 브리핑</div>
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
  const [showGuide, setShowGuide] = useState(false);
  const [isWakingUp, setIsWakingUp] = useState(false);

  // 앱 진입 시 서버 keep-alive ping (Render 슬립 방지)
  useEffect(() => {
    fetch(`${API}/api/ping`, { method: "GET" }).catch(() => {});
  }, []);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    let wakeTimer: NodeJS.Timeout;
    if (loading) {
      setLoadingStep(1);
      setIsWakingUp(false);
      timer = setInterval(() => { setLoadingStep(s => (s < 3 ? s + 1 : s)); }, 8000);
      // 10초 후에도 로딩 중이면 "서버 깨우는 중" 안내
      wakeTimer = setTimeout(() => { setIsWakingUp(true); }, 10000);
    } else {
      setIsWakingUp(false);
    }
    return () => { clearInterval(timer); clearTimeout(wakeTimer); };
  }, [loading]);

  useEffect(() => {
    if (!sessionId) return;

    // 관심종목: 서버에서 로드, 없으면 localStorage 백업에서 복원
    fetch(`${API}/api/watchlist/${sessionId}`)
      .then(r => r.json())
      .then(async d => {
        const serverList = d.list || [];
        if (serverList.length > 0) {
          setWatchlist(serverList);
        } else {
          // 서버가 비어있으면 localStorage 백업으로 복원
          try {
            const saved = localStorage.getItem("yeri_watchlist");
            if (saved) {
              const items: any[] = JSON.parse(saved);
              const tickers = items.map((i: any) => i.ticker || i).filter(Boolean) as string[];
              if (tickers.length > 0) {
                await fetch(`${API}/api/watchlist/${sessionId}/restore`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ tickers }),
                });
                setWatchlist(tickers);
              }
            }
          } catch {}
        }
      })
      .catch(() => {
        // 서버 에러 시에도 localStorage에서 읽기
        try {
          const saved = localStorage.getItem("yeri_watchlist");
          if (saved) {
            const items: any[] = JSON.parse(saved);
            const tickers = items.map((i: any) => i.ticker || i).filter(Boolean) as string[];
            setWatchlist(tickers);
          }
        } catch {}
      });

    // 포트폴리오 티커 (브리핑 내 강조 표시용) — yeri_portfolio_raw 키 사용
    const savedPort = localStorage.getItem("yeri_portfolio_raw")
      || localStorage.getItem("yeri_portfolio")
      || localStorage.getItem("yeri_portfolio_items");
    if (savedPort) {
      try {
        const items = JSON.parse(savedPort);
        const tickers = items.map((i: any) => i.ticker).filter(Boolean);
        setPortfolioTickers(tickers);
      } catch {}
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

  async function fetchWithTimeout(url: string, timeoutMs = 90000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timer);
      return res;
    } catch (e: unknown) {
      clearTimeout(timer);
      if (e instanceof Error && e.name === "AbortError") {
        throw new Error("요청 시간이 초과됐어요. 서버가 막 깨어났을 수 있으니 잠시 후 다시 시도해주세요.");
      }
      throw e;
    }
  }

  async function fetchMarket() {
    setLoading(true);
    setError("");
    try {
      const res = await fetchWithTimeout(`${API}/api/briefing/market`);
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
    if (watchlist.length === 0) {
      setError("관심종목이 없습니다. 관심종목 페이지에서 종목을 먼저 추가해주세요.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetchWithTimeout(`${API}/api/briefing/${sessionId}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      if (data.empty) {
        setError(data.message || "관심종목이 없습니다. 먼저 관심종목을 추가해주세요.");
        return;
      }
      setWatchlistReport(data.report || "");
      setWatchlist(data.list || []);
      if (!data.report) {
        setError("브리핑 데이터를 받았지만 보고서가 비어 있습니다. 잠시 후 다시 시도해주세요.");
      }
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
      {loading && isWakingUp && (
        <div style={{ position: "fixed", bottom: 90, left: "50%", transform: "translateX(-50%)", zIndex: 200, background: "#1a2233", color: "#fff", padding: "10px 20px", borderRadius: 20, fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 8, boxShadow: "0 4px 20px rgba(0,0,0,0.3)" }}>
          <span style={{ animation: "spin 1s linear infinite", display: "inline-block" }}>⚙️</span>
          서버 깨우는 중... 첫 요청은 30~60초 걸릴 수 있어요
        </div>
      )}
      <div style={{ padding: "14px 24px", background: "#fff", borderBottom: "1px solid var(--border)", flexShrink: 0, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 16, color: "var(--text-primary)" }}>📊 브리핑</div>
            <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>실제 시장 데이터 + 뉴스 기반 AI 분석</div>
          </div>
          <button onClick={() => setShowGuide(!showGuide)} style={{ background: "var(--accent-light)", color: "var(--accent)", border: "none", padding: "6px 12px", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
            {showGuide ? "닫기" : "📋 브리핑 설명서"}
          </button>
        </div>
      </div>
      
      {showGuide && (
        <div style={{ maxHeight: "65vh", overflowY: "auto", overscrollBehavior: "contain", padding: "24px 24px 34px", background: "#fdf8fa", borderBottom: "1px solid #fce7f3", fontSize: 13, color: "var(--text-primary)", lineHeight: 1.6, flexShrink: 0 }}>
          <div style={{ fontWeight: 800, color: "#db2777", fontSize: 15, marginBottom: 16 }}>💖 귀요미 종현을 위한 브리핑 설명서 💖</div>
          
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <p>어려운 주식 시장 뉴스, 이제 종현이 매일 아침 딱 필요한 정보만 잘게 씹어서 먹여드립니다! 차근차근 따라 해 볼까요?</p>
            
            <div>
              <div style={{ fontWeight: 800, color: "#111827", marginBottom: 2 }}>1️⃣ 1번: 종현에게 내가 관심 있는 종목 알려주기</div>
              <div style={{ color: "var(--text-secondary)" }}>제일 먼저, 우측 하단 끝에 있는 <b>[⭐ 관심종목]</b> 메뉴로 가주세요. 여기서 내가 평소에 '사볼까?' 하고 눈여겨보던 종목들을 검색해서 찜해 주세요. (최대 10개까지 담을 수 있어요!)</div>
              <div style={{ fontSize: 11, background: "#fff1f2", padding: "8px 12px", borderRadius: 8, color: "#be123c", marginTop: 6, fontWeight: 500 }}>💡 작은 꿀팁: 두 메뉴가 헷갈리시나요? 내가 '이미 돈 주고 산 종목'은 포트폴리오에 넣고, 아직 안 샀지만 '구경하고 있는 종목'은 관심종목에 넣으면 딱 맞습니다!</div>
            </div>

            <div>
              <div style={{ fontWeight: 800, color: "#111827", marginBottom: 2 }}>2️⃣ 2번: 브리핑 종류 고르기</div>
              <div style={{ color: "var(--text-secondary)" }}>원하는 종목을 다 담았으면, 하단의 <b>[📊 브리핑]</b> 버튼을 눌러 돌아오세요. 브리핑 화면 위를 보면 두 가지 탭이 있습니다.</div>
              <ul style={{ paddingLeft: 16, margin: "6px 0 0 0", color: "var(--text-secondary)", display: "flex", flexDirection: "column", gap: 4 }}>
                <li>🌐 <b>시장 브리핑</b>: "간밤에 미국 주식 시장 전체가 좋았는지 나빴는지, 무슨 굵직한 사건이 있었는지" 전체 뉴스를 요약해 주는 아침 신문 1면 같은 기능이에요.</li>
                <li>⭐ <b>관심종목 브리핑</b>: "아까 내가 1번에서 찜해둔 그 종목들"에 오늘 특별한 호재(좋은 일)나 악재(나쁜 일) 뉴스가 있었는지 종현이 집중적으로 분석해 줍니다.</li>
              </ul>
            </div>

            <div>
              <div style={{ fontWeight: 800, color: "#111827", marginBottom: 2 }}>3️⃣ 3번: '✨ 브리핑 생성하기' 버튼 누르기</div>
              <div style={{ color: "var(--text-secondary)" }}>원하는 메뉴를 고르고 번쩍거리는 '브리핑 생성하기' 버튼을 콕 눌러주세요. 그러면 종현이 똑똑한 인공지능으로 수십 개의 미국 뉴스, 주식 차트를 웽- 하고 분석해서 약 10~20초 뒤에 아주 쉬운 말로 요약된 리포트를 짠! 하고 띄워줍니다.</div>
            </div>

            <div>
              <div style={{ fontWeight: 800, color: "#111827", marginBottom: 2 }}>4️⃣ 4번: 색칠된 딱지 모드 100% 활용하기!</div>
              <div style={{ color: "var(--text-secondary)" }}>종현이 써준 브리핑을 쭉 읽다 보면 🟢초록색이나 🔴빨간색으로 예쁘게 칠해진 종목명과 작은 딱지들이 보일 거예요. 내가 가진 주식이 좋은 뉴스에 올랐으면 예쁜 초록색, 위험한 단기 하락 뉴스에 뽑혔으면 🚨빨간색 위험 딱지가 따라붙습니다. 바쁜 아침에는 색깔이 칠해진 핵심 문장들만 쏙쏙 훑어 읽어도 완벽하답니다!</div>
            </div>

            <div>
              <div style={{ fontWeight: 800, color: "#111827", marginBottom: 2 }}>🔄 매번 새로 읽고 싶을 땐?</div>
              <div style={{ color: "var(--text-secondary)" }}>시장이 어떻게 바뀌었는지 다시 보고 싶다면, 브리핑 카드 안의 [🔄 새로 분석] 버튼을 눌러보세요. 종현이 방금 막 나온 따끈따끈한 뉴스로 다시 브리핑을 갱신해 줍니다.</div>
            </div>
          </div>
          
          <div style={{ marginTop: 18, paddingTop: 16, borderTop: "1px dashed #fbcfe8", color: "#b81d52", fontWeight: 700, fontSize: 13 }}>
            💌 브리핑 기능을 사용하면서 오류나 추가적인 기능이 필요하다면 종현한테 바로 카톡 보내주세요.
          </div>
        </div>
      )}
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
