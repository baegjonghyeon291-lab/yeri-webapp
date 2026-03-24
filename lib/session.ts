/**
 * lib/session.ts
 * 웹앱 sessionId 자동 생성/저장 유틸
 * - 첫 방문 시 UUID를 localStorage에 저장
 * - 이후 방문 시 동일 ID 재사용
 * - 텔레그램/chatId와 완전 무관한 순수 웹앱 식별자
 */

const SESSION_KEY = "yeri_session_id";

function generateId(): string {
  return "yw-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
}

export function getSessionId(): string {
  if (typeof window === "undefined") return "ssr-temp";
  const existing = localStorage.getItem(SESSION_KEY);
  if (existing) return existing;
  const newId = generateId();
  localStorage.setItem(SESSION_KEY, newId);
  return newId;
}

export function clearSession(): void {
  if (typeof window !== "undefined") localStorage.removeItem(SESSION_KEY);
}
