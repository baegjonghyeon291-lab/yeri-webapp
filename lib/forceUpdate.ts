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

  // 3. 버전 관련 storage 정리 + 현재 빌드 해시 기록
  try {
    // appVersion은 삭제하지 않고 현재 빌드로 설정 (리로드 후 첫설치 블로커 방지)
    const buildHash = (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_BUILD_HASH) || 'updated';
    localStorage.setItem("appVersion", buildHash);
    localStorage.removeItem("sw-version");
    sessionStorage.clear();
    console.log("[ForceUpdate] Storage cleared, appVersion set to:", buildHash);
  } catch (e) {
    console.error("[ForceUpdate] Storage clear failed", e);
  }

  // 4. 하드 리로드 (캐시 무시 + 타임스탬프 쿼리)
  const base = window.location.href.split('?')[0];
  window.location.href = `${base}?forceUpdate=${Date.now()}`;
}
