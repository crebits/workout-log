import { db } from '../../src/data/db';
import { repo } from '../../src/data/repo';

beforeEach(async () => {
  await db.delete();
  await db.open();
});

const newEx = (name: string) => ({ name, type: 'weight' as const, incrementKg: 2.5, primaryMuscles: [], secondaryMuscles: [], note: '' });

test('운동 저장 후 이름으로 찾기(공백·대소문자 무시)', async () => {
  const e = await repo.saveExercise(newEx('Bench Press'));
  expect(e.id).toMatch(/[0-9a-f-]{36}/);
  expect((await repo.findExerciseByName('  bench press '))?.id).toBe(e.id);
});

test('삭제한 운동은 목록에서 빠지지만 getExercise로는 찾음', async () => {
  const e = await repo.saveExercise(newEx('스쿼트'));
  await repo.deleteExercise(e.id);
  expect(await repo.listExercises()).toHaveLength(0);
  expect((await repo.listExercises({ includeDeleted: true }))).toHaveLength(1);
  expect((await repo.getExercise(e.id))?.name).toBe('스쿼트');
  expect(await repo.findExerciseByName('스쿼트')).toBeUndefined();
});

test('saveExercise로 수정하면 id 유지, updatedAt 증가', async () => {
  const e = await repo.saveExercise(newEx('a'));
  await new Promise((r) => setTimeout(r, 2));
  const e2 = await repo.saveExercise({ ...e, note: 'x' });
  expect(e2.id).toBe(e.id);
  expect(e2.createdAt).toBe(e.createdAt);
  expect(e2.updatedAt).toBeGreaterThan(e.updatedAt);
});

const draft = (date: string, memo = 'm') => ({ date, routineId: null, isDeload: false, memo, exercises: [] });

test('saveEntry 두 번 → 같은 id, updatedAt 증가', async () => {
  const a = await repo.saveEntry(draft('2026-11-15'));
  await new Promise((r) => setTimeout(r, 2));
  const b = await repo.saveEntry(draft('2026-11-15', 'm2'));
  expect(b.id).toBe(a.id);
  expect(b.updatedAt).toBeGreaterThan(a.updatedAt);
  expect((await repo.getEntry('2026-11-15'))?.memo).toBe('m2');
});

test('비운 일지는 soft delete, 같은 날짜에 다시 쓰면 같은 레코드 되살림', async () => {
  const a = await repo.saveEntry(draft('2026-11-15'));
  await repo.saveEntry(draft('2026-11-15', '  '));
  expect(await repo.getEntry('2026-11-15')).toBeUndefined();
  expect(await repo.listEntries()).toHaveLength(0);
  const c = await repo.saveEntry(draft('2026-11-15', '다시'));
  expect(c.id).toBe(a.id);
  expect(c.deletedAt).toBeUndefined();
  expect(await repo.listEntries()).toHaveLength(1);
});

test('reorderRoutines가 order를 바꾼다', async () => {
  const r1 = await repo.saveRoutine({ name: 'A', kind: 'workout', intensity: null, order: 0, items: [] });
  const r2 = await repo.saveRoutine({ name: 'B', kind: 'workout', intensity: null, order: 1, items: [] });
  await repo.reorderRoutines([r2.id, r1.id]);
  expect((await repo.listRoutines()).map((r) => r.name)).toEqual(['B', 'A']);
});

test('deleteRoutine은 목록에서 뺀다', async () => {
  const r1 = await repo.saveRoutine({ name: 'A', kind: 'workout', intensity: null, order: 0, items: [] });
  await repo.deleteRoutine(r1.id);
  expect(await repo.listRoutines()).toHaveLength(0);
});

test('settings 기본값과 수정', async () => {
  expect((await repo.getSettings()).deloadEveryLaps).toBe(4);
  await repo.saveSettings({ deloadEveryLaps: 5 });
  expect((await repo.getSettings()).deloadEveryLaps).toBe(5);
  expect((await repo.getSettings()).backupReminderDays).toBe(14);
});

describe('changeMeasure', () => {
  const ex0 = { name: '플랭크', type: 'bodyweight' as const, incrementKg: 0, primaryMuscles: [], secondaryMuscles: [], note: '' };
  test('단위를 바꾸면 그 운동이 든 루틴의 목표 범위를 새 단위 기본값으로', async () => {
    const e = await repo.saveExercise(ex0);
    const other = await repo.saveExercise({ ...ex0, name: '푸시업' });
    const r = await repo.saveRoutine({ name: 'A', kind: 'workout', intensity: null, order: 0, items: [
      { exerciseId: e.id, order: 0, targetRepsMin: 8, targetRepsMax: 10 },
      { exerciseId: other.id, order: 1, targetRepsMin: 12, targetRepsMax: 15 },
    ] });
    const changed = await repo.changeMeasure(e.id, 'seconds');
    expect(changed).toBe(1);
    expect((await repo.getExercise(e.id))?.measure).toBe('seconds');
    const items = (await repo.listRoutines()).find((x) => x.id === r.id)!.items;
    expect(items[0]).toMatchObject({ targetRepsMin: 30, targetRepsMax: 60 });
    expect(items[1]).toMatchObject({ targetRepsMin: 12, targetRepsMax: 15 });
    await repo.changeMeasure(e.id, 'reps');
    expect((await repo.listRoutines())[0].items[0]).toMatchObject({ targetRepsMin: 8, targetRepsMax: 10 });
  });
  test('같은 단위면 아무것도 바꾸지 않는다', async () => {
    const e = await repo.saveExercise(ex0);
    expect(await repo.changeMeasure(e.id, 'reps')).toBe(0);
  });
});
