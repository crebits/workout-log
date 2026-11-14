import { db } from '../../src/data/db';
import { repo } from '../../src/data/repo';
import { buildBackup, parseBackup, planImport, applyImport, type BackupFile } from '../../src/data/backup';
import { ex, routine, entry, block, w, settings } from '../fixtures';

beforeEach(async () => { await db.delete(); await db.open(); });

const file = (p: Partial<BackupFile>): BackupFile => ({
  schemaVersion: 1, exportedAt: 1, exercises: [], routines: [], entries: [], settings: settings(), ...p,
});
const newEx = (name: string) => ({ name, type: 'weight' as const, incrementKg: 2.5, primaryMuscles: [], secondaryMuscles: [], note: '' });

test('buildBackup → parseBackup 왕복 (삭제 표시 포함)', async () => {
  const e = await repo.saveExercise(newEx('벤치'));
  await repo.deleteExercise(e.id);
  await repo.saveEntry({ date: '2026-11-15', routineId: null, isDeload: false, memo: 'x', exercises: [] });
  const b = await buildBackup();
  const parsed = parseBackup(JSON.stringify(b));
  expect(parsed.schemaVersion).toBe(1);
  expect(parsed.exercises[0].deletedAt).toBeDefined();
  expect(parsed.entries[0].memo).toBe('x');
});

test('schemaVersion 2 파일은 거부', () => {
  expect(() => parseBackup(JSON.stringify(file({ schemaVersion: 2 })))).toThrow('백업 파일을 읽을 수 없습니다');
});
test('JSON이 아니거나 배열이 없으면 거부', () => {
  expect(() => parseBackup('nope')).toThrow('백업 파일을 읽을 수 없습니다');
  expect(() => parseBackup('{"schemaVersion":1}')).toThrow('백업 파일을 읽을 수 없습니다');
});

test('다른 id 같은 이름 운동은 합치고 기록의 exerciseId를 바꾼다', async () => {
  const mine = await repo.saveExercise(newEx('벤치프레스'));
  const theirs = ex({ name: ' 벤치프레스 ' });
  const f = file({ exercises: [theirs], entries: [entry('2026-11-01', { memo: 'a', exercises: [block(theirs.id, [w(80, 8)])] })] });
  const plan = await planImport(f);
  expect(plan.exerciseIdMap[theirs.id]).toBe(mine.id);
  await applyImport(plan, 'keep');
  expect(await repo.listExercises()).toHaveLength(1);
  expect((await repo.getEntry('2026-11-01'))!.exercises[0].exerciseId).toBe(mine.id);
});

test('새 운동은 추가', async () => {
  const theirs = ex({ name: '스쿼트' });
  await applyImport(await planImport(file({ exercises: [theirs] })), 'keep');
  expect((await repo.listExercises()).map((e) => e.name)).toEqual(['스쿼트']);
});

test('휴식 두 개는 순번으로 매칭되어 두 개 유지', async () => {
  const f = file({ routines: [
    routine({ name: 'A', order: 0 }), routine({ name: '휴식', kind: 'rest', order: 1 }),
    routine({ name: 'B', order: 2 }), routine({ name: '휴식', kind: 'rest', order: 3 }),
  ] });
  await applyImport(await planImport(f), 'keep');
  const rs = await repo.listRoutines();
  expect(rs.filter((r) => r.kind === 'rest')).toHaveLength(2);
  // 다시 가져와도 늘어나지 않는다
  await applyImport(await planImport(f), 'keep');
  expect((await repo.listRoutines()).filter((r) => r.kind === 'rest')).toHaveLength(2);
  expect(await repo.listRoutines()).toHaveLength(4);
});

test('겹치는 날짜 keep: 기존 유지 / replace: 백업 내용, 기존 id 유지', async () => {
  const mine = await repo.saveEntry({ date: '2026-11-01', routineId: null, isDeload: false, memo: 'mine', exercises: [] });
  const f = file({ entries: [entry('2026-11-01', { memo: 'theirs' }), entry('2026-11-02', { memo: 'new' })] });
  const plan = await planImport(f);
  expect(plan.conflictDates).toEqual(['2026-11-01']);
  expect(plan.newDates).toEqual(['2026-11-02']);
  await applyImport(plan, 'keep');
  expect((await repo.getEntry('2026-11-01'))!.memo).toBe('mine');
  expect((await repo.getEntry('2026-11-02'))!.memo).toBe('new');
  await applyImport(await planImport(f), 'replace');
  const r = (await repo.getEntry('2026-11-01'))!;
  expect(r.memo).toBe('theirs');
  expect(r.id).toBe(mine.id);
});

test('자기 백업을 다시 가져오면 충돌 없음', async () => {
  await repo.saveEntry({ date: '2026-11-01', routineId: null, isDeload: false, memo: 'x', exercises: [] });
  const plan = await planImport(await buildBackup());
  expect(plan.conflictDates).toEqual([]);
  expect(plan.newDates).toEqual([]);
});

test('같은 id 운동은 updatedAt 큰 쪽', async () => {
  const mine = await repo.saveExercise(newEx('벤치'));
  const newer = { ...mine, note: '새 메모', updatedAt: mine.updatedAt + 1000 };
  await applyImport(await planImport(file({ exercises: [newer] })), 'keep');
  expect((await repo.getExercise(mine.id))!.note).toBe('새 메모');
});

test('일지의 routineId도 매핑된다', async () => {
  const mine = await repo.saveRoutine({ name: 'A', kind: 'workout', intensity: null, order: 0, items: [] });
  const theirs = routine({ name: 'A' });
  await applyImport(await planImport(file({ routines: [theirs], entries: [entry('2026-11-03', { routineId: theirs.id })] })), 'keep');
  expect((await repo.getEntry('2026-11-03'))!.routineId).toBe(mine.id);
});

test('가져온 새 루틴은 기존 루틴 뒤에 순서대로 붙는다', async () => {
  await repo.saveRoutine({ name: 'A', kind: 'workout', intensity: null, order: 0, items: [] });
  await repo.saveRoutine({ name: 'B', kind: 'workout', intensity: null, order: 1, items: [] });
  const f = file({ routines: [routine({ name: 'Y', order: 1 }), routine({ name: 'X', order: 0 })] });
  await applyImport(await planImport(f), 'keep');
  expect((await repo.listRoutines()).map((r) => r.name)).toEqual(['A', 'B', 'X', 'Y']);
});
