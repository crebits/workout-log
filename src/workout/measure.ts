import type { Exercise, WorkoutSet } from '../types';

/** 무게·맨몸 운동을 횟수로 셀지 시간(초)으로 셀지 */
export type Measure = 'reps' | 'seconds';

export const measureOf = (ex: Pick<Exercise, 'measure'> | undefined): Measure => ex?.measure ?? 'reps';

/** 현재 단위의 값: 횟수면 reps, 시간이면 durationSec */
export function countOf(m: Measure, s: WorkoutSet): number | undefined {
  return m === 'seconds' ? s.durationSec : s.reps;
}

export function withCount(m: Measure, s: WorkoutSet, v: number | undefined): WorkoutSet {
  return m === 'seconds' ? { ...s, durationSec: v } : { ...s, reps: v };
}

export const unitLabel = (m: Measure) => (m === 'seconds' ? 's' : '회');

/** 세트에 있는 값 그대로 표시: 시간이면 '60s', 횟수면 '8' */
export function formatCount(s: WorkoutSet): string {
  if (s.durationSec !== undefined) return `${s.durationSec}s`;
  if (s.reps !== undefined) return String(s.reps);
  return '-';
}
