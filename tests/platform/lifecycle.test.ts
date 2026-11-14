import { onPageHide, onPageShow } from '../../src/platform/lifecycle';

test('pagehide와 visibilitychange(hidden)에서 호출, 해제하면 안 불림', () => {
  const cb = vi.fn();
  const off = onPageHide(cb);
  window.dispatchEvent(new Event('pagehide'));
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
  document.dispatchEvent(new Event('visibilitychange'));
  expect(cb).toHaveBeenCalledTimes(2);
  off();
  window.dispatchEvent(new Event('pagehide'));
  expect(cb).toHaveBeenCalledTimes(2);
});
test('onPageShow: 다시 보일 때 호출', () => {
  const cb = vi.fn();
  const off = onPageShow(cb);
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' });
  document.dispatchEvent(new Event('visibilitychange'));
  expect(cb).toHaveBeenCalledTimes(1);
  off();
});
