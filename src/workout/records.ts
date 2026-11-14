import type { Entry, Exercise, ISODate, WorkoutSet } from '../types';
import { compareISO } from '../lib/date';

/** Epley. 1~12회만 계산한다. */
export function e1rm(weightKg: number, reps: number): number | null {
  if (!(reps >= 1 && reps <= 12) || !(weightKg > 0)) return null;
  return weightKg * (1 + reps / 30);
}

export function paceSecPerKm(durationSec?: number, distanceKm?: number): number | null {
  if (!durationSec || !distanceKm || distanceKm <= 0) return null;
  return durationSec / distanceKm;
}

export type PRKey = 'maxWeight' | 'maxReps' | 'bestE1rm' | 'maxAddedWeight' | 'longestDuration' | 'longestDistance' | 'bestPace';
export interface PRValue { value: number; date: ISODate; reps?: number }
export type PRs = Partial<Record<PRKey, PRValue>>;

/** 최고 기록 계산에 쓰는 일지: 삭제·디로드 제외 */
export const countsForRecords = (e: Entry) => !e.deletedAt && !e.isDeload;

export function workingSets(entry: Entry, exerciseId: string): WorkoutSet[] {
  return entry.exercises.filter((b) => b.exerciseId === exerciseId).flatMap((b) => b.sets.filter((s) => !s.isWarmup));
}

const LOWER_IS_BETTER: ReadonlySet<PRKey> = new Set(['bestPace']);
const better = (key: PRKey, a: number, b: number) => (LOWER_IS_BETTER.has(key) ? a < b : a > b);

export function computePRs(ex: Exercise, entries: Entry[]): PRs {
  const pr: PRs = {};
  const consider = (key: PRKey, value: number | null | undefined, date: ISODate, reps?: number) => {
    if (value == null || !(value > 0)) return;
    const cur = pr[key];
    if (!cur || better(key, value, cur.value)) pr[key] = reps === undefined ? { value, date } : { value, date, reps };
  };
  const sorted = entries.filter(countsForRecords).sort((a, b) => compareISO(a.date, b.date));
  for (const e of sorted) {
    for (const s of workingSets(e, ex.id)) {
      if (ex.type === 'weight') {
        const curW = pr.maxWeight;
        if (s.weightKg && (!curW || s.weightKg > curW.value || (s.weightKg === curW.value && (s.reps ?? 0) > (curW.reps ?? 0)))) {
          pr.maxWeight = { value: s.weightKg, date: e.date, reps: s.reps ?? 0 };
        }
        consider('maxReps', s.reps, e.date);
        consider('bestE1rm', s.weightKg && s.reps ? e1rm(s.weightKg, s.reps) : null, e.date);
      } else if (ex.type === 'bodyweight') {
        consider('maxReps', s.reps, e.date);
        consider('maxAddedWeight', s.addedWeightKg, e.date);
      } else {
        consider('longestDuration', s.durationSec, e.date);
        consider('longestDistance', s.distanceKm, e.date);
        consider('bestPace', paceSecPerKm(s.durationSec, s.distanceKm), e.date);
      }
    }
  }
  return pr;
}

/** entry가 기존 최고 기록을 넘은 항목. 이전 값이 없는 항목(첫 기록)은 제외. */
export function newPRs(ex: Exercise, entry: Entry, entries: Entry[]): PRKey[] {
  if (!countsForRecords(entry)) return [];
  const prev = computePRs(ex, entries.filter((e) => e.id !== entry.id && e.date !== entry.date));
  const cur = computePRs(ex, [entry]);
  return (Object.keys(cur) as PRKey[]).filter((k) => prev[k] && better(k, cur[k]!.value, prev[k]!.value));
}

export function bestE1rmBefore(exerciseId: string, entries: Entry[], date: ISODate): number | null {
  let best: number | null = null;
  for (const e of entries) {
    if (!countsForRecords(e) || compareISO(e.date, date) >= 0) continue;
    for (const s of workingSets(e, exerciseId)) {
      const v = s.weightKg && s.reps ? e1rm(s.weightKg, s.reps) : null;
      if (v !== null && (best === null || v > best)) best = v;
    }
  }
  return best;
}
