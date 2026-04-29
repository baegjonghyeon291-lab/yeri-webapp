"use client";
import { useState, useEffect, useRef, Suspense } from "react";
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

/**
 * useSearchParams()를 안전하게 격리하는 내부 컴포넌트.
 * Next.js 16에서 useSearchParams()는 Suspense 경계 안에서만 호출해야 하며,
 * 이를 위반하면 클라이언트 사이드 네비게이션 시 "This page couldn't load" 에러 발생.
 */
function SearchParamsReader({ onAnalyze }: { onAnalyze: (ticker: string) => void }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const autoAnalyzed = useRef(false);

  useEffect(() => {
    const ticker = searchParams.get("analyze");
    if (!ticker || autoAnalyzed.current) return;
    autoAnalyzed.current = true;
    router.replace("/chat", { scroll: false });
    setTimeout(() => { onAnalyze(`${ticker} 지금 바로 분석해줘`); }, 400);
  }, [searchParams, onAnalyze, router]);

  return null;
}

export default function ChatClient() {
  const [sessionId, setSessionId] = useState("");
  const [recentTickers, setRecentTickers] = useState<string[]>([]);
  const [portfolioTickers, setPortfolioTickers] = useState<string[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setSessionId(getSessionId());
    setRecentTickers(loadRecent());
    const savedPort = localStorage.getItem("yeri_portfolio") || localStorage.getItem("yeri_portfolio_items");
    if (savedPort) {
      try {
        const items = JSON.parse(savedPort);
        setPortfolioTickers(items.map((i: any) => i.ticker).filter(Boolean));
      } catch (e) {}
    }

    const savedHistory = localStorage.getItem("yeri_chat_history");
    if (savedHistory) {
      try {
        const parsed = JSON.parse(savedHistory);
        if (parsed.length > 0) {
          setMessages(parsed);
          setIsLoaded(true);
          return;
        }
      } catch {}
    }
    
    setMessages([
      {
        role: "bot",
        content:
          "안녕하세요! 저는 종현, AI 투자 비서예요 📈\n\n" +
          "주식 질문, 종목 분석, 시장 상황 등 궁금한 건 뭐든 물어보세요.\n\n" +
          "아래 버튼을 눌러 바로 시작할 수도 있어요 👇",
        time: now(),
      },
    ]);
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (isLoaded && messages.length > 0) {
      localStorage.setItem("yeri_chat_history", JSON.stringify(messages.slice(-50)));
    }
  }, [messages, isLoaded]);

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
      <Suspense fallback={null}>
        <SearchParamsReader onAnalyze={send} />
      </Suspense>
      <ChatLayout
        messages={messages}
        loading={loading}
        input={input}
        onInputChange={setInput}
        onSend={send}
        quickButtons={quickButtons}
        recentTickers={recentTickers}
      />
    </>
  );
}
