import { quickDefaults, buildQuickSets, isValidSetCount } from '../../src/workout/quickAdd';
import { ex, entry, block, w } from '../fixtures';

const bench = ex({ name: '벤치' });
const dip = ex({ name: '딥스', type: 'bodyweight' });
const run = ex({ name: '러닝', type: 'cardio' });
const plank = ex({ name: '플랭크', type: 'bodyweight', measure: 'seconds' });

test('최근 기록에서 기본값: 마지막 본 세트 무게·횟수, 본 세트 수', () => {
  const es = [
    entry('2026-11-01', { exercises: [block(bench.id, [w(70, 10)])] }),
    entry('2026-11-05', { exercises: [block(bench.id, [w(40, 10, true), w(80, 8), w(80, 7), w(80, 6)])] }),
  ];
  expect(quickDefaults(bench, es, '2026-11-10')).toEqual({ weightKg: 80, count: 6, setCount: 3 });
});
test('디로드·삭제·이후 날짜 기록은 제외', () => {
  const es = [
    entry('2026-11-01', { exercises: [block(bench.id, [w(70, 10)])] }),
    entry('2026-11-05', { isDeload: true, exercises: [block(bench.id, [w(50, 8)])] }),
    entry('2026-11-06', { deletedAt: 1, exercises: [block(bench.id, [w(55, 8)])] }),
    entry('2026-11-20', { exercises: [block(bench.id, [w(90, 8)])] }),
  ];
  expect(quickDefaults(bench, es, '2026-11-10')).toEqual({ weightKg: 70, count: 10, setCount: 1 });
});
test('기록 없으면 setCount 3만', () => expect(quickDefaults(bench, [], '2026-11-10')).toEqual({ setCount: 3 }));
test('맨몸: 추가 무게를 weightKg 자리로', () => {
  const es = [entry('2026-11-01', { exercises: [block(dip.id, [{ isWarmup: false, reps: 12, addedWeightKg: 10 }, { isWarmup: false, reps: 10, addedWeightKg: 10 }])] })];
  expect(quickDefaults(dip, es, '2026-11-10')).toEqual({ weightKg: 10, count: 10, setCount: 2 });
});
test('seconds 운동은 count = 초', () => {
  const es = [entry('2026-11-01', { exercises: [block(plank.id, [{ isWarmup: false, durationSec: 60 }])] })];
  expect(quickDefaults(plank, es, '2026-11-10')).toEqual({ count: 60, setCount: 1 });
});
test('유산소: 분·km, 1세트', () => {
  const es = [entry('2026-11-01', { exercises: [block(run.id, [{ isWarmup: false, durationSec: 1920, distanceKm: 5.2 }])] })];
  expect(quickDefaults(run, es, '2026-11-10')).toEqual({ durationMin: 32, distanceKm: 5.2, setCount: 1 });
});
test('buildQuickSets: 같은 값 세트 3개', () => {
  expect(buildQuickSets(bench, { weightKg: 80, count: 8, setCount: 3 })).toEqual([w(80, 8), w(80, 8), w(80, 8)]);
});
test('buildQuickSets: 무게 없이도 생성', () => {
  expect(buildQuickSets(bench, { count: 8, setCount: 2 })).toEqual([{ isWarmup: false, reps: 8 }, { isWarmup: false, reps: 8 }]);
});
test('buildQuickSets: 맨몸 추가 무게, seconds', () => {
  expect(buildQuickSets(dip, { weightKg: 10, count: 12, setCount: 1 })).toEqual([{ isWarmup: false, addedWeightKg: 10, reps: 12 }]);
  expect(buildQuickSets(plank, { count: 60, setCount: 2 })).toEqual([{ isWarmup: false, durationSec: 60 }, { isWarmup: false, durationSec: 60 }]);
});
test('buildQuickSets: 유산소 1세트', () => {
  expect(buildQuickSets(run, { durationMin: 32, distanceKm: 5.2, setCount: 5 })).toEqual([{ isWarmup: false, durationSec: 1920, distanceKm: 5.2 }]);
});
test('isValidSetCount', () => {
  for (const v of [0, 21, 2.5, undefined, -1]) expect(isValidSetCount(v)).toBe(false);
  for (const v of [1, 3, 20]) expect(isValidSetCount(v)).toBe(true);
});

import { lastHint } from '../../src/workout/quickAdd';
test('lastHint: 루틴과 상관없이 가장 최근 기록(디로드 제외)', () => {
  const es = [
    entry('2026-11-01', { exercises: [block(bench.id, [w(70, 10)])] }),
    entry('2026-11-05', { isDeload: true, exercises: [block(bench.id, [w(50, 8)])] }),
  ];
  expect(lastHint(bench, es, '2026-11-10')).toEqual({ lastSets: [w(70, 10)], lastDate: '2026-11-01', ready: false, bodyweightReady: false });
  expect(lastHint(bench, [], '2026-11-10')).toBeUndefined();
});
