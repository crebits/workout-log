import { measureOf, countOf, withCount, formatCount, unitLabel } from '../../src/workout/measure';
import { computePRs, bestE1rmBefore } from '../../src/workout/records';
import { buildPrefill, defaultRangeFromSets } from '../../src/workout/prefill';
import { chartSeries, metricsFor } from '../../src/workout/series';
import { summarizeSets } from '../../src/ui/entry/format';
import { ex, entry, block, routine, settings } from '../fixtures';

const t = (sec: number, weightKg?: number) => ({ isWarmup: false, durationSec: sec, ...(weightKg !== undefined ? { weightKg } : {}) });

test('measureOf 기본 reps', () => {
  expect(measureOf({})).toBe('reps');
  expect(measureOf(undefined)).toBe('reps');
  expect(measureOf({ measure: 'seconds' })).toBe('seconds');
});
test('countOf/withCount', () => {
  expect(countOf('seconds', { isWarmup: false, durationSec: 60, reps: 5 })).toBe(60);
  expect(countOf('reps', { isWarmup: false, durationSec: 60, reps: 5 })).toBe(5);
  expect(withCount('seconds', { isWarmup: false }, 45)).toEqual({ isWarmup: false, durationSec: 45 });
  expect(withCount('reps', { isWarmup: false, reps: 3 }, undefined)).toEqual({ isWarmup: false, reps: undefined });
});
test('formatCount·unitLabel', () => {
  expect(formatCount({ isWarmup: false, durationSec: 60 })).toBe('60s');
  expect(formatCount({ isWarmup: false, reps: 8 })).toBe('8');
  expect(formatCount({ isWarmup: false })).toBe('-');
  expect(unitLabel('seconds')).toBe('s');
  expect(unitLabel('reps')).toBe('회');
});

const plank = ex({ name: '플랭크', type: 'bodyweight', measure: 'seconds' });
const carry = ex({ name: '파머스 워크', type: 'weight', measure: 'seconds' });

test('맨몸 seconds PR: longestDuration, maxReps 없음', () => {
  const pr = computePRs(plank, [entry('2026-11-01', { exercises: [block(plank.id, [t(60), t(45)])] })]);
  expect(pr.longestDuration?.value).toBe(60);
  expect(pr.maxReps).toBeUndefined();
});
test('무게 seconds: e1RM 없음, maxWeight는 초와 함께', () => {
  const es = [entry('2026-11-01', { exercises: [block(carry.id, [t(40, 30)])] })];
  const pr = computePRs(carry, es);
  expect(pr.maxWeight).toEqual({ value: 30, reps: 40, date: '2026-11-01' });
  expect(pr.bestE1rm).toBeUndefined();
  expect(pr.longestDuration?.value).toBe(40);
  expect(bestE1rmBefore(carry, es, '2026-11-05')).toBeNull();
});
test('횟수 기록이 있던 운동을 seconds로 바꾸면 옛 reps 세트는 시간 기록에 안 들어감', () => {
  const es = [
    entry('2026-11-01', { exercises: [block(plank.id, [{ isWarmup: false, reps: 90 }])] }),
    entry('2026-11-02', { exercises: [block(plank.id, [t(60)])] }),
  ];
  expect(computePRs(plank, es).longestDuration?.value).toBe(60);
});
test('prefill seconds: 위쪽(초) 채우면 무게 +증가, 시간은 min초', () => {
  const r = routine({ name: 'r', items: [{ exerciseId: carry.id, order: 0, targetRepsMin: 30, targetRepsMax: 40 }] });
  const es = [entry('2026-11-01', { routineId: r.id, exercises: [block(carry.id, [t(40, 30)])] })];
  const res = buildPrefill({ routine: r, exercises: new Map([[carry.id, carry]]), entries: es, date: '2026-11-05', deload: false, settings: settings() });
  expect(res.exercises[0].sets).toEqual([{ isWarmup: false, weightKg: 32.5, durationSec: 30 }]);
  expect(res.hints[carry.id].ready).toBe(true);
});
test('defaultRange seconds: 60,45 → 45~47', () => {
  expect(defaultRangeFromSets([t(60), t(45)], settings(), 'seconds')).toEqual({ min: 45, max: 47 });
});
test('summarizeSets seconds', () => {
  expect(summarizeSets(carry, [t(60, 80), t(60, 80)])).toBe('80kg × 60s,60s');
  expect(summarizeSets(plank, [t(60), t(45)])).toBe('60s,45s');
});
test('series duration', () => {
  const es = [entry('2026-11-01', { exercises: [block(plank.id, [t(60), t(45)])] })];
  expect(chartSeries(plank, es, 'duration')).toEqual([{ date: '2026-11-01', value: 60 }]);
  expect(metricsFor(plank)).toEqual([{ metric: 'duration', label: '최장 시간' }]);
  expect(metricsFor(ex({ name: 'b' }))[0].metric).toBe('e1rm');
});
