import { deloadState } from '../../src/core/deload';
import type { Walk, RotationStep } from '../../src/core/rotation';

const N = 8;
/** pos 0..k-1 실제 스텝을 하루씩 만든다 */
function walkOf(count: number): Walk {
  const steps: RotationStep[] = Array.from({ length: count }, (_, i) => ({
    date: `d${String(i).padStart(3, '0')}`, itemId: `i${i % N}`, pos: i, inferred: false,
  }));
  return { steps, nextItemId: 'x', nextPos: count };
}
const dates = (w: Walk, from: number, to: number) => new Set(w.steps.slice(from, to).map((s) => s.date));

test('기록 없음 → active false, due false, laps 0', () => {
  expect(deloadState({ steps: [], nextItemId: 'a', nextPos: 0 }, new Set(), N, 4)).toEqual({ active: false, due: false, lapsSinceDeload: 0 });
});

test('디로드 시작 후 한 바퀴 안이면 active', () => {
  const w = walkOf(13); // 10,11,12 디로드 → nextPos-startPos = 3
  expect(deloadState(w, dates(w, 10, 13), N, 4).active).toBe(true);
});

test('한 바퀴 채우면 active 아님', () => {
  const w = walkOf(18); // 10..17 디로드 → nextPos-startPos = 8
  expect(deloadState(w, dates(w, 10, 18), N, 4).active).toBe(false);
});

test('중간에 끈 디로드도 디로드로 셈 (laps는 마지막 디로드 다음부터)', () => {
  const w = walkOf(13); // 10,11 디로드, 12 일반
  const s = deloadState(w, dates(w, 10, 12), N, 4);
  expect(s.active).toBe(false);
  expect(s.lapsSinceDeload).toBe(0); // nextPos 13 - (11+1) = 1칸
});

test('디로드 없이 4바퀴(32칸) → due', () => {
  const s = deloadState(walkOf(32), new Set(), N, 4);
  expect(s).toEqual({ active: false, due: true, lapsSinceDeload: 4 });
});

test('디로드 없이 31칸 → due 아님', () => {
  expect(deloadState(walkOf(31), new Set(), N, 4).due).toBe(false);
});

test('디로드 끝난 뒤부터 다시 셈: 끝나고 31칸이면 due 아님, 32칸이면 due', () => {
  const w1 = walkOf(8 + 31); // 0..7 디로드, 이후 31칸
  expect(deloadState(w1, dates(w1, 0, 8), N, 4).due).toBe(false);
  const w2 = walkOf(8 + 32);
  expect(deloadState(w2, dates(w2, 0, 8), N, 4).due).toBe(true);
});

test('간주 휴식 스텝은 디로드 판정에서 무시', () => {
  const w = walkOf(3);
  w.steps.push({ date: 'r', itemId: 'R', pos: 3, inferred: true });
  w.nextPos = 4;
  // 실제 마지막 스텝(pos 2)이 디로드면 active
  expect(deloadState(w, dates(w, 2, 3), N, 4).active).toBe(true);
});
