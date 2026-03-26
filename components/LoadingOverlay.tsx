"use client";
import { useState, useEffect } from "react";

interface LoadingOverlayProps {
  step: number;
  totalSteps?: number;
}

const MESSAGES = [
  "📡 시장의 실시간 기상도를 확인하고 있어요...",
  "🧠 예리가 포트폴리오의 리스크를 꼼꼼히 분석 중이에요...",
  "✨ 당신만을 위한 특별한 리포트를 작성하고 있어요...",
];

const TIPS = [
  "팁: 분산 투자는 리스크를 관리하는 가장 기본적인 방법이에요.",
  "팁: 정기적인 포트폴리오 리밸런싱은 장기 수익률에 도움이 돼요.",
  "팁: 뉴스에 일희일비하기보다는 기업의 펀더멘털에 집중하세요.",
  "팁: RSI가 30 미만이면 과매도, 70 이상이면 과매수 상태일 수 있어요.",
];

export default function LoadingOverlay({ step, totalSteps = 3 }: LoadingOverlayProps) {
  const [tipIdx, setTipIdx] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setTipIdx((prev) => (prev + 1) % TIPS.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(255,255,255,0.95)", zIndex: 10000,
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      padding: 32, textAlign: "center", backdropFilter: "blur(4px)"
    }}>
      {/* 애니메이션 로고/스피너 */}
      <div style={{ position: "relative", marginBottom: 32 }}>
        <div style={{ 
          width: 80, height: 80, border: "4px solid var(--accent-light)", 
          borderTopColor: "var(--accent)", borderRadius: "50%", 
          animation: "spin 1.2s cubic-bezier(0.5, 0, 0.5, 1) infinite" 
        }} />
        <div style={{
          position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 32, animation: "pulse 2s ease-in-out infinite"
        }}>
          {step === 1 ? "📡" : step === 2 ? "🧠" : "✨"}
        </div>
      </div>

      {/* 단계 표시 */}
      <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
        {[1, 2, 3].map((s) => (
          <div key={s} style={{
            width: 40, height: 4, borderRadius: 2,
            background: s <= step ? "var(--accent)" : "#e5e9f0",
            transition: "all 0.5s ease"
          }} />
        ))}
      </div>

      {/* 메시지 */}
      <div style={{ fontSize: 20, fontWeight: 800, color: "var(--text-primary)", marginBottom: 12, height: 28 }}>
        {MESSAGES[Math.min(step - 1, MESSAGES.length - 1)]}
      </div>
      <div style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 40 }}>
        잠시만 기다려주세요 (약 30초 내외 소요)
      </div>

      {/* 오늘의 팁 */}
      <div style={{ 
        background: "var(--bg-app)", padding: "16px 20px", borderRadius: 16, 
        maxWidth: 320, border: "1px solid var(--border)",
        animation: "slideUp 0.5s ease-out"
      }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--nav-active-color)", marginBottom: 6, display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
          <span>💡</span> INVESTING TIP
        </div>
        <div style={{ fontSize: 13, color: "var(--text-primary)", lineHeight: 1.5, fontWeight: 500 }}>
          {TIPS[tipIdx]}
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.1); opacity: 0.8; } }
        @keyframes slideUp { from { transform: translateY(10px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
      `}</style>
    </div>
  );
}
