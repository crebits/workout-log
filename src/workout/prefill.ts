import type { Entry, EntryExercise, Exercise, ISODate, Routine, Settings, WorkoutSet } from '../types';
import { compareISO } from '../lib/date';
import { decideProgression, type Range } from '../core/progression';
import { countOf, measureOf, toMeasure, withCount, type Measure } from './measure';

export interface ExerciseHint { lastSets: WorkoutSet[] | null; lastDate: ISODate | null; ready: boolean; bodyweightReady: boolean }

const roundTo = (value: number, step: number) => Math.round(Math.round(value / step) * step * 1000) / 1000;

function findSource(entries: Entry[], routineId: string, exerciseId: string): Entry | undefined {
  const has = (e: Entry) => e.exercises.some((b) => b.exerciseId === exerciseId);
  return entries.find((e) => e.routineId === routineId && has(e)) ?? entries.find(has);
}

export function buildPrefill(a: {
  routine: Routine; exercises: Map<string, Exercise>; entries: Entry[]; date: ISODate; deload: boolean; settings: Settings;
}): { exercises: EntryExercise[]; hints: Record<string, ExerciseHint> } {
  const candidates = a.entries
    .filter((e) => !e.deletedAt && !e.isDeload && compareISO(e.date, a.date) < 0)
    .sort((x, y) => compareISO(y.date, x.date));
  const hints: Record<string, ExerciseHint> = {};
  const items = [...a.routine.items].sort((x, y) => x.order - y.order);

  const exercises = items.map((item, order): EntryExercise => {
    const ex = a.exercises.get(item.exerciseId);
    const src = findSource(candidates, a.routine.id, item.exerciseId);
    // 단위를 바꾼 운동이면 옛 세트의 다른 단위 값은 비우고 가져온다
    const lastSets = src ? src.exercises.filter((b) => b.exerciseId === item.exerciseId).flatMap((b) => b.sets)
      .map((s) => (ex && ex.type !== 'cardio' ? toMeasure(measureOf(ex), s) : { ...s })) : null;
    const hint: ExerciseHint = { lastSets, lastDate: src?.date ?? null, ready: false, bodyweightReady: false };
    hints[item.exerciseId] = hint;
    if (!lastSets || lastSets.length === 0) return { exerciseId: item.exerciseId, order, sets: [{ isWarmup: false }] };

    const range: Range = { min: item.targetRepsMin, max: item.targetRepsMax };
    const m = measureOf(ex);
    const warmups = lastSets.filter((s) => s.isWarmup);
    let working = lastSets.filter((s) => !s.isWarmup);

    // 올릴 차례는 같은 루틴의 지난번 기록일 때만 판단한다 (스펙 6.3)
    const sameRoutine = src!.routineId === a.routine.id;
    if (sameRoutine && ex?.type === 'weight' && working.length > 0) {
      const res = decideProgression(working.map((s) => ({ load: s.weightKg ?? null, value: countOf(m, s) ?? 0 })), range, ex.incrementKg);
      hint.ready = res.ready;
      if (res.ready && !a.deload) {
        working = working.map((s, i) => withCount(m, { ...s, weightKg: res.next[i].load ?? undefined }, res.next[i].value));
      }
    } else if (sameRoutine && ex?.type === 'bodyweight') {
      hint.bodyweightReady = working.length > 0 && working.every((s) => (countOf(m, s) ?? 0) >= range.max);
    }

    if (a.deload && working.length > 0) {
      const keep = Math.max(1, Math.ceil(working.length * a.settings.deloadSetRatio));
      const inc = ex?.incrementKg || 2.5;
      working = working.slice(0, keep).map((s) =>
        // 무게 감소가 0이면 그대로 둔다 (증가 단위로 반올림하면 61kg이 60kg이 되므로)
        s.weightKg === undefined || a.settings.deloadWeightReduction === 0 ? s : { ...s, weightKg: roundTo(s.weightKg * (1 - a.settings.deloadWeightReduction), inc) },
      );
    }
    // 원래 순서 유지: 워밍업이 앞에 있던 대로
    return { exerciseId: item.exerciseId, order, sets: [...warmups, ...working] };
  });

  return { exercises, hints };
}

export function defaultRangeFromSets(sets: WorkoutSet[], settings: Settings, measure: Measure = 'reps'): { min: number; max: number } {
  if (settings.defaultTargetRange) return { ...settings.defaultTargetRange };
  const reps = sets.filter((s) => !s.isWarmup).map((s) => countOf(measure, s)).filter((v): v is number => v !== undefined);
  if (reps.length === 0) return { min: 8, max: 10 };
  const min = Math.min(...reps);
  return { min, max: min + 2 };
}
