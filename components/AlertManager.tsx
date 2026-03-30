"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface WatchlistItem {
  ticker: string;
  name: string;
}

interface AlertData {
  ticker: string;
  name: string;
  changePct: number;
}

export default function AlertManager() {
  const [alertQueue, setAlertQueue] = useState<AlertData[]>([]);
  const router = useRouter();

  useEffect(() => {
    let lastCheckedTickers = new Set<string>();

    const checkPrices = async () => {
      try {
        const ls = JSON.parse(localStorage.getItem('yeri_watchlist') || '[]');
        if (ls.length === 0) return;
        
        const tickers = ls.map((x: WatchlistItem) => x.ticker);
        const API = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001";
        const res = await fetch(`${API}/api/stocks/min-data?tickers=${tickers.join(',')}`);
        const result = await res.json();

        if (result.ok && result.data) {
          const newAlerts: AlertData[] = [];
          
          Object.keys(result.data).forEach(ticker => {
            const data = result.data[ticker];
            if (data && data.changePct !== undefined) {
              // ±5% 이상 변동 시 알림
              if (Math.abs(data.changePct) >= 5) {
                // 이미 이번 세션에서 알림을 보냈으면 무시 (과도한 푸시 방지)
                if (!lastCheckedTickers.has(ticker)) {
                  const match = ls.find((x: WatchlistItem) => x.ticker === ticker);
                  newAlerts.push({ ticker, changePct: data.changePct, name: match?.name || ticker });
                  lastCheckedTickers.add(ticker);
                }
              }
            }
          });

          if (newAlerts.length > 0) {
            setAlertQueue(prev => [...prev, ...newAlerts]);
          }
        }
      } catch (e) {
        // 무시
      }
    };

    // 초기 체크 후 매 60초마다 폴링
    checkPrices();
    const interval = setInterval(checkPrices, 60000);
    return () => clearInterval(interval);
  }, []);

  if (alertQueue.length === 0) return null;

  return (
    <div style={{
      position: "fixed",
      top: "calc(env(safe-area-inset-top, 0px) + 20px)",
      left: 0,
      right: 0,
      padding: "0 16px",
      zIndex: 9999,
      pointerEvents: "none", // 카드 밖 클릭 통과
      display: "flex",
      flexDirection: "column",
      gap: 10,
    }}>
      {alertQueue.map((alert, i) => (
        <div key={i} style={{
          background: "#ffffff",
          borderRadius: 20,
          padding: "16px",
          boxShadow: "0 10px 25px rgba(0,0,0,0.15), 0 2px 5px rgba(0,0,0,0.05)",
          border: "1px solid rgba(0,0,0,0.04)",
          display: "flex",
          flexDirection: "column",
          gap: 6,
          animation: "slideDown 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
          pointerEvents: "auto", // 카드 클릭 가능
          cursor: "pointer"
        }}
        onClick={() => {
          setAlertQueue(prev => prev.filter((_, idx) => idx !== i));
          window.dispatchEvent(new CustomEvent("open-sidebar")); // Close sidebar if open
          router.push(`/chat?analyze=${alert.ticker}`);
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 32, height: 32, borderRadius: 10, background: alert.changePct > 0 ? "#fdf2f8" : "#eff6ff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>
                {alert.changePct > 0 ? "🚀" : "🚨"}
              </div>
              <span style={{ fontWeight: 800, color: "#1a2233", fontSize: 15 }}>{alert.name} ({alert.ticker})</span>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setAlertQueue(prev => prev.filter((_, idx) => idx !== i));
              }}
              style={{ background: "transparent", border: "none", fontSize: 18, color: "var(--text-muted)", cursor: "pointer", padding: "4px" }}
            >×</button>
          </div>
          <div style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.4 }}>
            관심종목 <strong style={{color: alert.changePct > 0 ? "#db2777" : "#2563eb"}}>{alert.changePct > 0 ? "급등" : "급락"} 알림</strong>이 발생했습니다! 현재 <strong style={{color: alert.changePct > 0 ? "#db2777" : "#2563eb", fontWeight: 800}}>{alert.changePct.toFixed(2)}%</strong> 변동 중입니다. 터치하여 AI 분석을 받아보세요.
          </div>
        </div>
      ))}
    </div>
  );
}
