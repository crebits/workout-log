import { decideProgression, isStalled, type Attempt } from '../../src/core/progression';

const r = { min: 6, max: 8 };
const a = (load: number | null, value: number): Attempt => ({ load, value });

test('모든 세트가 위쪽 이상이면 올릴 차례', () => {
  expect(decideProgression([a(80, 8), a(80, 8)], r, 2.5)).toEqual({ ready: true, next: [a(82.5, 6), a(82.5, 6)] });
});
test('하나라도 못 채우면 그대로', () => {
  const res = decideProgression([a(80, 8), a(80, 7)], r, 2.5);
  expect(res).toEqual({ ready: false, next: [a(80, 8), a(80, 7)] });
});
test('세트별 무게가 다르면 세트별로 올림', () => {
  expect(decideProgression([a(80, 9), a(75, 8)], r, 2.5).next).toEqual([a(82.5, 6), a(77.5, 6)]);
});
test('load가 null이면 null 유지', () => {
  expect(decideProgression([a(null, 8)], r, 1).next).toEqual([a(null, 6)]);
});
test('빈 배열은 ready 아님', () => expect(decideProgression([], r, 2.5).ready).toBe(false));
test('next는 입력과 다른 객체(복사)', () => {
  const last = [a(80, 7)];
  expect(decideProgression(last, r, 2.5).next[0]).not.toBe(last[0]);
});

test('같은 무게 3회 연속 미달이면 정체', () => {
  expect(isStalled([[a(80, 7)], [a(80, 7)], [a(80, 6)]], r)).toBe(true);
});
test('2회뿐이면 정체 아님', () => expect(isStalled([[a(80, 7)], [a(80, 7)]], r)).toBe(false));
test('무게가 바뀌었으면 정체 아님', () => {
  expect(isStalled([[a(77.5, 7)], [a(80, 7)], [a(80, 6)]], r)).toBe(false);
});
test('중간에 한 번 채웠으면 정체 아님', () => {
  expect(isStalled([[a(80, 7)], [a(80, 8)], [a(80, 6)]], r)).toBe(false);
});
test('최근 3회만 본다', () => {
  expect(isStalled([[a(75, 8)], [a(80, 7)], [a(80, 7)], [a(80, 6)]], r)).toBe(true);
});
