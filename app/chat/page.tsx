import { Suspense } from "react";
import ChatClient from "./ChatClient";

export default function ChatPage() {
  return (
    <Suspense fallback={
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        height: "100%", color: "var(--text-muted)", fontSize: 14,
      }}>
        로딩 중...
      </div>
    }>
      <ChatClient />
    </Suspense>
  );
}
