import type { Entry, ISODate, Routine, Settings } from '../types';
import { compareISO } from '../lib/date';
import { walkRotation } from '../core/rotation';
import { deloadState, type DeloadState } from '../core/deload';
import { isStalled, type Attempt } from '../core/progression';
import { workingSets } from './records';
import { countOf, measureOf } from './measure';
import type { Exercise } from '../types';

export interface AppStatus {
  nextRoutineId: string | null;
  inferredRestDates: ISODate[];
  deload: DeloadState;
  stalledCount: number;
  stallSignal: boolean;
}

export const STALL_SIGNAL_MIN = 3;

export function activeRoutines(routines: Routine[]): Routine[] {
  return routines.filter((r) => !r.deletedAt).sort((a, b) => a.order - b.order);
}

export function computeStatus(routines: Routine[], entries: Entry[], until: ISODate, settings: Settings, exercises?: Map<string, Exercise>): AppStatus {
  const list = activeRoutines(routines);
  const n = list.length;
  const live = entries.filter((e) => !e.deletedAt);
  const walk = walkRotation(
    list.map((r) => ({ id: r.id, isRest: r.kind === 'rest' })),
    live.filter((e) => e.routineId).map((e) => ({ date: e.date, itemId: e.routineId! })),
    until,
  );
  const deloadDates = new Set(live.filter((e) => e.isDeload).map((e) => e.date));
  const deload = deloadState(walk, deloadDates, n, settings.deloadEveryLaps);

  // 정체: 순서상 최근 한 바퀴 안의 실제 기록에 나온 (루틴, 운동) 쌍
  const byDate = new Map(live.map((e) => [e.date, e]));
  const routineById = new Map(list.map((r) => [r.id, r]));
  const pairs = new Map<string, { routine: Routine; exerciseId: string }>();
  for (const s of walk.steps) {
    if (s.inferred || walk.nextPos - s.pos > n) continue;
    const e = byDate.get(s.date);
    const r = routineById.get(s.itemId);
    if (!e || !r) continue;
    for (const b of e.exercises) pairs.set(`${r.id}:${b.exerciseId}`, { routine: r, exerciseId: b.exerciseId });
  }
  let stalledCount = 0;
  for (const { routine, exerciseId } of pairs.values()) {
    const item = routine.items.find((i) => i.exerciseId === exerciseId);
    const ex = exercises?.get(exerciseId);
    if (!item || ex?.type === 'cardio') continue;
    const m = measureOf(ex);
    const history: Attempt[][] = live
      .filter((e) => !e.isDeload && e.routineId === routine.id && compareISO(e.date, until) < 0)
      .sort((a, b) => compareISO(a.date, b.date))
      // 운동의 현재 단위 값만 본다 (옛 다른 단위 세트·유산소 시간은 빠진다)
      .map((e) => workingSets(e, exerciseId)
        .map((s) => ({ load: s.weightKg ?? null, value: countOf(m, s) }))
        .filter((a): a is { load: number | null; value: number } => a.value !== undefined))
      .filter((h) => h.length > 0);
    if (isStalled(history, { min: item.targetRepsMin, max: item.targetRepsMax })) stalledCount++;
  }

  return {
    nextRoutineId: walk.nextItemId,
    inferredRestDates: walk.steps.filter((s) => s.inferred).map((s) => s.date),
    deload,
    stalledCount,
    stallSignal: stalledCount >= STALL_SIGNAL_MIN,
  };
}
