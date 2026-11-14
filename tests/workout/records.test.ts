import { e1rm, paceSecPerKm, computePRs, newPRs, bestE1rmBefore } from '../../src/workout/records';
import { ex, entry, block, w } from '../fixtures';

test('e1rm 80×8 = 101.33', () => expect(e1rm(80, 8)).toBeCloseTo(101.33, 2));
test('e1rm 13회 이상 null', () => expect(e1rm(60, 13)).toBeNull());
test('e1rm 0회 null', () => expect(e1rm(60, 0)).toBeNull());
test('pace 32분 5.2km ≈ 369.2초', () => expect(paceSecPerKm(1920, 5.2)).toBeCloseTo(369.2, 1));
test('pace 거리 없으면 null', () => {
  expect(paceSecPerKm(1920, undefined)).toBeNull();
  expect(paceSecPerKm(1920, 0)).toBeNull();
});

const bench = ex({ name: '벤치프레스' });

test('PR은 워밍업·디로드·삭제 기록 제외', () => {
  const es = [
    entry('2026-11-01', { exercises: [block(bench.id, [w(100, 10, true), w(80, 8)])] }),
    entry('2026-11-02', { isDeload: true, exercises: [block(bench.id, [w(90, 8)])] }),
    entry('2026-11-03', { deletedAt: 5, exercises: [block(bench.id, [w(95, 8)])] }),
  ];
  const pr = computePRs(bench, es);
  expect(pr.maxWeight).toEqual({ value: 80, reps: 8, date: '2026-11-01' });
  expect(pr.maxReps?.value).toBe(8);
  expect(pr.bestE1rm?.value).toBeCloseTo(101.33, 2);
});

test('맨몸 운동 PR: 최고 횟수, 최고 추가 무게', () => {
  const dip = ex({ name: '딥스', type: 'bodyweight' });
  const es = [entry('2026-11-01', { exercises: [block(dip.id, [{ isWarmup: false, reps: 12, addedWeightKg: 10 }, { isWarmup: false, reps: 15 }])] })];
  const pr = computePRs(dip, es);
  expect(pr.maxReps?.value).toBe(15);
  expect(pr.maxAddedWeight?.value).toBe(10);
  expect(pr.bestE1rm).toBeUndefined();
});

test('유산소 PR: 최장 시간·거리, 최고 페이스(작을수록 좋음)', () => {
  const run = ex({ name: '러닝', type: 'cardio' });
  const es = [
    entry('2026-11-01', { exercises: [block(run.id, [{ isWarmup: false, durationSec: 1800, distanceKm: 5 }])] }),
    entry('2026-11-05', { exercises: [block(run.id, [{ isWarmup: false, durationSec: 2400, distanceKm: 6 }])] }),
  ];
  const pr = computePRs(run, es);
  expect(pr.longestDuration).toMatchObject({ value: 2400, date: '2026-11-05' });
  expect(pr.longestDistance?.value).toBe(6);
  expect(pr.bestPace).toMatchObject({ value: 360, date: '2026-11-01' });
});

test('첫 기록은 신기록 아님', () => {
  const e = entry('2026-11-01', { exercises: [block(bench.id, [w(80, 8)])] });
  expect(newPRs(bench, e, [e])).toEqual([]);
});

test('이전 최고 무게를 넘으면 maxWeight 신기록', () => {
  const old = entry('2026-11-01', { exercises: [block(bench.id, [w(80, 8)])] });
  const now = entry('2026-11-05', { exercises: [block(bench.id, [w(82.5, 6)])] });
  const keys = newPRs(bench, now, [old, now]);
  expect(keys).toContain('maxWeight');
  expect(keys).not.toContain('maxReps');
});

test('디로드 기록은 신기록 아님', () => {
  const old = entry('2026-11-01', { exercises: [block(bench.id, [w(80, 8)])] });
  const now = entry('2026-11-05', { isDeload: true, exercises: [block(bench.id, [w(90, 8)])] });
  expect(newPRs(bench, now, [old, now])).toEqual([]);
});

test('지운 운동도 기록이 있으면 PR 계산', () => {
  const gone = ex({ name: '스쿼트', deletedAt: 9 });
  const es = [entry('2026-11-01', { exercises: [block(gone.id, [w(100, 5)])] })];
  expect(computePRs(gone, es).maxWeight?.value).toBe(100);
});

test('bestE1rmBefore는 그 날짜 이전만', () => {
  const es = [
    entry('2026-11-01', { exercises: [block(bench.id, [w(80, 8)])] }),
    entry('2026-11-05', { exercises: [block(bench.id, [w(100, 8)])] }),
  ];
  expect(bestE1rmBefore(bench, es, '2026-11-05')).toBeCloseTo(101.33, 2);
  expect(bestE1rmBefore(bench, es, '2026-11-01')).toBeNull();
});
