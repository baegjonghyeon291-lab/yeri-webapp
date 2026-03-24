"use client";
import { useState } from "react";
import ChatLayout from "@/components/chat/ChatLayout";
import type { Message } from "@/components/chat/MessageBubble";

const API = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001";
const CHAT_ID = "web-default";

const QUICK = [
  "삼성전자 어때?",
  "TSLA 언제 사?",
  "오늘 브리핑",
  "NVDA vs TSLA 비교",
  "요즘 뭐 살까?",
];

function now() {
  return new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
}

export default function ChatPage() {
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

  async function send(text?: string) {
    const msg = (text ?? input).trim();
    if (!msg || loading) return;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: msg, time: now() }]);
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: msg, chatId: CHAT_ID }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      const reply = data.messages?.[0]?.content ?? "응답을 받지 못했어요.";
      setMessages((prev) => [...prev, { role: "bot", content: reply, time: now() }]);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "알 수 없는 오류";
      setMessages((prev) => [
        ...prev,
        { role: "bot", content: `연결 실패: ${errMsg}\n\nAPI 서버(포트 3001)가 실행 중인지 확인해주세요.`, time: now() },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <ChatLayout
      messages={messages}
      loading={loading}
      input={input}
      onInputChange={setInput}
      onSend={send}
      quickButtons={QUICK}
    />
  );
}
