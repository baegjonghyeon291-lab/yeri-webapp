"use client";
import { useState, useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import ChatLayout from "@/components/chat/ChatLayout";
import type { Message } from "@/components/chat/MessageBubble";
import { getSessionId } from "@/lib/session";

const API = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001";
const RECENT_KEY = "yeri_recent_tickers";
const MAX_RECENT = 8;

function saveRecent(ticker: string) {
  try {
    const prev: string[] = JSON.parse(localStorage.getItem(RECENT_KEY) || "[]");
    const next = [ticker, ...prev.filter(t => t !== ticker)].slice(0, MAX_RECENT);
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch { /* 무시 */ }
}
function loadRecent(): string[] {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) || "[]"); } catch { return []; }
}

function now() {
  return new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
}

export default function ChatClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [sessionId, setSessionId] = useState("");
  const [recentTickers, setRecentTickers] = useState<string[]>([]);
  const [portfolioTickers, setPortfolioTickers] = useState<string[]>([]);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "bot",
      content:
        "안녕하세요! 저는 예리, AI 투자 비서예요 📈\n\n" +
        "주식 질문, 종목 분석, 시장 상황 등 궁금한 건 뭐든 물어보세요.\n\n" +
        "아래 버튼을 눌러 바로 시작할 수도 있어요 👇",
      time: now(),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const autoAnalyzed = useRef(false);

  useEffect(() => {
    setSessionId(getSessionId());
    setRecentTickers(loadRecent());
    const saved = localStorage.getItem("yeri_portfolio_items");
    if (saved) {
      try {
        const items = JSON.parse(saved);
        setPortfolioTickers(items.map((i: any) => i.ticker).filter(Boolean));
      } catch (e) {}
    }
  }, []);

  // URL ?analyze=TICKER 파라미터 감지 → 자동 분석 실행
  useEffect(() => {
    const ticker = searchParams.get("analyze");
    if (!ticker || autoAnalyzed.current || !sessionId) return;
    autoAnalyzed.current = true;
    router.replace("/chat", { scroll: false });
    setTimeout(() => { send(`${ticker} 지금 바로 분석해줘`); }, 400);
  }, [searchParams, sessionId]);

  async function send(text?: string) {
    const msg = (text ?? input).trim();
    if (!msg || loading) return;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: msg, time: now() }]);
    setLoading(true);

    const tickerMatch = msg.match(/\b([A-Z]{1,6}(?:\.\w+)?)\b/);
    if (tickerMatch) {
      saveRecent(tickerMatch[1]);
      setRecentTickers(loadRecent());
    }

    try {
      const res = await fetch(`${API}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: msg, chatId: sessionId }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      // 모든 메시지를 순회하며 타입별로 변환
      const apiMsgs = data.messages || [];
      if (apiMsgs.length === 0) throw new Error("응답을 받지 못했어요.");

      const newMsgs: Message[] = apiMsgs.map((m: any) => ({
        role: "bot" as const,
        content: m.content || "",
        time: now(),
        type: m.type,
        candidates: m.candidates,
        expectedQuestions: m.expectedQuestions,
        recData: m.data,
      }));
      setMessages((prev) => [...prev, ...newMsgs]);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "알 수 없는 오류";
      setMessages((prev) => [
        ...prev,
        {
          role: "bot",
          content: `연결 실패: ${errMsg}\n\n⚠️ API 서버(포트 3001)가 실행 중인지 확인해주세요.`,
          time: now(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  const quickButtons = [
    ...(portfolioTickers.length > 0 ? ["내 포트폴리오 분석"] : []),
    "오늘 시장 브리핑",
    "내 관심종목 분석",
    ...(recentTickers.length >= 2 ? [`${recentTickers[0]} vs ${recentTickers[1]} 비교`] : []),
    ...(recentTickers.length > 0 ? [recentTickers[0] + " 더 자세히"] : []),
    "요즘 핫한 종목은?",
    "배당주 추천해줘",
    "삼성전자 어때?",
  ];

  return (
    <>
      {recentTickers.length > 0 && (
        <div style={{
          padding: "8px 16px",
          background: "#fff",
          borderBottom: "1px solid var(--border)",
          display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap",
          flexShrink: 0,
        }}>
          <span style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 600, flexShrink: 0 }}>
            최근 분석:
          </span>
          {recentTickers.map(t => (
            <button
              key={t}
              onClick={() => send(`${t} 분석해줘`)}
              disabled={loading}
              style={{
                padding: "3px 9px", borderRadius: 12,
                border: "1px solid var(--border)", background: "#f5f7fa",
                color: "var(--text-secondary)", fontSize: 11, cursor: "pointer",
                fontWeight: 600, transition: "all 0.15s",
              }}
              onMouseOver={e => { e.currentTarget.style.background = "var(--accent-light)"; e.currentTarget.style.color = "var(--nav-active-color)"; }}
              onMouseOut={e => { e.currentTarget.style.background = "#f5f7fa"; e.currentTarget.style.color = "var(--text-secondary)"; }}
            >
              {t}
            </button>
          ))}
        </div>
      )}
      <ChatLayout
        messages={messages}
        loading={loading}
        input={input}
        onInputChange={setInput}
        onSend={send}
        quickButtons={quickButtons}
      />
    </>
  );
}
