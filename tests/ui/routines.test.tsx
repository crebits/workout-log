import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { db } from '../../src/data/db';
import { repo } from '../../src/data/repo';
import { RoutinesScreen } from '../../src/ui/routines/RoutinesScreen';

beforeEach(async () => { await db.delete(); await db.open(); });

async function seed() {
  const bench = await repo.saveExercise({ name: '벤치프레스', type: 'weight', incrementKg: 2.5, primaryMuscles: [], secondaryMuscles: [], note: '' });
  const dip = await repo.saveExercise({ name: '딥스', type: 'bodyweight', incrementKg: 0, primaryMuscles: [], secondaryMuscles: [], note: '' });
  const a = await repo.saveRoutine({ name: 'A', kind: 'workout', intensity: 'heavy', order: 0, items: [
    { exerciseId: bench.id, order: 0, targetRepsMin: 6, targetRepsMax: 8 },
    { exerciseId: dip.id, order: 1, targetRepsMin: 10, targetRepsMax: 12 },
  ] });
  const b = await repo.saveRoutine({ name: 'B', kind: 'workout', intensity: null, order: 1, items: [] });
  return { bench, dip, a, b };
}

test('위/아래 버튼으로 루틴 순서가 바뀐다', async () => {
  await seed();
  render(<RoutinesScreen />);
  fireEvent.click(await screen.findByRole('button', { name: 'B 위로' }));
  await waitFor(async () => expect((await repo.listRoutines()).map((r) => r.name)).toEqual(['B', 'A']));
});

test('휴식 추가', async () => {
  await seed();
  render(<RoutinesScreen />);
  fireEvent.click(await screen.findByRole('button', { name: '+ 휴식' }));
  await waitFor(async () => {
    const rs = await repo.listRoutines();
    expect(rs.at(-1)).toMatchObject({ name: '휴식', kind: 'rest', order: 2 });
  });
});

test('새 루틴 추가', async () => {
  await seed();
  render(<RoutinesScreen />);
  fireEvent.click(await screen.findByRole('button', { name: '+ 루틴' }));
  fireEvent.change(await screen.findByLabelText('루틴 이름'), { target: { value: 'C' } });
  fireEvent.click(screen.getByRole('button', { name: '루틴 저장' }));
  await waitFor(async () => expect((await repo.listRoutines()).map((r) => r.name)).toEqual(['A', 'B', 'C']));
});

test('목표 범위 수정이 저장된다', async () => {
  const { bench, a } = await seed();
  render(<RoutinesScreen />);
  fireEvent.click(await screen.findByRole('button', { name: 'A 고중량 편집' }));
  const editor = await screen.findByRole('group', { name: 'A 고중량 편집' });
  fireEvent.change(within(editor).getByLabelText('벤치프레스 목표 최소'), { target: { value: '5' } });
  fireEvent.change(within(editor).getByLabelText('벤치프레스 목표 최대'), { target: { value: '7' } });
  fireEvent.click(within(editor).getByRole('button', { name: '루틴 저장' }));
  await waitFor(async () => {
    const r = (await repo.listRoutines()).find((x) => x.id === a.id)!;
    expect(r.items.find((i) => i.exerciseId === bench.id)).toMatchObject({ targetRepsMin: 5, targetRepsMax: 7 });
  });
});

test('min > max면 저장되지 않고 안내가 보인다', async () => {
  const { bench, a } = await seed();
  render(<RoutinesScreen />);
  fireEvent.click(await screen.findByRole('button', { name: 'A 고중량 편집' }));
  const editor = await screen.findByRole('group', { name: 'A 고중량 편집' });
  fireEvent.change(within(editor).getByLabelText('벤치프레스 목표 최소'), { target: { value: '9' } });
  fireEvent.click(within(editor).getByRole('button', { name: '루틴 저장' }));
  expect(await within(editor).findByText(/목표 횟수 범위를 확인해 주세요/)).toBeInTheDocument();
  const r = (await repo.listRoutines()).find((x) => x.id === a.id)!;
  expect(r.items.find((i) => i.exerciseId === bench.id)?.targetRepsMin).toBe(6);
});

test('루틴 안의 운동 순서 변경', async () => {
  const { a, dip } = await seed();
  render(<RoutinesScreen />);
  fireEvent.click(await screen.findByRole('button', { name: 'A 고중량 편집' }));
  const editor = await screen.findByRole('group', { name: 'A 고중량 편집' });
  fireEvent.click(within(editor).getByRole('button', { name: '딥스 위로' }));
  fireEvent.click(within(editor).getByRole('button', { name: '루틴 저장' }));
  await waitFor(async () => {
    const r = (await repo.listRoutines()).find((x) => x.id === a.id)!;
    expect([...r.items].sort((x, y) => x.order - y.order)[0].exerciseId).toBe(dip.id);
  });
});

test('루틴 삭제는 확인 후', async () => {
  await seed();
  vi.spyOn(window, 'confirm').mockReturnValue(true);
  render(<RoutinesScreen />);
  fireEvent.click(await screen.findByRole('button', { name: 'B 삭제' }));
  await waitFor(async () => expect((await repo.listRoutines()).map((r) => r.name)).toEqual(['A']));
});

test('루틴 목록에 강도가 이름에 붙어 보인다', async () => {
  await repo.saveRoutine({ name: '하체', kind: 'workout', intensity: 'heavy', order: 90, items: [] });
  render(<RoutinesScreen />);
  expect(await screen.findByText('하체 고중량')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: '하체 고중량 편집' })).toBeInTheDocument();
});
