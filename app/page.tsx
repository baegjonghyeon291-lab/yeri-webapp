"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import LoadingOverlay from "@/components/LoadingOverlay";

export default function Home() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await fetch("https://yeri-project.onrender.com/api/dashboard/webapp");
        const json = await res.json();
        setData(json);
      } catch (e) {
        console.error("Dashboard DB error", e);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  if (loading) return <LoadingOverlay step={1} />;

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "20px 16px 80px", color: "var(--text-primary)", fontFamily: "var(--font-sans)", minHeight: "100vh" }}>
      
      {/* ── 헤더 ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, paddingTop: 12 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0, letterSpacing: "-0.5px", background: "linear-gradient(135deg, #db2777, #9d174d)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
          홈
        </h1>
      </div>

      <div style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 16 }}>
        👋 앗, 반가워요! 예리의 <b>투자 요약 브리핑</b>입니다.
      </div>

      {/* ── 위젯 1: 시장 요약 ── */}
      <div style={{ background: "#fff", borderRadius: 16, padding: 20, marginBottom: 16, boxShadow: "0 2px 10px rgba(0,0,0,0.03)", border: "1px solid #fce7f3" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>🌐 오늘 시장 상태</div>
        </div>
        <div style={{ fontSize: 18, fontWeight: 800, color: data?.market?.status?.includes('탐욕') ? '#059669' : data?.market?.status?.includes('공포') ? '#db2777' : '#111827' }}>
          {data?.market?.status || "보통 (중립)"}
        </div>
        <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 6, opacity: 0.8 }}>
          시장의 심리와 흐름을 반영한 결과입니다.
        </div>
      </div>

      {/* ── 위젯 2: 포트폴리오 상태 ── */}
      <div style={{ background: "linear-gradient(135deg, #fdf8fa, #fff)", borderRadius: 16, padding: 20, marginBottom: 16, boxShadow: "0 4px 15px rgba(219,39,119,0.05)", border: "1px solid #fbcfe8" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>📊 내 포트폴리오</div>
          <button onClick={() => router.push('/portfolio')} style={{ fontSize: 12, background: "rgba(219,39,119,0.1)", color: "#b81d52", border: "none", padding: "6px 12px", borderRadius: 12, fontWeight: 700, cursor: "pointer" }}>
            상세 보기
          </button>
        </div>

        {data?.portfolio ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "flex", borderBottom: "1px solid #fce7f3", paddingBottom: 12 }}>
              <div style={{ width: "35%", fontSize: 12, color: "var(--text-secondary)" }}>종합 건강도</div>
              <div style={{ width: "65%", fontSize: 13, fontWeight: 800, color: data?.portfolio?.healthLabel === '우수' ? '#059669' : data?.portfolio?.healthLabel === '주의' || data?.portfolio?.healthLabel === '위험' ? '#db2777' : '#2563eb' }}>
                {data.portfolio.healthLabel}
              </div>
            </div>
            <div style={{ display: "flex", borderBottom: "1px solid #fce7f3", paddingBottom: 12 }}>
              <div style={{ width: "35%", fontSize: 12, color: "var(--text-secondary)" }}>강세 TOP</div>
              <div style={{ width: "65%", fontSize: 13, fontWeight: 700, color: "#059669" }}>
                {data.portfolio.strongTop || "없음"}
              </div>
            </div>
            <div style={{ display: "flex" }}>
              <div style={{ width: "35%", fontSize: 12, color: "var(--text-secondary)" }}>위험 TOP</div>
              <div style={{ width: "65%", fontSize: 13, fontWeight: 700, color: "#db2777" }}>
                {data.portfolio.riskTop || "없음"}
              </div>
            </div>
          </div>
        ) : (
          <div style={{ fontSize: 13, color: "var(--text-secondary)", textAlign: "center", padding: "10px 0" }}>
            보유 종목이 없습니다. 포트폴리오에 종목을 추가해 보세요!
          </div>
        )}
      </div>

      {/* ── 위젯 3: 오늘의 액션 ── */}
      <div style={{ background: "#fff", borderRadius: 16, padding: 20, boxShadow: "0 2px 10px rgba(0,0,0,0.03)", border: "1px solid #e2e8f0", position: "relative", overflow: "hidden" }}>
        
        {/* 장식선 */}
        <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 4, background: data?.todayAction?.priority === 'HIGH' ? '#e11d48' : data?.todayAction?.priority === 'MEDIUM' ? '#f59e0b' : '#3b82f6' }}></div>
        
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
          <span style={{ fontSize: 16 }}>🎯</span>
          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>오늘 챙겨야 할 액션</div>
        </div>

        {data?.todayAction ? (
          <div>
            <div style={{background: "#f8fafc", padding: "12px 14px", borderRadius: 8, border: "1px solid #e2e8f0"}}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <span style={{ fontSize: 14, fontWeight: 800, color: "#111827", background: "white", padding: "2px 6px", borderRadius: 6, border: "1px solid #cbd5e1" }}>
                  {data.todayAction.ticker}
                </span>
                <span style={{ fontSize: 13, fontWeight: 800, color: data?.todayAction?.priority === 'HIGH' ? '#e11d48' : '#3b82f6' }}>
                  {data.todayAction.action}
                </span>
              </div>
              <div style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5 }}>
                {data.todayAction.reason}
              </div>
            </div>
            {data.todayAction.ticker !== 'PORTFOLIO' && (
              <button onClick={() => router.push('/portfolio')} style={{ marginTop: 12, width: "100%", padding: "10px", borderRadius: 8, border: "1px solid #e2e8f0", background: "white", color: "#111827", fontSize: 12, fontWeight: 700, cursor: "pointer", display: "flex", justifyContent: "center", alignItems: "center", gap: 6 }}>
                포트폴리오에서 자세히 보기 <span>→</span>
              </button>
            )}
          </div>
        ) : (
          <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>오늘의 액션을 계산 중이거나, 보유 종목이 없습니다.</div>
        )}
      </div>

    </div>
  );
}
