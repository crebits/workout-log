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

import { monthGrid, addMonthsISO, monthTitle, dayTitle, dayLabel, formatDateTime, startOfMonthISO } from '../../src/lib/date';

test('startOfMonthISO', () => expect(startOfMonthISO('2026-11-15')).toBe('2026-11-01'));
test('addMonthsISO', () => expect(addMonthsISO('2026-01-01', -1)).toBe('2025-12-01'));
test('monthGrid: 일요일 시작, 앞뒤 달 채움, 7의 배수', () => {
  const g = monthGrid('2026-11-01');
  expect(g[0]).toEqual({ date: '2026-11-01', inMonth: true }); // 2026-11-01은 일요일
  expect(g.length % 7).toBe(0);
  expect(g.at(-1)).toEqual({ date: '2026-12-05', inMonth: false });
});
test('제목 형식', () => {
  expect(monthTitle('2026-11-01')).toBe('2026년 11월');
  expect(dayTitle('2026-11-14')).toBe('11월 14일 (토)');
  expect(dayLabel('2026-11-03')).toBe('11월 3일');
});
test('formatDateTime 현지 시간', () => {
  expect(formatDateTime(new Date('2026-11-14T23:30:00Z').getTime())).toBe('2026-11-15 08:30');
});
