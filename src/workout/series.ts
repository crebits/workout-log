import type { Entry, Exercise, ISODate, WorkoutSet } from '../types';
import { compareISO } from '../lib/date';
import { countsForRecords, e1rm, paceSecPerKm, workingSets } from './records';
import { measureOf } from './measure';

export type Metric = 'e1rm' | 'reps' | 'duration' | 'distance' | 'pace' | 'heartRate' | 'cadence';
export interface Point { date: ISODate; value: number }

const pick: Record<Metric, { get(s: WorkoutSet): number | null; lowerIsBetter?: boolean }> = {
  e1rm: { get: (s) => (s.weightKg && s.reps ? e1rm(s.weightKg, s.reps) : null) },
  reps: { get: (s) => s.reps ?? null },
  duration: { get: (s) => s.durationSec ?? null },
  distance: { get: (s) => s.distanceKm ?? null },
  pace: { get: (s) => paceSecPerKm(s.durationSec, s.distanceKm), lowerIsBetter: true },
  heartRate: { get: (s) => s.avgHeartRate ?? null },
  cadence: { get: (s) => s.avgCadence ?? null },
};

/** 그래프용 날짜별 값(그날의 가장 좋은 값). 삭제·디로드·워밍업 제외. */
export function chartSeries(ex: Exercise, entries: Entry[], metric: Metric): Point[] {
  const m = pick[metric];
  const out: Point[] = [];
  for (const e of entries.filter(countsForRecords).sort((a, b) => compareISO(a.date, b.date))) {
    const vals = workingSets(e, ex.id).map(m.get).filter((v): v is number => v !== null && v > 0);
    if (vals.length) out.push({ date: e.date, value: m.lowerIsBetter ? Math.min(...vals) : Math.max(...vals) });
  }
  return out;
}

export const METRICS_FOR: Record<Exercise['type'], { metric: Metric; label: string }[]> = {
  weight: [{ metric: 'e1rm', label: '추정 1RM' }],
  bodyweight: [{ metric: 'reps', label: '최고 횟수' }],
  cardio: [
    { metric: 'distance', label: '거리' }, { metric: 'pace', label: '페이스' },
    { metric: 'heartRate', label: '평균 심박' }, { metric: 'cadence', label: '케이던스' },
  ],
};

/** 운동별 그래프 항목. 시간(초) 운동은 최장 시간 */
export function metricsFor(ex: Exercise): { metric: Metric; label: string }[] {
  if (ex.type !== 'cardio' && measureOf(ex) === 'seconds') return [{ metric: 'duration', label: '최장 시간' }];
  return METRICS_FOR[ex.type];
}
