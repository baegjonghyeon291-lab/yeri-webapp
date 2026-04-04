/**
 * forceUpdate.ts — PWA 강제 업데이트 유틸리티
 * 
 * Service Worker 해제, Cache Storage 전체 삭제,
 * localStorage/sessionStorage 정리 후 하드 리로드.
 */

export async function forceUpdate(): Promise<void> {
  // 1. Service Worker 전체 해제
  if ("serviceWorker" in navigator) {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const reg of registrations) {
        await reg.unregister();
      }
      console.log("[ForceUpdate] SW unregistered:", registrations.length);
    } catch (e) {
      console.error("[ForceUpdate] SW unregister failed", e);
    }
  }

  // 2. Cache Storage 전체 삭제
  if ("caches" in window) {
    try {
      const keys = await caches.keys();
      await Promise.all(keys.map(k => caches.delete(k)));
      console.log("[ForceUpdate] Caches deleted:", keys.length);
    } catch (e) {
      console.error("[ForceUpdate] Caches delete failed", e);
    }
  }

  // 3. 버전 관련 storage 정리
  try {
    localStorage.removeItem("appVersion");
    localStorage.removeItem("sw-version");
    // ★ "방금 업데이트 완료" 플래그 → 리로드 후 첫설치 블로커 대신 성공 토스트 표시
    localStorage.setItem("yeri-just-updated", "true");
    sessionStorage.clear();
  } catch (e) {
    console.error("[ForceUpdate] Storage clear failed", e);
  }

  // 4. 하드 리로드 (캐시 무시 + 타임스탬프 쿼리)
  const base = window.location.href.split('?')[0];
  window.location.href = `${base}?forceUpdate=${Date.now()}`;
}
