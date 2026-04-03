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
  const [showUpdateToast, setShowUpdateToast] = useState(false);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    const currentBuild = process.env.NEXT_PUBLIC_BUILD_HASH || "dev";

    // ── 0. 방금 업데이트가 완료되어 새로 켜진 경우 감지 ──
    if (currentBuild !== "dev") {
      const lastVersion = localStorage.getItem("appVersion");
      // 처음 접속이 아니면서(lastVersion 존재), 이전 버전에서 새 버전으로 바뀐 경우
      if (lastVersion && lastVersion !== currentBuild) {
        setShowUpdateToast(true);
        // 5초간 띄운 뒤 자동 숨김
        setTimeout(() => setShowUpdateToast(false), 6000);
      }
      // 최신 버전 업데이트 기록
      localStorage.setItem("appVersion", currentBuild);
    }

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
    if (currentBuild === "dev") return; // 개발 모드에서는 비활성화

    async function checkVersion() {
      try {
        const res = await fetch(`/version.json?t=${Date.now()}`, { cache: "no-store" });
        const data = await res.json();
        if (data.version && data.version !== "__BUILD_VERSION__" && !data.version.includes(currentBuild)) {
          setShowBanner(true);
          // 3초 후 자동 새로고침
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

  return (
    <>
      {/* 1) 새로고침 직후 "업데이트 완료" 알림 토스트 (애니메이션 포함 하단 고정) */}
      {showUpdateToast && (
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
              position: absolute;
              font-size: 20px;
              opacity: 0;
              pointer-events: none;
            }
            .heart-particles .p1 {
              left: 10%;
              animation: floatUp 1.5s ease-out infinite;
              animation-delay: 0.2s;
            }
            .heart-particles .p2 {
              left: 50%;
              animation: floatUp 1.8s ease-out infinite;
              animation-delay: 0.5s;
            }
            .heart-particles .p3 {
              right: 10%;
              animation: floatUp 1.6s ease-out infinite;
              animation-delay: 0.1s;
            }
            @keyframes floatUp {
              0% { transform: translateY(0) scale(0.5) rotate(0deg); opacity: 0; }
              50% { opacity: 0.8; transform: scale(1.2) rotate(15deg); }
              100% { transform: translateY(-30px) scale(0.8) rotate(-10deg); opacity: 0; }
            }
          `}</style>
        </div>
      )}

      {/* 2) 강제 새로고침 감지 전 띄우는 배너 (기존) */}
      {showBanner && (
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
          <span>새 버전 감지됨. 업데이트 중...</span>
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
      )}
    </>
  );
}
