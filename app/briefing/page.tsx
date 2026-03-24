"use client";
import { useState } from "react";

const API = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001";
const CHAT_ID = "web-default";

export default function BriefingPage() {
  const [report, setReport] = useState("");
  const [list, setList] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  async function fetchBriefing() {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/briefing/${CHAT_ID}`);
      const data = await res.json();
      setReport(data.report || "");
      setList(data.list || []);
    } finally { setLoading(false); }
  }

  return (
    <div style={{ height: "100vh", overflowY: "auto", padding: 32, background: "var(--bg-primary)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700 }}>📊 관심종목 브리핑</h1>
          <p style={{ color: "var(--text-secondary)", fontSize: 14, marginTop: 4 }}>
            {list.length > 0 ? `${list.join(", ")} — ${list.length}개 종목` : "관심종목을 먼저 등록해주세요"}
          </p>
        </div>
        <button onClick={fetchBriefing} disabled={loading}
          style={{
            padding: "12px 22px", borderRadius: 10, border: "none",
            background: loading ? "var(--bg-input)" : "var(--accent)",
            color: loading ? "var(--text-secondary)" : "#000",
            fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", fontSize: 14,
          }}>
          {loading ? "분석 중..." : "🔄 브리핑 생성"}
        </button>
      </div>

      {loading && (
        <div style={{ textAlign: "center", padding: "64px 0" }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>⏳</div>
          <div style={{ color: "var(--text-secondary)", fontSize: 14 }}>AI가 관심종목을 분석 중입니다...</div>
          <div style={{ color: "var(--text-secondary)", fontSize: 12, marginTop: 6 }}>약 30~60초 소요</div>
        </div>
      )}

      {!loading && !report && (
        <div style={{ textAlign: "center", padding: "64px 0", color: "var(--text-secondary)" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📊</div>
          <div style={{ fontSize: 16, marginBottom: 8 }}>브리핑을 생성해보세요</div>
          <div style={{ fontSize: 13 }}>관심종목 등록 후 위 버튼을 눌러주세요</div>
        </div>
      )}

      {!loading && report && (
        <div style={{
          background: "var(--bg-card)", border: "1px solid var(--border)",
          borderRadius: 14, padding: 24,
        }}>
          <div style={{
            color: "var(--text-primary)", fontSize: 14, lineHeight: 1.8,
            whiteSpace: "pre-wrap", fontFamily: "monospace",
          }}>
            {report}
          </div>
        </div>
      )}
    </div>
  );
}
