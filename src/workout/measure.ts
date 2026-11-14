import type { Exercise, WorkoutSet } from '../types';

/** 무게·맨몸 운동을 횟수로 셀지 시간(초)으로 셀지 */
export type Measure = 'reps' | 'seconds';

export const measureOf = (ex: Pick<Exercise, 'measure'> | undefined): Measure => ex?.measure ?? 'reps';

/** 현재 단위의 값: 횟수면 reps, 시간이면 durationSec */
export function countOf(m: Measure, s: WorkoutSet): number | undefined {
  return m === 'seconds' ? s.durationSec : s.reps;
}

/** 현재 단위의 값을 쓰고, 다른 단위 필드는 지운다 (한 세트에 횟수와 시간이 섞이지 않게) */
export function withCount(m: Measure, s: WorkoutSet, v: number | undefined): WorkoutSet {
  return m === 'seconds' ? { ...s, durationSec: v, reps: undefined } : { ...s, reps: v, durationSec: undefined };
}

/** 세트가 실제로 가진 단위. 둘 다 없거나 둘 다 있으면 운동의 단위 */
export function setMeasure(s: WorkoutSet, fallback: Measure): Measure {
  if (s.durationSec !== undefined && s.reps === undefined) return 'seconds';
  if (s.reps !== undefined && s.durationSec === undefined) return 'reps';
  return fallback;
}

/** 단위가 바뀐 운동의 옛 세트를 가져올 때: 다른 단위 값은 비운다 */
export function toMeasure(m: Measure, s: WorkoutSet): WorkoutSet {
  return m === 'seconds' ? { ...s, reps: undefined } : { ...s, durationSec: undefined };
}

export const unitLabel = (m: Measure) => (m === 'seconds' ? 's' : '회');

/** 세트에 있는 값 그대로 표시: 시간이면 '60s', 횟수면 '8' */
export function formatCount(s: WorkoutSet, withRepsUnit = false): string {
  if (s.durationSec !== undefined) return `${s.durationSec}s`;
  if (s.reps !== undefined) return withRepsUnit ? `${s.reps}회` : String(s.reps);
  return '-';
}
