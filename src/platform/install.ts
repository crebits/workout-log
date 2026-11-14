/** 홈 화면에서 실행 중인지 (iOS는 navigator.standalone) */
export function isStandalone(): boolean {
  const nav = navigator as Navigator & { standalone?: boolean };
  return nav.standalone === true || (typeof matchMedia === 'function' && matchMedia('(display-mode: standalone)').matches);
}

export function isIOS(): boolean {
  const ua = navigator.userAgent;
  return /iPhone|iPad|iPod/.test(ua) || (ua.includes('Macintosh') && navigator.maxTouchPoints > 1);
}

/** 저장소를 브라우저가 임의로 지우지 않도록 요청 */
export async function requestPersist(): Promise<boolean> {
  try {
    return (await navigator.storage?.persist?.()) ?? false;
  } catch {
    return false;
  }
}

const DISMISS_KEY = 'installGuideDismissed';
export function isGuideDismissed(): boolean {
  try { return localStorage.getItem(DISMISS_KEY) === '1'; } catch { return false; }
}
export function dismissGuide(): void {
  try { localStorage.setItem(DISMISS_KEY, '1'); } catch { /* 저장 못 해도 이번 화면에서는 닫힘 */ }
}
