// 하단 입력창 — 라이트 테마 + 실시간 종목 후보 추천
"use client";
import { useRef, useEffect, useState, useCallback } from "react";

const API = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001";

interface Candidate { ticker: string; name: string; market: string; confidence: number; exchange?: string; currentPrice?: number; changePct?: number; }
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

const searchCache = new Map<string, any>();

export default function ChatInput({ value, onChange, onSend, onSendText, loading, quickButtons, onQuick }: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [suggestTier, setSuggestTier] = useState<string>("");
  const [showDrop, setShowDrop] = useState(false);
  const debouncedValue = useDebounce(value, 300);

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

    if (searchCache.has(q)) {
      const data = searchCache.get(q);
      if (data.ok && data.tier !== 'HIGH' && data.candidates?.length > 0) {
        setCandidates(data.candidates.slice(0, 5));
        setSuggestTier(data.tier);
        setShowDrop(true);
      } else {
        setCandidates([]);
        setShowDrop(false);
      }
      return;
    }

    fetch(`${API}/api/suggest?q=${encodeURIComponent(q)}`)
      .then(r => r.json())
      .then(data => {
        searchCache.set(q, data);
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
      paddingBottom: "calc(16px + env(safe-area-inset-bottom, 0px))",
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
            padding: "8px 14px", fontSize: 12, fontWeight: 700,
            background: "linear-gradient(90deg, #f0fdf4, #ffffff)",
            color: "#059669", borderBottom: "1px solid #d1fae5",
            display: "flex", alignItems: "center", gap: 6
          }}>
            {suggestTier === "MED" ? "💡 혹시 이 종목을 찾으시나요?" : "💡 대중적인 추천 우량주"}
          </div>
          {candidates.map((c, i) => (
            <button
              key={c.ticker}
              onClick={() => selectCandidate(c)}
              style={{
                display: "flex", alignItems: "center", gap: 8,
                width: "100%", padding: "12px 14px", border: "none",
                background: "transparent", cursor: "pointer", textAlign: "left",
                borderBottom: i < candidates.length - 1 ? "1px solid #f3f4f6" : "none",
                transition: "background 0.1s",
              }}
              onMouseOver={e => (e.currentTarget.style.background = "#f5f7fa")}
              onMouseOut={e => (e.currentTarget.style.background = "transparent")}
            >
              <span style={{
                fontWeight: 700, fontSize: 12, color: "#059669",
                background: "#ecfdf5", borderRadius: 4, padding: "3px 8px", flexShrink: 0,
              }}>{c.ticker}</span>
              <span style={{ fontSize: 14, color: "var(--text-primary)", flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {c.name}
              </span>
              
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", flexShrink: 0, marginRight: 8 }}>
                {c.currentPrice ? (
                  <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)" }}>
                    {c.market === "KR" ? "₩" : "$"}{c.currentPrice.toLocaleString(undefined, { minimumFractionDigits: c.market === "KR" ? 0 : 2, maximumFractionDigits: c.market === "KR" ? 0 : 2 })}
                  </span>
                ) : (
                  <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{c.exchange || c.market}</span>
                )}
                {c.changePct != null && (
                  <span style={{ fontSize: 10, color: c.changePct > 0 ? "#ef4444" : c.changePct < 0 ? "#3b82f6" : "#6b7280" }}>
                    {c.changePct > 0 ? "▲" : c.changePct < 0 ? "▼" : ""}{Math.abs(c.changePct).toFixed(2)}%
                  </span>
                )}
              </div>

              <span style={{ fontSize: 11, color: "var(--text-muted)", flexShrink: 0 }}>
                {Math.round(c.confidence * 100)}%
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
                padding: "8px 16px", borderRadius: 20, fontSize: 13,
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
      <div style={{ display: "flex", gap: 8, padding: "10px 14px 0", alignItems: "flex-end" }}>
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
            flex: 1, padding: "12px 16px", borderRadius: 24, resize: "none",
            background: "#f5f7fa", border: "1.5px solid var(--border-input)",
            color: "var(--text-primary)", fontSize: 15, outline: "none",
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
            width: 44, height: 44, borderRadius: "50%", border: "none",
            background: canSend ? "var(--accent)" : "#e5e9f0",
            color: canSend ? "#fff" : "var(--text-muted)",
            fontWeight: 700, cursor: canSend ? "pointer" : "not-allowed",
            fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0, boxShadow: canSend ? "0 2px 8px rgba(232,160,191,0.35)" : "none",
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
