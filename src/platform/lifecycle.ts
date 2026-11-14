/** 앱이 가려지거나 닫힐 때(iOS는 pagehide가 더 확실함) */
export function onPageHide(cb: () => void): () => void {
  const onVis = () => { if (document.visibilityState === 'hidden') cb(); };
  document.addEventListener('visibilitychange', onVis);
  window.addEventListener('pagehide', cb);
  return () => { document.removeEventListener('visibilitychange', onVis); window.removeEventListener('pagehide', cb); };
}

/** 앱이 다시 보일 때 */
export function onPageShow(cb: () => void): () => void {
  const onVis = () => { if (document.visibilityState === 'visible') cb(); };
  document.addEventListener('visibilitychange', onVis);
  window.addEventListener('pageshow', cb);
  return () => { document.removeEventListener('visibilitychange', onVis); window.removeEventListener('pageshow', cb); };
}
