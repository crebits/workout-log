import { db } from './db';
import type { Entry, Exercise, ISODate, Routine, Settings } from '../types';
import { SCHEMA_VERSION } from '../types';
import { repo } from './repo';

export interface BackupFile {
  schemaVersion: number;
  exportedAt: number;
  exercises: Exercise[];
  routines: Routine[];
  entries: Entry[];
  settings: Settings;
}

export interface ImportPlan {
  newDates: ISODate[];
  conflictDates: ISODate[];
  exerciseIdMap: Record<string, string>;
  routineIdMap: Record<string, string>;
  incoming: BackupFile;
}

const BAD_FILE = '백업 파일을 읽을 수 없습니다';

export async function buildBackup(): Promise<BackupFile> {
  return {
    schemaVersion: SCHEMA_VERSION,
    exportedAt: Date.now(),
    exercises: await db.exercises.toArray(),
    routines: await db.routines.toArray(),
    entries: await db.entries.toArray(),
    settings: await repo.getSettings(),
  };
}

export function parseBackup(text: string): BackupFile {
  let data: unknown;
  try { data = JSON.parse(text); } catch { throw new Error(BAD_FILE); }
  const f = data as Partial<BackupFile>;
  if (
    !f || typeof f !== 'object' || typeof f.schemaVersion !== 'number' || f.schemaVersion > SCHEMA_VERSION ||
    !Array.isArray(f.exercises) || !Array.isArray(f.routines) || !Array.isArray(f.entries)
  ) throw new Error(BAD_FILE);
  return f as BackupFile;
}

const norm = (s: string) => s.trim().toLowerCase();
const restOrdinals = (rs: Routine[]) =>
  rs.filter((r) => r.kind === 'rest' && !r.deletedAt).sort((a, b) => a.order - b.order).map((r) => r.id);

async function buildMaps(file: BackupFile) {
  const curEx = await db.exercises.toArray();
  const curRt = await db.routines.toArray();
  const exerciseIdMap: Record<string, string> = {};
  for (const e of file.exercises) {
    const byId = curEx.find((c) => c.id === e.id);
    const byName = e.deletedAt ? undefined : curEx.find((c) => !c.deletedAt && norm(c.name) === norm(e.name));
    exerciseIdMap[e.id] = byId?.id ?? byName?.id ?? e.id;
  }
  const routineIdMap: Record<string, string> = {};
  const curRest = restOrdinals(curRt);
  const incRest = restOrdinals(file.routines);
  for (const r of file.routines) {
    const byId = curRt.find((c) => c.id === r.id);
    let match: string | undefined = byId?.id;
    if (!match && !r.deletedAt) {
      match = r.kind === 'rest'
        ? curRest[incRest.indexOf(r.id)]
        : curRt.find((c) => !c.deletedAt && c.kind === 'workout' && norm(c.name) === norm(r.name))?.id;
    }
    routineIdMap[r.id] = match ?? r.id;
  }
  return { exerciseIdMap, routineIdMap };
}

type EntryAction = { kind: 'new' | 'newer' | 'conflict' | 'skip'; existing?: Entry };

async function classify(e: Entry): Promise<EntryAction> {
  const existing = await db.entries.where('date').equals(e.date).first();
  if (!existing || existing.deletedAt) return { kind: 'new', existing };
  if (existing.id === e.id) return e.updatedAt > existing.updatedAt ? { kind: 'newer', existing } : { kind: 'skip', existing };
  return { kind: 'conflict', existing };
}

export async function planImport(file: BackupFile): Promise<ImportPlan> {
  const maps = await buildMaps(file);
  const newDates: ISODate[] = [];
  const conflictDates: ISODate[] = [];
  for (const e of file.entries.filter((x) => !x.deletedAt)) {
    const a = await classify(e);
    if (a.kind === 'new') newDates.push(e.date);
    if (a.kind === 'conflict') conflictDates.push(e.date);
  }
  return { newDates: newDates.sort(), conflictDates: conflictDates.sort(), ...maps, incoming: file };
}

export async function applyImport(plan: ImportPlan, onConflict: 'keep' | 'replace'): Promise<void> {
  const { incoming, exerciseIdMap, routineIdMap } = plan;
  const exId = (id: string) => exerciseIdMap[id] ?? id;
  await db.transaction('rw', db.exercises, db.routines, db.entries, async () => {
    for (const e of incoming.exercises) {
      if (exId(e.id) !== e.id) continue; // 이름으로 합쳐짐: 기존 유지
      const cur = await db.exercises.get(e.id);
      if (!cur || e.updatedAt > cur.updatedAt) await db.exercises.put(e);
    }
    for (const r of incoming.routines) {
      if ((routineIdMap[r.id] ?? r.id) !== r.id) continue;
      const cur = await db.routines.get(r.id);
      const mapped = { ...r, items: r.items.map((i) => ({ ...i, exerciseId: exId(i.exerciseId) })) };
      if (!cur || r.updatedAt > cur.updatedAt) await db.routines.put(mapped);
    }
    for (const e of incoming.entries.filter((x) => !x.deletedAt)) {
      const mapped: Entry = {
        ...e,
        routineId: e.routineId ? (routineIdMap[e.routineId] ?? e.routineId) : null,
        exercises: e.exercises.map((b) => ({ ...b, exerciseId: exId(b.exerciseId) })),
      };
      const a = await classify(e);
      if (a.kind === 'skip' || (a.kind === 'conflict' && onConflict === 'keep')) continue;
      if (a.existing) {
        const { deletedAt: _d, ...rest } = mapped;
        await db.entries.put({ ...rest, id: a.existing.id, createdAt: a.existing.createdAt, updatedAt: Math.max(Date.now(), e.updatedAt) });
      } else {
        await db.entries.put(mapped);
      }
    }
  });
}
