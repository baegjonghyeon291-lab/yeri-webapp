import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import InstallPrompt from "@/components/InstallPrompt";

export const metadata: Metadata = {
  title: "JH♡YR",
  description: "AI 투자 어시스턴트 — 예리",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "JH♡YR",
  },
  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "black-translucent",
  },
};

export const viewport = {
  themeColor: "#2ea85a",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="JH♡YR" />
        <meta name="theme-color" content="#2ea85a" />
        {/* Service Worker 등록 */}
        <script dangerouslySetInnerHTML={{ __html: `
          if ('serviceWorker' in navigator) {
            window.addEventListener('load', function() {
              navigator.serviceWorker.register('/sw.js')
                .then(function(reg) { console.log('[SW] 등록:', reg.scope); })
                .catch(function(e) { console.log('[SW] 실패:', e); });
            });
          }
        ` }} />
      </head>
      <body style={{
        display: 'flex', height: '100dvh', overflow: 'hidden',
        background: 'var(--bg-primary)',
        /* iOS safe-area 대응 */
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}>
        <Sidebar />
        <main className="flex-1 overflow-hidden" style={{ minWidth: 0 }}>
          {children}
        </main>
        <InstallPrompt />
      </body>
    </html>
  );
}
