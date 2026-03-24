// 하단 입력창 — 라이트 테마
"use client";
import { useRef, useEffect } from "react";

interface Props {
  value: string;
  onChange: (val: string) => void;
  onSend: () => void;
  loading: boolean;
  quickButtons?: string[];
  onQuick?: (text: string) => void;
}

export default function ChatInput({ value, onChange, onSend, loading, quickButtons, onQuick }: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 자동 높이 조절
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  }, [value]);

  function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  }

  const canSend = !loading && value.trim().length > 0;

  return (
    <div style={{
      borderTop: "1px solid var(--border)",
      background: "var(--bg-input-bar)",
      flexShrink: 0,
      boxShadow: "0 -1px 8px rgba(0,0,0,0.04)",
    }}>
      {/* 퀵 버튼 가로 스크롤 */}
      {quickButtons && quickButtons.length > 0 && (
        <div className="quick-scroll">
          {quickButtons.map((q) => (
            <button
              key={q}
              onClick={() => onQuick?.(q)}
              style={{
                padding: "6px 14px",
                borderRadius: 20,
                fontSize: 12,
                background: "var(--accent-light)",
                border: "1px solid #c8efd8",
                color: "var(--nav-active-color)",
                cursor: "pointer",
                whiteSpace: "nowrap",
                flexShrink: 0,
                fontWeight: 500,
                transition: "all 0.15s",
              }}
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {/* 입력 + 전송 */}
      <div style={{ display: "flex", gap: 8, padding: "10px 14px 14px", alignItems: "flex-end" }}>
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKey}
          placeholder="종목이나 질문을 입력해줘 (Enter 전송)"
          rows={1}
          style={{
            flex: 1,
            padding: "10px 16px",
            borderRadius: 24,
            resize: "none",
            background: "#f5f7fa",
            border: "1.5px solid var(--border-input)",
            color: "var(--text-primary)",
            fontSize: 14,
            outline: "none",
            fontFamily: "inherit",
            lineHeight: 1.5,
            maxHeight: 120,
            overflowY: "auto",
            transition: "border-color 0.15s",
          }}
          onFocus={(e) => { e.target.style.borderColor = "var(--accent)"; }}
          onBlur={(e) => { e.target.style.borderColor = "var(--border-input)"; }}
        />
        {/* 원형 전송 버튼 */}
        <button
          onClick={onSend}
          disabled={!canSend}
          className="send-btn"
          style={{
            width: 42, height: 42,
            borderRadius: "50%",
            border: "none",
            background: canSend ? "var(--accent)" : "#e5e9f0",
            color: canSend ? "#fff" : "var(--text-muted)",
            fontWeight: 700,
            cursor: canSend ? "pointer" : "not-allowed",
            fontSize: 18,
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
            boxShadow: canSend ? "0 2px 8px rgba(63,202,107,0.35)" : "none",
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
