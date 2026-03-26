// 하단 입력창 — 라이트 테마 + 실시간 종목 후보 추천
"use client";
import { useRef, useEffect, useState, useCallback } from "react";

const API = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001";

interface Candidate { ticker: string; name: string; market: string; confidence: number }
interface Props {
  value: string;
  onChange: (val: string) => void;
  onSend: () => void;
  onSendText?: (text: string) => void;
  loading: boolean;
  quickButtons?: string[];
  onQuick?: (text: string) => void;
}

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export default function ChatInput({ value, onChange, onSend, onSendText, loading, quickButtons, onQuick }: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [suggestTier, setSuggestTier] = useState<string>("");
  const [showDrop, setShowDrop] = useState(false);
  const debouncedValue = useDebounce(value, 400);

  // 자동 높이 조절
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  }, [value]);

  // 실시간 종목 후보 조회
  useEffect(() => {
    const q = debouncedValue.trim();
    // 2자 이상, 전송 직후 비울 때 제외
    if (q.length < 2 || q.length > 30) { setCandidates([]); setShowDrop(false); return; }
    fetch(`${API}/api/suggest?q=${encodeURIComponent(q)}`)
      .then(r => r.json())
      .then(data => {
        if (data.ok && data.tier !== 'HIGH' && data.candidates?.length > 0) {
          setCandidates(data.candidates.slice(0, 5));
          setSuggestTier(data.tier);
          setShowDrop(true);
        } else {
          setCandidates([]);
          setShowDrop(false);
        }
      })
      .catch(() => { setCandidates([]); setShowDrop(false); });
  }, [debouncedValue]);

  function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Escape") { setShowDrop(false); return; }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      setShowDrop(false);
      onSend();
    }
  }

  function selectCandidate(c: Candidate) {
    setShowDrop(false);
    setCandidates([]);
    const text = `${c.ticker} 분석해줘`;
    if (onSendText) { onSendText(text); }
    else { onChange(text); }
  }

  const canSend = !loading && value.trim().length > 0;

  return (
    <div style={{
      borderTop: "1px solid var(--border)",
      background: "var(--bg-input-bar)",
      flexShrink: 0,
      boxShadow: "0 -1px 8px rgba(0,0,0,0.04)",
      position: "relative",
    }}>
      {/* 종목 후보 드롭다운 */}
      {showDrop && candidates.length > 0 && (
        <div style={{
          position: "absolute", bottom: "100%", left: 14, right: 14,
          background: "#fff", border: "1px solid var(--border)",
          borderRadius: 14, boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
          zIndex: 100, overflow: "hidden",
          marginBottom: 4,
        }}>
          <div style={{
            padding: "6px 12px", fontSize: 10, fontWeight: 700,
            color: "#92400e", background: "#fffbf0", borderBottom: "1px solid #fde68a",
          }}>
            {suggestTier === "MED" ? "💡 혹시 이 종목인가요?" : "🔍 유사 종목 후보"}
          </div>
          {candidates.map((c, i) => (
            <button
              key={c.ticker}
              onClick={() => selectCandidate(c)}
              style={{
                display: "flex", alignItems: "center", gap: 8,
                width: "100%", padding: "8px 14px", border: "none",
                background: "transparent", cursor: "pointer", textAlign: "left",
                borderBottom: i < candidates.length - 1 ? "1px solid #f3f4f6" : "none",
                transition: "background 0.1s",
              }}
              onMouseOver={e => (e.currentTarget.style.background = "#f5f7fa")}
              onMouseOut={e => (e.currentTarget.style.background = "transparent")}
            >
              <span style={{
                fontWeight: 700, fontSize: 12, color: "#059669",
                background: "#ecfdf5", borderRadius: 4, padding: "1px 6px", flexShrink: 0,
              }}>{c.ticker}</span>
              <span style={{ fontSize: 12, color: "var(--text-primary)", flex: 1 }}>{c.name}</span>
              <span style={{ fontSize: 10, color: "var(--text-muted)", flexShrink: 0 }}>
                {c.market} · {Math.round(c.confidence * 100)}%
              </span>
            </button>
          ))}
        </div>
      )}

      {/* 퀵 버튼 가로 스크롤 */}
      {quickButtons && quickButtons.length > 0 && (
        <div className="quick-scroll">
          {quickButtons.map((q) => (
            <button
              key={q}
              onClick={() => onQuick?.(q)}
              style={{
                padding: "6px 14px", borderRadius: 20, fontSize: 12,
                background: "var(--accent-light)", border: "1px solid #c8efd8",
                color: "var(--nav-active-color)", cursor: "pointer",
                whiteSpace: "nowrap", flexShrink: 0, fontWeight: 500,
                transition: "all 0.15s",
              }}
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {/* 입력 + 전송 */}
      <div style={{ display: "flex", gap: 8, padding: "10px 14px calc(14px + env(safe-area-inset-bottom, 0px))", alignItems: "flex-end" }}>
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKey}
          onFocus={() => { if (candidates.length > 0) setShowDrop(true); }}
          onBlur={() => setTimeout(() => setShowDrop(false), 150)}
          placeholder="종목이나 질문을 입력해줘 (Enter 전송)"
          rows={1}
          style={{
            flex: 1, padding: "10px 16px", borderRadius: 24, resize: "none",
            background: "#f5f7fa", border: "1.5px solid var(--border-input)",
            color: "var(--text-primary)", fontSize: 14, outline: "none",
            fontFamily: "inherit", lineHeight: 1.5, maxHeight: 120, overflowY: "auto",
            transition: "border-color 0.15s",
          }}
          onFocusCapture={(e) => { e.target.style.borderColor = "var(--accent)"; }}
          onBlurCapture={(e) => { e.target.style.borderColor = "var(--border-input)"; }}
        />
        <button
          onClick={() => { setShowDrop(false); onSend(); }}
          disabled={!canSend}
          className="send-btn"
          style={{
            width: 42, height: 42, borderRadius: "50%", border: "none",
            background: canSend ? "var(--accent)" : "#e5e9f0",
            color: canSend ? "#fff" : "var(--text-muted)",
            fontWeight: 700, cursor: canSend ? "pointer" : "not-allowed",
            fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0, boxShadow: canSend ? "0 2px 8px rgba(63,202,107,0.35)" : "none",
          }}
        >
          {loading
            ? <span style={{ fontSize: 11, color: "var(--text-muted)" }}>···</span>
            : <span style={{ transform: "rotate(-45deg)", display: "inline-block", marginBottom: 2 }}>➤</span>
          }
        </button>
      </div>
    </div>
  );
}
