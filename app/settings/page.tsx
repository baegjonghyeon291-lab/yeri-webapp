"use client";

import { useState, useEffect } from "react";
import { getSessionId } from "@/lib/session";
import LoadingOverlay from "@/components/LoadingOverlay";

const API = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001";

interface Settings {
  briefingTime: string;
  briefingEnabled: boolean;
  alertEnabled: boolean;
  mode: string;
}

export default function SettingsPage() {
  const [sessionId, setSessionId] = useState("");
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    setSessionId(getSessionId());
  }, []);

  useEffect(() => {
    if (!sessionId) return;
    const fetchSettings = async () => {
      try {
        const res = await fetch(`${API}/api/settings/${sessionId}`);
        const data = await res.json();
        setSettings(data);
      } catch (e) {
        console.error("Failed to load settings");
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, [sessionId]);

  const handleSave = async () => {
    if (!sessionId || !settings) return;
    setSaving(true);
    setMsg("");
    try {
      const res = await fetch(`${API}/api/settings/${sessionId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings)
      });
      if (res.ok) {
        setMsg("✅ 설정이 저장되었습니다.");
        setTimeout(() => setMsg(""), 3000);
      }
    } catch (e) {
      setMsg("❌ 저장 실패");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingOverlay step={1} />;

  return (
    <div style={{ padding: "20px 24px 120px", height: "100%", overflowY: "auto", background: "var(--bg-app)", color: "var(--text-primary)" }}>
      <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 24, letterSpacing: "-0.5px" }}>⚙️ 환경 설정</h1>
      
      {settings && (
        <>
          {/* 브리핑 설정 */}
          <div style={{ background: "#fff", borderRadius: 16, padding: 20, marginBottom: 20, border: "1px solid var(--border)", boxShadow: "0 2px 10px rgba(0,0,0,0.02)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 800, color: "#111827" }}>아침 정기 브리핑</div>
                <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 4 }}>매일 지정한 시간에 포트폴리오 및 관심종목 요약을 알려드립니다.</div>
              </div>
              <label style={{ position: "relative", display: "inline-block", width: 44, height: 24 }}>
                <input type="checkbox" checked={settings.briefingEnabled} onChange={e => setSettings({...settings, briefingEnabled: e.target.checked})} style={{ opacity: 0, width: 0, height: 0 }} />
                <span style={{ position: "absolute", cursor: "pointer", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: settings.briefingEnabled ? "#db2777" : "#cbd5e1", transition: ".3s", borderRadius: 24 }}>
                  <span style={{ position: "absolute", content: '""', height: 18, width: 18, left: settings.briefingEnabled ? 22 : 3, bottom: 3, backgroundColor: "white", transition: ".3s", borderRadius: "50%" }}></span>
                </span>
              </label>
            </div>
            
            {settings.briefingEnabled && (
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 12, paddingTop: 12, borderTop: "1px dashed var(--border)" }}>
                <span style={{ fontSize: 14, fontWeight: 600 }}>브리핑 수신 시간:</span>
                <input 
                  type="time" 
                  value={settings.briefingTime} 
                  onChange={e => setSettings({...settings, briefingTime: e.target.value})} 
                  style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid var(--border)", fontSize: 14, background: "#f8fafc", fontFamily: "inherit" }}
                />
              </div>
            )}
          </div>

          {/* 알림 수신 설정 */}
          <div style={{ background: "#fff", borderRadius: 16, padding: 20, marginBottom: 24, border: "1px solid var(--border)", boxShadow: "0 2px 10px rgba(0,0,0,0.02)" }}>
             <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 800, color: "#111827" }}>스마트 예측 / 조건 도달 알림</div>
                <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 4 }}>시장 변동 시 실시간 경고 및 목표가 도달 알림을 받습니다.</div>
              </div>
              <label style={{ position: "relative", display: "inline-block", width: 44, height: 24 }}>
                <input type="checkbox" checked={settings.alertEnabled} onChange={e => setSettings({...settings, alertEnabled: e.target.checked})} style={{ opacity: 0, width: 0, height: 0 }} />
                <span style={{ position: "absolute", cursor: "pointer", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: settings.alertEnabled ? "#db2777" : "#cbd5e1", transition: ".3s", borderRadius: 24 }}>
                  <span style={{ position: "absolute", content: '""', height: 18, width: 18, left: settings.alertEnabled ? 22 : 3, bottom: 3, backgroundColor: "white", transition: ".3s", borderRadius: "50%" }}></span>
                </span>
              </label>
            </div>
          </div>

          {/* 초보자/고급자 모드 설정 */}
          <div style={{ background: "#fff", borderRadius: 16, padding: 20, marginBottom: 24, border: "1px solid var(--border)", boxShadow: "0 2px 10px rgba(0,0,0,0.02)" }}>
             <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ flex: 1, paddingRight: 10 }}>
                <div style={{ fontSize: 15, fontWeight: 800, color: "#111827" }}>지표/전략 표시 모드</div>
                <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 4 }}>포트폴리오 화면에서 보여지는 데이터와 설명의 난이도를 설정합니다.</div>
              </div>
              <select 
                value={settings.mode || 'advanced'}
                onChange={e => setSettings({...settings, mode: e.target.value})}
                style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid var(--border)", fontSize: 14, background: "#f8fafc", fontFamily: "inherit", fontWeight: 700 }}
              >
                <option value="beginner">🌱 초보자 (핵심만)</option>
                <option value="advanced">🔥 고급자 (전문 지표)</option>
              </select>
            </div>
          </div>

          {/* 저장 버튼 */}
          <button 
            onClick={handleSave} 
            disabled={saving}
            style={{ width: "100%", background: "#111827", color: "white", padding: "14px", borderRadius: 12, fontSize: 16, fontWeight: 800, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
          >
            {saving ? "저장 중..." : "설정 저장하기"}
          </button>
          
          {msg && (
            <div style={{ textAlign: "center", marginTop: 12, fontSize: 13, fontWeight: 700, color: msg.includes("❌") ? "#ef4444" : "#10b981", animation: "fadeIn 0.3s ease" }}>
              {msg}
            </div>
          )}
        </>
      )}
    </div>
  );
}
