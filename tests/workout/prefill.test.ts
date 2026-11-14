import { buildPrefill, defaultRangeFromSets } from '../../src/workout/prefill';
import { ex, routine, entry, block, w, settings } from '../fixtures';

const bench = ex({ name: '벤치프레스' });
const dip = ex({ name: '딥스', type: 'bodyweight' });
const exMap = new Map([bench, dip].map((e) => [e.id, e]));
const heavy = routine({ name: '가슴 고', items: [{ exerciseId: bench.id, order: 0, targetRepsMin: 6, targetRepsMax: 8 }] });
const light = routine({ name: '가슴 저', items: [{ exerciseId: bench.id, order: 0, targetRepsMin: 10, targetRepsMax: 12 }] });
const run = (es: ReturnType<typeof entry>[], r = heavy, date = '2026-11-20', deload = false, s = settings()) =>
  buildPrefill({ routine: r, exercises: exMap, entries: es, date, deload, settings: s });

test('같은 루틴 지난 기록에서 워밍업 포함 복사', () => {
  const es = [entry('2026-11-10', { routineId: heavy.id, exercises: [block(bench.id, [w(40, 10, true), w(80, 7)])] })];
  const r = run(es);
  expect(r.exercises[0].sets).toEqual([w(40, 10, true), w(80, 7)]);
  expect(r.hints[bench.id]).toMatchObject({ lastDate: '2026-11-10', ready: false });
});

test('고중량/저중량 루틴은 각자 기록에서', () => {
  const es = [
    entry('2026-11-10', { routineId: heavy.id, exercises: [block(bench.id, [w(80, 7)])] }),
    entry('2026-11-14', { routineId: light.id, exercises: [block(bench.id, [w(60, 11)])] }),
  ];
  expect(run(es, heavy).exercises[0].sets).toEqual([w(80, 7)]);
  expect(run(es, light).exercises[0].sets).toEqual([w(60, 11)]);
});

test('디로드 기록은 원본에서 제외', () => {
  const es = [
    entry('2026-11-10', { routineId: heavy.id, exercises: [block(bench.id, [w(80, 7)])] }),
    entry('2026-11-14', { routineId: heavy.id, isDeload: true, exercises: [block(bench.id, [w(60, 7)])] }),
  ];
  expect(run(es).exercises[0].sets).toEqual([w(80, 7)]);
});

test('date 이후 기록은 원본이 아님', () => {
  const es = [
    entry('2026-11-10', { routineId: heavy.id, exercises: [block(bench.id, [w(80, 7)])] }),
    entry('2026-11-25', { routineId: heavy.id, exercises: [block(bench.id, [w(90, 7)])] }),
  ];
  expect(run(es).exercises[0].sets).toEqual([w(80, 7)]);
});

test('같은 루틴 기록이 없으면 그 운동의 가장 최근 기록', () => {
  const es = [entry('2026-11-10', { routineId: null, exercises: [block(bench.id, [w(70, 8)])] })];
  expect(run(es).exercises[0].sets).toEqual([w(70, 8)]);
});

test('위쪽 채웠으면 +2.5kg, 횟수 min으로 (워밍업은 그대로)', () => {
  const es = [entry('2026-11-10', { routineId: heavy.id, exercises: [block(bench.id, [w(40, 10, true), w(80, 8), w(80, 8)])] })];
  const r = run(es);
  expect(r.exercises[0].sets).toEqual([w(40, 10, true), w(82.5, 6), w(82.5, 6)]);
  expect(r.hints[bench.id].ready).toBe(true);
});

test('디로드면 본 세트 3→2, 무게 감소 0.1·증가단위 2.5 → 82.5가 75', () => {
  const es = [entry('2026-11-10', { routineId: heavy.id, exercises: [block(bench.id, [w(40, 10, true), w(82.5, 8), w(82.5, 8), w(82.5, 8)])] })];
  const r = run(es, heavy, '2026-11-20', true, settings({ deloadWeightReduction: 0.1 }));
  expect(r.exercises[0].sets).toEqual([w(40, 10, true), w(75, 8), w(75, 8)]);
});

test('맨몸 운동은 숫자 그대로, bodyweightReady만', () => {
  const r2 = routine({ name: 'r', items: [{ exerciseId: dip.id, order: 0, targetRepsMin: 10, targetRepsMax: 12 }] });
  const es = [entry('2026-11-10', { routineId: r2.id, exercises: [block(dip.id, [{ isWarmup: false, reps: 12 }])] })];
  const r = run(es, r2);
  expect(r.exercises[0].sets).toEqual([{ isWarmup: false, reps: 12 }]);
  expect(r.hints[dip.id]).toMatchObject({ ready: false, bodyweightReady: true });
});

test('기록 없으면 빈 세트 하나', () => {
  const r = run([]);
  expect(r.exercises).toEqual([{ exerciseId: bench.id, order: 0, sets: [{ isWarmup: false }] }]);
  expect(r.hints[bench.id]).toMatchObject({ lastSets: null, lastDate: null });
});

test('루틴 items 순서대로', () => {
  const r2 = routine({ name: 'r', items: [
    { exerciseId: dip.id, order: 1, targetRepsMin: 1, targetRepsMax: 2 },
    { exerciseId: bench.id, order: 0, targetRepsMin: 1, targetRepsMax: 2 },
  ] });
  expect(run([], r2).exercises.map((e) => e.exerciseId)).toEqual([bench.id, dip.id]);
});

test('defaultRange: 8,8,7 → 7~9', () => {
  expect(defaultRangeFromSets([w(80, 8), w(80, 8), w(80, 7), w(40, 3, true)], settings())).toEqual({ min: 7, max: 9 });
});
test('defaultRange: 설정값이 있으면 그것', () => {
  expect(defaultRangeFromSets([w(80, 8)], settings({ defaultTargetRange: { min: 5, max: 6 } }))).toEqual({ min: 5, max: 6 });
});
test('defaultRange: 본 세트가 없으면 8~10', () => {
  expect(defaultRangeFromSets([], settings())).toEqual({ min: 8, max: 10 });
});
