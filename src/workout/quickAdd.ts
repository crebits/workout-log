import type { Entry, Exercise, ISODate, WorkoutSet } from '../types';
import { compareISO } from '../lib/date';
import { countsForRecords, workingSets } from './records';
import { countOf, measureOf, withCount } from './measure';

/** 한 줄 추가 칸의 값. weightKg는 맨몸 운동에선 추가 무게 */
export interface QuickValues { weightKg?: number; count?: number; setCount: number; durationMin?: number; distanceKm?: number }

export const DEFAULT_SET_COUNT = 3;
export const MAX_SET_COUNT = 20;

export const isValidSetCount = (n: number | undefined): boolean =>
  n !== undefined && Number.isInteger(n) && n >= 1 && n <= MAX_SET_COUNT;

/** 그 날짜 이전의 가장 최근 기록(디로드·삭제 제외)으로 기본값을 만든다 */
export function quickDefaults(ex: Exercise, entries: Entry[], date: ISODate): QuickValues {
  const last = entries
    .filter((e) => countsForRecords(e) && compareISO(e.date, date) < 0 && workingSets(e, ex.id).length > 0)
    .sort((a, b) => compareISO(b.date, a.date))[0];
  if (!last) return ex.type === 'cardio' ? { setCount: 1 } : { setCount: DEFAULT_SET_COUNT };
  const sets = workingSets(last, ex.id);
  const s = sets[sets.length - 1];
  const out: QuickValues = { setCount: ex.type === 'cardio' ? 1 : sets.length };
  if (ex.type === 'cardio') {
    if (s.durationSec !== undefined) out.durationMin = Math.round((s.durationSec / 60) * 100) / 100;
    if (s.distanceKm !== undefined) out.distanceKm = s.distanceKm;
    return out;
  }
  const weight = ex.type === 'weight' ? s.weightKg : s.addedWeightKg;
  if (weight !== undefined) out.weightKg = weight;
  const count = countOf(measureOf(ex), s);
  if (count !== undefined) out.count = count;
  return out;
}

/** 같은 값의 본 세트를 세트 수만큼 만든다. 유산소는 1세트 */
export function buildQuickSets(ex: Exercise, v: QuickValues): WorkoutSet[] {
  if (ex.type === 'cardio') {
    const s: WorkoutSet = { isWarmup: false };
    if (v.durationMin !== undefined) s.durationSec = Math.round(v.durationMin * 60);
    if (v.distanceKm !== undefined) s.distanceKm = v.distanceKm;
    return [s];
  }
  const base: WorkoutSet = { isWarmup: false };
  if (v.weightKg !== undefined) base[ex.type === 'weight' ? 'weightKg' : 'addedWeightKg'] = v.weightKg;
  const one = v.count === undefined ? base : withCount(measureOf(ex), base, v.count);
  return Array.from({ length: v.setCount }, () => ({ ...one }));
}
