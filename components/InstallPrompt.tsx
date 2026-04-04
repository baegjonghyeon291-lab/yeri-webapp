"use client";
import { useEffect, useState } from "react";

/**
 * PWA 설치 유도 배너.
 * - 모바일 브라우저에서만 표시 (이미 PWA로 실행 중이면 숨김)
 * - 갤럭시/Android: beforeinstallprompt 캡처 → 네이티브 설치 프롬프트
 * - 아이폰/iOS: 홈 화면 추가 안내 가이드 오버레이
 */

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function InstallPrompt() {
  const [show, setShow] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showGuide, setShowGuide] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // PWA standalone 모드면 숨김
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches
      || (navigator as any).standalone === true;
    if (isStandalone) return;

    // 모바일 체크
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (!isMobile) return;

    // 이전에 닫았으면 이번 세션에서는 안 뜸
    if (sessionStorage.getItem("install-dismissed")) return;

    // iOS 감지
    const ios = /iPhone|iPad|iPod/.test(navigator.userAgent);
    setIsIOS(ios);
    setShow(true);

    // Android: beforeinstallprompt 캡처
    if (!ios) {
      const handler = (e: Event) => {
        e.preventDefault();
        setDeferredPrompt(e as BeforeInstallPromptEvent);
      };
      window.addEventListener("beforeinstallprompt", handler);
      return () => window.removeEventListener("beforeinstallprompt", handler);
    }
  }, []);

  const handleInstall = async () => {
    if (isIOS) {
      setShowGuide(true);
      return;
    }
    // Android: 네이티브 설치 프롬프트
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") setShow(false);
      setDeferredPrompt(null);
    } else {
      // 프롬프트 못 잡은 경우 안내
      setShowGuide(true);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    setShow(false);
    sessionStorage.setItem("install-dismissed", "true");
  };

  if (!show || dismissed) return null;

  return (
    <>
      {/* ── 상단 고정 설치 배너 ── */}
      <div style={{
        position: "fixed",
        top: 0, left: 0, right: 0,
        zIndex: 99998,
        paddingTop: "env(safe-area-inset-top, 0px)",
        background: "linear-gradient(135deg, #1a3a2a 0%, #2d5a3f 100%)",
        boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
        animation: "slideDown .3s ease",
      }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "12px 16px",
        }}>
          {/* 아이콘 */}
          <span style={{ fontSize: 28, lineHeight: 1 }}>💌</span>

          {/* 텍스트 */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: "#fff", fontSize: 14, fontWeight: 700, letterSpacing: "-.3px" }}>
              예리 AI 앱 설치하기
            </div>
            <div style={{ color: "rgba(255,255,255,.65)", fontSize: 11, marginTop: 2 }}>
              홈 화면에서 바로 실행하세요
            </div>
          </div>

          {/* 설치 버튼 */}
          <button
            onClick={handleInstall}
            style={{
              padding: "10px 20px",
              background: "linear-gradient(135deg, #3fca6b, #2ea85a)",
              color: "#fff", border: "none", borderRadius: 12,
              fontSize: 13, fontWeight: 700, cursor: "pointer",
              boxShadow: "0 4px 12px rgba(63,202,107,.3)",
              whiteSpace: "nowrap", flexShrink: 0,
            }}
          >
            앱 다운로드
          </button>

          {/* 닫기 */}
          <button
            onClick={handleDismiss}
            style={{
              width: 28, height: 28, borderRadius: "50%",
              border: "none", background: "rgba(255,255,255,.15)",
              color: "rgba(255,255,255,.6)", fontSize: 14,
              cursor: "pointer", display: "flex",
              alignItems: "center", justifyContent: "center",
              flexShrink: 0, padding: 0,
            }}
          >✕</button>
        </div>
      </div>

      {/* 배너 높이만큼 밀어주는 spacer */}
      <div style={{ height: "calc(60px + env(safe-area-inset-top, 0px))", flexShrink: 0 }} />

      {/* ── iOS/Android 안내 가이드 오버레이 ── */}
      {showGuide && (
        <div
          onClick={() => setShowGuide(false)}
          style={{
            position: "fixed", inset: 0, zIndex: 9999998,
            background: "rgba(0,0,0,.85)", backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            display: "flex", alignItems: "flex-end", justifyContent: "center",
            paddingBottom: "calc(30px + env(safe-area-inset-bottom, 0px))",
            animation: "fadeIn .25s ease",
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: "#fff", borderRadius: 24, padding: "32px 28px 28px",
              width: "90%", maxWidth: 380,
              boxShadow: "0 20px 60px rgba(0,0,0,.3)",
              animation: "slideUp .35s cubic-bezier(.175,.885,.32,1.275)",
            }}
          >
            <div style={{ textAlign: "center", marginBottom: 24 }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>💌</div>
              <h3 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "#1a2233" }}>
                홈 화면에 추가하기
              </h3>
              <p style={{ margin: "8px 0 0", color: "#888", fontSize: 12 }}>
                아래 순서대로 따라해 주세요!
              </p>
            </div>

            {isIOS ? (
              /* iOS 안내 */
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <StepItem num={1} icon="🔗" text={<>하단의 <b>공유 버튼</b> <span style={{fontSize:18}}>⬆</span> 을 눌러주세요</>} />
                <StepItem num={2} icon="📱" text={<>메뉴에서 <b>"홈 화면에 추가"</b>를 눌러주세요</>} />
                <StepItem num={3} icon="✅" text={<>오른쪽 상단 <b>"추가"</b>를 눌러 완료!</>} />
              </div>
            ) : (
              /* Android 안내 */
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <StepItem num={1} icon="⋮" text={<>브라우저 우측 상단 <b>메뉴(⋮)</b>를 눌러주세요</>} />
                <StepItem num={2} icon="📱" text={<><b>"홈 화면에 추가"</b> 또는 <b>"앱 설치"</b>를 눌러주세요</>} />
                <StepItem num={3} icon="✅" text={<><b>"설치"</b> 또는 <b>"추가"</b>를 눌러 완료!</>} />
              </div>
            )}

            <button
              onClick={() => setShowGuide(false)}
              style={{
                width: "100%", marginTop: 24, padding: 14,
                background: "#f5f5f5", color: "#666",
                border: "none", borderRadius: 14,
                fontSize: 14, fontWeight: 600, cursor: "pointer",
              }}
            >
              닫기
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideDown { from{transform:translateY(-100%)} to{transform:translateY(0)} }
        @keyframes fadeIn { from{opacity:0} to{opacity:1} }
        @keyframes slideUp { from{opacity:0;transform:translateY(40px)} to{opacity:1;transform:translateY(0)} }
      `}</style>
    </>
  );
}

function StepItem({ num, icon, text }: { num: number; icon: string; text: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
      <div style={{
        width: 40, height: 40, borderRadius: 12,
        background: "#f0f9f4", border: "1px solid #d4edda",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 20, flexShrink: 0,
      }}>{icon}</div>
      <div style={{ flex: 1 }}>
        <span style={{ fontSize: 11, color: "#3fca6b", fontWeight: 700 }}>STEP {num}</span>
        <div style={{ fontSize: 13, color: "#333", lineHeight: 1.5, marginTop: 2 }}>{text}</div>
      </div>
    </div>
  );
}
