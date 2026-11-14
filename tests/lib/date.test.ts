import { todayISO, addDays, daysBetween, compareISO } from '../../src/lib/date';

test('KST 오전 8시는 그날 날짜', () => {
  expect(todayISO(new Date('2026-11-14T23:30:00Z'))).toBe('2026-11-15');
});
test('addDays 월 경계', () => expect(addDays('2026-11-30', 1)).toBe('2026-12-01'));
test('addDays 음수', () => expect(addDays('2026-11-01', -1)).toBe('2026-10-31'));
test('daysBetween', () => expect(daysBetween('2026-11-10', '2026-11-15')).toBe(5));
test('compareISO', () => {
  expect(compareISO('2026-11-10', '2026-11-15')).toBeLessThan(0);
  expect(compareISO('2026-11-15', '2026-11-15')).toBe(0);
});
