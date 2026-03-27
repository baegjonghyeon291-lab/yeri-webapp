"use client";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function InstallPrompt() {
  const pathname = usePathname();
  const [show, setShow]   = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  // /chat 에서는 배너 완전 비활성화
  if (pathname === "/chat") return null;

  useEffect(() => {
    // 이미 한 번 닫은 경우 표시 안 함
    if (localStorage.getItem("pwa_prompt_dismissed")) return;
    // standalone 모드(이미 설치됨)이면 표시 안 함
    if (window.matchMedia("(display-mode: standalone)").matches) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShow(true);
    };
    window.addEventListener("beforeinstallprompt", handler);

    // iOS는 beforeinstallprompt가 없으므로 Safari 감지 후 별도 표시
    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const isSafari = /safari/i.test(navigator.userAgent) && !/chrome/i.test(navigator.userAgent);
    if (isIos && isSafari) setShow(true);

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  function dismiss() {
    localStorage.setItem("pwa_prompt_dismissed", "1");
    setShow(false);
  }

  async function install() {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") dismiss();
    } else {
      // iOS 안내
      dismiss();
    }
  }

  if (!show) return null;

  const isIos = typeof navigator !== "undefined" && /iphone|ipad|ipod/i.test(navigator.userAgent);
  const iosGuide = isIos ? "공유(□↑) → 홈 화면에 추가" : "";

  return (
    <div style={{
      position: "fixed", bottom: 16, left: 16, right: 16, zIndex: 9999,
      background: "#1a3a2a", color: "#fff",
      borderRadius: 16, padding: "14px 16px",
      display: "flex", alignItems: "center", gap: 12,
      boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
      animation: "slideUp 0.3s ease",
    }}>
      <span style={{ fontSize: 28, flexShrink: 0 }}>💚</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 700, fontSize: 13 }}>JH♡YR 앱으로 설치</div>
        <div style={{ fontSize: 11, color: "#a7f3d0", marginTop: 2 }}>
          {iosGuide || "홈 화면에 추가하면 바로 실행 가능해요"}
        </div>
      </div>
      <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
        {!isIos && (
          <button
            onClick={install}
            style={{
              padding: "6px 14px", borderRadius: 20, border: "none",
              background: "#2ea85a", color: "#fff",
              fontSize: 12, fontWeight: 700, cursor: "pointer",
            }}
          >설치</button>
        )}
        <button
          onClick={dismiss}
          style={{
            padding: "6px 10px", borderRadius: 20,
            border: "1px solid #3d6b4f", background: "transparent",
            color: "#a7f3d0", fontSize: 12, cursor: "pointer",
          }}
        >닫기</button>
      </div>

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(80px); opacity: 0; }
          to   { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
