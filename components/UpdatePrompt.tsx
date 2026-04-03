"use client";
import { useEffect, useState } from "react";

/**
 * PWA 자동 업데이트 감지 + 강제 새로고침 컴포넌트.
 *
 * 동작 원리:
 * 1. 앱 시작 시 /version.json을 폴링하여 서버 최신 빌드 해시 확인
 * 2. 현재 빌드 해시(NEXT_PUBLIC_BUILD_HASH)와 비교
 * 3. 불일치 시 자동 새로고침 또는 배너 표시
 * 4. Service Worker 업데이트 감지 → skipWaiting → 자동 reload
 */
export default function UpdatePrompt() {
  const [showBanner, setShowBanner] = useState(false);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    // ── 1. Service Worker 업데이트 감지 ──
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.ready.then((reg) => {
        // 주기적 업데이트 체크 (2분마다)
        setInterval(() => reg.update(), 2 * 60 * 1000);

        reg.addEventListener("updatefound", () => {
          const newSW = reg.installing;
          if (!newSW) return;

          newSW.addEventListener("statechange", () => {
            // 새 SW가 waiting이면 → skipWaiting 요청
            if (newSW.state === "installed" && navigator.serviceWorker.controller) {
              newSW.postMessage("SKIP_WAITING");
            }
          });
        });
      });

      // SW가 controllerchange 되면 즉시 reload
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (!updating) {
          setUpdating(true);
          window.location.reload();
        }
      });
    }

    // ── 2. version.json 폴링으로 배포 감지 ──
    const currentBuild = process.env.NEXT_PUBLIC_BUILD_HASH || "dev";
    if (currentBuild === "dev") return; // 개발 모드에서는 비활성화

    async function checkVersion() {
      try {
        const res = await fetch(`/version.json?t=${Date.now()}`, { cache: "no-store" });
        const data = await res.json();
        if (data.version && data.version !== "__BUILD_VERSION__" && !data.version.includes(currentBuild)) {
          setShowBanner(true);
          // 5초 후 자동 새로고침
          setTimeout(() => {
            setUpdating(true);
            // 캐시 전부 날리고 새로고침
            if ("caches" in window) {
              caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k))));
            }
            window.location.reload();
          }, 3000);
        }
      } catch { /* 네트워크 실패 무시 */ }
    }

    // 앱 시작 후 3초 뒤 첫 체크, 이후 3분마다
    const t1 = setTimeout(checkVersion, 3000);
    const t2 = setInterval(checkVersion, 3 * 60 * 1000);

    // 앱이 백그라운드에서 다시 올라올 때도 체크
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

  if (!showBanner) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 99999,
        background: "linear-gradient(135deg, #2ea85a 0%, #1a8a45 100%)",
        color: "#fff",
        padding: "14px 20px",
        paddingTop: "calc(14px + env(safe-area-inset-top, 0px))",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        fontSize: 13,
        fontWeight: 600,
        boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
        animation: "slideDown 0.3s ease",
      }}
    >
      <span style={{ animation: "spin 1s linear infinite", fontSize: 16 }}>🔄</span>
      <span>새 버전이 감지되었습니다. 자동으로 업데이트 중...</span>
      <style>{`
        @keyframes slideDown {
          from { transform: translateY(-100%); }
          to { transform: translateY(0); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
