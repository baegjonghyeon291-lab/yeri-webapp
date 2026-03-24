"use client";
import { useState, useEffect } from "react";
import { getSessionId } from "@/lib/session";

const API = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001";

type Tab = "market" | "watchlist";

function LoadingDots() {
  return (
    <div style={{ display: "flex", justifyContent: "center", padding: "60px 0" }}>
      <div style={{
        display: "flex", gap: 8, alignItems: "center",
        padding: "16px 24px", borderRadius: 16, background: "#fff",
        boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
      }}>
        {[0, 1, 2].map((i) => (
          <div key={i} style={{
            width: 8, height: 8, borderRadius: "50%", background: "#3fca6b",
            animation: `chatBounce 1.2s ease-in-out ${i * 0.2}s infinite`,
          }} />
        ))}
        <span style={{ marginLeft: 10, fontSize: 13, color: "var(--text-secondary)" }}>
          AI가 실데이터를 분석 중이에요 (30~60초)
        </span>
      </div>
    </div>
  );
}

function ReportCard({ report, onRefresh, loading }: {
  report: string;
  onRefresh: () => void;
  loading: boolean;
}) {
  // 섹션별 파싱: 📌 💹 📰 ✅ ⚠️ 🧠 👉 등 이모지로 분리해서 카드화
  const lines = report.split("\n");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* 새로고침 버튼 */}
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button
          onClick={onRefresh}
          disabled={loading}
          style={{
            padding: "8px 16px", borderRadius: 20, border: "1px solid var(--border)",
            background: "#fff", color: "var(--nav-active-color)",
            fontSize: 12, fontWeight: 600, cursor: "pointer",
            display: "flex", alignItems: "center", gap: 6,
          }}
        >
          🔄 새로 분석
        </button>
      </div>

      {/* 브리핑 본문 */}
      <div style={{
        background: "#fff",
        borderRadius: 16,
        border: "1px solid var(--border)",
        boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
        overflow: "hidden",
      }}>
        {/* 헤더 */}
        <div style={{
          padding: "14px 20px",
          borderBottom: "1px solid var(--border)",
          background: "var(--accent-light)",
          display: "flex", alignItems: "center", gap: 8,
        }}>
          <div style={{
            width: 32, height: 32, borderRadius: 10,
            background: "linear-gradient(135deg, #2ea85a 0%, #3fca6b 100%)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 16, flexShrink: 0,
          }}>📈</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 13, color: "var(--text-primary)" }}>예리의 브리핑</div>
            <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>
              {new Date().toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric", weekday: "short" })}
            </div>
          </div>
        </div>

        {/* 본문 */}
        <div style={{ padding: "20px 24px" }}>
          {lines.map((line, i) => {
            if (!line.trim()) return <div key={i} style={{ height: 8 }} />;

            // 구분선
            if (line.startsWith("---")) {
              return <hr key={i} style={{ border: "none", borderTop: "1px solid var(--border)", margin: "12px 0" }} />;
            }

            // 섹션 헤더 (이모지로 시작하는 줄)
            const sectionEmojis = ["📌", "💹", "📰", "✅", "⚠️", "🧠", "👉", "1.", "2.", "3.", "4.", "5.", "6.", "7.", "8.", "9."];
            const isSection = sectionEmojis.some(e => line.startsWith(e));

            if (isSection && line.includes(":")) {
              const colonIdx = line.indexOf(":");
              const label = line.slice(0, colonIdx + 1);
              const content = line.slice(colonIdx + 1).trim();
              return (
                <div key={i} style={{ marginBottom: 10 }}>
                  <span style={{ fontWeight: 700, color: "var(--text-primary)", fontSize: 14 }}>{label}</span>
                  {content && <span style={{ fontSize: 14, color: "var(--text-primary)", marginLeft: 4 }}>{content}</span>}
                </div>
              );
            }

            // 볼드 텍스트 처리
            if (line.startsWith("**") && line.endsWith("**")) {
              return (
                <div key={i} style={{ fontWeight: 700, fontSize: 14, color: "var(--text-primary)", marginBottom: 6 }}>
                  {line.slice(2, -2)}
                </div>
              );
            }

            // 불릿 포인트
            if (line.startsWith("•") || line.startsWith("-")) {
              return (
                <div key={i} style={{
                  fontSize: 13, color: "var(--text-secondary)", paddingLeft: 12,
                  marginBottom: 4, lineHeight: 1.65,
                }}>
                  {line}
                </div>
              );
            }

            return (
              <div key={i} style={{ fontSize: 14, color: "var(--text-primary)", lineHeight: 1.7, marginBottom: 4 }}>
                {line}
              </div>
            );
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
      <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 8 }}>
        {tab === "market" ? "오늘 시장 브리핑을 불러오세요" : "관심종목 브리핑을 생성하세요"}
      </div>
      <div style={{ fontSize: 13, marginBottom: 24 }}>
        {tab === "market"
          ? "S&P500, NASDAQ, 거시경제 + 뉴스 기반 AI 분석"
          : "관심종목 페이지에서 종목을 추가한 후 생성해보세요"}
      </div>
      <button
        onClick={onFetch}
        style={{
          padding: "12px 28px", borderRadius: 24, border: "none",
          background: "var(--accent)", color: "#fff",
          fontWeight: 700, fontSize: 14, cursor: "pointer",
          boxShadow: "0 4px 14px rgba(63,202,107,0.35)",
        }}
      >
        ✨ 브리핑 생성하기
      </button>
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // 관심종목 목록 로드
  useEffect(() => {
    fetch(`${API}/api/watchlist/${sessionId}`)
      .then((r) => r.json())
      .then((d) => setWatchlist(d.list || []))
      .catch(() => {});
  }, []);

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
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "var(--bg-app)" }}>

      {/* 헤더 */}
      <div style={{
        padding: "14px 24px",
        background: "#fff",
        borderBottom: "1px solid var(--border)",
        flexShrink: 0,
        boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
      }}>
        <div style={{ fontWeight: 800, fontSize: 16, color: "var(--text-primary)" }}>📊 브리핑</div>
        <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>
          실제 시장 데이터 + 뉴스 기반 AI 분석
        </div>
      </div>

      {/* 탭 */}
      <div style={{
        display: "flex", gap: 0,
        borderBottom: "1px solid var(--border)",
        background: "#fff", flexShrink: 0,
      }}>
        {(["market", "watchlist"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              flex: 1,
              padding: "12px 0",
              border: "none",
              borderBottom: tab === t ? "2px solid var(--accent)" : "2px solid transparent",
              background: "transparent",
              color: tab === t ? "var(--nav-active-color)" : "var(--text-secondary)",
              fontWeight: tab === t ? 700 : 400,
              fontSize: 13,
              cursor: "pointer",
              transition: "all 0.15s",
            }}
          >
            {t === "market" ? "🌐 시장 브리핑" : `⭐ 관심종목 브리핑 ${watchlist.length > 0 ? `(${watchlist.length})` : ""}`}
          </button>
        ))}
      </div>

      {/* 내용 */}
      <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
        {/* 관심종목 탭: 오버뷰 칩 */}
        {tab === "watchlist" && watchlist.length > 0 && (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
            {watchlist.map((t) => (
              <span key={t} style={{
                padding: "4px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600,
                background: "var(--accent-light)", color: "var(--nav-active-color)",
                border: "1px solid #c8efd8",
              }}>{t}</span>
            ))}
          </div>
        )}

        {/* 에러 */}
        {error && (
          <div style={{
            padding: "12px 16px", borderRadius: 12, background: "#fff8f8",
            border: "1px solid #f5c2cc", color: "#d64060", fontSize: 13, marginBottom: 16,
          }}>
            ⚠️ {error} — API 서버(포트 3001)가 실행 중인지 확인해주세요.
          </div>
        )}

        {/* 로딩 */}
        {loading && <LoadingDots />}

        {/* 결과 */}
        {!loading && currentReport && (
          <ReportCard report={currentReport} onRefresh={onFetch} loading={loading} />
        )}

        {/* 빈 상태 */}
        {!loading && !currentReport && !error && (
          <EmptyState tab={tab} onFetch={onFetch} />
        )}
      </div>
    </div>
  );
}
