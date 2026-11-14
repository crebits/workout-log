import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db';
import type { BaseRecord, Entry, Exercise, ISODate, Routine, Settings } from '../types';
import { DEFAULT_SETTINGS } from '../types';

export type EntryDraft = Pick<Entry, 'date' | 'routineId' | 'isDeload' | 'memo' | 'exercises'>;
type Input<T extends BaseRecord> = Omit<T, keyof BaseRecord> & Partial<BaseRecord>;

const notDeleted = <T extends BaseRecord>(r: T) => !r.deletedAt;
const normName = (s: string) => s.trim().toLowerCase();

/** 단조 증가 시각: 같은 ms에 두 번 저장해도 updatedAt이 커진다 */
let lastNow = 0;
function now(): number {
  lastNow = Math.max(Date.now(), lastNow + 1);
  return lastNow;
}

function stamp<T extends BaseRecord>(input: Input<T>, existing?: T): T {
  const t = now();
  const { deletedAt: _drop, ...rest } = input as Input<T> & { deletedAt?: number };
  return {
    ...(rest as object),
    id: existing?.id ?? input.id ?? crypto.randomUUID(),
    createdAt: existing?.createdAt ?? input.createdAt ?? t,
    updatedAt: t,
  } as T;
}

/** 단위를 바꿀 때 루틴 목표 범위 기본값 */
export const DEFAULT_RANGE = { reps: { min: 8, max: 10 }, seconds: { min: 30, max: 60 } } as const;

export const isEmptyDraft = (d: EntryDraft) => d.routineId === null && d.memo.trim() === '' && d.exercises.length === 0;

export const repo = {
  async listExercises(opts?: { includeDeleted?: boolean }): Promise<Exercise[]> {
    const all = await db.exercises.toArray();
    return opts?.includeDeleted ? all : all.filter(notDeleted);
  },
  getExercise: (id: string) => db.exercises.get(id),
  async findExerciseByName(name: string): Promise<Exercise | undefined> {
    const n = normName(name);
    return (await db.exercises.toArray()).find((e) => notDeleted(e) && normName(e.name) === n);
  },
  async saveExercise(input: Input<Exercise>): Promise<Exercise> {
    const existing = input.id ? await db.exercises.get(input.id) : undefined;
    const rec = stamp<Exercise>({ ...input, name: input.name.trim() }, existing);
    await db.exercises.put(rec);
    return rec;
  },
  /**
   * 운동의 세는 방식(횟수/시간)을 바꾼다. 그 운동이 든 루틴의 목표 범위는 새 단위의 기본값으로 바꾼다
   * (8~10회가 8~10초로 읽히지 않게). 바뀐 루틴 수를 돌려준다.
   */
  async changeMeasure(id: string, measure: 'reps' | 'seconds'): Promise<number> {
    return db.transaction('rw', db.exercises, db.routines, async () => {
      const ex = await db.exercises.get(id);
      if (!ex || (ex.measure ?? 'reps') === measure) return 0;
      await db.exercises.put({ ...ex, measure, updatedAt: now() });
      const range = DEFAULT_RANGE[measure];
      let changed = 0;
      for (const r of await db.routines.toArray()) {
        if (r.deletedAt || !r.items.some((i) => i.exerciseId === id)) continue;
        const items = r.items.map((i) => (i.exerciseId === id ? { ...i, targetRepsMin: range.min, targetRepsMax: range.max } : i));
        await db.routines.put({ ...r, items, updatedAt: now() });
        changed++;
      }
      return changed;
    });
  },
  async deleteExercise(id: string): Promise<void> {
    await db.exercises.update(id, { deletedAt: now(), updatedAt: now() });
  },

  async listRoutines(opts?: { includeDeleted?: boolean }): Promise<Routine[]> {
    const all = await db.routines.toArray();
    return (opts?.includeDeleted ? all : all.filter(notDeleted)).sort((a, b) => a.order - b.order);
  },
  async saveRoutine(input: Input<Routine>): Promise<Routine> {
    const existing = input.id ? await db.routines.get(input.id) : undefined;
    const rec = stamp<Routine>(input, existing);
    await db.routines.put(rec);
    return rec;
  },
  async deleteRoutine(id: string): Promise<void> {
    await db.routines.update(id, { deletedAt: now(), updatedAt: now() });
  },
  async reorderRoutines(ids: string[]): Promise<void> {
    await db.transaction('rw', db.routines, async () => {
      for (const [order, id] of ids.entries()) await db.routines.update(id, { order, updatedAt: now() });
    });
  },

  async getEntry(date: ISODate): Promise<Entry | undefined> {
    const e = await db.entries.where('date').equals(date).first();
    return e && notDeleted(e) ? e : undefined;
  },
  async listEntries(): Promise<Entry[]> {
    return (await db.entries.toArray()).filter(notDeleted);
  },
  /** 비어 있으면 soft delete. 같은 날짜 레코드(삭제된 것 포함)가 있으면 그 레코드를 갱신·복구한다. */
  async saveEntry(d: EntryDraft): Promise<Entry> {
    return db.transaction('rw', db.entries, async () => {
      const existing = await db.entries.where('date').equals(d.date).first();
      if (isEmptyDraft(d)) {
        if (existing && !existing.deletedAt) {
          const t = now();
          await db.entries.update(existing.id, { ...d, deletedAt: t, updatedAt: t });
          return { ...existing, ...d, deletedAt: t, updatedAt: t };
        }
        return existing ?? { ...stamp<Entry>(d), deletedAt: now() };
      }
      const rec = stamp<Entry>(d, existing);
      await db.entries.put(rec);
      return rec;
    });
  },

  async getSettings(): Promise<Settings> {
    return (await db.settings.get('settings')) ?? { ...DEFAULT_SETTINGS, updatedAt: 0 };
  },
  async saveSettings(patch: Partial<Omit<Settings, 'id'>>): Promise<Settings> {
    const rec: Settings = { ...(await repo.getSettings()), ...patch, id: 'settings', updatedAt: now() };
    await db.settings.put(rec);
    return rec;
  },
};

/** 화면용 실시간 조회 훅 */
export const live = {
  exercises: (opts?: { includeDeleted?: boolean }) => useLiveQuery(() => repo.listExercises(opts), [opts?.includeDeleted]),
  routines: (opts?: { includeDeleted?: boolean }) => useLiveQuery(() => repo.listRoutines(opts), [opts?.includeDeleted]),
  entries: () => useLiveQuery(() => repo.listEntries(), []),
  settings: () => useLiveQuery(() => repo.getSettings(), []),
};
