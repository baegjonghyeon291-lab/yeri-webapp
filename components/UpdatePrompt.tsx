"use client";
import { useEffect, useState } from "react";
import { forceUpdate } from "@/lib/forceUpdate";

/**
 * PWA 수동 업데이트 컴포넌트.
 * - 자동 새로고침/SW교체/캐시삭제 일절 없음
 * - 구버전 감지 → "업데이트 하기" 버튼 표시
 * - 버튼 클릭 시에만 SW/캐시 퍼지 + 하드 리로드
 * - 최신 상태면 아무것도 안 뜸
 */
export default function UpdatePrompt() {
  const [needsUpdate, setNeedsUpdate] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);

  useEffect(() => {
    const currentBuild = process.env.NEXT_PUBLIC_BUILD_HASH || "dev";

    // ── 업데이트 완료 후 재시작 감지 (성공 토스트) ──
    if (currentBuild !== "dev") {
      const lastVersion = localStorage.getItem("appVersion");
      if (lastVersion && lastVersion !== currentBuild) {
        setShowSuccessToast(true);
        setTimeout(() => setShowSuccessToast(false), 6000);
      }
      localStorage.setItem("appVersion", currentBuild);
    }

    // ── version.json 폴링 (버전 비교만, 자동 동작 없음) ──
    if (currentBuild === "dev") return;

    async function checkVersion() {
      try {
        const url = `${window.location.origin}/version.json?_=${Date.now()}&r=${Math.random()}`;
        const res = await fetch(url, {
          cache: "no-store",
          headers: { "Cache-Control": "no-cache, no-store", "Pragma": "no-cache" },
        });
        const data = await res.json();
        const isStale = data.version
          && data.version !== "__BUILD_VERSION__"
          && !data.version.includes(currentBuild);

        if (isStale) {
          setNeedsUpdate(true);
          window.dispatchEvent(new CustomEvent("yeri-version-status", { detail: "outdated" }));
        } else {
          window.dispatchEvent(new CustomEvent("yeri-version-status", { detail: "latest" }));
        }
      } catch { /* 네트워크 실패 무시 */ }
    }

    checkVersion();
    const t = setInterval(checkVersion, 2 * 60 * 1000);
    const onVisible = () => { if (document.visibilityState === "visible") checkVersion(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => { clearInterval(t); document.removeEventListener("visibilitychange", onVisible); };
  }, []);

  // 수동 업데이트 버튼 클릭 시에만 실행
  const handleUpdate = async () => {
    setUpdating(true);
    window.dispatchEvent(new CustomEvent("yeri-version-status", { detail: "updating" }));
    await new Promise(r => setTimeout(r, 2000));
    await forceUpdate();
  };

  return (
    <>
      {/* ── 업데이트 성공 토스트 ── */}
      {showSuccessToast && (
        <div style={{
          position: "fixed", bottom: 80, left: "50%", transform: "translateX(-50%)",
          zIndex: 999999, background: "linear-gradient(135deg,#ff69b4,#ff1493)",
          color: "#fff", padding: "16px 28px", borderRadius: 50,
          display: "flex", alignItems: "center", gap: 12,
          fontSize: 16, fontWeight: 700,
          boxShadow: "0 10px 40px rgba(255,20,147,0.4)",
          animation: "toastPop .6s cubic-bezier(.34,1.56,.64,1) forwards, fadeOut 1s ease 5s forwards",
          whiteSpace: "nowrap",
        }}>
          <span style={{ fontSize: 22 }}>✨</span>
          <span>귀염둥이 예리야 업데이트 됐어!! 💕</span>
          <style>{`
            @keyframes toastPop { from{opacity:0;bottom:40px;transform:translateX(-50%) scale(.8)} to{opacity:1;bottom:80px;transform:translateX(-50%) scale(1)} }
            @keyframes fadeOut { from{opacity:1} to{opacity:0;pointer-events:none} }
          `}</style>
        </div>
      )}

      {/* ── 구버전 감지 → 업데이트 하기 블로커 ── */}
      {needsUpdate && !updating && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999999,
          background: "rgba(0,0,0,.88)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
          display: "flex", alignItems: "center", justifyContent: "center",
          animation: "fadeIn .3s ease forwards",
        }}>
          <div style={{
            background: "#fff", padding: "44px 32px 36px", borderRadius: 28,
            textAlign: "center", width: "88%", maxWidth: 360,
            boxShadow: "0 24px 48px rgba(0,0,0,.5)",
            animation: "slideUp .4s cubic-bezier(.175,.885,.32,1.275) forwards",
          }}>
            <div style={{ fontSize: 56, marginBottom: 20, animation: "bounce 2s infinite" }}>💌</div>
            <h2 style={{ margin: "0 0 10px", color: "#1a1a1a", fontSize: 24, fontWeight: 800 }}>업데이트 필요</h2>
            <p style={{ margin: "0 0 8px", color: "#666", fontSize: 14, lineHeight: 1.6, wordBreak: "keep-all" }}>
              예리 AI의 새로운 버전이 있습니다!<br/>최신 버전으로 교체해 주세요.
            </p>
            <p style={{ margin: "0 0 28px", color: "#aaa", fontSize: 11 }}>
              현재: {process.env.NEXT_PUBLIC_BUILD_HASH || "dev"}
            </p>
            <button onClick={handleUpdate} style={{
              width: "100%", padding: 18,
              background: "linear-gradient(135deg,#2ea85a,#3fca6b)", color: "#fff",
              border: "none", borderRadius: 16, fontSize: 17, fontWeight: 800,
              cursor: "pointer", boxShadow: "0 8px 20px rgba(63,202,107,.35)",
              letterSpacing: "-.3px",
            }}>
              ✨ 업데이트 하기
            </button>
          </div>
          <style>{`
            @keyframes fadeIn { from{opacity:0} to{opacity:1} }
            @keyframes slideUp { from{opacity:0;transform:translateY(30px)} to{opacity:1;transform:translateY(0)} }
            @keyframes bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }
          `}</style>
        </div>
      )}

      {/* ── 업데이트 진행 중 로딩 화면 (버튼 클릭 시에만) ── */}
      {updating && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999999,
          background: "linear-gradient(135deg,#1a1a2e 0%,#16213e 50%,#0f3460 100%)",
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          animation: "fadeIn .3s ease forwards",
        }}>
          {/* 하트 파티클 */}
          <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
            {["💕","💖","✨","💗","♡","💫","💕","✨","💖","♡","💗","💫"].map((h, i) => (
              <span key={i} style={{
                position: "absolute", left: `${8 + (i * 7.5) % 84}%`,
                fontSize: 16 + (i % 3) * 8, opacity: 0,
                animation: `heartFloat ${3 + (i % 3)}s ease-in-out ${i * 0.3}s infinite`,
              }}>{h}</span>
            ))}
          </div>

          {/* 스피너 */}
          <div style={{
            width: 80, height: 80, borderRadius: "50%",
            border: "4px solid rgba(255,255,255,.15)", borderTopColor: "#ff69b4",
            animation: "spin 1s linear infinite", marginBottom: 32,
          }} />

          <h2 style={{ color: "#fff", fontSize: 24, fontWeight: 800, marginBottom: 16, animation: "pulse 2s ease-in-out infinite" }}>
            새 버전 적용중...
          </h2>
          <p style={{ color: "#ff69b4", fontSize: 16, fontWeight: 700, letterSpacing: 1 }}>
            ♡♡ 좀만 기다려 귀요미 ♡♡
          </p>

          <style>{`
            @keyframes spin { to{transform:rotate(360deg)} }
            @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.7} }
            @keyframes heartFloat {
              0% { transform:translateY(100vh) rotate(0deg); opacity:0 }
              10% { opacity:.6 }
              90% { opacity:.6 }
              100% { transform:translateY(-20vh) rotate(360deg); opacity:0 }
            }
          `}</style>
        </div>
      )}
    </>
  );
}
