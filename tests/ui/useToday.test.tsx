import { renderHook, act } from '@testing-library/react';
import { useToday } from '../../src/ui/useToday';

afterEach(() => vi.useRealTimers());

test('자정이 지나 앱이 다시 보이면 오늘 날짜가 바뀐다', () => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 10, 15, 23, 59));
  const { result } = renderHook(() => useToday());
  expect(result.current).toBe('2026-11-15');
  vi.setSystemTime(new Date(2026, 10, 16, 0, 5));
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' });
  act(() => { document.dispatchEvent(new Event('visibilitychange')); });
  expect(result.current).toBe('2026-11-16');
});
