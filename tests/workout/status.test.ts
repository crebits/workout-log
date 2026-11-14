import { computeStatus } from '../../src/workout/status';
import { ex, routine, entry, block, w, settings } from '../fixtures';

const exs = [1, 2, 3].map((i) => ex({ name: `e${i}` }));
const items = exs.map((e, i) => ({ exerciseId: e.id, order: i, targetRepsMin: 6, targetRepsMax: 8 }));
const A = routine({ name: 'A', order: 0, items });
const B = routine({ name: 'B', order: 1 });
const R = routine({ name: '휴식', kind: 'rest', order: 2 });
const routines = [B, R, A]; // order로 정렬되어야 함

test('다음 루틴과 간주 휴식', () => {
  const es = [entry('2026-11-10', { routineId: A.id }), entry('2026-11-11', { routineId: B.id })];
  const s = computeStatus(routines, es, '2026-11-13', settings());
  expect(s.inferredRestDates).toEqual(['2026-11-12']);
  expect(s.nextRoutineId).toBe(A.id);
});

test('삭제된 일지·루틴 없는 일지는 순환에서 빠짐', () => {
  const es = [entry('2026-11-10', { routineId: A.id }), entry('2026-11-11', { routineId: B.id, deletedAt: 3 }), entry('2026-11-11', { routineId: null })];
  expect(computeStatus(routines, es, '2026-11-12', settings()).nextRoutineId).toBe(B.id);
});

test('정체 운동 3개면 신호', () => {
  const sess = (d: string) => entry(d, { routineId: A.id, exercises: exs.map((e) => block(e.id, [w(80, 7)])) });
  // A를 같은 무게로 3번(사이사이 B, 휴식)
  const es = [sess('2026-11-01'), entry('2026-11-02', { routineId: B.id }), entry('2026-11-03', { routineId: R.id }),
    sess('2026-11-04'), entry('2026-11-05', { routineId: B.id }), entry('2026-11-06', { routineId: R.id }), sess('2026-11-07')];
  const s = computeStatus(routines, es, '2026-11-08', settings());
  expect(s.stalledCount).toBe(3);
  expect(s.stallSignal).toBe(true);
});

test('정체는 최근 한 바퀴의 기록만 본다', () => {
  const sess = (d: string) => entry(d, { routineId: A.id, exercises: exs.map((e) => block(e.id, [w(80, 7)])) });
  const es = [sess('2026-11-01'), sess('2026-11-02'), sess('2026-11-03'),
    ...['04', '05', '06', '07'].map((d, i) => entry(`2026-11-${d}`, { routineId: [B.id, R.id][i % 2] }))];
  // 마지막 A는 11-03, 이후 4칸 이상 나아감(목록 길이 3) → 한 바퀴 밖
  expect(computeStatus(routines, es, '2026-11-08', settings()).stalledCount).toBe(0);
});

test('디로드 상태 전달', () => {
  const es = [entry('2026-11-10', { routineId: A.id, isDeload: true })];
  expect(computeStatus(routines, es, '2026-11-11', settings()).deload.active).toBe(true);
});

test('정체: 시간 운동은 초만 보고, 옛 횟수 세트는 빼고 판단', () => {
  const carry = ex({ name: 'carry', measure: 'seconds' });
  const R2 = routine({ name: 'C', order: 0, items: [{ exerciseId: carry.id, order: 0, targetRepsMin: 30, targetRepsMax: 60 }] });
  const reps = (d: string) => entry(d, { routineId: R2.id, exercises: [block(carry.id, [w(20, 8)])] });
  const secs = (d: string) => entry(d, { routineId: R2.id, exercises: [block(carry.id, [{ isWarmup: false, weightKg: 20, durationSec: 45 }])] });
  const es = [reps('2026-11-01'), reps('2026-11-02'), secs('2026-11-03')];
  const s = computeStatus([R2], es, '2026-11-04', settings(), new Map([[carry.id, carry]]));
  expect(s.stalledCount).toBe(0);
});
