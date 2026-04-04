"use client";
import { useEffect, useState } from "react";
import { forceUpdate } from "@/lib/forceUpdate";

/**
 * PWA 자동 업데이트 감지 + 강제 업데이트 블로커 컴포넌트.
 *
 * 동작:
 * 1. 앱 시작 시 /version.json 폴링으로 서버 최신 빌드 해시 확인
 * 2. 현재 빌드 해시(NEXT_PUBLIC_BUILD_HASH)와 비교
 * 3. 불일치 → 풀스크린 블로커 표시 (구버전 사용 차단)
 * 4. 버튼 클릭 → SW unregister + caches 삭제 + storage 정리 + 하드 리로드
 * 5. 업데이트 성공 후 앱 재시작 → 하트 파티클 토스트 표시
 * 6. Service Worker updatefound → 자동 skipWaiting → controllerchange → reload
 */
export default function UpdatePrompt() {
  const [needsUpdate, setNeedsUpdate] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [updating, setUpdating] = useState(false);
  // 전역 update 상태를 공유하기 위한 커스텀 이벤트 발행
  const [versionStatus, setVersionStatus] = useState<"checking" | "latest" | "outdated" | "updating">("checking");

  useEffect(() => {
    const currentBuild = process.env.NEXT_PUBLIC_BUILD_HASH || "dev";

    // ── 0. 업데이트 완료 후 재시작 감지 ──
    if (currentBuild !== "dev") {
      const lastVersion = localStorage.getItem("appVersion");
      if (lastVersion && lastVersion !== currentBuild) {
        setShowSuccessToast(true);
        setTimeout(() => setShowSuccessToast(false), 6000);
      }
      localStorage.setItem("appVersion", currentBuild);
    }

    // ── 1. Service Worker 업데이트 감지 ──
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.ready.then((reg) => {
        setInterval(() => reg.update(), 2 * 60 * 1000);

        reg.addEventListener("updatefound", () => {
          const newSW = reg.installing;
          if (!newSW) return;
          newSW.addEventListener("statechange", () => {
            if (newSW.state === "installed" && navigator.serviceWorker.controller) {
              newSW.postMessage("SKIP_WAITING");
            }
          });
        });
      });

      navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (!updating) {
          setUpdating(true);
          window.location.reload();
        }
      });
    }

    // ── 2. version.json 폴링 ──
    if (currentBuild === "dev") {
      setVersionStatus("latest");
      return;
    }

    async function checkVersion() {
      try {
        const res = await fetch(`/version.json?t=${Date.now()}`, {
          cache: "no-store",
          headers: { "Cache-Control": "no-cache", "Pragma": "no-cache" },
        });
        const data = await res.json();
        if (data.version && data.version !== "__BUILD_VERSION__" && !data.version.includes(currentBuild)) {
          setNeedsUpdate(true);
          setVersionStatus("outdated");
          // 커스텀 이벤트로 다른 컴포넌트에 알림
          window.dispatchEvent(new CustomEvent("yeri-version-status", { detail: "outdated" }));
        } else {
          setVersionStatus("latest");
          window.dispatchEvent(new CustomEvent("yeri-version-status", { detail: "latest" }));
        }
      } catch {
        // 네트워크 실패 시 기존 상태 유지
      }
    }

    // 앱 시작 후 2초 뒤 첫 체크, 이후 2분마다
    const t1 = setTimeout(checkVersion, 2000);
    const t2 = setInterval(checkVersion, 2 * 60 * 1000);

    // 앱 포그라운드 복귀 시 즉시 체크
    const onVisible = () => {
      if (document.visibilityState === "visible") checkVersion();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      clearTimeout(t1);
      clearInterval(t2);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [updating]);

  const handleForceUpdate = async () => {
    setUpdating(true);
    setVersionStatus("updating");
    window.dispatchEvent(new CustomEvent("yeri-version-status", { detail: "updating" }));
    await forceUpdate();
  };

  return (
    <>
      {/* ── 업데이트 완료 성공 토스트 ── */}
      {showSuccessToast && (
        <div
          style={{
            position: "fixed",
            bottom: "80px",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 999999,
            background: "linear-gradient(135deg, rgba(255, 105, 180, 0.95), rgba(255, 20, 147, 0.95))",
            color: "#fff",
            padding: "16px 28px",
            borderRadius: "50px",
            display: "flex",
            alignItems: "center",
            gap: 12,
            fontSize: 16,
            fontWeight: 700,
            boxShadow: "0 10px 40px rgba(255, 20, 147, 0.4)",
            animation: "toastPop 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards, fadeOut 1s ease 5s forwards",
            whiteSpace: "nowrap"
          }}
        >
          <div className="heart-particles">
            <span className="p1">💕</span>
            <span className="p2">💖</span>
            <span className="p3">✨</span>
          </div>
          <span style={{ fontSize: 22 }}>✨</span>
          <span>귀염둥이 예리야 업데이트 됐어!! 💕</span>
          <style>{`
            @keyframes toastPop {
              from { opacity: 0; bottom: 40px; transform: translateX(-50%) scale(0.8); }
              to { opacity: 1; bottom: 80px; transform: translateX(-50%) scale(1); }
            }
            @keyframes fadeOut {
              from { opacity: 1; }
              to { opacity: 0; pointer-events: none; }
            }
            .heart-particles span {
              position: absolute; font-size: 20px; opacity: 0; pointer-events: none;
            }
            .heart-particles .p1 { left: 10%; animation: floatUp 1.5s ease-out infinite 0.2s; }
            .heart-particles .p2 { left: 50%; animation: floatUp 1.8s ease-out infinite 0.5s; }
            .heart-particles .p3 { right: 10%; animation: floatUp 1.6s ease-out infinite 0.1s; }
            @keyframes floatUp {
              0% { transform: translateY(0) scale(0.5) rotate(0deg); opacity: 0; }
              50% { opacity: 0.8; transform: scale(1.2) rotate(15deg); }
              100% { transform: translateY(-30px) scale(0.8) rotate(-10deg); opacity: 0; }
            }
          `}</style>
        </div>
      )}

      {/* ── 풀스크린 블로커 — 구버전 사용 차단 ── */}
      {needsUpdate && (
        <div
          style={{
            position: "fixed",
            top: 0, left: 0, right: 0, bottom: 0,
            zIndex: 9999999,
            backgroundColor: "rgba(0, 0, 0, 0.88)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            animation: "fadeIn 0.3s ease-out forwards",
          }}
        >
          <div style={{
            background: "#fff",
            padding: "44px 32px 36px",
            borderRadius: "28px",
            textAlign: "center",
            width: "88%",
            maxWidth: "360px",
            boxShadow: "0 24px 48px rgba(0,0,0,0.5)",
            animation: "slideUpFade 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards"
          }}>
            <div style={{ fontSize: "56px", marginBottom: "20px", animation: "bounceInfinite 2s infinite" }}>🚀</div>
            <h2 style={{ margin: "0 0 10px", color: "#1a1a1a", fontSize: "24px", fontWeight: "800", letterSpacing: "-0.5px" }}>
              업데이트 필요
            </h2>
            <p style={{ margin: "0 0 8px", color: "#666", fontSize: "14px", lineHeight: "1.6", wordBreak: "keep-all" }}>
              예리 AI의 새로운 버전이 감지되었습니다!<br/>
              원활한 사용을 위해 최신 버전으로<br/>교체해 주세요.
            </p>
            <p style={{ margin: "0 0 28px", color: "#aaa", fontSize: "11px" }}>
              현재 앱: {process.env.NEXT_PUBLIC_BUILD_HASH || "dev"}
            </p>

            <button
              onClick={handleForceUpdate}
              disabled={updating}
              style={{
                width: "100%",
                padding: "18px",
                background: updating ? "#e0e0e0" : "linear-gradient(135deg, #2ea85a 0%, #3fca6b 100%)",
                color: "#fff",
                border: "none",
                borderRadius: "16px",
                fontSize: "17px",
                fontWeight: "800",
                cursor: updating ? "default" : "pointer",
                boxShadow: updating ? "none" : "0 8px 20px rgba(63,202,107,0.35)",
                transition: "all 0.15s",
                transform: updating ? "scale(0.97)" : "scale(1)",
                letterSpacing: "-0.3px",
              }}
            >
              {updating ? "⏳ 업데이트 중..." : "✨ 업데이트하기"}
            </button>

            <p style={{ margin: "16px 0 0", color: "#999", fontSize: "10px", lineHeight: "1.5" }}>
              캐시 삭제 → 서비스 워커 교체 → 최신 버전 재설치
            </p>
          </div>

          <style>{`
            @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
            @keyframes slideUpFade {
              from { opacity: 0; transform: translateY(30px); }
              to { opacity: 1; transform: translateY(0); }
            }
            @keyframes bounceInfinite {
              0%, 100% { transform: translateY(0); }
              50% { transform: translateY(-10px); }
            }
          `}</style>
        </div>
      )}
    </>
  );
}
